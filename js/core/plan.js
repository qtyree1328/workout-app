/* Compiles a session (blocks → items) into the flat list of timed steps the player runs.
   Pure functions, shared with the Node tests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Plan=api;})(typeof window!=='undefined'?window:globalThis,()=>{
 const DEFAULTS={warmup:true,cooldown:true,setsDelta:0,restScale:1,repeat:1,countdown:5};
 const kindOf=name=>/warm-?up/i.test(name)?'warm-up':/cool-?down/i.test(name)?'cool-down':'main';
 const estimate=item=>item.estimate??Math.max(20,Math.round((item.reps||8)*4));
 const sidesOf=(item,m)=>(item.sides||(m&&m.unilateral?'each':'both'))==='each'?['Left','Right']:['Both'];

 function compile(session,meta={},options={}){
  const o={...DEFAULTS,...options};
  const scale=v=>v>=30&&o.restScale!==1?Math.max(15,Math.round(v*o.restScale/5)*5):v;
  const steps=[],blocks=[];
  (session.blocks||[]).forEach((b,bi)=>{
   const kind=kindOf(b.name);
   if(kind==='warm-up'&&!o.warmup||kind==='cool-down'&&!o.cooldown||!b.items||!b.items.length)return;
   const baseRounds=b.rounds||1;
   let rounds=kind==='main'&&baseRounds>1?Math.max(1,baseRounds+o.setsDelta):baseRounds;
   if(kind==='main'&&b.repeat&&o.repeat>1)rounds*=o.repeat;
   const start=steps.length;
   for(let round=1;round<=rounds;round++){
    b.items.forEach((item,ii)=>{
     const m=meta[item.ex]||{};
     const baseSets=item.sets||1;
     const sets=kind==='main'&&baseRounds===1&&baseSets>1?Math.max(1,baseSets+o.setsDelta):baseSets;
     const sides=sidesOf(item,m);
     const hangs=item.mode==='interval'?item.count:1;
     for(let set=1;set<=sets;set++)sides.forEach((side,si)=>{for(let h=1;h<=hangs;h++){
      const lastHang=h===hangs,lastSide=si===sides.length-1,lastSet=set===sets,lastItem=ii===b.items.length-1;
      let rest;
      if(!lastHang)rest=item.off;
      else if(!lastSide)rest=item.switch??5;
      else if(!lastSet)rest=scale(item.rest??10);
      else if(lastItem&&round<rounds&&b.roundRest!=null)rest=scale(b.roundRest);
      else rest=scale(item.restAfter??item.rest??10);
      steps.push({ex:item.ex,label:item.label||null,block:b.name,kind,blockIndex:bi,item:ii,key:`${bi}.${ii}`,
       round,rounds,set,sets,side,hang:item.mode==='interval'?h:null,hangs:item.mode==='interval'?hangs:null,
       mode:item.mode==='reps'?'reps':'time',work:item.mode==='interval'?item.on:item.mode==='reps'?estimate(item):item.work,
       reps:item.mode==='reps'?item.reps:null,target:item.target||null,rest,
       cue:(item.cues&&item.cues[set-1])||item.cue||'',log:item.log||null});
     }});
    });
   }
   if(steps.length>start)blocks.push({name:b.name,kind,start,end:steps.length-1});
  });
  if(steps.length)steps[steps.length-1].rest=0;
  const work=steps.reduce((n,s)=>n+s.work,0),rest=steps.reduce((n,s)=>n+s.rest,0);
  return {steps,blocks,duration:steps.length?o.countdown+work+rest:0,work,estimated:steps.some(s=>s.mode==='reps'),countdown:o.countdown};
 }

 // Pick the variant that best fills `minutes` without going over (5% grace): more or fewer sets,
 // a repeated flow, or dropping the cool-down/warm-up. Published protocols (`fixed`) only lose the cool-down.
 function fit(session,minutes,meta={},base={}){
  const target=minutes*60*1.05,fixed=!!session.fixed,flows=(session.blocks||[]).some(b=>b.repeat);
  let best=null;
  for(const setsDelta of fixed?[0]:[-2,-1,0,1,2])for(const repeat of flows&&!fixed?[1,2]:[1])for(const warmup of fixed?[true]:[true,false])for(const cooldown of [true,false]){
   const options={...base,setsDelta,repeat,warmup,cooldown},plan=compile(session,meta,options);
   if(!plan.steps.length||plan.duration>target)continue;
   const score=plan.duration-Math.abs(setsDelta)*45-(repeat>1?30:0)-(warmup?0:Math.max(120,plan.duration*.25))-(cooldown?0:45);
   if(!best||score>best.score)best={score,options,plan};
  }
  if(best)return {fits:true,score:best.score,options:best.options,plan:best.plan,changed:describeOptions(best.options)};
  const plan=compile(session,meta,base);return {fits:false,score:-Infinity,options:{...base},plan,changed:[]};
 }
 function describeOptions(o){const out=[];if(o.setsDelta)out.push(`${o.setsDelta>0?'+':''}${o.setsDelta} set${Math.abs(o.setsDelta)>1?'s':''}`);if(o.repeat>1)out.push('flow twice');if(!o.warmup)out.push('no warm-up');if(!o.cooldown)out.push('no cool-down');return out;}

 const fmt=s=>{s=Math.round(s);if(s<60)return `${s} s`;const m=Math.floor(s/60),r=s%60;return r?`${m}:${String(r).padStart(2,'0')} min`:`${m} min`;};
 const clock=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),r=s%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`:`${m}:${String(r).padStart(2,'0')}`;};
 const minutes=s=>{const m=Math.round(s/60);return m<1?'<1 min':`${m} min`;};

 // “5 × 10 s · 3 min rest”, “4 × 5 reps”, “3 × 6 hangs · 7 s on / 3 s off”
 function describe(item,m={}){
  const sets=item.sets||1,each=sidesOf(item,m).length>1?' each side':'';
  let text=item.mode==='interval'?`${sets>1?sets+' × ':''}${item.count} hangs · ${item.on} s on / ${item.off} s off`
   :item.mode==='reps'?`${sets>1?sets+' × ':''}${item.reps} reps`
   :`${sets>1?sets+' × ':''}${fmt(item.work)}`;
  text+=each;
  if(item.target)text+=` · ~${item.target} reps`;
  if(sets>1&&(item.rest||0)>=30)text+=` · ${fmt(item.rest)} rest`;
  return text;
 }

 function exercisesOf(session){const seen=new Set();for(const b of session.blocks||[])for(const i of b.items)seen.add(i.ex);return [...seen];}
 function mainExercises(session){const seen=new Set();for(const b of session.blocks||[])if(kindOf(b.name)==='main')for(const i of b.items)seen.add(i.ex);return seen.size?[...seen]:exercisesOf(session);}
 function equipmentOf(session,meta){const set=new Set();for(const id of exercisesOf(session))for(const e of meta[id]?.equipment||[])set.add(e);return [...set];}

 // Builder rows (flat items with a block label) ⇄ session blocks.
 function toBlocks(rows){const blocks=[];for(const row of rows){const {block='Main',...item}=row;const last=blocks[blocks.length-1];if(last&&last.name===block&&!last.rounds)last.items.push(item);else blocks.push({name:block,items:[item]});}return blocks;}
 function toRows(session){const rows=[];for(const b of session.blocks||[]){const rounds=b.rounds||1;for(let r=0;r<rounds;r++)b.items.forEach((item,i)=>{const copy={...item,block:b.name};if(rounds>1&&i===b.items.length-1&&b.roundRest!=null&&r<rounds-1)copy.restAfter=b.roundRest;rows.push(copy);});}return rows;}

 return {compile,fit,describeOptions,describe,fmt,clock,minutes,kindOf,estimate,exercisesOf,mainExercises,equipmentOf,toBlocks,toRows,DEFAULTS};
});
