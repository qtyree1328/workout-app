/* Crux service worker: offline app shell + downloadable media.
   Scope is the folder this file lives in (works under /workout-app/ on GitHub Pages).

   >>> Bump VERSION on every deploy that changes html/css/js/data. <<<
   Shell files are precached under a versioned cache and revalidated in the background
   (stale-while-revalidate), so edits still reach people even if the bump is forgotten.
   Media (clips, covers, poses, thumbs, examples, climbing) lives in its own cache that is
   never versioned or purged by updates: cache-first, filled on first use or by the
   "Download all media" button in Settings. */
const VERSION='2026-09-30.6';
const SHELL_CACHE='crux-shell-'+VERSION;
const MEDIA_CACHE='crux-media-v1';
const SDK_CACHE='crux-sdk-v1';
const SHELL=[
 './','index.html','manifest.webmanifest','icon.svg','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png',
 'css/base.css','css/app.css','css/features.css','css/player.css','css/hangboard.css','firebase-config.js',
 'data/library.js','data/cover-art.js','data/classification.js','data/sessions.js',
 'js/core/plan.js','js/core/engine.js','js/core/search.js','js/core/hip.js','js/core/feet.js',
 'js/figures.js','js/art.js','js/store.js','js/lib.js','js/audio.js','js/player.js','js/pwa.js','js/custom.js','js/timer.js','js/builder.js','js/hangboard.js','js/hangboard3d.js','js/vendor/three.module.min.js','js/sync.js','js/app.js'
];
const MEDIA_RE=/\/media\/(clips|covers|poses|examples|climbing|thumbs)\//;
const scopeURL=new URL(self.registration.scope);

self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(SHELL_CACHE);
  // One file at a time tolerated: a missing optional file must not block the install.
  await Promise.all(SHELL.map(async p=>{
   try{const res=await fetch(new Request(p,{cache:'reload'}));if(res.ok)await cache.put(new URL(p,scopeURL).href,res);}catch{}
  }));
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('crux-shell-')&&key!==SHELL_CACHE)await caches.delete(key);
  await self.clients.claim();
 })());
});
self.addEventListener('message',event=>{
 const d=event.data||{};
 if(d.type==='SKIP_WAITING')self.skipWaiting();
 else if(d.type==='VERSION'&&event.source)event.source.postMessage({type:'VERSION',version:VERSION});
});

self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 // Firebase SDK files (only requested when cloud sync is configured): keep a copy so sync can start offline.
 if(url.hostname==='www.gstatic.com'&&url.pathname.startsWith('/firebasejs/')){event.respondWith(sdk(event,req));return;}
 if(url.origin!==self.location.origin)return; // everything else cross-origin goes straight to the network
 if(!url.pathname.startsWith(scopeURL.pathname))return;
 if(MEDIA_RE.test(url.pathname)){event.respondWith(media(event,req));return;}
 if(req.mode==='navigate'){event.respondWith(navigation(event,req));return;}
 event.respondWith(staleWhileRevalidate(event,req));
});

// HTML: the network wins when it answers quickly; on poor signal fall back to the cached shell.
async function navigation(event,req){
 const cache=await caches.open(SHELL_CACHE);
 const fallback=async()=>(await cache.match(new URL('index.html',scopeURL).href))||(await cache.match(scopeURL.href));
 const network=fetch(req).then(res=>{if(res.ok)cache.put(new URL('index.html',scopeURL).href,res.clone());return res;});
 try{
  return await Promise.race([network,new Promise((_,rej)=>setTimeout(()=>rej(new Error('slow')),3500))]);
 }catch{
  const hit=await fallback();
  if(hit){event.waitUntil(network.catch(()=>{}));return hit;}
  return network.catch(()=>new Response('Offline',{status:503,headers:{'Content-Type':'text/plain'}}));
 }
}

async function staleWhileRevalidate(event,req){
 const cache=await caches.open(SHELL_CACHE);
 const hit=await cache.match(req,{ignoreSearch:true});
 const refresh=fetch(req).then(res=>{if(res&&res.ok)cache.put(req,res.clone());return res;}).catch(()=>null);
 if(hit){event.waitUntil(refresh);return hit;}
 const res=await refresh;
 return res||new Response('',{status:504});
}

// Media: cache-first. Byte-range requests (every <video> on iOS Safari) are answered from the cached
// file with a proper 206; otherwise the full file is fetched once in the background for next time.
const filling=new Set();
async function media(event,req){
 const cache=await caches.open(MEDIA_CACHE);
 const hit=await cache.match(req.url,{ignoreSearch:true});
 const range=req.headers.get('range');
 if(hit){return range?slice(hit,range):hit;}
 if(range){
  const key=req.url;
  if(!filling.has(key)){
   filling.add(key);
   event.waitUntil(fetch(req.url).then(res=>{if(res.ok&&res.status===200)return cache.put(key,res);}).catch(()=>{}).finally(()=>filling.delete(key)));
  }
  return fetch(req);
 }
 try{
  const res=await fetch(req);
  if(res.ok&&res.status===200)event.waitUntil(cache.put(req.url,res.clone()));
  return res;
 }catch{return new Response('',{status:504});}
}
async function slice(res,rangeHeader){
 const blob=await res.blob(),size=blob.size;
 const m=/^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
 const type=res.headers.get('Content-Type')||'video/mp4';
 if(!m||(m[1]===''&&m[2]==='')||!size)return new Response(blob,{status:200,headers:{'Content-Type':type,'Content-Length':String(size),'Accept-Ranges':'bytes'}});
 let start,end;
 if(m[1]===''){start=Math.max(0,size-Number(m[2]));end=size-1;}
 else{start=Number(m[1]);end=m[2]===''?size-1:Math.min(Number(m[2]),size-1);}
 if(start>end||start>=size)return new Response(null,{status:416,statusText:'Range Not Satisfiable',headers:{'Content-Range':`bytes */${size}`,'Accept-Ranges':'bytes'}});
 const part=blob.slice(start,end+1,type);
 return new Response(part,{status:206,statusText:'Partial Content',headers:{'Content-Type':type,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':String(part.size),'Accept-Ranges':'bytes'}});
}

async function sdk(event,req){
 const cache=await caches.open(SDK_CACHE);
 const hit=await cache.match(req.url);
 if(hit)return hit;
 try{
  const res=await fetch(req);
  if(res.ok||res.type==='opaque')event.waitUntil(cache.put(req.url,res.clone()));
  return res;
 }catch{return new Response('',{status:504});}
}
