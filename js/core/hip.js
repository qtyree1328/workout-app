/* Hip Opener: random poses from the chart, ordered standing → lying.
   Each pose is held 6 minutes (one-sided poses: 3 minutes per side with a short switch),
   with 1 minute of rest between poses. The time you have decides how many poses fit. */
(function(root,factory){const api=factory(root.Plan||(typeof require==='function'?require('./plan.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.HipOpener=api;})(typeof window!=='undefined'?window:globalThis,Plan=>{
 const COUNTS=[1,2,3,4,5,6,7,8],HOLD=360,REST=60,SWITCH=10,GRACE=1.05;
 function rng(seed){let a=seed>>>0||1;return ()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
 const warmBlock=()=>({name:'Warm-up',items:[
  {ex:'easy-walking',mode:'time',work:60,rest:10,label:'Easy movement',cue:'Walk, march or jog on the spot.'},
  {ex:'90-90-hip-switches',mode:'time',work:40,rest:10},
  {ex:'prone-bent-knee-hip-rotations',mode:'time',work:40,rest:15}]});
 // Warm-up length plus the 15 s hand-over rest to the first pose.
 function warmSeconds(meta){return Plan.compile({blocks:[warmBlock()]},meta,{countdown:0}).duration+15;}
 // Worst case (every pose one-sided, so each adds a side switch).
 function seconds(count,warmup,meta,countdown=5){return countdown+(warmup?warmSeconds(meta):0)+count*(HOLD+SWITCH)+(count-1)*REST;}
 function maxCount(minutes,warmup,meta,countdown=5){return COUNTS.filter(n=>seconds(n,warmup,meta,countdown)<=minutes*60*GRACE).pop()||0;}
 function generate({minutes=30,count=3,warmup=false,seed=Date.now(),countdown=5,keep=[]}={},pool,positions,meta){
  const random=rng(seed),order=pool.map(p=>p.id).filter(id=>!keep.includes(id));
  for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  const chosen=[...keep,...order].slice(0,count);
  const rank=Object.fromEntries(pool.map(p=>[p.id,positions.indexOf(p.position)]));
  chosen.sort((a,b)=>rank[a]-rank[b]);
  const oneSided=id=>!!(meta[id]&&meta[id].unilateral);
  const session={id:'hip-opener',title:'Hip Opener',category:'hip',generated:true,seed,minutes,count,level:'Beginner',
   blocks:[...(warmup?[warmBlock()]:[]),{name:'Poses',items:chosen.map(id=>oneSided(id)
    ?{ex:id,mode:'time',work:HOLD/2,sides:'each',switch:SWITCH,rest:REST,cue:'3 minutes each side. Breathe slowly and let gravity do the work.'}
    :{ex:id,mode:'time',work:HOLD,sides:'both',rest:REST,cue:'Settle in for 6 minutes. Breathe slowly and ease deeper as you relax.'})}]};
  return {session,hold:HOLD,perSide:HOLD/2,rest:REST,poses:chosen,feasible:count<=maxCount(minutes,warmup,meta,countdown)};
 }
 return {generate,maxCount,seconds,COUNTS,HOLD,REST,SWITCH};
});
