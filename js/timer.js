/* Timer tab: a configurable interval timer (get ready → work/rest × sets × rounds).
   Start hands a generated session of generic 'timer-interval' steps to Crux.Player, so beeps, voice,
   ring, pause and background-pause all come from the normal player. Presets live in Crux.store.timerPresets. */
(function(){
 const Crux=window.Crux=window.Crux||{};
 const {h,icon,prefs,toast}=Crux;
 const Plan=window.Plan;
 const DEFAULT={work:30,rest:15,sets:8,rounds:1,roundRest:60,getReady:10};
 const QUICK=[
  {name:'Tabata',work:20,rest:10,sets:8,rounds:1,roundRest:60,getReady:10},
  {name:'30 / 30',work:30,rest:30,sets:10,rounds:1,roundRest:60,getReady:10},
  {name:'Hangs 10 / 50',work:10,rest:50,sets:6,rounds:1,roundRest:120,getReady:10},
  {name:'EMOM 10',work:60,rest:0,sets:10,rounds:1,roundRest:60,getReady:5},
  {name:'Boxing 3 min',work:180,rest:60,sets:5,rounds:1,roundRest:60,getReady:10},
 ];
 let cfg={...DEFAULT,...(prefs.get('timerCfg',null)||{})};
 let unsub=null;

 const fmtClock=s=>Plan.clock(s);
 function sessionFor(c,title){
  const item={ex:Crux.TIMER_ID,label:'Work',mode:'time',work:c.work,sets:c.sets,rest:c.rest};
  const block={name:'Main',items:[item]};
  if(c.rounds>1){block.rounds=c.rounds;block.roundRest=c.roundRest;}
  return {id:'timer-'+[c.work,c.rest,c.sets,c.rounds,c.roundRest].join('-'),title:title||'Interval timer',category:'timer',level:'Custom',intensity:2,goals:[],focus:[],
   summary:describe(c),why:'',sources:[],blocks:[block]};
 }
 function describe(c){
  const f=Crux.kit.fmtSec;
  let t=`${c.sets} × ${f(c.work)} work${c.rest?` / ${f(c.rest)} rest`:''}`;
  if(c.rounds>1)t+=` · ${c.rounds} rounds, ${f(c.roundRest)} between`;
  return t;
 }
 const totalOf=c=>Plan.compile(sessionFor(c),Crux.META,{countdown:c.getReady}).duration;
 const sameCfg=(a,b)=>['work','rest','sets','rounds','roundRest','getReady'].every(k=>a[k]===b[k]);
 const persist=()=>prefs.set('timerCfg',cfg);

 function render(view){
  if(unsub){unsub();unsub=null;}
  cfg={...DEFAULT,...(prefs.get('timerCfg',null)||{})};
  view.innerHTML=`<div class="page page-timer">
   <div class="page-header"><span class="eyebrow">Interval</span><h1 class="page-title">Timer</h1></div>
   <div class="timer-layout">
    <section class="timer-config" aria-label="Timer settings">
     <div class="chip-row" id="timer-quick" role="group" aria-label="Quick setups"></div>
     <div class="timer-params" id="timer-params"></div>
    </section>
    <aside class="timer-summary">
     <div class="timer-total-card">
      <span class="timer-total-label">Total time</span>
      <span class="timer-total num" id="timer-total">0:00</span>
      <span class="timer-total-sub" id="timer-sub"></span>
      <button type="button" class="btn timer-start" id="timer-start">${icon('play')} Start</button>
     </div>
     <div class="timer-save" id="timer-save"></div>
    </aside>
   </div>
   <section class="section" id="timer-presets-section" hidden><h2 class="section-title">Saved timers</h2><div class="preset-list" id="timer-presets"></div></section>
  </div>`;
  const q=s=>view.querySelector(s);
  const steppers={};
  const params=q('#timer-params');
  const defs=[
   {k:'work',label:'Work',icon:'flame',min:5,max:600,step:5,fmt:Crux.kit.fmtSec},
   {k:'rest',label:'Rest',icon:'moon',min:0,max:600,step:5,fmt:Crux.kit.fmtSec},
   {k:'sets',label:'Sets',icon:'repeat',min:1,max:50,step:1,fmt:v=>String(v)},
   {k:'rounds',label:'Rounds',icon:'layers',min:1,max:20,step:1,fmt:v=>String(v)},
   {k:'roundRest',label:'Rest between rounds',icon:'clock',min:0,max:600,step:5,fmt:Crux.kit.fmtSec,when:()=>cfg.rounds>1},
   {k:'getReady',label:'Get ready',icon:'timer',min:0,max:30,step:1,fmt:v=>v?`${v} s`:'None'},
  ];
  defs.forEach(d=>{
   const card=document.createElement('div');card.className='timer-param';card.dataset.k=d.k;
   card.innerHTML=`<span class="timer-param-label">${icon(d.icon)}<span>${h(d.label)}</span></span>`;
   const st=Crux.kit.stepper({value:cfg[d.k],min:d.min,max:d.max,step:d.step,fmt:d.fmt,label:d.label,cls:'big',onChange:v=>{cfg[d.k]=v;persist();update();}});
   steppers[d.k]=st;card.appendChild(st.el);params.appendChild(card);
  });
  function syncSteppers(){defs.forEach(d=>steppers[d.k].set(cfg[d.k],true));}
  function update(){
   const total=totalOf(cfg);
   Crux.ui.pulse(q('#timer-total'),fmtClock(total));
   q('#timer-sub').textContent=describe(cfg);
   q('.timer-param[data-k="roundRest"]').hidden=cfg.rounds<=1;
   paintSave();
  }
  // quick setups
  const quick=q('#timer-quick');
  quick.innerHTML=QUICK.map((p,i)=>`<button type="button" class="chip" data-i="${i}">${h(p.name)}</button>`).join('');
  quick.addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;cfg={...cfg,...QUICK[Number(b.dataset.i)]};delete cfg.name;persist();syncSteppers();update();});
  // start
  q('#timer-start').addEventListener('click',()=>{
   const s=sessionFor(cfg);
   Crux.ui.startSession(s,{countdown:cfg.getReady,ownCountdown:true},'Interval timer');
  });
  // presets
  function paintSave(){
   const box=q('#timer-save'),list=Crux.store.items('timerPresets');
   const dupe=list.find(p=>sameCfg(p,cfg));
   if(dupe){box.innerHTML=`<span class="timer-saved-note">${icon('check')} Saved as “${h(dupe.name)}”</span>`;return;}
   if(box.querySelector('input'))return; // keep the name field while typing
   box.innerHTML=`<button type="button" class="btn btn-secondary btn-sm" id="preset-open">${icon('plus')} Save this timer</button>`;
   box.querySelector('#preset-open').addEventListener('click',()=>{
    box.innerHTML=`<form class="preset-form"><input class="field-input" id="preset-name" maxlength="40" placeholder="Name, e.g. Hangboard 7/3" aria-label="Timer name" autocomplete="off"><button type="submit" class="btn btn-sm">Save</button></form>`;
    const input=box.querySelector('input');input.focus();
    box.querySelector('form').addEventListener('submit',e=>{
     e.preventDefault();
     const name=input.value.trim()||`${cfg.work}/${cfg.rest} × ${cfg.sets}`;
     Crux.store.upsert('timerPresets',{name,work:cfg.work,rest:cfg.rest,sets:cfg.sets,rounds:cfg.rounds,roundRest:cfg.roundRest,getReady:cfg.getReady});
     box.innerHTML='';paintSave();toast('Timer saved');
    });
   });
  }
  function paintPresets(){
   const list=Crux.store.items('timerPresets').slice().sort((a,b)=>b.updatedAt-a.updatedAt);
   q('#timer-presets-section').hidden=!list.length;
   const wrap=q('#timer-presets');
   wrap.innerHTML=list.map(p=>`<div class="preset-row" data-id="${h(p.id)}"><button type="button" class="preset-load" data-load="${h(p.id)}"><span class="preset-name">${h(p.name)}</span><span class="preset-desc num">${h(describe(p))} · ${fmtClock(totalOf(p))}</span></button><button type="button" class="icon-btn" data-del="${h(p.id)}" aria-label="Delete ${h(p.name)}">${icon('trash')}</button></div>`).join('');
  }
  q('#timer-presets').addEventListener('click',e=>{
   const load=e.target.closest('[data-load]'),del=e.target.closest('[data-del]');
   if(load){const p=Crux.store.find('timerPresets',load.dataset.load);if(p){cfg={work:p.work,rest:p.rest,sets:p.sets,rounds:p.rounds,roundRest:p.roundRest,getReady:p.getReady};persist();syncSteppers();update();window.scrollTo({top:0,behavior:'smooth'});}}
   if(del){
    if(del.dataset.armed){Crux.store.remove('timerPresets',del.dataset.del);}
    else{del.dataset.armed='1';del.classList.add('is-armed');del.setAttribute('aria-label','Tap again to delete');setTimeout(()=>{delete del.dataset.armed;del.classList.remove('is-armed');},2800);}
   }
  });
  unsub=Crux.store.on(e=>{
   if(!view.contains(q('.page-timer'))||!document.body.contains(view)){return;}
   if(e.type==='change'&&(e.collections.includes('timerPresets')||e.collections.includes('*'))){paintPresets();paintSave();}
  });
  update();paintPresets();
 }

 Crux.pages=Crux.pages||{};
 Crux.pages.timer={render};
 Crux.timer={sessionFor,describe};
})();
