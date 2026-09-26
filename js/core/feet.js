/* Foot Training: random foot & ankle exercises from the pool below.
   Each exercise keeps its own dosing from data/classification.js (timed holds or rep sets,
   read from meta[id].dose/hold/unilateral), ordered mobility -> intrinsic -> strength ->
   balance -> stretch so a session flows warm-up-first, work-first, wind-down-last.
   The time you have decides how many exercises fit; a short optional warm-up can be added. */
(function(root,factory){const api=factory(root.Plan||(typeof require==='function'?require('./plan.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.FootTraining=api;})(typeof window!=='undefined'?window:globalThis,Plan=>{
 const COUNTS=[3,4,5,6,8,10],REST=15,SWITCH=5,GRACE=1.05;
 const GROUP_ORDER=['mobility','intrinsic','strength','balance','stretch'];
 // The optional warm-up always uses these two mobility exercises; when it is on, generate()
 // leaves them out of the random draw so they never appear twice in the same session.
 const WARM_IDS=['foot-ankle-circles','foot-knee-to-wall-mobilization'];
 function rng(seed){let a=seed>>>0||1;return ()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
 const warmBlock=meta=>({name:'Warm-up',items:WARM_IDS.map((id,i)=>({...itemFor(id,meta),rest:i===WARM_IDS.length-1?10:REST}))});
 // Warm-up length plus the 10 s hand-over rest to the first exercise.
 function warmSeconds(meta){return Plan.compile({blocks:[warmBlock(meta)]},meta,{countdown:0}).duration+10;}
 // One session item for an exercise, built from its own dose in classification.js.
 function itemFor(id,meta){
  const m=meta[id]||{},dose=m.dose||{},uni=!!m.unilateral;
  const work=dose.workSeconds||30,target=dose.reps>1?dose.reps:undefined;
  return uni
   ?{ex:id,mode:'time',work,sides:'each',switch:SWITCH,target,rest:REST,cue:dose.cue}
   :{ex:id,mode:'time',work,sides:'both',target,rest:REST,cue:dose.cue};
 }
 // How long one item's work (both sides, for unilateral exercises) takes, before its rest.
 function workSeconds(id,meta){const m=meta[id]||{},dose=m.dose||{},work=dose.workSeconds||30;return m.unilateral?work*2+SWITCH:work;}
 // Worst case (every exercise costs as much as the most time-consuming one in the pool).
 function worstItem(pool,meta){return Math.max(...pool.map(p=>workSeconds(p.id,meta)));}
 function seconds(count,warmup,meta,countdown=5,pool){
  if(!pool||!pool.length||!count)return countdown+(warmup?warmSeconds(meta):0);
  return countdown+(warmup?warmSeconds(meta):0)+count*worstItem(pool,meta)+(count-1)*REST;
 }
 function maxCount(minutes,warmup,meta,countdown=5,pool){
  if(!pool||!pool.length)return 0;
  return COUNTS.filter(n=>seconds(n,warmup,meta,countdown,pool)<=minutes*60*GRACE).pop()||0;
 }
 function generate({minutes=20,count=5,warmup=false,seed=Date.now(),countdown=5,keep=[]}={},pool,groups,meta){
  const random=rng(seed),order=pool.map(p=>p.id).filter(id=>!keep.includes(id)&&!(warmup&&WARM_IDS.includes(id)));
  for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  const chosen=[...keep,...order].slice(0,count);
  const groupOf=Object.fromEntries(pool.map(p=>[p.id,p.group]));
  const rank=Object.fromEntries((groups||GROUP_ORDER).map((g,i)=>[g,i]));
  chosen.sort((a,b)=>(rank[groupOf[a]]??99)-(rank[groupOf[b]]??99));
  const items=chosen.map(id=>itemFor(id,meta));
  const session={id:'foot-training',title:'Foot Training',category:'feet',generated:true,seed,minutes,count,level:'Beginner',
   blocks:[...(warmup?[warmBlock(meta)]:[]),{name:'Exercises',items}]};
  return {session,exercises:chosen,feasible:count<=maxCount(minutes,warmup,meta,countdown,pool)};
 }
 return {generate,maxCount,seconds,COUNTS,REST,SWITCH,GROUP_ORDER};
});
