/* Crux.pwa: service-worker registration, the "Offline ready" / "Update available" toast, and the
   "Download all media for offline" tool in Settings. Loaded before js/app.js (which calls register()). */
(function(){
 const Crux=window.Crux=window.Crux||{};
 const MEDIA_CACHE='crux-media-v1';
 const STATE_KEY='mediaDl';
 const hasCaches=()=>typeof caches!=='undefined';

 /* ── service worker + toast ─────────────────────────────────────────── */
 let toastEl=null;
 function pwaToast(text,action){
  if(!toastEl){
   toastEl=document.createElement('div');toastEl.className='pwa-toast';toastEl.setAttribute('role','status');
   document.body.appendChild(toastEl);
  }
  toastEl.innerHTML='';
  const span=document.createElement('span');span.textContent=text;toastEl.appendChild(span);
  if(action){
   const b=document.createElement('button');b.type='button';b.className='pwa-toast-btn';b.textContent=action.label;
   b.addEventListener('click',action.run);toastEl.appendChild(b);
  }
  const x=document.createElement('button');x.type='button';x.className='pwa-toast-x';x.setAttribute('aria-label','Dismiss');x.textContent='×';
  x.addEventListener('click',()=>toastEl.classList.remove('show'));toastEl.appendChild(x);
  requestAnimationFrame(()=>toastEl.classList.add('show'));
  if(!action)setTimeout(()=>toastEl&&toastEl.classList.remove('show'),4200);
 }
 function updateReady(reg){
  pwaToast('Update available',{label:'Reload',run:()=>{
   const w=reg.waiting;
   if(w){navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});w.postMessage({type:'SKIP_WAITING'});}
   else location.reload();
  }});
 }
 let registration=null;
 function register(){
  if(!('serviceWorker' in navigator))return;
  const hadController=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js',{scope:'./'}).then(reg=>{
   if(!reg)return;
   registration=reg;Crux.pwa.registration=reg;
   if(reg.waiting&&navigator.serviceWorker.controller)updateReady(reg);
   reg.addEventListener('updatefound',()=>{
    const w=reg.installing;if(!w)return;
    w.addEventListener('statechange',()=>{
     if(w.state==='installed'){
      if(navigator.serviceWorker.controller)updateReady(reg);
     }
    });
   });
   // Installed Home Screen apps are rarely reloaded: look for a new version whenever the app comes back.
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)reg.update().catch(()=>{});});
   if(!hadController)navigator.serviceWorker.ready.then(()=>pwaToast('Offline ready'));
  }).catch(err=>console.warn('Service worker not registered',err&&err.message));
 }

 /* ── media list (built from the data files) ─────────────────────────── */
 function mediaList(){
  const set=new Set();
  const walk=o=>{
   if(typeof o==='string'){if(o.startsWith('media/'))set.add(o);}
   else if(o&&typeof o==='object')for(const k in o)walk(o[k]);
  };
  walk(window.LIBRARY&&window.LIBRARY.exercises);
  // Drawn covers exist for a few ideas that are not in the library (yet): only fetch the ones the app can show.
  const known=new Set(((window.LIBRARY&&window.LIBRARY.exercises)||[]).map(e=>e.id));
  for(const [id,c] of Object.entries(window.EXERCISE_COVERS||{}))if(known.has(id))walk(c);
  // Only what the app displays: clips, covers, poses, examples, climbing, thumbs. Never the big root sources.
  return [...set].filter(p=>/^media\/(clips|covers|poses|examples|climbing|thumbs)\//.test(p))
   .map(p=>new URL(p,document.baseURI).href);
 }

 const readState=()=>{try{return JSON.parse(localStorage.getItem(STATE_KEY))||null;}catch{return null;}};
 const writeState=s=>{try{if(s)localStorage.setItem(STATE_KEY,JSON.stringify(s));else localStorage.removeItem(STATE_KEY);}catch{}};
 const fmtMB=b=>(b/1048576).toFixed(b>=104857600?0:1)+' MB';

 async function cachedCount(list){
  if(!hasCaches())return 0;
  const cache=await caches.open(MEDIA_CACHE);
  const keys=new Set((await cache.keys()).map(r=>r.url));
  return list.filter(u=>keys.has(u)).length;
 }

 let running=null; // {done,total,bytes,cancel}
 async function downloadAll(onProgress){
  const list=mediaList(),cache=await caches.open(MEDIA_CACHE);
  try{if(navigator.storage&&navigator.storage.persist)await navigator.storage.persist();}catch{}
  const job=running={done:0,total:list.length,bytes:0,failed:[],cancelled:false,cancel(){job.cancelled=true;}};
  const queue=list.slice();
  const existing=new Set((await cache.keys()).map(r=>r.url));
  async function worker(){
   while(queue.length&&!job.cancelled){
    const url=queue.shift();
    try{
     if(existing.has(url)){
      const r=await cache.match(url);if(r){const b=await r.blob();job.bytes+=b.size;}
     }else{
      const res=await fetch(url);
      if(res.status===404){job.failed.push(url);}
      else if(!res.ok)throw new Error('HTTP '+res.status);
      else{const blob=await res.blob();job.bytes+=blob.size;await cache.put(url,new Response(blob,{status:200,headers:{'Content-Type':res.headers.get('Content-Type')||blob.type||'application/octet-stream'}}));}
     }
    }catch(err){job.failed.push(url);job.error=err;}
    job.done++;onProgress&&onProgress(job);
   }
  }
  await Promise.all([1,2,3,4].map(worker));
  running=null;
  const missing=job.failed.length;
  if(!job.cancelled){
   // Files that 404 (drawings not made yet) never block the "Downloaded" state; network failures do.
   const netFail=job.failed.length&&job.error;
   if(!netFail)writeState({at:Date.now(),count:list.length-missing,bytes:job.bytes,skipped:job.failed});
  }
  return job;
 }
 async function removeAll(){
  if(hasCaches())await caches.delete(MEDIA_CACHE);
  writeState(null);
 }

 /* ── Settings section ───────────────────────────────────────────────── */
 function settingsSection(root){
  root.innerHTML=`<div class="dl-head"><span class="settings-row-label">Offline media</span><span class="dl-status" data-dl-status></span></div>
   <p class="settings-note" data-dl-note></p>
   <div class="dl-bar" hidden><span class="dl-bar-fill"></span></div>
   <div class="dl-actions"><button type="button" class="btn btn-secondary btn-sm" data-dl-go></button><button type="button" class="btn btn-ghost btn-sm" data-dl-cancel hidden>Cancel</button></div>`;
  const q=s=>root.querySelector(s);
  const status=q('[data-dl-status]'),note=q('[data-dl-note]'),bar=q('.dl-bar'),fill=q('.dl-bar-fill'),go=q('[data-dl-go]'),cancel=q('[data-dl-cancel]');
  async function paint(){
   const st=readState();
   if(!hasCaches()||!('serviceWorker' in navigator)){status.textContent='';note.textContent='Offline downloads need a secure connection (https) and a browser with service workers.';go.hidden=true;return;}
   go.hidden=false;bar.hidden=true;cancel.hidden=true;go.disabled=false;
   const list=mediaList(),have=await cachedCount(list);
   if(st&&have>=st.count){
    status.textContent='Downloaded ✓';
    note.textContent=`${st.count} files · ${fmtMB(st.bytes)} saved on this device. Videos and pictures now play without a connection.`;
    go.textContent='Remove downloads';go.dataset.mode='remove';
   }else{
    status.textContent=have?`${have} of ${list.length} saved`:'';
    note.textContent='Save every video, picture and drawing (about 35 MB) so workouts play instantly with no signal. Anything you open is also saved automatically.';
    go.textContent='Download all media for offline';go.dataset.mode='download';
   }
  }
  go.addEventListener('click',async()=>{
   if(go.dataset.mode==='remove'){await removeAll();await paint();return;}
   go.disabled=true;bar.hidden=false;cancel.hidden=false;go.textContent='Downloading…';
   const total=mediaList().length;
   const job=await downloadAll(j=>{
    fill.style.transform=`scaleX(${(j.done/total).toFixed(4)})`;
    status.textContent=`${j.done} / ${total} · ${fmtMB(j.bytes)}`;
   });
   if(job.cancelled)Crux.toast('Download cancelled');
   else if(job.error)Crux.toast('Some files could not be downloaded. Check your connection and try again.');
   else Crux.toast('All media saved for offline use');
   await paint();
  });
  cancel.addEventListener('click',()=>{if(running)running.cancel();});
  paint();
 }

 Crux.pwa={register,settingsSection,mediaList,downloadAll,removeAll,cachedCount,MEDIA_CACHE,toast:pwaToast};
})();
