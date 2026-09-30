/* Crux.store: the one document that holds everything the person creates on this device.
     { v, favorites:{exercises:[],sessions:[]}, customExercises:[], customWorkouts:[], history:[], timerPresets:[], hangLog:[], updatedAt }
   Every list item is {id, updatedAt, deleted?, …}. Deleting leaves a small tombstone ({id, updatedAt, deleted:true})
   so two devices can be merged safely: per item, the newest updatedAt wins (a tombstone can win too).
   The pure merge helpers below are shared with tests/store.cjs and js/sync.js. Stored in localStorage (one key). */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else{const Crux=root.Crux=root.Crux||{};Crux.storeCore=api;Crux.store=api.createStore(root.localStorage);}
})(typeof window!=='undefined'?window:globalThis,()=>{
 const VERSION=1,KEY='crux-store';
 const COLLECTIONS=['customExercises','customWorkouts','history','timerPresets','hangLog'];
 const FAV_KINDS=['exercises','sessions'];
 const TOMBSTONE_TTL=90*24*3600*1000;

 const emptyDoc=()=>({v:VERSION,favorites:{exercises:[],sessions:[]},customExercises:[],customWorkouts:[],history:[],timerPresets:[],hangLog:[],updatedAt:0});
 const isItem=x=>x&&typeof x==='object'&&typeof x.id==='string'&&x.id;
 const clean=list=>(Array.isArray(list)?list:[]).filter(isItem).map(x=>({...x,updatedAt:Number(x.updatedAt)||0}));

 // Older/foreign shapes → the current shape. Plain id strings in favorites become items.
 function normalize(doc){
  const out=emptyDoc();
  if(!doc||typeof doc!=='object')return out;
  const fav=doc.favorites||{};
  for(const k of FAV_KINDS)out.favorites[k]=clean((Array.isArray(fav[k])?fav[k]:[]).map(x=>typeof x==='string'?{id:x,updatedAt:1}:x));
  for(const c of COLLECTIONS)out[c]=clean(doc[c]);
  out.updatedAt=Number(doc.updatedAt)||0;
  return out;
 }

 // Same id on both sides: the newer updatedAt wins. On a tie a tombstone wins, then the longer JSON
 // (any fixed rule works as long as merge(a,b) and merge(b,a) agree).
 function pick(a,b){
  if(!a)return b;if(!b)return a;
  if(a.updatedAt!==b.updatedAt)return a.updatedAt>b.updatedAt?a:b;
  if(!!a.deleted!==!!b.deleted)return a.deleted?a:b;
  return JSON.stringify(a)>=JSON.stringify(b)?a:b;
 }
 function mergeItems(a,b){
  const map=new Map();
  for(const item of clean(a))map.set(item.id,item);
  for(const item of clean(b))map.set(item.id,pick(map.get(item.id),item));
  return [...map.values()].sort((x,y)=>x.updatedAt-y.updatedAt||(x.id<y.id?-1:1));
 }
 function mergeDocs(a,b){
  a=normalize(a);b=normalize(b);
  const out=emptyDoc();
  for(const k of FAV_KINDS)out.favorites[k]=mergeItems(a.favorites[k],b.favorites[k]);
  for(const c of COLLECTIONS)out[c]=mergeItems(a[c],b[c]);
  out.updatedAt=Math.max(a.updatedAt,b.updatedAt);
  return out;
 }
 function pruneTombstones(doc,now=Date.now()){
  const keep=x=>!(x.deleted&&now-x.updatedAt>TOMBSTONE_TTL);
  const out=normalize(doc);
  for(const k of FAV_KINDS)out.favorites[k]=out.favorites[k].filter(keep);
  for(const c of COLLECTIONS)out[c]=out[c].filter(keep);
  return out;
 }
 const alive=list=>list.filter(x=>!x.deleted);
 const sameDoc=(a,b)=>JSON.stringify(normalize(a))===JSON.stringify(normalize(b));

 function createStore(storage,{now=()=>Date.now(),listenStorage=true}={}){
  let doc=load();
  const listeners=new Set();
  let lastTs=0;
  // Strictly increasing timestamps, so two quick edits in the same millisecond still order correctly.
  const stamp=()=>{lastTs=Math.max(now(),lastTs+1);return lastTs;};
  function load(){
   try{const raw=storage&&storage.getItem(KEY);if(raw)return pruneTombstones(JSON.parse(raw),now());}catch{}
   return emptyDoc();
  }
  function persist(){
   try{storage&&storage.setItem(KEY,JSON.stringify(doc));return true;}
   catch(err){emit({type:'error',error:err});return false;}
  }
  function emit(evt){listeners.forEach(fn=>{try{fn(evt);}catch(err){console.error(err);}});}
  function on(fn){listeners.add(fn);return()=>listeners.delete(fn);}
  const coll=name=>FAV_KINDS.includes(name.replace(/^favorites\./,''))&&name.startsWith('favorites.')?doc.favorites[name.slice(10)]:doc[name];
  function setColl(name,list){if(name.startsWith('favorites.'))doc.favorites[name.slice(10)]=list;else doc[name]=list;}

  function commit(source,colls,ts){
   doc.updatedAt=ts||stamp();
   persist();
   emit({type:'change',source,collections:colls});
  }
  const newId=prefix=>`${prefix}-${stamp().toString(36)}${Math.random().toString(36).slice(2,6)}`;

  const api={
   KEY,VERSION,
   get:()=>doc,
   on,
   newId,
   items:name=>alive(coll(name)||[]),
   find:(name,id)=>{const x=(coll(name)||[]).find(i=>i.id===id);return x&&!x.deleted?x:null;},
   upsert(name,item,source='local'){
    const list=coll(name);if(!list)throw new Error('Unknown collection '+name);
    const ts=stamp(),next={...item,id:item.id||newId(name.slice(0,2)),updatedAt:ts};delete next.deleted;
    setColl(name,[...list.filter(i=>i.id!==next.id),next]);
    commit(source,[name],ts);
    return next;
   },
   // Change fields of an item without touching updatedAt (used to attach a downloaded photo).
   patchItem(name,id,patch,source='remote'){
    const list=coll(name);const cur=list&&list.find(i=>i.id===id&&!i.deleted);if(!cur)return false;
    setColl(name,list.map(i=>i.id===id?{...i,...patch}:i));
    persist();emit({type:'change',source,collections:[name]});
    return true;
   },
   remove(name,id,source='local'){
    const list=coll(name);if(!list||!list.some(i=>i.id===id))return;
    const ts=stamp();
    setColl(name,list.map(i=>i.id===id?{id,updatedAt:ts,deleted:true}:i));
    commit(source,[name],ts);
   },
   isFav:(kind,id)=>doc.favorites[kind].some(i=>i.id===id&&!i.deleted),
   favorites:kind=>alive(doc.favorites[kind]).map(i=>i.id),
   toggleFav(kind,id){
    const name='favorites.'+kind,on_=api.isFav(kind,id),ts=stamp(),list=doc.favorites[kind].filter(i=>i.id!==id);
    list.push(on_?{id,updatedAt:ts,deleted:true}:{id,updatedAt:ts});
    doc.favorites[kind]=list;commit('local',[name],ts);
    return !on_;
   },
   addHistory(entry){return api.upsert('history',{...entry,id:entry.id||newId('h')});},
   // Hangboard tab: one record per hang ({hold, type:'hang', seconds}) or pull-up set ({hold, type:'pullups', reps}).
   addHang(entry){return api.upsert('hangLog',{...entry,id:entry.id||newId('hb'),at:entry.at||now()});},
   updateHistory(id,patch){const cur=api.find('history',id);return cur?api.upsert('history',{...cur,...patch}):null;},
   // Merge in a document from elsewhere (another device, an import). Never loses newer local edits.
   merge(remote,source='remote'){
    const merged=mergeDocs(doc,remote);
    if(sameDoc(merged,doc))return false;
    doc=merged;persist();
    emit({type:'change',source,collections:['*']});
    return true;
   },
   exportJSON:()=>JSON.stringify({app:'crux',v:VERSION,exportedAt:new Date(now()).toISOString(),data:doc},null,1),
   importJSON(text){
    let parsed;
    try{parsed=JSON.parse(text);}catch{throw new Error('That file is not valid JSON.');}
    const data=parsed&&parsed.app==='crux'&&parsed.data?parsed.data:parsed;
    if(!data||typeof data!=='object'||!('favorites' in data||'customExercises' in data||'history' in data||'customWorkouts' in data||'timerPresets' in data||'hangLog' in data))throw new Error('That file is not a Crux backup.');
    api.merge(data,'import');
    return {exercises:api.items('customExercises').length,workouts:api.items('customWorkouts').length,history:api.items('history').length};
   },
   reset(){doc=emptyDoc();persist();emit({type:'change',source:'local',collections:['*']});},
   reload(){doc=load();emit({type:'change',source:'tab',collections:['*']});},
  };
  if(listenStorage&&typeof window!=='undefined'&&window.addEventListener){
   window.addEventListener('storage',e=>{if(e.key===KEY)api.reload();});
  }
  return api;
 }

 return {VERSION,KEY,COLLECTIONS,FAV_KINDS,emptyDoc,normalize,mergeItems,mergeDocs,pruneTombstones,createStore,pick,sameDoc};
});
