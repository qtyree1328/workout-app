/* Workout timer state machine: ready → work → rest → work … → done.
   Time only moves through tick(); the interface decides what a frame is. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Engine=api;})(typeof window!=='undefined'?window:globalThis,()=>{
 function create(steps,{countdown=5}={}){
  const s={steps,index:0,phase:steps.length?'ready':'done',phaseTotal:countdown*1000,remaining:countdown*1000,phaseElapsed:0,
   elapsed:0,workTime:0,paused:false,done:!steps.length,repsDone:0,completed:[]};
  return s;
 }
 const current=s=>s.steps[s.index];
 function enterWork(s,i){s.index=i;s.phase='work';const st=current(s);s.phaseTotal=st.mode==='reps'?0:st.work*1000;s.remaining=s.phaseTotal;s.phaseElapsed=0;s.repsDone=0;}
 function enterRest(s){s.phase='rest';s.phaseTotal=current(s).rest*1000;s.remaining=s.phaseTotal;s.phaseElapsed=0;}
 function finish(s){s.phase='done';s.done=true;s.remaining=0;s.phaseTotal=0;}
 function markDone(s){if(!s.completed.includes(s.index))s.completed.push(s.index);}
 // Natural progression, also used by Next and Done.
 function advance(s){
  if(s.done)return;
  if(s.phase==='ready'){enterWork(s,s.index);return;}
  if(s.phase==='work'){markDone(s);if(s.index>=s.steps.length-1){finish(s);return;}if(current(s).rest>0)enterRest(s);else enterWork(s,s.index+1);return;}
  if(s.phase==='rest')enterWork(s,s.index+1);
 }
 function tick(s,dt){
  if(s.paused||s.done)return;
  dt=Math.max(0,dt);
  s.elapsed+=dt;s.phaseElapsed+=dt;
  if(s.phase==='work')s.workTime+=dt;
  if(s.phase==='work'&&current(s).mode==='reps')return;
  s.remaining-=dt;
  if(s.remaining<=0){
   const over=-s.remaining;advance(s);
   if(!s.done&&over>0&&!(s.phase==='work'&&current(s).mode==='reps')){s.remaining=Math.max(1,s.remaining-over);s.phaseElapsed=over;}
  }
 }
 function previous(s){
  if(s.phase==='ready')return;
  if(s.phase==='done'){s.done=false;enterWork(s,s.steps.length-1);return;}
  if(s.phase==='rest'){enterWork(s,s.index);return;}
  if(s.phaseElapsed>3000||s.index===0){enterWork(s,s.index);return;}
  enterWork(s,s.index-1);
 }
 function jump(s,i){if(i<0||i>=s.steps.length)return;s.done=false;enterWork(s,i);}
 function addTime(s,ms){if(s.phase!=='rest'&&s.phase!=='ready'&&!(s.phase==='work'&&current(s).mode!=='reps'))return;s.remaining=Math.max(1000,s.remaining+ms);s.phaseTotal=Math.max(s.phaseTotal+ms,s.remaining);}
 function rep(s,d=1){if(s.phase!=='work'||current(s).mode!=='reps'||s.paused)return;s.repsDone=Math.max(0,Math.min(99,s.repsDone+d));}
 // Planned seconds left, from the current position.
 function remainingPlanned(s){
  if(s.done)return 0;
  let total=Math.max(0,s.remaining)/1000;const st=current(s);
  if(s.phase==='ready')total+=st.work+st.rest;
  else if(s.phase==='work'){if(st.mode==='reps')total+=Math.max(0,st.work-s.phaseElapsed/1000);total+=st.rest;}
  for(let i=s.index+1;i<s.steps.length;i++)total+=s.steps[i].work+s.steps[i].rest;
  return total;
 }
 function progress(s,planned){if(s.done)return 1;const left=remainingPlanned(s);return planned>0?Math.max(0,Math.min(1,1-left/planned)):0;}
 function snapshot(s){return {index:s.index,phase:s.phase,remaining:s.remaining,phaseTotal:s.phaseTotal,elapsed:s.elapsed,workTime:s.workTime,completed:s.completed.slice(),repsDone:s.repsDone};}
 function restore(steps,snap,opts){const s=create(steps,opts);if(!snap||snap.index>=steps.length)return s;Object.assign(s,{index:snap.index,elapsed:snap.elapsed||0,workTime:snap.workTime||0,completed:snap.completed||[]});
  if(snap.phase==='rest'){s.phase='rest';s.phaseTotal=snap.phaseTotal;s.remaining=snap.remaining;}else{enterWork(s,snap.index);}s.paused=true;return s;}
 return {create,tick,advance,previous,jump,addTime,rep,remainingPlanned,progress,snapshot,restore,current};
});
