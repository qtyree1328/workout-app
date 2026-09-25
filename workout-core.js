/* Shared with the browser and Node's regression tests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WorkoutCore=api;})(typeof window!=='undefined'?window:globalThis,()=>{
 const number=(v,min,max,fallback)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback;};
 function cleanStep(s,metadata){return {exercise:s.exercise,mode:(metadata[s.exercise]?.hold||metadata[s.exercise]?.trainingType==='locomotion')?'time':s.mode==='reps'?'reps':'time',work:number(s.work,5,600,30),reps:number(s.reps,1,100,8),rest:number(s.rest,0,600,15),variant:number(s.variant,0,10,0),side:['Both','Left','Right'].includes(s.side)?s.side:'Both',phase:['warm-up','main','cool-down'].includes(s.phase)?s.phase:'main',set:number(s.set,1,10,1),cue:String(s.cue||'').slice(0,300),repTarget:s.repTarget?number(s.repTarget,1,100,8):null};}
 function duration(steps,rounds=1){const total=steps.reduce((n,s)=>n+s.work+s.rest,0)*rounds-(steps.at(-1)?.rest||0);return steps.some(s=>s.mode==='reps')?null:Math.max(0,total);}
 function create(steps,rounds=1){return {steps:JSON.parse(JSON.stringify(steps)),rounds:number(rounds,1,20,1),round:0,index:0,phase:'ready',remaining:3000,elapsed:0,completedReps:0,paused:false,complete:false};}
 function enterWork(s){s.phase='work';s.remaining=s.steps[s.index].work*1000;s.elapsed=0;s.completedReps=0;}
 function nextWork(s){s.index++;if(s.index===s.steps.length){s.index=0;s.round++;}enterWork(s);}
 function isLast(s){return s.round===s.rounds-1&&s.index===s.steps.length-1;}
 function advance(s){if(s.complete)return;if(s.phase==='ready'){enterWork(s);return;}if(s.phase==='rest'){nextWork(s);return;}if(isLast(s)){s.complete=true;s.phase='complete';s.remaining=0;return;}if(s.steps[s.index].rest>0){s.phase='rest';s.remaining=s.steps[s.index].rest*1000;}else nextWork(s);}
 function tick(s,delta){if(s.paused||s.complete)return;const d=Math.max(0,delta);if(s.phase==='work'){s.elapsed+=d;if(s.steps[s.index].mode==='reps')return;}s.remaining-=d;if(s.remaining<=0)advance(s);}
 function rep(s,delta=1){if(s.phase!=='work'||s.steps[s.index].mode!=='reps'||s.paused)return;s.completedReps=Math.max(0,Math.min(s.steps[s.index].reps,s.completedReps+delta));if(s.completedReps===s.steps[s.index].reps)advance(s);}
 function previous(s){if(s.phase==='rest'){enterWork(s);return;}if(s.index>0)s.index--;else if(s.round>0){s.round--;s.index=s.steps.length-1;}s.complete=false;enterWork(s);}
 return {number,cleanStep,duration,create,tick,advance,rep,previous};
});
