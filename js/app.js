/* Crux — pages, router and interactions. Owns: index.html, css/app.css, js/app.js.
   Reads: js/lib.js (Crux), js/core/plan.js (Plan), js/core/hip.js (HipOpener), js/core/search.js (Search),
   data/sessions.js (SESSIONS). Renders into #view (js/lib.js and data/*.js already loaded). */
(function(){
 'use strict';
 const {$,$$,h,icon,prefs,applyTheme,exercise,thumb,equipmentLabels,displayName,toast,on,emit,reducedMotion,CATEGORIES,META,SESS,byId}=window.Crux;
 const Plan=window.Plan;
 const countdown=()=>prefs.get('countdown',5);
 const view=$('#view');

 /* ───────────────────────── small utilities ───────────────────────── */
 function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};}
 function hashSeed(str){let n=0;for(let i=0;i<str.length;i++)n=(n*31+str.charCodeAt(i))|0;return Math.abs(n)||1;}
 function startSession(session,options,title){
  if(window.Crux&&window.Crux.Player&&typeof window.Crux.Player.start==='function'){
   try{window.Crux.Player.start({session,options,title:title||session.title});}
   catch(err){console.error(err);toast('Player not available');}
  }else toast('Player not available');
 }
 function pulse(el,text){
  if(!el)return;
  if(el.textContent===text)return;
  if(reducedMotion()||typeof el.animate!=='function'){el.textContent=text;return;}
  const out=el.animate([{transform:'translateY(0)',opacity:1},{transform:'translateY(-6px)',opacity:0}],{duration:130,easing:'ease-in'});
  out.onfinish=()=>{el.textContent=text;el.animate([{transform:'translateY(6px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:190,easing:'ease-out'});};
 }
 function mountArt(el,seed,category){
  el.classList.add('art');
  if(window.Art&&typeof Art.cover==='function'){
   try{el.innerHTML=Art.cover(hashSeed(String(seed)),category);return;}catch(err){console.error(err);}
  }
  el.style.background=`linear-gradient(135deg,var(--${category}),var(--${category}-2))`;
 }
 function setVT(el,name){if(el&&typeof document.startViewTransition==='function')el.style.viewTransitionName=name;}
 function go(path,withTransition){
  const apply=()=>{location.hash=path;handleHash();};
  if(withTransition&&typeof document.startViewTransition==='function'&&!reducedMotion())document.startViewTransition(apply);
  else apply();
 }
 function makeTappable(el,onActivate,label){
  el.setAttribute('tabindex','0');
  el.setAttribute('role','button');
  if(label)el.setAttribute('aria-label',label);
  el.addEventListener('click',e=>{if(e.target.closest('[data-stop-tap]'))return;onActivate(e);});
  el.addEventListener('keydown',e=>{
   if(e.target.closest('[data-stop-tap]'))return;
   if(e.key==='Enter'||e.key===' '){e.preventDefault();onActivate(e);}
  });
 }
 function syncIndicator(container,btnSel,indSel){
  if(!container)return;
  const ind=container.querySelector(indSel);
  const active=container.querySelector(`${btnSel}[aria-pressed="true"]`);
  if(!ind||!active)return;
  ind.style.width=active.offsetWidth+'px';
  ind.style.transform=`translateX(${active.offsetLeft-parseFloat(getComputedStyle(container).paddingLeft||0)}px)`;
 }
 function syncAllIndicators(){
  $$('.tabnav').forEach(el=>syncIndicator(el,'.tabnav-btn','.tabnav-indicator'));
  $$('.segmented').forEach(el=>syncIndicator(el,'button','.segmented-indicator'));
 }
 window.addEventListener('resize',debounce(syncAllIndicators,120));

 // FLIP-ish list reconciliation: keeps entering/leaving/reordering animated instead of a full rebuild.
 function flipUpdate(container,items,keyFn,render){
  const before=new Map();
  [...container.children].forEach(el=>{if(el.dataset&&el.dataset.key)before.set(el.dataset.key,el.getBoundingClientRect());});
  const existing=new Map();
  [...container.children].forEach(el=>{if(el.dataset&&el.dataset.key)existing.set(el.dataset.key,el);});
  const seen=new Set();
  const frag=document.createDocumentFragment();
  items.forEach((item,i)=>{
   const key=String(keyFn(item));
   seen.add(key);
   const prior=existing.get(key)||null;
   const el=render(item,prior,i);
   el.dataset.key=key;
   if(!prior){el.classList.add('is-entering');el.style.setProperty('--stagger',i);}
   frag.appendChild(el);
  });
  existing.forEach((el,key)=>{
   if(seen.has(key))return;
   const r=el.getBoundingClientRect();
   el.style.position='fixed';el.style.left=r.left+'px';el.style.top=r.top+'px';el.style.width=r.width+'px';el.style.height=r.height+'px';el.style.margin='0';el.style.zIndex='60';el.style.pointerEvents='none';
   document.body.appendChild(el);
   if(reducedMotion()){el.remove();return;}
   requestAnimationFrame(()=>{el.style.transition='opacity .22s var(--ease),transform .22s var(--ease)';el.style.opacity='0';el.style.transform='scale(.93)';});
   setTimeout(()=>el.remove(),240);
  });
  container.appendChild(frag);
  if(!reducedMotion()){
   items.forEach(item=>{
    const key=String(keyFn(item));
    if(!before.has(key))return;
    const el=container.querySelector(`:scope > [data-key="${CSS.escape(key)}"]`);
    if(!el||el.classList.contains('is-entering'))return;
    const prev=before.get(key),now=el.getBoundingClientRect();
    const dx=prev.left-now.left,dy=prev.top-now.top;
    if(Math.abs(dx)<1&&Math.abs(dy)<1)return;
    el.style.transition='none';
    el.style.transform=`translate(${dx}px,${dy}px)`;
    el.getBoundingClientRect();
    requestAnimationFrame(()=>{el.style.transition='transform .34s var(--ease)';el.style.transform='';});
   });
  }
 }

 /* ───────────────────────── sheet system (bottom sheet / modal) ───────────────────────── */
 const sheetLayer=$('#sheet-layer');
 let activeSheet=null;
 function openSheet({body,label,wide,onClose}){
  closeSheet(true);
  const returnFocus=document.activeElement;
  const backdrop=document.createElement('div');backdrop.className='sheet-backdrop';
  const panel=document.createElement('div');panel.className='sheet-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');if(label)panel.setAttribute('aria-label',label);
  panel.innerHTML=`<div class="sheet-handle-wrap"><div class="sheet-handle"></div></div><div class="sheet-scroll"></div>`;
  panel.querySelector('.sheet-scroll').appendChild(body);
  sheetLayer.appendChild(backdrop);sheetLayer.appendChild(panel);
  document.body.style.overflow='hidden';
  requestAnimationFrame(()=>{backdrop.classList.add('open');panel.classList.add('open');});
  function close(){
   backdrop.classList.remove('open');panel.classList.remove('open');
   document.body.style.overflow='';
   setTimeout(()=>{backdrop.remove();panel.remove();},reducedMotion()?0:420);
   document.removeEventListener('keydown',onKey);
   try{onClose&&onClose();}catch(err){console.error(err);}
   if(returnFocus&&returnFocus.focus)try{returnFocus.focus();}catch(err){}
   if(activeSheet===state)activeSheet=null;
  }
  function onKey(e){if(e.key==='Escape')close();}
  document.addEventListener('keydown',onKey);
  backdrop.addEventListener('click',close);
  // drag-to-dismiss from the handle
  const handle=panel.querySelector('.sheet-handle-wrap');
  let dragging=false,startY=0,startTransform=0;
  handle.addEventListener('pointerdown',e=>{dragging=true;startY=e.clientY;panel.classList.add('dragging');handle.setPointerCapture(e.pointerId);});
  handle.addEventListener('pointermove',e=>{
   if(!dragging)return;
   const dy=Math.max(0,e.clientY-startY);
   panel.style.transform=`translateY(${dy}px)`;
  });
  function endDrag(e){
   if(!dragging)return;dragging=false;panel.classList.remove('dragging');
   const dy=Math.max(0,(e.clientY||startY)-startY);
   panel.style.transform='';
   if(dy>120)close();
  }
  handle.addEventListener('pointerup',endDrag);
  handle.addEventListener('pointercancel',endDrag);
  const closeBtn=panel.querySelector('[data-sheet-close]');
  if(closeBtn)closeBtn.addEventListener('click',close);
  const state={backdrop,panel,close};
  activeSheet=state;
  const firstFocus=panel.querySelector('[autofocus]')||panel.querySelector('button,a,input');
  if(firstFocus)setTimeout(()=>firstFocus.focus(),reducedMotion()?0:60);
  return state;
 }
 function closeSheet(silent){if(activeSheet){const s=activeSheet;if(silent){s.backdrop.remove();s.panel.remove();document.body.style.overflow='';activeSheet=null;}else s.close();}}

 /* ───────────────────────── settings sheet ───────────────────────── */
 function openSettings(){
  const body=document.createElement('div');
  const theme=prefs.get('theme','auto'),sound=prefs.get('sound',true),voice=prefs.get('voice',true),cd=countdown();
  body.innerHTML=`
   <div class="sheet-head"><h2>Settings</h2><button type="button" class="icon-btn plain" data-sheet-close aria-label="Close settings">${icon('close')}</button></div>
   <div class="settings-body">
    <div class="settings-row"><span class="settings-row-label">Theme</span>
     <div class="segmented" id="theme-seg">
      <button type="button" data-v="auto" aria-pressed="${theme==='auto'}">${icon('auto')} Auto</button>
      <button type="button" data-v="light" aria-pressed="${theme==='light'}">${icon('sun')} Light</button>
      <button type="button" data-v="dark" aria-pressed="${theme==='dark'}">${icon('moon')} Dark</button>
      <span class="segmented-indicator" aria-hidden="true"></span>
     </div></div>
    <div class="settings-row"><span class="settings-row-label">Sound effects</span>
     <label class="switch"><input type="checkbox" id="sound-toggle" ${sound?'checked':''}><span class="switch-track"></span></label></div>
    <div class="settings-row"><span class="settings-row-label">Voice coach</span>
     <label class="switch"><input type="checkbox" id="voice-toggle" ${voice?'checked':''}><span class="switch-track"></span></label></div>
    <div class="settings-row"><span class="settings-row-label">Countdown</span>
     <div class="segmented" id="cd-seg">
      <button type="button" data-v="3" aria-pressed="${cd===3}">3 s</button>
      <button type="button" data-v="5" aria-pressed="${cd===5}">5 s</button>
      <button type="button" data-v="10" aria-pressed="${cd===10}">10 s</button>
      <span class="segmented-indicator" aria-hidden="true"></span>
     </div></div>
    <hr class="settings-divider">
    <a class="settings-link" href="RESEARCH.md" target="_blank" rel="noopener">Evidence & sources ↗</a>
    <p class="settings-note">Nothing you do here is tracked, logged or sent anywhere. Only these preferences are saved, on this device.</p>
   </div>`;
  openSheet({body,label:'Settings'});
  const themeSeg=body.querySelector('#theme-seg'),cdSeg=body.querySelector('#cd-seg');
  themeSeg.addEventListener('click',e=>{
   const btn=e.target.closest('button[data-v]');if(!btn)return;
   prefs.set('theme',btn.dataset.v);applyTheme();
   [...themeSeg.querySelectorAll('button')].forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
   syncIndicator(themeSeg,'button','.segmented-indicator');
  });
  cdSeg.addEventListener('click',e=>{
   const btn=e.target.closest('button[data-v]');if(!btn)return;
   prefs.set('countdown',Number(btn.dataset.v));
   [...cdSeg.querySelectorAll('button')].forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
   syncIndicator(cdSeg,'button','.segmented-indicator');
  });
  body.querySelector('#sound-toggle').addEventListener('change',e=>prefs.set('sound',e.target.checked));
  body.querySelector('#voice-toggle').addEventListener('change',e=>prefs.set('voice',e.target.checked));
  requestAnimationFrame(()=>{syncIndicator(themeSeg,'button','.segmented-indicator');syncIndicator(cdSeg,'button','.segmented-indicator');});
 }

 /* ───────────────────────── exercise sheet ───────────────────────── */
 let sheetFigure=null;
 function exerciseCategory(x){
  if(x.id.startsWith('hip-'))return 'hip';
  if(x.id.startsWith('hip-'))return 'hip';
  if(x.kind==='Climbing')return 'climbing';
  if(x.kind==='Mobility')return 'mobility';
  if(x.kind==='Warm-up')return 'recovery';
  return 'strength';
 }
 function tryItSession(x){
  const m=x.meta||{};
  // Only strength-type movements count reps; holds, stretches and mobility drills run on a timer.
  const timeMode=!!m.hold||!['strength','power'].includes(m.trainingType);
  const item=timeMode
   ?{ex:x.id,mode:'time',work:m.work||20,sets:2,rest:Math.max(15,m.rest||15)}
   :{ex:x.id,mode:'reps',reps:m.reps||8,sets:2,rest:Math.max(15,m.rest||15)};
  return {id:'single-'+x.id,title:x.name,category:exerciseCategory(x),blocks:[{name:'Main',items:[item]}]};
 }
 function defaultPrescription(x){
  const m=x.meta||{},d=m.dose;
  if(!d)return '';
  const item=(m.hold||!['strength','power'].includes(m.trainingType))?{mode:'time',work:d.workSeconds,sets:d.sets,rest:d.restSeconds,sides:m.unilateral?'each':'both'}
   :{mode:'reps',reps:d.reps,sets:d.sets,rest:d.restSeconds,sides:m.unilateral?'each':'both'};
  return Plan.describe(item,m);
 }
 function renderExerciseSheetBody(id){
  const x=exercise(id);
  if(!x){const d=document.createElement('div');d.innerHTML='<div class="sheet-head"><h2>Not found</h2></div>';return d;}
  const wrap=document.createElement('div');
  const mediaCls=x.media.type==='image'?'is-photo':x.media.type==='figure'?'is-figure':x.media.type==='instruction'?'is-instruction':'';
  const tags=[x.meta.difficulty,x.meta.target,...(equipmentLabels(x.equipment,{props:true})||[])].filter(Boolean);
  const trains=(x.climbing&&x.climbing.length)?`<p class="ex-sheet-trains">Trains ${h(x.climbing.join(', '))}</p>`:'';
  const rx=defaultPrescription(x);
  const src=x.source?`<p class="ex-sheet-source">Source: <a href="${h(x.source.url)}" target="_blank" rel="noopener">${h(x.source.author||'Link')} ↗</a></p>`:'';
  wrap.innerHTML=`
   <div class="sheet-head"><h2>${h(x.name)}</h2><button type="button" class="icon-btn plain" data-sheet-close aria-label="Close">${icon('close')}</button></div>
   <div class="ex-sheet-media ${mediaCls}" id="ex-media"></div>
   <div class="ex-sheet-body">
    <h1 class="ex-sheet-title sr-only">${h(x.name)}</h1>
    <div class="ex-sheet-tags">${tags.map(t=>`<span class="tag">${h(t)}</span>`).join('')}</div>
    ${trains}
    ${x.cue?`<p class="ex-sheet-cue">${h(x.cue)}</p>`:''}
    ${rx?`<span class="ex-sheet-prescription">${h(rx)}</span>`:''}
    ${src}
    <div class="ex-sheet-actions"><button type="button" class="btn" id="try-it-btn">${icon('play')} Try it</button></div>
   </div>`;
  const mediaEl=wrap.querySelector('#ex-media');
  if(x.media.type==='figure'&&window.Figures){
   try{sheetFigure=Figures.mount(mediaEl,id,{phase:'ready'});}
   catch(err){console.error(err);mediaEl.innerHTML=`<img src="${h(x.media.poster||'')}" alt="">`;}
  }else if(x.media.type==='figure'){
   mediaEl.classList.remove('is-figure');mediaEl.innerHTML=`<div class="icon-btn plain" style="width:64px;height:64px">${icon(exerciseCategory(x))}</div>`;
  }else if(x.media.type==='image'){
   mediaEl.innerHTML=`<img src="${h(x.media.src)}" alt="${h(x.name)}">`;
   if(x.media.options){
    const toggle=document.createElement('button');toggle.type='button';toggle.className='chip ex-sheet-options-toggle';toggle.textContent='Easier options';toggle.setAttribute('aria-pressed','false');
    let showing=false;
    toggle.addEventListener('click',()=>{
     showing=!showing;toggle.setAttribute('aria-pressed',String(showing));
     mediaEl.querySelector('img').src=showing?x.media.options:x.media.src;
    });
    mediaEl.appendChild(toggle);
   }
   if(x.media.credit)mediaEl.insertAdjacentHTML('beforeend',`<span class="visually-hidden">${h(x.media.credit)}</span>`);
  }else if(x.media.type==='instruction'){
   mediaEl.innerHTML=`<img src="${h(x.media.thumb)}" alt="">`;
  }else{
   if(x.media.src)mediaEl.innerHTML=`<video autoplay muted loop playsinline poster="${h(x.media.poster||'')}" src="${h(x.media.src)}"></video>`;
   else mediaEl.innerHTML=`<img src="${h(x.media.poster||x.media.thumb||'')}" alt="">`;
  }
  wrap.querySelector('#try-it-btn').addEventListener('click',()=>{
   const session=tryItSession(x);
   startSession(session,{countdown:countdown()},x.name);
  });
  return wrap;
 }
 function openExerciseSheet(id){
  try{sheetFigure&&sheetFigure.destroy&&sheetFigure.destroy();}catch(err){}
  sheetFigure=null;
  const body=renderExerciseSheetBody(id);
  const x=exercise(id);
  openSheet({body,label:x?x.name:'Exercise',onClose:()=>{
   try{sheetFigure&&sheetFigure.destroy&&sheetFigure.destroy();}catch(err){}
   sheetFigure=null;
   const v=body.querySelector('video');if(v)try{v.pause();}catch(err){}
   if(routeState.sheetId){routeState.sheetId=null;if(location.hash!==routeState.base)go(routeState.base,false);}
  }});
 }

 /* ───────────────────────── resume banner ───────────────────────── */
 function resumeBannerHTML(info){
  return `<div class="resume-banner" role="status">
   <span class="resume-text">Resume <strong>${h(info.title)}</strong> · step ${info.step} of ${info.total}</span>
   <div class="resume-actions">
    <button type="button" class="btn btn-sm" id="resume-go">Resume</button>
    <button type="button" class="icon-btn plain" id="resume-discard" aria-label="Discard saved session">${icon('close')}</button>
   </div></div>`;
 }
 function paintResumeBanner(){
  const slot=$('#resume-slot');if(!slot)return;
  let info=null;
  if(window.Crux&&window.Crux.Player&&typeof window.Crux.Player.resumeAvailable==='function'){
   try{info=window.Crux.Player.resumeAvailable();}catch(err){info=null;}
  }
  if(!info){slot.innerHTML='';return;}
  slot.innerHTML=resumeBannerHTML(info);
  $('#resume-go').addEventListener('click',()=>{
   if(window.Crux&&window.Crux.Player&&typeof window.Crux.Player.resume==='function'){try{window.Crux.Player.resume();}catch(err){toast('Player not available');}}
   else toast('Player not available');
  });
  $('#resume-discard').addEventListener('click',()=>{try{window.Crux.Player&&window.Crux.Player.discard&&window.Crux.Player.discard();}catch(err){}slot.innerHTML='';});
 }
 on('player:closed',()=>paintResumeBanner());

 /* ───────────────────────── Home page ───────────────────────── */
 const CATEGORY_LIST=[{id:'all',label:'All',icon:'all'},...Object.entries(CATEGORIES).map(([id,c])=>({id,label:c.label,icon:c.icon}))];
 const homeState={category:prefs.get('category','all'),minutes:prefs.get('minutes','any'),focus:prefs.get('focus',null)};
 let hipState=null;
 const minutesEff=()=>homeState.minutes==='any'?30:homeState.minutes;

 function greeting(){
  const hr=new Date().getHours();
  return hr<12?'Good morning':hr<18?'Good afternoon':'Good evening';
 }
 function poolFor(category,focus){
  let pool=category==='all'?SESS.sessions.slice():SESS.sessions.filter(s=>s.category===category);
  if(focus)pool=pool.filter(s=>(s.focus||[]).includes(focus));
  return pool;
 }
 function computeResults(category,minutesSel,focus){
  const pool=poolFor(category,focus),isAny=minutesSel==='any';
  const items=pool.map((s,i)=>{
   if(isAny){const plan=Plan.compile(s,META,{countdown:countdown()});return{session:s,plan,changed:[],fits:!!plan.steps.length,idx:i,options:{...Plan.DEFAULTS,countdown:countdown()},score:0};}
   const res=Plan.fit(s,minutesSel,META,{countdown:countdown()});
   return{session:s,plan:res.plan,changed:res.changed,fits:res.fits,idx:i,options:res.options,score:res.score};
  }).filter(x=>x.fits);
  // A chosen time ranks by how well the plan fills it with the fewest changes; "Any" keeps catalogue order.
  if(isAny)items.sort((a,b)=>a.idx-b.idx);
  else items.sort((a,b)=>b.score-a.score||a.idx-b.idx);
  return items;
 }
 function catIcon(id){return CATEGORIES[id]?CATEGORIES[id].icon:'all';}

 function renderHome(){
  view.innerHTML=`<div class="page page-home">
   <div id="resume-slot"></div>
   <div class="page-header"><span class="eyebrow">${greeting()}</span><h1 class="page-title">What are we training?</h1></div>
   <div class="controls">
    <div class="tile-row" id="cat-tiles" role="group" aria-label="Category"></div>
    <div class="chip-group">
     <span class="row-label">Time</span>
     <div class="chip-row" id="time-chips" role="group" aria-label="Time available"></div>
    </div>
    <div class="chip-group" id="focus-group">
     <span class="row-label">Focus</span>
     <div class="chip-row" id="focus-chips" role="group" aria-label="Focus"></div>
    </div>
   </div>
   <div class="results" id="results-area"></div>
  </div>`;
  paintResumeBanner();
  buildCategoryTiles();
  buildTimeChips();
  buildFocusChips(true);
  updateResults();
 }

 function buildCategoryTiles(){
  const row=$('#cat-tiles');
  row.innerHTML=CATEGORY_LIST.map(c=>`
   <button type="button" class="category-tile${c.id==='all'?' is-neutral':''}${homeState.category===c.id?' on':''}" data-cat="${c.id}"
    aria-pressed="${homeState.category===c.id}" style="--tile-c:${c.id==='all'?'var(--ink)':'var(--'+c.id+')'}">
    ${icon(c.icon)}<span class="category-tile-label">${h(c.label)}</span>
   </button>`).join('');
  row.addEventListener('click',e=>{
   const btn=e.target.closest('.category-tile');if(!btn)return;
   setCategory(btn.dataset.cat);
  });
 }
 function buildTimeChips(){
  const row=$('#time-chips');
  const opts=[5,10,15,20,30,45,60,'any'];
  row.innerHTML=opts.map(v=>{
   const on=homeState.minutes===v;
   const label=v==='any'?'Any':`${v}m`;
   return `<button type="button" class="chip" data-min="${v}" aria-pressed="${on}">${label}</button>`;
  }).join('');
  row.addEventListener('click',e=>{
   const btn=e.target.closest('.chip');if(!btn)return;
   const v=btn.dataset.min==='any'?'any':Number(btn.dataset.min);
   setMinutes(v);
  });
 }
 function buildFocusChips(instant){
  const row=$('#focus-chips'),group=$('#focus-group');
  const cat=SESS.categories.find(c=>c.id===homeState.category);
  const list=(cat&&cat.focus)||[];
  const hideRow=homeState.category==='all'||homeState.category==='hip'||!list.length;
  const render=()=>{
   row.innerHTML=list.map(f=>`<button type="button" class="chip" data-focus="${h(f)}" aria-pressed="${homeState.focus===f}">${h(f)}</button>`).join('');
   if(group)group.classList.toggle('is-hidden',hideRow);
  };
  if(instant||reducedMotion()){render();}
  else{
   if(group)group.classList.add('is-hidden');
   setTimeout(()=>{render();requestAnimationFrame(()=>{if(!hideRow&&group)group.classList.remove('is-hidden');});},180);
  }
  row.onclick=e=>{
   const btn=e.target.closest('.chip');if(!btn)return;
   const f=btn.dataset.focus;
   setFocus(homeState.focus===f?null:f);
  };
 }
 function setCategory(id){
  if(homeState.category===id)return;
  homeState.category=id;prefs.set('category',id);
  homeState.focus=null;prefs.set('focus',null);
  [...$('#cat-tiles').children].forEach(b=>{const on=b.dataset.cat===id;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});
  buildFocusChips(false);
  updateResults();
 }
 function setMinutes(v){
  if(homeState.minutes===v)return;
  homeState.minutes=v;prefs.set('minutes',v);
  [...$('#time-chips').children].forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.min==='any'?'any':Number(b.dataset.min))===v)));
  updateResults();
 }
 function setFocus(f){
  homeState.focus=f;prefs.set('focus',f);
  [...$('#focus-chips').children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.focus===f)));
  updateResults();
 }

 function updateResults(){
  const area=$('#results-area');if(!area)return;
  if(homeState.category==='hip'){renderHipSection(area);return;}
  const items=computeResults(homeState.category,homeState.minutes,homeState.focus);
  if(!items.length){renderEmptyState(area);return;}
  const countLine=homeState.minutes==='any'?`${items.length} workout${items.length===1?'':'s'}`:`${items.length} workout${items.length===1?'':'s'} fit in ${homeState.minutes} min`;
  const hero=items[0],rest=items.slice(1);
  let html=`<div class="results-head"><span class="results-count">${h(countLine)}</span></div><div id="hero-slot"></div>`;
  html+=`<div class="result-grid" id="result-grid"></div>`;
  area.innerHTML=html;
  paintHero($('#hero-slot'),hero);
  flipUpdate($('#result-grid'),rest,x=>x.session.id,(item,el)=>buildResultCard(item,el));
 }

 function paintHero(slot,item){
  const {session:s,plan,changed,options}=item;
  const el=document.createElement('div');
  el.className='hero-card';
  const equip=equipmentLabels(Plan.equipmentOf(s,META));
  const trainsLine=(s.goals&&s.goals.length)?`<p class="hero-trains">Trains ${h(s.goals.join(', '))}</p>`:'';
  el.innerHTML=`<div class="art" id="hero-art"></div><span class="hero-eyebrow">Best match</span>
   <div class="hero-content">
    <h2 class="hero-title">${h(s.title)}</h2>
    <p class="hero-summary">${h(s.summary)}</p>
    ${trainsLine}
    <div class="hero-tags">
     <span class="tag">${h(s.level)}</span>
     ${equip.map(e=>`<span class="tag">${h(e)}</span>`).join('')}
    </div>
    ${changed&&changed.length?`<span class="hero-fitted">${icon('info')} Fitted: ${h(changed.join(', '))}</span>`:''}
    <div class="hero-cta">
     <div class="hero-duration"><span class="hero-duration-num num" id="hero-duration">${Math.round(plan.duration/60)}</span><span class="hero-duration-label">minutes</span></div>
     <button type="button" class="btn hero-start" data-stop-tap>${icon('play')} Start</button>
    </div>
   </div>`;
  slot.innerHTML='';slot.appendChild(el);
  mountArt(el.querySelector('#hero-art'),s.id,s.category);
  setVT(el.querySelector('#hero-art'),'card-art-'+s.id);
  makeTappable(el,()=>go('#/session/'+encodeURIComponent(s.id),true),'Open '+s.title+' details');
  el.querySelector('.hero-start').addEventListener('click',()=>startSession(s,options,s.title));
 }
 function buildResultCard(item,existingEl){
  const {session:s,plan}=item;
  const el=existingEl||document.createElement('button');
  if(!existingEl){el.type='button';el.className='result-card';}
  const equip=equipmentLabels(Plan.equipmentOf(s,META));
  el.innerHTML=`<div class="result-art"><div class="art" id="art-${h(s.id)}"></div>
    <span class="result-cat-icon" style="color:var(--${s.category})">${icon(catIcon(s.category))}</span>
    <span class="result-duration-badge">${Math.round(plan.duration/60)} min</span></div>
   <div class="result-body">
    <h3 class="result-title">${h(s.title)}</h3>
    <p class="result-summary">${h(s.summary)}</p>
    ${s.goals&&s.goals.length?`<span class="result-trains">Trains ${h(s.goals.slice(0,2).join(', '))}</span>`:''}
    <div class="result-tags"><span class="tag">${h(s.level)}</span>${equip.slice(0,2).map(e=>`<span class="tag">${h(e)}</span>`).join('')}</div>
   </div>`;
  const artEl=el.querySelector('.art');
  mountArt(artEl,s.id,s.category);
  setVT(artEl,'card-art-'+s.id);
  el.onclick=()=>go('#/session/'+encodeURIComponent(s.id),true);
  return el;
 }
 function renderEmptyState(area){
  const pool=poolFor(homeState.category,homeState.focus);
  const shortest=pool.map(s=>({s,dur:Plan.compile(s,META,{countdown:countdown()}).duration})).sort((a,b)=>a.dur-b.dur).slice(0,3);
  area.innerHTML=`<div class="empty-state">
   <h3>Nothing fits in ${homeState.minutes==='any'?'that window':homeState.minutes+' min'} yet</h3>
   <p>Try a longer window, a different category, or one of the shortest options here:</p>
   <div class="empty-list">${shortest.map(x=>`<div class="empty-list-item"><span>${h(x.s.title)}</span><span>Needs ${h(Plan.minutes(x.dur))}</span></div>`).join('')||'<div class="empty-list-item"><span>No sessions in this category yet</span></div>'}</div>
  </div>`;
 }

 /* ── Hip Opener generator ── */
 function hipRegen(count,warmup,opts){
  opts=opts||{};
  const seed=opts.freshSeed?(Date.now()+Math.floor(Math.random()*1e6)):(hipState?hipState.seed:Date.now());
  const keep=opts.keepOverride!==undefined?opts.keepOverride:(hipState&&hipState.result?hipState.result.poses.slice(0,count):[]);
  const result=window.HipOpener.generate({minutes:minutesEff(),count,warmup,seed,countdown:countdown(),keep},SESS.hipPoses,SESS.positions,META);
  hipState={seed,warmup,result};
  prefs.set('hipCount',count);
  return result;
}
 function renderHipSection(area){
  const HipOpener=window.HipOpener;
  if(!HipOpener){area.innerHTML='<div class="empty-state"><h3>Hip Opener unavailable</h3><p>The generator module did not load.</p></div>';return;}
  const warmupPref=hipState?hipState.warmup:prefs.get('hipWarmup',false);
  const max=HipOpener.maxCount(minutesEff(),warmupPref,META,countdown());
  if(!hipState){
   const saved=prefs.get('hipCount',null);
   const initCount=(saved&&HipOpener.COUNTS.includes(saved)&&saved<=max)?saved:max;
   if(max>0)hipRegen(initCount,warmupPref,{freshSeed:true,keepOverride:[]});
   else hipState={seed:0,warmup:warmupPref,result:null};
  }else{
   const curCount=hipState.result?hipState.result.poses.length:0;
   if(max===0)hipState.result=null;
   else if(!hipState.result||curCount>max)hipRegen(Math.min(Math.max(curCount||max,1),max),hipState.warmup,{});
  }
  paintHipPanel(area);
 }
 // Rebuilds only when coming from the "nothing fits" note; otherwise updates the existing
 // skeleton in place so the pose list keeps its persistent container for flipUpdate to diff against.
 function paintHipPanel(area){
  const HipOpener=window.HipOpener;
  if(!hipState.result){
   area.innerHTML=`<div class="hip-empty">
    <p>Hip Opener needs at least 10 minutes — each pose is a 6-minute hold.</p>
    <button type="button" class="btn btn-sm" id="hip-use-10" style="margin-top:10px">Use 10 min</button>
   </div>`;
   $('#hip-use-10').addEventListener('click',()=>setMinutes(10));
   return;
  }
  let panel=area.querySelector('.hip-panel');
  if(!panel){
   area.innerHTML=`<div class="hip-panel">
    <div class="hip-count-row"><span class="row-label">Poses</span><div class="chip-row" id="hip-counts" role="group" aria-label="Number of poses"></div></div>
    <div class="hip-toolbar">
     <label class="switch"><input type="checkbox" id="hip-warmup"><span class="switch-track"></span><span class="switch-label">Warm-up</span></label>
     <span class="hip-summary num" id="hip-summary"></span>
     <div class="hip-actions"><button type="button" class="btn btn-secondary btn-sm" id="hip-shuffle">${icon('shuffle')} Shuffle</button></div>
    </div>
    <div class="pose-list" id="pose-list"></div>
    <div class="hip-start-row"><button type="button" class="btn" id="hip-start">${icon('play')} Start</button></div>
   </div>`;
   panel=area.querySelector('.hip-panel');
   $('#hip-counts').addEventListener('click',e=>{
    const btn=e.target.closest('.chip');if(!btn||btn.disabled)return;
    hipRegen(Number(btn.dataset.n),hipState.warmup,{});
    paintHipPanel(area);
   });
   $('#hip-warmup').addEventListener('change',e=>{
    const w=e.target.checked;prefs.set('hipWarmup',w);
    hipRegen(hipState.result.poses.length,w,{});
    paintHipPanel(area);
   });
   $('#hip-shuffle').addEventListener('click',()=>{
    hipRegen(hipState.result.poses.length,hipState.warmup,{freshSeed:true,keepOverride:[]});
    paintHipPanel(area);
   });
  }
  const result=hipState.result,max=HipOpener.maxCount(minutesEff(),hipState.warmup,META,countdown());
  const plan=Plan.compile(result.session,META,{countdown:countdown()});
  const summary=`${result.poses.length} pose${result.poses.length===1?'':'s'} · ${Plan.minutes(result.hold)} holds · ${Plan.minutes(result.rest)} rest · ${Plan.minutes(plan.duration)}`;
  $('#hip-counts').innerHTML=HipOpener.COUNTS.map(n=>`<button type="button" class="chip" data-n="${n}" aria-pressed="${result.poses.length===n}" ${n>max?'disabled':''}>${n}</button>`).join('');
  const warmupInput=$('#hip-warmup');if(warmupInput)warmupInput.checked=hipState.warmup;
  pulse($('#hip-summary'),summary);
  $('#hip-start').onclick=()=>startSession(result.session,{countdown:countdown()},'Hip Opener');
  paintPoseList($('#pose-list'),result);
 }
 function poseHoldText(id,result){
  const uni=!!(META[id]&&META[id].unilateral);
  return uni?`${Plan.minutes(result.perSide)} each side`:Plan.minutes(result.hold);
 }
 function paintPoseList(container,result){
  flipUpdate(container,result.poses,id=>id,(id,el)=>{
   const row=el||document.createElement('div');
   if(!el)row.className='pose-row';
   const pos=(SESS.hipPoses.find(p=>p.id===id)||{}).position||'';
   const label=displayName(id);
   row.innerHTML=`<span class="pose-thumb">${thumb(id,'thumb')}</span>
    <span class="pose-info"><span class="pose-name">${h(label)}</span><span class="pose-meta">${h(pos.charAt(0).toUpperCase()+pos.slice(1))}</span></span>
    <span class="pose-hold num">${h(poseHoldText(id,result))}</span>
    <button type="button" class="icon-btn" data-swap="${h(id)}" aria-label="Swap ${h(label)} for another pose">${icon('swap')}</button>`;
   row.querySelector('[data-swap]').onclick=()=>{
    const keep=hipState.result.poses.filter(p=>p!==id);
    hipRegen(hipState.result.poses.length,hipState.warmup,{freshSeed:true,keepOverride:keep});
    paintHipPanel($('#results-area'));
   };
   return row;
  });
 }

 /* ───────────────────────── Exercises page ───────────────────────── */
 const exState={q:'',filter:'all'};
 const EX_FILTERS=[
  {id:'all',label:'All'},{id:'climbing',label:'Climbing'},{id:'upper',label:'Upper body'},{id:'lower',label:'Lower body'},
  {id:'core',label:'Core'},{id:'hip',label:'Hip poses'},{id:'mobility',label:'Mobility'},{id:'strength',label:'Strength'}];
 function exercisePool(){
  return Object.keys(byId).map(id=>exercise(id)).filter(Boolean);
 }
 function matchesFilter(x,filter){
  const m=x.meta||{};
  switch(filter){
   case 'all':return true;
   case 'climbing':return x.kind==='Climbing';
   case 'upper':return m.target==='Arms';
   case 'lower':return m.target==='Legs';
   case 'core':return m.target==='Abs';
   case 'hip':return x.id.startsWith('hip-')&&x.media.type==='image';
   case 'mobility':return m.trainingType==='active-mobility'||m.trainingType==='static-stretch';
   case 'strength':return ['strength','isometric','skill','power'].includes(m.trainingType)||(m.trainingType||'').startsWith('finger-');
   default:return true;
  }
 }
 function searchHaystack(x){
  const m=x.meta||{};
  return [x.name,x.kind,x.area,...(m.tags||[]),...(m.regions||[]),...(m.aliases||[]),...(x.climbing||[]),...(x.equipment||[])].join(' ');
 }
 function renderExercises(){
  view.innerHTML=`<div class="page page-exercises">
   <div class="page-header"><span class="eyebrow">Library</span><h1 class="page-title">Exercises</h1></div>
   <div class="section">
    <div class="search-field">${icon('search','search-icon')}<input type="search" id="ex-search" placeholder="Search exercises" aria-label="Search exercises" value="${h(exState.q)}"></div>
    <div class="chip-row" id="ex-filters" role="group" aria-label="Filter"></div>
   </div>
   <div id="ex-grid-wrap"></div>
  </div>`;
  const filters=$('#ex-filters');
  filters.innerHTML=EX_FILTERS.map(f=>`<button type="button" class="chip" data-f="${f.id}" aria-pressed="${exState.filter===f.id}">${h(f.label)}</button>`).join('');
  filters.addEventListener('click',e=>{
   const btn=e.target.closest('.chip');if(!btn)return;
   exState.filter=btn.dataset.f;
   [...filters.children].forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
   updateExerciseGrid();
  });
  const input=$('#ex-search');
  input.addEventListener('input',debounce(()=>{exState.q=input.value;updateExerciseGrid();},150));
  updateExerciseGrid();
 }
 function updateExerciseGrid(){
  const wrap=$('#ex-grid-wrap');if(!wrap)return;
  const list=exercisePool().filter(x=>matchesFilter(x,exState.filter)).filter(x=>window.Search?Search.matches(searchHaystack(x),exState.q):true);
  if(!list.length){wrap.innerHTML='<p class="no-results">No exercises match. Try a different search or filter.</p>';return;}
  if(!wrap.querySelector('.exercise-grid'))wrap.innerHTML='<div class="exercise-grid" id="exercise-grid"></div>';
  const grid=$('#exercise-grid');
  flipUpdate(grid,list,x=>x.id,(x,el)=>buildExerciseCard(x,el));
 }
 function buildExerciseCard(x,existingEl){
  const el=existingEl||document.createElement('button');
  if(!existingEl){el.type='button';el.className='exercise-card';}
  const tags=[x.meta.difficulty,x.meta.target].filter(Boolean);
  el.innerHTML=`${thumb(x.id,'thumb')}
   <div class="exercise-card-body"><span class="exercise-card-name">${h(x.name)}</span>
    <div class="exercise-card-tags">${tags.map(t=>`<span class="tag">${h(t)}</span>`).join('')}</div></div>`;
  el.onclick=()=>go('#/exercise/'+encodeURIComponent(x.id),false);
  return el;
 }

 /* ───────────────────────── Session detail ───────────────────────── */
 function effectiveBlocks(session,meta,o){
  const out=[];
  (session.blocks||[]).forEach(b=>{
   const kind=Plan.kindOf(b.name);
   if(kind==='warm-up'&&!o.warmup)return;
   if(kind==='cool-down'&&!o.cooldown)return;
   if(!b.items||!b.items.length)return;
   const baseRounds=b.rounds||1;
   let rounds=kind==='main'&&baseRounds>1?Math.max(1,baseRounds+o.setsDelta):baseRounds;
   if(kind==='main'&&b.repeat&&o.repeat>1)rounds*=o.repeat;
   const rows=b.items.map(item=>{
    const m=meta[item.ex]||{};
    const baseSets=item.sets||1;
    const sets=kind==='main'&&baseRounds===1&&baseSets>1?Math.max(1,baseSets+o.setsDelta):baseSets;
    let rest=item.rest;
    if(rest!=null&&rest>=30&&o.restScale!==1)rest=Math.max(15,Math.round(rest*o.restScale/5)*5);
    return{...item,sets,rest,__m:m};
   });
   out.push({name:b.name,kind,rounds,rows});
  });
  return out;
 }
 function describeSetsDelta(n){return n===0?'Normal':`${n>0?'+':''}${n} set${Math.abs(n)>1?'s':''}`;}
 function renderSessionDetail(id){
  const session=SESS.sessions.find(s=>s.id===id);
  if(!session){go('#/',false);return;}
  const minutesPref=prefs.get('minutes','any');
  let o;
  if(minutesPref==='any')o={...Plan.DEFAULTS,countdown:countdown()};
  else o=Plan.fit(session,minutesPref,META,{countdown:countdown()}).options;
  const hasWarmup=(session.blocks||[]).some(b=>Plan.kindOf(b.name)==='warm-up');
  const hasCooldown=(session.blocks||[]).some(b=>Plan.kindOf(b.name)==='cool-down');
  const initialPlan=Plan.compile(session,META,o);
  const equip=equipmentLabels(Plan.equipmentOf(session,META));
  view.innerHTML=`<div class="page-session">
   <div class="session-hero"><div class="art" id="session-art"></div>
    <button type="button" class="icon-btn on-dark session-back" id="session-back" aria-label="Back">${icon('back')}</button>
    <div class="session-hero-content">
     <h1 class="session-hero-title">${h(session.title)}</h1>
     <p class="session-hero-summary">${h(session.summary)}</p>
     <div class="session-hero-tags">${(session.goals||[]).map(g=>`<span class="tag">${h(g)}</span>`).join('')}</div>
    </div>
   </div>
   <div class="container">
    <div class="section" style="margin-top:20px"><div class="stat-row">
     <div class="stat"><span class="stat-value num" id="stat-duration">${h(Plan.minutes(initialPlan.duration))}</span><span class="stat-label">Duration</span></div>
     <div class="stat"><span class="stat-value num" id="stat-exercises">0</span><span class="stat-label">Exercises</span></div>
     <div class="stat"><span class="stat-value">${h(session.level||'')}</span><span class="stat-label">Level</span></div>
     <div class="stat"><span class="stat-value">${equip.length?h(equip.slice(0,2).join(', ')):'Bodyweight'}</span><span class="stat-label">Equipment</span></div>
    </div></div>
    <div class="section"><h2 class="section-title">Adjust</h2><div class="adjust-card" id="adjust-card"></div></div>
    <div class="section"><h2 class="section-title">Exercises</h2><div id="exercise-list" style="display:flex;flex-direction:column;gap:18px"></div></div>
    <div class="section"><div class="why-card"><h2 class="section-title">Why this works</h2><p class="why-text">${h(session.why||'')}</p>
     ${(session.sources&&session.sources.length)?`<ul class="source-list">${session.sources.map(k=>{const src=SESS.sources[k];return src?`<li><a href="${h(src.url)}" target="_blank" rel="noopener">${h(src.label)} ↗</a></li>`:'';}).join('')}</ul>`:''}
    </div></div>
   </div>
   <div class="bottom-bar"><div class="bottom-bar-duration"><span class="num" id="bar-duration">${h(Plan.clock(initialPlan.duration))}</span><span>Duration</span></div>
    <button type="button" class="btn" id="bar-start">${icon('play')} Start</button></div>
  </div>`;
  mountArt($('#session-art'),session.id,session.category);
  setVT($('#session-art'),'card-art-'+session.id);
  $('#session-back').addEventListener('click',()=>go('#/',true));

  function paint(){
   const plan=Plan.compile(session,META,o);
   const blocks=effectiveBlocks(session,META,o);
   const exCount=blocks.reduce((n,b)=>n+b.rows.length,0);
   pulse($('#stat-duration'),Plan.minutes(plan.duration));
   const exEl=$('#stat-exercises');if(exEl)exEl.textContent=String(exCount);
   pulse($('#bar-duration'),Plan.clock(plan.duration));
   $('#exercise-list').innerHTML='';
   blocks.forEach((b,bi)=>{
    const group=document.createElement('div');group.className='block-group';
    group.innerHTML=`<div class="block-header">${h(b.name)}${b.rounds>1?`<span class="block-rounds">× ${b.rounds} rounds</span>`:''}</div>`;
    b.rows.forEach((row,ri)=>{
     const btn=document.createElement('button');btn.type='button';btn.className='exercise-row';
     btn.innerHTML=`${thumb(row.ex,'thumb')}<span class="exercise-row-info"><span class="exercise-row-name">${h(displayName(row.ex,row.label))}</span><span class="exercise-row-desc">${h(Plan.describe(row,row.__m))}</span></span>${icon('chevron','chev')}`;
     btn.addEventListener('click',()=>go('#/exercise/'+encodeURIComponent(row.ex),false));
     group.appendChild(btn);
    });
    $('#exercise-list').appendChild(group);
   });
   $('#bar-start').onclick=()=>startSession(session,o,session.title);
  }
  paint();

  const adjust=$('#adjust-card');
  function paintAdjust(){
   let html='';
   if(hasWarmup)html+=`<div class="adjust-row"><span class="adjust-row-label">Warm-up</span><label class="switch"><input type="checkbox" id="adj-warmup" ${o.warmup?'checked':''}><span class="switch-track"></span></label></div>`;
   if(hasCooldown)html+=`<div class="adjust-row"><span class="adjust-row-label">Cool-down</span><label class="switch"><input type="checkbox" id="adj-cooldown" ${o.cooldown?'checked':''}><span class="switch-track"></span></label></div>`;
   if(session.fixed){
    html+=`<p class="adjust-note">Published protocol — kept as studied.</p>`;
   }else{
    html+=`<div class="adjust-row"><span class="adjust-row-label">Sets</span><div class="stepper">
     <button type="button" id="sets-minus" aria-label="Fewer sets" ${o.setsDelta<=-2?'disabled':''}>${icon('minus')}</button>
     <span class="stepper-value">${h(describeSetsDelta(o.setsDelta))}</span>
     <button type="button" id="sets-plus" aria-label="More sets" ${o.setsDelta>=2?'disabled':''}>${icon('plus')}</button></div></div>`;
    html+=`<div class="adjust-row"><span class="adjust-row-label">Rest</span><div class="segmented" id="rest-seg">
     <button type="button" data-v="0.75" aria-pressed="${o.restScale===0.75}">Shorter</button>
     <button type="button" data-v="1" aria-pressed="${o.restScale===1}">Normal</button>
     <button type="button" data-v="1.25" aria-pressed="${o.restScale===1.25}">Longer</button>
     <span class="segmented-indicator" aria-hidden="true"></span></div></div>`;
   }
   adjust.innerHTML=html;
   if(hasWarmup)$('#adj-warmup').addEventListener('change',e=>{o.warmup=e.target.checked;paint();});
   if(hasCooldown)$('#adj-cooldown').addEventListener('change',e=>{o.cooldown=e.target.checked;paint();});
   if(!session.fixed){
    $('#sets-minus').addEventListener('click',()=>{o.setsDelta=Math.max(-2,o.setsDelta-1);paintAdjust();paint();});
    $('#sets-plus').addEventListener('click',()=>{o.setsDelta=Math.min(2,o.setsDelta+1);paintAdjust();paint();});
    const restSeg=$('#rest-seg');
    restSeg.addEventListener('click',e=>{
     const btn=e.target.closest('button[data-v]');if(!btn)return;
     o.restScale=Number(btn.dataset.v);
     [...restSeg.querySelectorAll('button')].forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
     syncIndicator(restSeg,'button','.segmented-indicator');
     paint();
    });
    requestAnimationFrame(()=>syncIndicator(restSeg,'button','.segmented-indicator'));
   }
  }
  paintAdjust();
 }

 /* ───────────────────────── router ───────────────────────── */
 const routeState={base:null,sheetId:null};
 let currentBaseRendered=null,lastHash=null;
 function matchExercise(hash){const m=hash.match(/^#\/exercise\/([^/?#]+)/);return m?decodeURIComponent(m[1]):null;}
 function renderBase(path){
  if(currentBaseRendered===path)return;
  currentBaseRendered=path;
  const m=path.match(/^#\/session\/([^/?#]+)/);
  if(path==='#/exercises')renderExercises();
  else if(m)renderSessionDetail(decodeURIComponent(m[1]));
  else renderHome();
  updateTabnav(path);
  window.scrollTo({top:0,behavior:reducedMotion()?'auto':'smooth'});
  requestAnimationFrame(syncAllIndicators);
 }
 function updateTabnav(path){
  const onExercises=path==='#/exercises';
  $$('.tabnav-btn').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.route==='/exercises')===onExercises)));
  syncIndicator($('#tabnav'),'.tabnav-btn','.tabnav-indicator');
 }
 function handleHash(){
  const hash=location.hash||'#/';
  if(hash===lastHash)return;
  lastHash=hash;
  const exId=matchExercise(hash);
  if(exId){
   if(!routeState.base)routeState.base='#/exercises';
   renderBase(routeState.base);
   routeState.sheetId=exId;
   openExerciseSheet(exId);
  }else{
   if(routeState.sheetId){routeState.sheetId=null;closeSheet();}
   routeState.base=hash;
   renderBase(hash);
  }
 }
 window.addEventListener('hashchange',handleHash);

 /* ───────────────────────── boot ───────────────────────── */
 function boot(){
  $('#wordmark-glyph').innerHTML=icon('climbing');
  $('#settings-open').innerHTML=icon('settings');
  $('#settings-open').addEventListener('click',openSettings);
  $$('.tabnav-btn').forEach(a=>a.addEventListener('click',e=>{
   e.preventDefault();
   go(a.getAttribute('href'),false);
  }));
  handleHash();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
