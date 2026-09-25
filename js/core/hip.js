/* Hip Opener: a random session from the pose chart, ordered standing → lying and timed to fit. */
(function(root,factory){const api=factory(root.Plan||(typeof require==='function'?require('./plan.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.HipOpener=api;})(typeof window!=='undefined'?window:globalThis,Plan=>{
 const COUNTS=[3,4,5,6,8,10,12],MIN_HOLD=20,MAX_HOLD=120,SWITCH=5,CHANGE=10;
 function rng(seed){let a=seed>>>0||1;return ()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
 const warmBlock=()=>({name:'Warm-up',items:[
  {ex:'easy-walking',mode:'time',work:60,rest:10,label:'Easy movement',cue:'Walk, march or jog on the spot.'},
  {ex:'90-90-hip-switches',mode:'time',work:40,rest:10},
  {ex:'prone-bent-knee-hip-rotations',mode:'time',work:40,rest:15}]});
 // Warm-up length plus the 15 s hand-over rest to the first pose.
 function warmSeconds(meta){return Plan.compile({blocks:[warmBlock()]},meta,{countdown:0}).duration+15;}
 // Seconds the poses may use: total minus countdown and warm-up (including its hand-over rest).
 function budget(minutes,warmup,meta,countdown=5){return minutes*60-countdown-(warmup?warmSeconds(meta):0);}
 // Worst case: every pose one-sided, so the count is always playable at ≥ MIN_HOLD.
 function maxCount(minutes,warmup,meta,countdown=5){const b=budget(minutes,warmup,meta,countdown);return COUNTS.filter(n=>2*n*MIN_HOLD+n*(SWITCH+CHANGE)-CHANGE<=b).pop()||0;}
 function generate({minutes=15,count=6,warmup=minutes>=10,seed=Date.now(),countdown=5,keep=[]}={},pool,positions,meta){
  const random=rng(seed),order=pool.map(p=>p.id).filter(id=>!keep.includes(id));
  for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  const chosen=[...keep,...order].slice(0,count);
  const rank=Object.fromEntries(pool.map(p=>[p.id,positions.indexOf(p.position)]));
  chosen.sort((a,b)=>rank[a]-rank[b]);
  const sides=id=>meta[id]&&meta[id].unilateral?2:1;
  const units=chosen.reduce((n,id)=>n+sides(id),0);
  const changes=chosen.reduce((n,id)=>n+(sides(id)-1)*SWITCH,0)+(chosen.length-1)*CHANGE;
  const room=budget(minutes,warmup,meta,countdown);
  let sets=1,hold=Math.floor((room-changes)/units/5)*5;
  if(hold>75){const twice=Math.floor((room-2*changes-chosen.length*CHANGE)/(2*units)/5)*5;if(twice>=30){sets=2;hold=twice;}}
  hold=Math.max(15,Math.min(MAX_HOLD,hold));
  const session={id:'hip-opener',title:'Hip Opener',category:'hip',generated:true,seed,minutes,count,level:'Beginner',
   blocks:[...(warmup?[warmBlock()]:[]),{name:'Poses',items:chosen.map(id=>({ex:id,mode:'time',work:hold,sets,rest:CHANGE,switch:SWITCH}))}]};
  return {session,hold,sets,poses:chosen,feasible:hold>=MIN_HOLD};
 }
 return {generate,maxCount,budget,COUNTS,MIN_HOLD};
});
