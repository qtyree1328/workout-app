/* Crux.sync: optional cloud sync through your own Firebase project. Fully inactive unless firebase-config.js
   sets window.CRUX_FIREBASE (see README -> "Cloud sync with Firebase (optional)").
   The local store stays the source of truth and works offline; sync merges per item (newest updatedAt wins,
   tombstones for deletes) so two devices can never overwrite each other wholesale.

   Firestore layout:  users/{uid}/crux/state   { json: "<store document, photos removed>", updatedAt, v }
                      users/{uid}/photos/{exerciseId}  { rev, data }   (one JPEG data URL per custom exercise)
   This file has a pure core (createSyncer, used by tests/sync.cjs) and a thin Firebase adapter below it. */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else{const Crux=root.Crux=root.Crux||{};Crux.syncCore=api;Crux.sync=api.boot(root);}
})(typeof window!=='undefined'?window:globalThis,root=>{
 const SDK_VERSION='10.12.5';
 const SDK=['app','auth','firestore'].map(n=>`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-${n}-compat.js`);
 const MAX_PHOTO=900*1024;        // a photo bigger than this stays on this device
 const MAX_STATE=900*1024;        // Firestore documents are limited to 1 MiB

 /* ── pure helpers ─────────────────────────────────────────────────── */
 const strip=doc=>({...doc,customExercises:(doc.customExercises||[]).map(x=>x.photo?{...x,photo:'',hasPhoto:true}:x)});
 // Keep a local photo when the incoming exercise carries the same photo revision.
 function injectPhotos(remote,local){
  const byId=new Map((local.customExercises||[]).map(x=>[x.id,x]));
  return {...remote,customExercises:(remote.customExercises||[]).map(x=>{
   const mine=byId.get(x.id);
   if(x.hasPhoto&&!x.photo&&mine&&mine.photo&&mine.photoRev===x.photoRev)return {...x,photo:mine.photo};
   return x;
  })};
 }
 function payloadOf(doc,now){
  let d=strip(doc),json=JSON.stringify(d);
  if(json.length>MAX_STATE){d={...d,history:d.history.map(h=>{const{session,...rest}=h;return rest;})};json=JSON.stringify(d);}
  if(json.length>MAX_STATE){d={...d,history:d.history.slice().sort((a,b)=>(b.startedAt||0)-(a.startedAt||0)).slice(0,120)};json=JSON.stringify(d);}
  return {json,updatedAt:doc.updatedAt||now,v:1};
 }

 /* backend = { state:{listen(cb)->unsub, set(payload)}, photo:{get(id)->Promise<{rev,data}|null>, set(id,rev,data)} }
    core = Crux.storeCore (normalize, mergeDocs, sameDoc); store = the store instance. */
 function createSyncer({store,core,backend,now=()=>Date.now(),debounceMs=1500,onStatus=()=>{}}){
  let remoteDoc=null,timer=null,unsub=null,stopped=false,pushing=false,dirty=false;
  const uploaded=new Map(); // exerciseId -> rev already on the server
  const wantPhoto=new Set();
  const status=(s,extra)=>onStatus({state:s,...extra});

  async function syncPhotos(){
   for(const x of store.items('customExercises')){
    if(x.photo&&x.photoRev&&uploaded.get(x.id)!==x.photoRev&&x.photo.length<=MAX_PHOTO){
     try{await backend.photo.set(x.id,x.photoRev,x.photo);uploaded.set(x.id,x.photoRev);}catch(err){status('error',{message:'Photo upload failed'});}
    }
   }
   for(const x of store.items('customExercises')){
    if(x.hasPhoto&&!x.photo&&!wantPhoto.has(x.id+':'+x.photoRev)){
     wantPhoto.add(x.id+':'+x.photoRev);
     try{
      const p=await backend.photo.get(x.id);
      if(p&&p.data){uploaded.set(x.id,p.rev);store.patchItem('customExercises',x.id,{photo:p.data,photoRev:p.rev,hasPhoto:true},'remote');}
     }catch{wantPhoto.delete(x.id+':'+x.photoRev);}
    }
   }
  }
  async function push(){
   if(stopped)return;
   if(pushing){dirty=true;return;}
   pushing=true;
   try{
    status('syncing');
    const merged=remoteDoc?core.mergeDocs(injectPhotos(remoteDoc,store.get()),store.get()):store.get();
    await syncPhotos();
    await backend.state.set(payloadOf(merged,now()));
    status('synced',{at:now()});
   }catch(err){status('error',{message:(err&&err.message)||'Sync failed'});}
   finally{pushing=false;if(dirty){dirty=false;schedule();}}
  }
  function schedule(ms=debounceMs){clearTimeout(timer);timer=setTimeout(push,ms);}
  function onRemote(payload){
   if(stopped||!payload)return;
   let incoming;
   try{incoming=core.normalize(JSON.parse(payload.json));}catch{return;}
   remoteDoc=incoming;
   store.merge(injectPhotos(incoming,store.get()),'remote');
   syncPhotos();
   // If the merge left us holding something the server does not have, send it back.
   if(!core.sameDoc(strip(store.get()),incoming))schedule(400);
   else status('synced',{at:now()});
  }
  const off=store.on(e=>{if(e.type==='change'&&e.source!=='remote'&&!stopped)schedule();});
  function start(){
   stopped=false;status('syncing');
   unsub=backend.state.listen(payload=>{if(payload)onRemote(payload);else{remoteDoc=null;schedule(200);}},err=>status('error',{message:(err&&err.message)||'Listener failed'}));
  }
  function stop(){stopped=true;clearTimeout(timer);if(unsub)unsub();unsub=null;off();}
  return {start,stop,push,schedule,_state:()=>({remoteDoc})};
 }

 /* ── Firebase glue (browser only) ─────────────────────────────────── */
 function boot(win){
  const listeners=new Set();
  const sync={configured:false,status:{state:'off'},user:null,onStatus(fn){listeners.add(fn);fn(sync.status);return()=>listeners.delete(fn);},
   settingsSection:()=>false,signIn:async()=>{},signUp:async()=>{},signOut:async()=>{},syncNow:()=>{},reset:async()=>{}};
  if(!win||!win.document)return sync;
  const cfg=win.CRUX_FIREBASE;
  if(!cfg||typeof cfg!=='object'||!cfg.apiKey||!cfg.projectId)return sync;
  sync.configured=true;
  const setStatus=s=>{sync.status={...sync.status,...s};listeners.forEach(fn=>{try{fn(sync.status);}catch{}});};
  setStatus({state:'idle'});
  let fb=null,syncer=null,sdkPromise=null;

  function loadScript(src){
   return new Promise((res,rej)=>{const s=win.document.createElement('script');s.src=src;s.async=false;s.onload=res;s.onerror=()=>rej(new Error('Could not load Firebase (offline?)'));win.document.head.appendChild(s);});
  }
  function loadSDK(){
   if(sdkPromise)return sdkPromise;
   sdkPromise=(async()=>{
    if(!win.firebase)for(const src of SDK)await loadScript(src);
    const app=win.firebase.apps.length?win.firebase.app():win.firebase.initializeApp(cfg);
    const auth=win.firebase.auth(),db=win.firebase.firestore();
    try{await db.enablePersistence({synchronizeTabs:true});}catch{/* another tab, or unsupported: fine */}
    fb={app,auth,db};
    auth.onAuthStateChanged(user=>{sync.user=user;setStatus({user:user?{email:user.email}:null});user?begin(user):end();});
    return fb;
   })().catch(err=>{sdkPromise=null;setStatus({state:win.navigator.onLine?'error':'offline',message:err.message});throw err;});
   return sdkPromise;
  }
  function begin(user){
   end();
   const Crux=win.Crux,core=Crux.storeCore,store=Crux.store;
   const stateRef=fb.db.doc(`users/${user.uid}/crux/state`);
   const photoRef=id=>fb.db.doc(`users/${user.uid}/photos/${id}`);
   const backend={
    state:{
     listen:(cb,errCb)=>stateRef.onSnapshot(snap=>{cb(snap.exists?snap.data():null);},errCb),
     set:payload=>stateRef.set(payload),
    },
    photo:{
     get:async id=>{const s=await photoRef(id).get();return s.exists?s.data():null;},
     set:(id,rev,data)=>photoRef(id).set({rev,data}),
    },
   };
   syncer=createSyncer({store,core,backend,onStatus:s=>setStatus(s)});
   syncer.start();
  }
  function end(){if(syncer){syncer.stop();syncer=null;}setStatus({state:sync.user?'idle':'signed-out'});}
  const fail=err=>{
   const map={'auth/invalid-credential':'Wrong email or password.','auth/wrong-password':'Wrong email or password.','auth/user-not-found':'No account with that email.','auth/email-already-in-use':'That email already has an account. Sign in instead.','auth/weak-password':'Use a password with at least 6 characters.','auth/invalid-email':'That email address does not look right.','auth/network-request-failed':'No connection. Try again when you have signal.','auth/too-many-requests':'Too many attempts. Wait a minute and try again.'};
   const e=new Error(map[err&&err.code]||(err&&err.message)||'Something went wrong');throw e;
  };
  Object.assign(sync,{
   async init(){await loadSDK();},
   async signIn(email,password){await loadSDK();try{await fb.auth.signInWithEmailAndPassword(email,password);}catch(e){fail(e);}},
   async signUp(email,password){await loadSDK();try{await fb.auth.createUserWithEmailAndPassword(email,password);}catch(e){fail(e);}},
   async reset(email){await loadSDK();try{await fb.auth.sendPasswordResetEmail(email);}catch(e){fail(e);}},
   async signOut(){if(fb)await fb.auth.signOut();},
   syncNow(){if(syncer)syncer.push();},
  });

  sync.settingsSection=root=>{
   const {h}=win.Crux;
   const paint=()=>{
    const st=sync.status,user=sync.user;
    const label={syncing:'Syncing…',synced:st.at?`Synced ${new Date(st.at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}`:'Synced',offline:'Offline — will sync later',error:st.message||'Sync problem','signed-out':'Signed out',idle:user?'Connected':'Signed out'}[st.state]||'';
    if(user){
     root.innerHTML=`<div class="dl-head"><span class="settings-row-label">Cloud sync</span><span class="dl-status" id="sync-status">${h(label)}</span></div>
      <p class="settings-note">Signed in as <strong>${h(user.email||'')}</strong>. Favorites, exercises, workouts, timers and history are kept in sync between your devices.</p>
      <div class="dl-actions"><button type="button" class="btn btn-secondary btn-sm" id="sync-now">Sync now</button><button type="button" class="btn btn-ghost btn-sm" id="sync-out">Sign out</button></div>`;
     root.querySelector('#sync-now').onclick=()=>sync.syncNow();
     root.querySelector('#sync-out').onclick=()=>sync.signOut();
    }else{
     root.innerHTML=`<div class="dl-head"><span class="settings-row-label">Cloud sync</span><span class="dl-status" id="sync-status">${h(st.state==='error'||st.state==='offline'?label:'')}</span></div>
      <p class="settings-note">Sign in to keep your data in sync between devices. Your data stays on this device either way.</p>
      <form class="sync-form" id="sync-form" novalidate><input class="field-input" type="email" id="sync-email" placeholder="Email" autocomplete="email" autocapitalize="none" aria-label="Email"><input class="field-input" type="password" id="sync-pass" placeholder="Password" autocomplete="current-password" aria-label="Password">
       <div class="dl-actions"><button type="submit" class="btn btn-sm" id="sync-in">Sign in</button><button type="button" class="btn btn-secondary btn-sm" id="sync-up">Create account</button><button type="button" class="btn btn-ghost btn-sm" id="sync-forgot">Forgot password</button></div></form>`;
     const email=root.querySelector('#sync-email'),pass=root.querySelector('#sync-pass');
     const run=async fn=>{try{await fn();}catch(e){win.Crux.toast(e.message);}};
     root.querySelector('#sync-form').addEventListener('submit',e=>{e.preventDefault();run(()=>sync.signIn(email.value.trim(),pass.value));});
     root.querySelector('#sync-up').onclick=()=>run(()=>sync.signUp(email.value.trim(),pass.value));
     root.querySelector('#sync-forgot').onclick=()=>run(async()=>{if(!email.value.trim())throw new Error('Type your email first');await sync.reset(email.value.trim());win.Crux.toast('Password reset email sent');});
    }
   };
   sync.init().catch(()=>{});
   let off=null;
   off=sync.onStatus(()=>{if(!root.isConnected){if(off)off();return;}paint();});
   return true;
  };
  // Start quietly at page load so a signed-in device syncs without opening Settings.
  win.addEventListener('load',()=>{if(win.navigator.onLine)sync.init().catch(()=>{});});
  win.addEventListener('online',()=>{sync.init().catch(()=>{});if(syncer)syncer.schedule(300);});
  win.addEventListener('offline',()=>setStatus({state:'offline'}));
  return sync;
 }

 return {createSyncer,strip,injectPhotos,payloadOf,boot,MAX_PHOTO,MAX_STATE,SDK_VERSION};
});
