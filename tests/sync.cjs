// Cloud-sync core with an in-memory backend: two devices converge, photos travel, tombstones win.
const assert=require('node:assert/strict');
const core=require('../js/store.js');
const Sync=require('../js/sync.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function server(){
 const s={state:null,photos:{},listeners:new Set(),writes:0};
 s.backend=()=>({
  state:{listen(cb){s.listeners.add(cb);if(s.state)setTimeout(()=>cb(s.state),0);else setTimeout(()=>cb(null),0);return()=>s.listeners.delete(cb);},
   async set(p){s.writes++;s.state=p;await sleep(1);s.listeners.forEach(cb=>setTimeout(()=>cb(p),0));}},
  photo:{async get(id){return s.photos[id]||null;},async set(id,rev,data){s.photos[id]={rev,data};}},
 });
 return s;
}
function device(srv,name){
 let t=Date.now();
 const store=core.createStore({getItem:()=>null,setItem(){},removeItem(){}},{now:()=>Date.now(),listenStorage:false});
 const syncer=Sync.createSyncer({store,core,backend:srv.backend(),debounceMs:5});
 return {store,syncer,name};
}

(async()=>{
 // pure helpers
 assert.equal(Sync.strip({customExercises:[{id:'a',photo:'data:x'}]}).customExercises[0].photo,'');
 assert.equal(Sync.strip({customExercises:[{id:'a',photo:'data:x'}]}).customExercises[0].hasPhoto,true);
 const kept=Sync.injectPhotos({customExercises:[{id:'a',photo:'',hasPhoto:true,photoRev:5}]},{customExercises:[{id:'a',photo:'PIC',photoRev:5}]});
 assert.equal(kept.customExercises[0].photo,'PIC');
 const other=Sync.injectPhotos({customExercises:[{id:'a',photo:'',hasPhoto:true,photoRev:6}]},{customExercises:[{id:'a',photo:'PIC',photoRev:5}]});
 assert.equal(other.customExercises[0].photo,'');
 // big documents are trimmed under the Firestore limit
 const big={v:1,history:Array.from({length:400},(_,i)=>({id:'h'+i,updatedAt:i,startedAt:i,session:{blocks:'x'.repeat(4000)}})),customExercises:[],customWorkouts:[],timerPresets:[],favorites:{exercises:[],sessions:[]},updatedAt:1};
 assert(Sync.payloadOf(big,1).json.length<=Sync.MAX_STATE);

 const srv=server(),A=device(srv,'A'),B=device(srv,'B');
 A.syncer.start();B.syncer.start();
 await sleep(30);
 // A creates data (with a photo), B should get all of it
 A.store.toggleFav('exercises','pull-up');
 A.store.upsert('customExercises',{id:'my-1',name:'Ring rows',photo:'data:image/jpeg;base64,AAAA',photoRev:42});
 A.store.upsert('customWorkouts',{id:'cw-1',title:'Pull day',items:[]});
 await sleep(120);
 assert.equal(B.store.isFav('exercises','pull-up'),true);
 assert.equal(B.store.find('customExercises','my-1').name,'Ring rows');
 assert.equal(B.store.find('customExercises','my-1').photo,'data:image/jpeg;base64,AAAA','photo downloaded');
 assert(!srv.state.json.includes('base64,AAAA'),'photo is not inside the state document');
 assert.equal(srv.photos['my-1'].rev,42);
 // B edits, A deletes a different item; both converge
 B.store.upsert('customWorkouts',{...B.store.find('customWorkouts','cw-1'),title:'Pull day v2'});
 A.store.upsert('timerPresets',{id:'tp-1',name:'Tabata',work:20});
 await sleep(150);
 A.store.remove('customExercises','my-1');
 await sleep(150);
 assert.equal(A.store.find('customWorkouts','cw-1').title,'Pull day v2');
 assert.equal(B.store.find('timerPresets','tp-1').name,'Tabata');
 assert.equal(B.store.find('customExercises','my-1'),null,'tombstone propagated');
 assert.deepEqual(core.normalize(A.store.get()).customWorkouts,core.normalize(B.store.get()).customWorkouts);
 // an offline device that reconnects later merges instead of overwriting
 const C=device(srv,'C');
 C.store.upsert('customWorkouts',{id:'cw-2',title:'Offline made'});
 C.syncer.start();
 await sleep(800);
 assert.equal(A.store.find('customWorkouts','cw-2').title,'Offline made');
 assert.equal(C.store.find('customWorkouts','cw-1').title,'Pull day v2');
 [A,B,C].forEach(d=>d.syncer.stop());
 console.log('PASS sync: photo split, two/three-device convergence, tombstones, offline reconnect merge, payload cap.');
 process.exit(0);
})().catch(e=>{console.error('FAIL sync',e);process.exit(1);});
