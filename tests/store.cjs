// Store merge logic: per-item updatedAt wins, tombstones, favorites, import/export, migration.
const assert=require('node:assert/strict');
const S=require('../js/store.js');

function memory(){const m={};return {getItem:k=>k in m?m[k]:null,setItem:(k,v)=>{m[k]=String(v);},removeItem:k=>{delete m[k];},_m:m};}

// mergeItems: newest wins, union otherwise, commutative
{
 const a=[{id:'x',updatedAt:5,name:'old'},{id:'y',updatedAt:1}];
 const b=[{id:'x',updatedAt:9,name:'new'},{id:'z',updatedAt:2}];
 const m=S.mergeItems(a,b);
 assert.deepEqual(m.map(i=>i.id).sort(),['x','y','z']);
 assert.equal(m.find(i=>i.id==='x').name,'new');
 assert.deepEqual(S.mergeItems(a,b),S.mergeItems(b,a));
 // idempotent
 assert.deepEqual(S.mergeItems(m,b),m);
}
// tombstones win when newer, lose when older; tie -> tombstone
{
 const alive={id:'a',updatedAt:10,name:'n'},dead={id:'a',updatedAt:20,deleted:true};
 assert.equal(S.mergeItems([alive],[dead])[0].deleted,true);
 const revived={id:'a',updatedAt:30,name:'again'};
 assert.equal(S.mergeItems([dead],[revived])[0].deleted,undefined);
 assert.equal(S.mergeItems([{id:'a',updatedAt:5},],[{id:'a',updatedAt:5,deleted:true}])[0].deleted,true);
 assert.deepEqual(S.mergeItems([{id:'a',updatedAt:5}],[{id:'a',updatedAt:5,deleted:true}]),S.mergeItems([{id:'a',updatedAt:5,deleted:true}],[{id:'a',updatedAt:5}]));
}
// mergeDocs across all collections; updatedAt is the max
{
 const a=S.normalize({favorites:{exercises:[{id:'e1',updatedAt:3}],sessions:[]},customWorkouts:[{id:'w1',updatedAt:4,title:'A'}],updatedAt:4});
 const b=S.normalize({favorites:{exercises:[{id:'e1',updatedAt:8,deleted:true},{id:'e2',updatedAt:2}],sessions:[{id:'s1',updatedAt:1}]},customWorkouts:[{id:'w1',updatedAt:2,title:'B'}],history:[{id:'h1',updatedAt:6}],updatedAt:8});
 const m=S.mergeDocs(a,b);
 assert.equal(m.updatedAt,8);
 assert.equal(m.favorites.exercises.find(i=>i.id==='e1').deleted,true);
 assert.equal(m.favorites.exercises.length,2);
 assert.equal(m.customWorkouts[0].title,'A');
 assert.equal(m.history.length,1);
 assert.deepEqual(S.mergeDocs(a,b),S.mergeDocs(b,a));
}
// normalize: bad input and legacy favorite strings
{
 assert.deepEqual(S.normalize(null),S.emptyDoc());
 const n=S.normalize({favorites:{exercises:['a','b']},customExercises:[null,{name:'no id'},{id:'ok'}]});
 assert.equal(n.favorites.exercises.length,2);
 assert.equal(n.customExercises.length,1);
}
// old tombstones are pruned, fresh ones kept
{
 const now=1e12,old=now-91*24*3600*1000;
 const p=S.pruneTombstones({customWorkouts:[{id:'o',updatedAt:old,deleted:true},{id:'n',updatedAt:now-1000,deleted:true},{id:'k',updatedAt:old}]},now);
 assert.deepEqual(p.customWorkouts.map(i=>i.id).sort(),['k','n']);
}
// store: favorites, upsert/remove, persistence, events, strictly increasing stamps
{
 const mem=memory();let t=1000;
 const st=S.createStore(mem,{now:()=>t,listenStorage:false});
 const events=[];st.on(e=>events.push(e));
 assert.equal(st.toggleFav('exercises','pull-up'),true);
 assert.equal(st.isFav('exercises','pull-up'),true);
 assert.equal(st.toggleFav('exercises','pull-up'),false);
 assert.equal(st.isFav('exercises','pull-up'),false);
 assert.deepEqual(st.favorites('exercises'),[]);
 st.toggleFav('sessions','max-hangs');
 const w=st.upsert('customWorkouts',{title:'Mine',items:[]});
 assert(w.id&&w.updatedAt>1000);
 st.upsert('customWorkouts',{...w,title:'Renamed'});
 assert.equal(st.find('customWorkouts',w.id).title,'Renamed');
 st.remove('customWorkouts',w.id);
 assert.equal(st.find('customWorkouts',w.id),null);
 assert.equal(st.items('customWorkouts').length,0);
 assert.equal(st.get().customWorkouts[0].deleted,true);
 assert(events.filter(e=>e.type==='change').length>=6);
 // reload from storage
 const st2=S.createStore(mem,{now:()=>t,listenStorage:false});
 assert.equal(st2.isFav('sessions','max-hangs'),true);
 // history
 const h=st.addHistory({title:'T',category:'strength',sessionId:'x',startedAt:1,duration:60,completedSteps:3,totalSteps:3});
 st.updateHistory(h.id,{note:'felt good',effort:4});
 assert.equal(st.find('history',h.id).effort,4);
}
// remote merge keeps newer local edits and reports change only when something changed
{
 const st=S.createStore(memory(),{now:()=>50,listenStorage:false});
 const w=st.upsert('customWorkouts',{title:'Local'});
 const remote=S.normalize({customWorkouts:[{id:w.id,updatedAt:1,title:'Stale'},{id:'r',updatedAt:60,title:'Remote'}]});
 assert.equal(st.merge(remote),true);
 assert.equal(st.find('customWorkouts',w.id).title,'Local');
 assert.equal(st.find('customWorkouts','r').title,'Remote');
 assert.equal(st.merge(remote),false);
}
// export / import round-trip and validation
{
 const a=S.createStore(memory(),{listenStorage:false});
 a.upsert('customExercises',{id:'my-1',name:'Ring row'});
 a.toggleFav('exercises','my-1');
 const json=a.exportJSON();
 const b=S.createStore(memory(),{listenStorage:false});
 const r=b.importJSON(json);
 assert.equal(r.exercises,1);
 assert.equal(b.isFav('exercises','my-1'),true);
 assert.throws(()=>b.importJSON('nope'),/valid JSON/);
 assert.throws(()=>b.importJSON('{"hello":1}'),/not a Crux backup/);
}
console.log('PASS store: merge (newest wins, tombstones, commutative/idempotent), normalize, pruning, favorites, CRUD, history, remote merge, export/import.');
