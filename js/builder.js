/* Build tab: create and edit your own workouts from every exercise (built-in + custom).
   Saved to Crux.store.customWorkouts; they show on the Workouts page under "My workouts".
   Also lists recent completed workouts (Crux.store.history) with a Repeat button. */
(function(){
 const Crux=window.Crux=window.Crux||{};
 const {h,icon,prefs,toast,exercise,thumb,displayName,CATEGORIES,META}=Crux;
 const Plan=window.Plan;
 const DRAFT_KEY='builderDraft';
 const INTENSITY=[[1,'Relaxed'],[2,'Elevated'],[3,'Strenuous']];
 let draft=prefs.get(DRAFT_KEY,null);
 let mode=draft?'edit':'list';
 let expanded=null,root=null,unsub=null;
 const uid=()=>Math.random().toString(36).slice(2,9);
 const saveDraft=()=>prefs.set(DRAFT_KEY,draft);
 const q=s=>root&&root.querySelector(s);

 /* ── item defaults ───────────────────────────────────────────────── */
 function newItem(id){
  const m=META[id]||{},d=m.dose||{};
  return {uid:uid(),ex:id,mode:Crux.modeOf(m),work:d.workSeconds||m.work||30,reps:d.reps>1?d.reps:(m.reps>1?m.reps:10),sets:d.sets||2,rest:Math.max(0,d.restSeconds??m.rest??30),sides:m.unilateral?'each':'both'};
 }
 function blankDraft(){return {id:null,title:'',category:'strength',intensity:2,items:[]};}
 function itemToPlan(i){const o={ex:i.ex,mode:i.mode,sets:i.sets,rest:i.rest,sides:i.sides};if(i.mode==='reps')o.reps=i.reps;else o.work=i.work;return o;}
 const sessionOf=()=>Crux.customSession({...draft,id:draft.id||'draft',items:draft.items});
 const planOf=()=>Plan.compile(sessionOf(),META,{countdown:0});
 const describeItem=i=>Plan.describe({...itemToPlan(i),sides:i.sides},META[i.ex]||{});

 /* ── public API ──────────────────────────────────────────────────── */
 function ensureDraft(){if(!draft){draft=blankDraft();}mode='edit';}
 function addExercise(id){ensureDraft();const it=newItem(id);draft.items.push(it);expanded=it.uid;saveDraft();if(root&&q('.page-build'))paint();}
 function edit(id){
  const w=Crux.store.find('customWorkouts',id);if(!w)return;
  draft={id:w.id,title:w.title,category:w.category||'strength',intensity:w.intensity||2,items:(w.items||[]).map(i=>({...i,uid:uid()}))};
  mode='edit';expanded=null;saveDraft();
 }
 function duplicate(id){
  const w=Crux.store.find('customWorkouts',id);if(!w)return;
  Crux.store.upsert('customWorkouts',{...w,id:Crux.store.newId('cw'),title:(w.title||'Workout')+' (copy)'});
  toast('Duplicated');
 }
 // Built-in session → editable rows (warm-up/cool-down and set changes as currently selected).
 function copyFrom(session,o){
  o={...Plan.DEFAULTS,...(o||{})};
  const items=[];
  (session.blocks||[]).forEach(b=>{
   const kind=Plan.kindOf(b.name);
   if(kind==='warm-up'&&!o.warmup||kind==='cool-down'&&!o.cooldown||!b.items)return;
   const rounds=b.rounds||1;
   for(let r=0;r<rounds;r++)b.items.forEach((it,ii)=>{
    const m=META[it.ex]||{},sets0=it.sets||1;
    let out={uid:uid(),ex:it.ex,sides:it.sides||(m.unilateral?'each':'both'),rest:it.rest??10};
    if(kind==='main'&&rounds===1&&sets0>1)out.sets=Math.max(1,sets0+(o.setsDelta||0));else out.sets=sets0;
    if(it.mode==='interval'){out.mode='time';out.work=it.on;out.sets=out.sets*it.count;out.rest=it.off;}
    else if(it.mode==='reps'){out.mode='reps';out.reps=it.reps;out.work=m.work||30;}
    else{out.mode='time';out.work=it.work;out.reps=m.reps>1?m.reps:10;}
    if(it.restAfter!=null&&ii===b.items.length-1){/* the longer rest after a block is kept as the item's rest */out.rest=Math.max(out.rest,it.restAfter);}
    items.push(out);
   });
  });
  draft={id:null,title:`${session.title} (copy)`,category:session.category==='timer'?'strength':session.category,intensity:session.intensity||2,items};
  mode='edit';expanded=null;saveDraft();
 }

 /* ── page ────────────────────────────────────────────────────────── */
 function render(view){
  root=view;
  if(unsub)unsub();
  unsub=Crux.store.on(e=>{
   if(e.type!=='change'||!root||!root.querySelector('.page-build'))return;
   const c=e.collections||[];
   if(mode==='list'&&(c.includes('*')||c.includes('customWorkouts')||c.includes('history')||c.some(x=>x.startsWith('favorites'))))paintList();
  });
  paint();
 }
 function paint(){if(mode==='edit')paintEditor();else paintList();}

 /* ── list view ───────────────────────────────────────────────────── */
 function fmtWhen(ts){
  const d=new Date(ts),now=new Date(),day=86400000;
  const sameDay=(a,b)=>a.toDateString()===b.toDateString();
  const t=d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
  if(sameDay(d,now))return 'Today, '+t;
  if(sameDay(d,new Date(now-day)))return 'Yesterday, '+t;
  return d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})+', '+t;
 }
 function paintList(){
  const st=Crux.store;
  const works=st.items('customWorkouts').slice().sort((a,b)=>b.updatedAt-a.updatedAt);
  const hist=st.items('history').slice().sort((a,b)=>(b.startedAt||0)-(a.startedAt||0)).slice(0,10);
  root.innerHTML=`<div class="page page-build">
   <div class="page-header page-header-row"><div><span class="eyebrow">Your workouts</span><h1 class="page-title">Build</h1></div>
    <button type="button" class="btn btn-sm" id="b-new">${icon('plus')} New workout</button></div>
   ${draft?`<div class="resume-banner" role="status"><span class="resume-text">Unfinished workout <strong>${h(draft.title||'Untitled')}</strong> · ${draft.items.length} exercise${draft.items.length===1?'':'s'}</span><div class="resume-actions"><button type="button" class="btn btn-sm" id="b-continue">Continue</button><button type="button" class="icon-btn plain" id="b-discard" aria-label="Discard unfinished workout">${icon('close')}</button></div></div>`:''}
   <section class="section"><h2 class="section-title">My workouts</h2>
    <div class="w-list" id="w-list">${works.length?works.map(cardHTML).join(''):`<div class="empty-state slim"><h3>Nothing saved yet</h3><p>Pick exercises, set the time and reps, and save the workout. It will show up on the Workouts page too.</p><button type="button" class="btn btn-sm" id="b-new2">${icon('plus')} Build your first workout</button></div>`}</div>
   </section>
   <section class="section"><h2 class="section-title">Recent</h2>
    <div class="h-list" id="h-list">${hist.length?hist.map(histHTML).join(''):`<p class="no-results">Finished workouts show up here so you can repeat them.</p>`}</div>
   </section></div>`;
  const nw=()=>{draft=blankDraft();mode='edit';expanded=null;saveDraft();paint();window.scrollTo({top:0});};
  q('#b-new').addEventListener('click',nw);
  const n2=q('#b-new2');if(n2)n2.addEventListener('click',nw);
  const cont=q('#b-continue');if(cont)cont.addEventListener('click',()=>{mode='edit';paint();});
  const dis=q('#b-discard');if(dis)dis.addEventListener('click',discard);
  q('#w-list').addEventListener('click',e=>{
   const b=e.target.closest('[data-act]');if(!b)return;
   const id=b.dataset.id,act=b.dataset.act;
   if(act==='start'){const w=st.find('customWorkouts',id);if(w){const s=Crux.customSession(w);Crux.ui.startSession(s,{},s.title);}}
   else if(act==='edit'){edit(id);paint();window.scrollTo({top:0});}
   else if(act==='dup')duplicate(id);
   else if(act==='open')Crux.ui.go('#/session/'+encodeURIComponent(id),false);
   else if(act==='del'){
    if(b.dataset.armed){st.remove('customWorkouts',id);toast('Workout deleted');}
    else{b.dataset.armed='1';b.classList.add('is-armed');b.setAttribute('aria-label','Tap again to delete');setTimeout(()=>{delete b.dataset.armed;b.classList.remove('is-armed');},2800);}
   }
  });
  q('#h-list').addEventListener('click',e=>{
   const b=e.target.closest('[data-act]');if(!b)return;
   const entry=st.find('history',b.dataset.id);if(!entry)return;
   if(b.dataset.act==='repeat'){
    const s=Crux.findSession(entry.sessionId)||entry.session;
    if(!s){toast('That workout is no longer available');return;}
    Crux.ui.startSession(s,entry.options||{},entry.title);
   }else if(b.dataset.act==='hdel'){
    if(b.dataset.armed){st.remove('history',entry.id);}
    else{b.dataset.armed='1';b.classList.add('is-armed');setTimeout(()=>{delete b.dataset.armed;b.classList.remove('is-armed');},2800);}
   }
  });
 }
 function cardHTML(w){
  const s=Crux.customSession(w),plan=Plan.compile(s,META,{countdown:Crux.ui.countdown()});
  const cat=w.category||'strength',n=(w.items||[]).length;
  return `<article class="w-card" style="--cat:var(--${cat})">
   <button type="button" class="w-card-main" data-act="open" data-id="${h(w.id)}"><span class="w-card-icon">${icon(CATEGORIES[cat]?CATEGORIES[cat].icon:'all')}</span>
    <span class="w-card-text"><span class="w-card-title">${h(w.title||'Untitled')}</span><span class="w-card-meta num">${n} exercise${n===1?'':'s'} · ${Plan.minutes(plan.duration)}${plan.estimated?' (est.)':''} · ${h((Crux.ui.INTENSITY_META[w.intensity]||{}).label||'')}</span></span></button>
   <div class="w-card-actions">
    <button type="button" class="btn btn-sm" data-act="start" data-id="${h(w.id)}">${icon('play')} Start</button>
    ${Crux.favBtn('sessions',w.id,'inline')}
    <button type="button" class="icon-btn" data-act="edit" data-id="${h(w.id)}" aria-label="Edit ${h(w.title)}">${icon('edit')}</button>
    <button type="button" class="icon-btn" data-act="dup" data-id="${h(w.id)}" aria-label="Duplicate ${h(w.title)}">${icon('copy')}</button>
    <button type="button" class="icon-btn" data-act="del" data-id="${h(w.id)}" aria-label="Delete ${h(w.title)}">${icon('trash')}</button>
   </div></article>`;
 }
 function histHTML(e){
  const cat=e.category||'strength',ico=CATEGORIES[cat]?CATEGORIES[cat].icon:(cat==='timer'?'timer':'all');
  const eff=e.effort?`<span class="h-effort" aria-label="Effort ${e.effort} of 5">${Array.from({length:e.effort},()=>icon('flame')).join('')}</span>`:'';
  return `<div class="h-row" style="--cat:var(${cat==='timer'?'--timer':'--'+cat})"><span class="w-card-icon">${icon(ico)}</span>
   <span class="h-text"><span class="h-title">${h(e.title)}</span><span class="h-meta num">${h(fmtWhen(e.startedAt||e.updatedAt))} · ${Plan.clock(e.duration||0)} · ${e.completedSteps}/${e.totalSteps} steps</span>${eff}${e.note?`<span class="h-note">${h(e.note)}</span>`:''}</span>
   <button type="button" class="btn btn-secondary btn-sm" data-act="repeat" data-id="${h(e.id)}">${icon('repeat')} Repeat</button>
   <button type="button" class="icon-btn plain" data-act="hdel" data-id="${h(e.id)}" aria-label="Remove from history">${icon('close')}</button></div>`;
 }

 /* ── editor ──────────────────────────────────────────────────────── */
 function paintEditor(keepScroll){
  const scroll=window.scrollY;
  root.innerHTML=`<div class="page page-build builder-editor">
   <div class="page-header page-header-row"><div><span class="eyebrow">${draft.id?'Editing':'New workout'}</span><h1 class="page-title">Build</h1></div>
    <button type="button" class="btn btn-secondary btn-sm" id="b-cancel">Close</button></div>
   <section class="b-meta">
    <label class="field"><span class="field-label">Name</span><input class="field-input" id="b-name" maxlength="60" placeholder="e.g. Tuesday pull day" autocomplete="off" value="${h(draft.title)}"></label>
    <div class="field"><span class="field-label">Category</span><div class="chip-row wrap" id="b-cat" role="group" aria-label="Category">${Object.entries(CATEGORIES).map(([id,c])=>`<button type="button" class="chip" data-v="${id}" aria-pressed="${draft.category===id}">${h(c.label)}</button>`).join('')}</div></div>
    <div class="field"><span class="field-label">Intensity</span><div class="segmented" id="b-int">${INTENSITY.map(([v,l])=>`<button type="button" data-v="${v}" aria-pressed="${draft.intensity===v}">${l}</button>`).join('')}<span class="segmented-indicator" aria-hidden="true"></span></div></div>
   </section>
   <section class="section"><div class="section-head"><h2 class="section-title">Exercises</h2><button type="button" class="btn btn-sm" id="b-add">${icon('plus')} Add exercise</button></div>
    <ol class="b-items" id="b-items"></ol>
    <div class="b-empty" id="b-empty" hidden><p>No exercises yet.</p><button type="button" class="btn" id="b-add2">${icon('plus')} Add exercise</button></div>
   </section>
   <div class="builder-bar"><div class="bottom-bar-duration"><span class="num" id="b-total">0:00</span><span id="b-count">Total</span></div>
    <button type="button" class="btn btn-secondary" id="b-save">${icon('check')} Save</button><button type="button" class="btn" id="b-start">${icon('play')} Start</button></div>
  </div>`;
  q('#b-name').addEventListener('input',e=>{draft.title=e.target.value;saveDraft();});
  q('#b-cat').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;draft.category=b.dataset.v;saveDraft();[...q('#b-cat').children].forEach(c=>c.setAttribute('aria-pressed',String(c===b)));});
  const seg=q('#b-int');
  seg.addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(!b)return;draft.intensity=Number(b.dataset.v);saveDraft();[...seg.querySelectorAll('button')].forEach(c=>c.setAttribute('aria-pressed',String(c===b)));Crux.ui.syncIndicator(seg,'button','.segmented-indicator');});
  requestAnimationFrame(()=>Crux.ui.syncIndicator(seg,'button','.segmented-indicator'));
  q('#b-cancel').addEventListener('click',()=>{
   // A draft with content is kept (a "Continue" banner shows on the list); an empty one just closes.
   if(draft.items.length||(draft.title||'').trim()){mode='list';paint();window.scrollTo({top:0});}
   else discard();
  });
  q('#b-add').addEventListener('click',openPicker);q('#b-add2').addEventListener('click',openPicker);
  q('#b-save').addEventListener('click',()=>save(false));
  q('#b-start').addEventListener('click',start);
  paintItems();
  if(keepScroll)window.scrollTo({top:scroll});
 }
 function discard(){draft=null;mode='list';expanded=null;prefs.set(DRAFT_KEY,null);paint();window.scrollTo({top:0});}
 function total(){
  const plan=planOf(),el=q('#b-total');
  if(el)Crux.ui.pulse(el,(plan.estimated?'~':'')+Plan.clock(plan.duration));
  const c=q('#b-count');if(c)c.textContent=`${draft.items.length} exercise${draft.items.length===1?'':'s'}${plan.estimated?' · reps estimated':''}`;
  const empty=!draft.items.length;
  ['#b-save','#b-start'].forEach(s=>{const b=q(s);if(b)b.disabled=empty;});
 }
 function save(){
  if(!draft.items.length){toast('Add at least one exercise');return;}
  const title=(draft.title||'').trim()||'My workout';
  const item=Crux.store.upsert('customWorkouts',{id:draft.id||Crux.store.newId('cw'),title,category:draft.category,intensity:draft.intensity,
   items:draft.items.map(i=>{const{uid:_,...rest}=i;return rest;})});
  toast(`Saved “${title}”`);
  draft=null;mode='list';prefs.set(DRAFT_KEY,null);paint();window.scrollTo({top:0});
  return item;
 }
 function start(){
  if(!draft.items.length)return;
  const s=sessionOf();
  Crux.ui.startSession(s,{},(draft.title||'').trim()||'My workout');
 }

 /* ── item list ───────────────────────────────────────────────────── */
 function paintItems(){
  const list=q('#b-items');if(!list)return;
  list.innerHTML='';
  q('#b-empty').hidden=draft.items.length>0;
  draft.items.forEach((it,idx)=>list.appendChild(itemEl(it,idx)));
  total();
 }
 function move(idx,to){
  if(to<0||to>=draft.items.length||to===idx)return;
  const [it]=draft.items.splice(idx,1);draft.items.splice(to,0,it);saveDraft();paintItems();
  const el=q(`[data-uid="${it.uid}"]`);if(el&&el.animate&&!Crux.reducedMotion())el.animate([{background:'color-mix(in srgb,var(--strength) 16%,var(--surface))'},{background:'var(--surface)'}],{duration:600});
 }
 function itemEl(it,idx){
  const x=exercise(it.ex),missing=!x;
  const open=expanded===it.uid;
  const li=document.createElement('li');li.className='b-item'+(open?' is-open':'')+(missing?' is-missing':'');li.dataset.uid=it.uid;
  li.innerHTML=`<div class="b-item-main">
    <span class="b-grip" role="button" aria-label="Drag to reorder ${h(displayName(it.ex))}" tabindex="-1">${icon('grip')}</span>
    <button type="button" class="b-item-info" aria-expanded="${open}">${missing?'<span class="thumb"></span>':thumb(it.ex,'thumb')}<span class="b-item-text"><span class="b-item-name">${h(missing?'Exercise removed':displayName(it.ex))}</span><span class="b-item-desc num">${h(describeItem(it))}</span></span></button>
    <span class="b-item-move"><button type="button" class="icon-btn plain" data-a="up" aria-label="Move up" ${idx===0?'disabled':''}>${icon('up')}</button><button type="button" class="icon-btn plain" data-a="down" aria-label="Move down" ${idx===draft.items.length-1?'disabled':''}>${icon('down')}</button></span>
   </div>
   ${open?'<div class="b-item-edit"></div>':''}`;
  li.querySelector('.b-item-info').addEventListener('click',()=>{expanded=open?null:it.uid;paintItems();});
  li.querySelector('[data-a="up"]').addEventListener('click',()=>move(idx,idx-1));
  li.querySelector('[data-a="down"]').addEventListener('click',()=>move(idx,idx+1));
  attachDrag(li,idx);
  if(open)fillEdit(li.querySelector('.b-item-edit'),it,idx);
  return li;
 }
 function fillEdit(box,it,idx){
  const F=Crux.kit;
  const m=META[it.ex]||{};
  box.innerHTML=`<div class="b-edit-row"><div class="segmented b-mode" role="group" aria-label="Mode"><button type="button" data-v="time" aria-pressed="${it.mode==='time'}">Timed</button><button type="button" data-v="reps" aria-pressed="${it.mode==='reps'}">Reps</button><span class="segmented-indicator" aria-hidden="true"></span></div>
    <label class="b-each"><span>Each side</span><span class="switch"><input type="checkbox" ${it.sides==='each'?'checked':''}><span class="switch-track"></span></span></label></div>
   <div class="b-steppers"></div>
   <div class="b-edit-actions"><button type="button" class="btn btn-secondary btn-sm" data-a="dup">${icon('copy')} Duplicate</button><button type="button" class="btn btn-secondary btn-sm btn-danger" data-a="rm">${icon('trash')} Remove</button></div>`;
  const seg=box.querySelector('.b-mode'),wrap=box.querySelector('.b-steppers');
  const refresh=()=>{
   const desc=box.closest('.b-item').querySelector('.b-item-desc');if(desc)desc.textContent=describeItem(it);
   total();
  };
  const row=(label,st)=>{const r=document.createElement('div');r.className='b-step';r.innerHTML=`<span class="b-step-label">${h(label)}</span>`;r.appendChild(st.el);wrap.appendChild(r);};
  function steppers(){
   wrap.innerHTML='';
   if(it.mode==='reps')row('Reps',F.stepper({value:it.reps,min:1,max:100,label:'reps',onChange:v=>{it.reps=v;saveDraft();refresh();}}));
   else row('Work',F.stepper({value:it.work,min:5,max:900,step:5,fmt:F.fmtSec,label:'work seconds',onChange:v=>{it.work=v;saveDraft();refresh();}}));
   row('Sets',F.stepper({value:it.sets,min:1,max:12,label:'sets',onChange:v=>{it.sets=v;saveDraft();refresh();}}));
   row('Rest',F.stepper({value:it.rest,min:0,max:300,step:5,fmt:F.fmtSec,label:'rest seconds',onChange:v=>{it.rest=v;saveDraft();refresh();}}));
  }
  steppers();
  seg.addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(!b)return;it.mode=b.dataset.v;saveDraft();[...seg.querySelectorAll('button')].forEach(c=>c.setAttribute('aria-pressed',String(c===b)));Crux.ui.syncIndicator(seg,'button','.segmented-indicator');steppers();refresh();});
  requestAnimationFrame(()=>Crux.ui.syncIndicator(seg,'button','.segmented-indicator'));
  box.querySelector('.b-each input').addEventListener('change',e=>{it.sides=e.target.checked?'each':'both';saveDraft();refresh();});
  box.querySelector('[data-a="dup"]').addEventListener('click',()=>{const c={...it,uid:uid()};draft.items.splice(idx+1,0,c);expanded=c.uid;saveDraft();paintItems();});
  box.querySelector('[data-a="rm"]').addEventListener('click',()=>{draft.items.splice(idx,1);expanded=null;saveDraft();paintItems();});
 }

 /* ── drag to reorder (pointer events on the grip) ────────────────── */
 function attachDrag(li,idx){
  const grip=li.querySelector('.b-grip');
  grip.addEventListener('pointerdown',e=>{
   if(e.button&&e.pointerType==='mouse')return;
   e.preventDefault();
   const list=li.parentElement,rows=[...list.children],rects=rows.map(r=>r.getBoundingClientRect());
   const h0=rects[idx].height+parseFloat(getComputedStyle(list).rowGap||0)||rects[idx].height+8;
   const startY=e.clientY,startScroll=window.scrollY;
   let target=idx,lastY=e.clientY,raf=0;
   grip.setPointerCapture(e.pointerId);
   li.classList.add('is-dragging');list.classList.add('is-reordering');
   rows.forEach((r,i)=>{if(i!==idx)r.style.transition='transform .18s var(--ease)';});
   const update=()=>{
    raf=0;
    const dy=lastY-startY+(window.scrollY-startScroll);
    li.style.transform=`translateY(${dy}px)`;
    const center=rects[idx].top+rects[idx].height/2+dy-(window.scrollY-startScroll)+ (window.scrollY-startScroll);
    let t=idx;
    rows.forEach((r,i)=>{if(i===idx)return;const mid=rects[i].top+rects[i].height/2;if(i>idx&&center>mid)t=Math.max(t,i);if(i<idx&&center<mid)t=Math.min(t,i);});
    target=t;
    rows.forEach((r,i)=>{if(i===idx)return;let s=0;if(idx<i&&i<=target)s=-h0;else if(target<=i&&i<idx)s=h0;r.style.transform=s?`translateY(${s}px)`:'';});
    // auto-scroll near the viewport edges
    const y=lastY,vh=window.innerHeight;
    if(y<90)window.scrollBy(0,-12);else if(y>vh-90)window.scrollBy(0,12);
    if(y<90||y>vh-90)raf=requestAnimationFrame(update);
   };
   const onMove=ev=>{lastY=ev.clientY;if(!raf)raf=requestAnimationFrame(update);};
   const end=()=>{
    grip.removeEventListener('pointermove',onMove);grip.removeEventListener('pointerup',end);grip.removeEventListener('pointercancel',end);
    cancelAnimationFrame(raf);
    rows.forEach(r=>{r.style.transform='';r.style.transition='';});
    li.classList.remove('is-dragging');list.classList.remove('is-reordering');
    if(target!==idx){const [it]=draft.items.splice(idx,1);draft.items.splice(target,0,it);saveDraft();}
    paintItems();
   };
   grip.addEventListener('pointermove',onMove);grip.addEventListener('pointerup',end);grip.addEventListener('pointercancel',end);
  });
 }

 /* ── exercise picker ─────────────────────────────────────────────── */
 function openPicker(){
  const state={q:'',filter:'all',added:0};
  const body=document.createElement('div');body.className='picker';
  body.innerHTML=`<div class="sheet-head"><h2>Add exercises</h2><button type="button" class="icon-btn plain" data-sheet-close aria-label="Close">${icon('close')}</button></div>
   <div class="picker-tools"><div class="search-field">${icon('search','search-icon')}<input type="search" id="p-search" placeholder="Search exercises" aria-label="Search exercises"></div>
    <div class="chip-row" id="p-filters" role="group" aria-label="Filter"></div></div>
   <div class="picker-list" id="p-list"></div>
   <div class="picker-foot"><span id="p-count" class="picker-count"></span><button type="button" class="btn" id="p-done">Done</button></div>`;
  const sheet=Crux.ui.openSheet({body,label:'Add exercises'});
  const $q=s=>body.querySelector(s);
  const filters=Crux.ui.EX_FILTERS;
  $q('#p-filters').innerHTML=filters.map(f=>`<button type="button" class="chip" data-f="${f.id}" aria-pressed="${state.filter===f.id}">${f.icon?icon(f.icon)+' ':''}${h(f.label)}</button>`).join('');
  $q('#p-filters').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;state.filter=b.dataset.f;[...$q('#p-filters').children].forEach(c=>c.setAttribute('aria-pressed',String(c===b)));paintList();});
  $q('#p-search').addEventListener('input',Crux.ui.debounce(e=>{state.q=e.target.value;paintList();},120));
  function paintList(){
   const list=Crux.ui.exercisePool().filter(x=>Crux.ui.matchesFilter(x,state.filter)).filter(x=>window.Search?Search.matches(Crux.ui.searchHaystack(x),state.q):true);
   $q('#p-list').innerHTML=list.length?list.map(x=>`<div class="p-row" data-id="${h(x.id)}" role="button" tabindex="0" aria-label="Add ${h(x.name)}">${thumb(x.id,'thumb')}<span class="p-text"><span class="p-name">${h(x.name)}${x.custom?' <span class="tag tag-mine">Mine</span>':''}</span><span class="p-desc">${h(Plan.describe(newItemDesc(x.id),x.meta))}</span></span>${Crux.favBtn('exercises',x.id,'inline')}<span class="p-add" aria-hidden="true">${icon('plus')}</span></div>`).join(''):`<p class="no-results">No exercises match.</p>`;
  }
  const newItemDesc=id=>{const i=newItem(id);return itemToPlan(i);};
  function add(id,row){
   ensureDraft();const it=newItem(id);draft.items.push(it);saveDraft();state.added++;
   $q('#p-count').textContent=`${state.added} added`;
   if(row){row.classList.add('just-added');setTimeout(()=>row.classList.remove('just-added'),700);const a=row.querySelector('.p-add');if(a){a.innerHTML=icon('check');setTimeout(()=>{a.innerHTML=icon('plus');},900);}}
  }
  const activate=e=>{const row=e.target.closest('.p-row');if(!row||e.target.closest('.fav-btn'))return;add(row.dataset.id,row);};
  $q('#p-list').addEventListener('click',activate);
  $q('#p-list').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.classList.contains('p-row')){e.preventDefault();activate(e);}});
  $q('#p-done').addEventListener('click',()=>{sheet.close();if(state.added&&root&&q('.builder-editor')){expanded=draft.items[draft.items.length-1].uid;paintItems();}});
  paintList();
  setTimeout(()=>{const s=$q('#p-search');s&&s.focus({preventScroll:true});},350);
 }

 Crux.on('custom:changed',()=>{if(root&&root.querySelector('.builder-editor'))paintItems();});
 Crux.pages=Crux.pages||{};
 Crux.pages.build={render};
 Crux.builder={addExercise,edit,copyFrom,duplicate};
})();
