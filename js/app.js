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
 // iOS Safari only applies :active press states when a touchstart listener exists.
 document.addEventListener('touchstart',()=>{},{passive:true});

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
   if(!prior&&!reducedMotion()){
    el.classList.add('is-entering');el.style.setProperty('--stagger',Math.min(i,9));
    const done=e=>{if(e.target!==el)return;el.classList.remove('is-entering');el.removeEventListener('animationend',done);el.removeEventListener('animationcancel',done);};
    el.addEventListener('animationend',done);el.addEventListener('animationcancel',done);
   }
   frag.appendChild(el);
  });
  existing.forEach((el,key)=>{
   if(seen.has(key))return;
   const r=before.get(key)||el.getBoundingClientRect();
   const vtArt=el.querySelector('.art');if(vtArt)vtArt.style.viewTransitionName='';
   el.style.position='fixed';el.style.left=r.left+'px';el.style.top=r.top+'px';el.style.width=r.width+'px';el.style.height=r.height+'px';el.style.margin='0';el.style.zIndex='60';el.style.pointerEvents='none';
   document.body.appendChild(el);
   if(reducedMotion()){el.remove();return;}
   requestAnimationFrame(()=>{el.style.transition='opacity .22s var(--ease),transform .22s var(--ease)';el.style.opacity='0';el.style.transform='scale(.93)';});
   setTimeout(()=>el.remove(),240);
  });
  container.appendChild(frag);
  if(!reducedMotion()&&before.size){
   // Batched FLIP: read every new rect first (one layout), then write all inverted transforms,
   // then play them together next frame — no per-card layout thrash.
   const moves=[];
   [...container.children].forEach(el=>{
    const key=el.dataset&&el.dataset.key;
    if(!key||!before.has(key)||el.classList.contains('is-entering'))return;
    const prev=before.get(key),now=el.getBoundingClientRect();
    const dx=prev.left-now.left,dy=prev.top-now.top;
    if(Math.abs(dx)>=1||Math.abs(dy)>=1)moves.push([el,dx,dy]);
   });
   moves.forEach(([el,dx,dy])=>{el.style.transition='none';el.style.transform=`translate(${dx}px,${dy}px)`;});
   if(moves.length)requestAnimationFrame(()=>requestAnimationFrame(()=>moves.forEach(([el])=>{el.style.transition='transform .5s cubic-bezier(.22,1,.36,1)';el.style.transform='';const clr=e=>{if(e.target===el&&e.propertyName==='transform'){el.style.transition='';el.removeEventListener('transitionend',clr);}};el.addEventListener('transitionend',clr);})));
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
  if(x.id.startsWith('foot-'))return 'feet';
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
 const homeState={category:prefs.get('category','all'),minutes:prefs.get('minutes','any'),focus:prefs.get('focus',null),intensity:prefs.get('intensity','any')};
 const GEN_CATS=new Set(['hip','feet']); // categories with the random-generator panel, not a session list
 const minutesEff=()=>homeState.minutes==='any'?30:homeState.minutes;

 /* ── Intensity meta (shared by the slider, result cards, hero and session detail) ── */
 const INTENSITY_META={
  any:{label:'Any',aria:'Any intensity',icon:'all',cls:''},
  1:{label:'Relaxed',aria:'Relaxed',icon:'leaf',cls:'i1'},
  2:{label:'Elevated heart rate',aria:'Elevated heart rate',icon:'heartpulse',cls:'i2'},
  3:{label:'Strenuous',aria:'Strenuous',icon:'flame',cls:'i3'},
 };
 function intensityBadge(level,cls){
  const m=INTENSITY_META[level]||INTENSITY_META.any;
  return `<span class="intensity-badge ${m.cls}${cls?' '+cls:''}" title="${h(m.label)}" aria-label="${h(m.label)}">${icon(m.icon)}</span>`;
 }

 /* ───────────────────────── Stop-slider (time / intensity control) ─────────────────────────
    A touch-first discrete slider with real physics. N evenly spaced stops; the thumb is driven by a
    small spring simulation on requestAnimationFrame (transform/opacity only, idle when settled):
     • drag  — the thumb tracks the finger through a stiff spring, with soft "detent" magnetism near
               each stop and a rubber-band past the ends; the knob squashes with speed.
     • fling — on release the value is projected from the drag velocity, then a bouncy spring carries
               the thumb (and its momentum) into the chosen stop.
     • ticks — crossing a stop pings its tick, kicks the knob, rolls the readout and (where supported)
               fires a tiny haptic. The floating bubble hangs off the thumb and swings with its speed.
    Keyboard (arrows / Home / End / Page keys), role="slider" + aria-valuetext, a 44px hit target on
    the thumb, and tap-to-set on the track (committed on release, so a vertical scroll that starts on
    the track never changes the value). prefers-reduced-motion → no springs, no swing, no pings.
    Callers get onPreview(stop,i) whenever the stop under the thumb changes during a drag, and
    onCommit(stop,i) once the value is set; paintThumb(stop,i,dir) repaints labels; hooks.onFrame
    lets a caller animate thumb content off the same frame loop. */
 function rollText(el,html,dir){
  if(!el||el.innerHTML===html)return;
  el.innerHTML=html;
  if(reducedMotion()||typeof el.animate!=='function')return;
  if(el._roll)el._roll.cancel();
  const d=(dir||1)*9;
  el._roll=el.animate([{transform:`translateY(${d}px)`,opacity:0,filter:'blur(1.5px)'},{transform:'none',opacity:1,filter:'blur(0)'}],{duration:220,easing:'cubic-bezier(.2,.8,.2,1)'});
 }
 function buildStopSlider({root,stops,valueOf,initial,onPreview,onCommit,paintThumb,labels,colors,hooks}){
  hooks=hooks||{};
  const rail=root.querySelector('.stopslider-rail');
  const fill=root.querySelector('.stopslider-fill');
  const thumb=root.querySelector('.stopslider-thumb');
  const ticksWrap=root.querySelector('.stopslider-ticks');
  const bubble=root.querySelector('.stopslider-bubble');
  const n=stops.length;
  const fracOf=i=>n<=1?0:i/(n-1);
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  // Thumb: 44px transparent hit target → .stopslider-knob (the visible, squashable disc).
  const knob=document.createElement('span');knob.className='stopslider-knob';
  while(thumb.firstChild)knob.appendChild(thumb.firstChild);
  thumb.appendChild(knob);
  if(root.classList.contains('intensity')){const g=document.createElement('span');g.className='stopslider-glow';g.setAttribute('aria-hidden','true');thumb.insertBefore(g,knob);}
  const glow=thumb.querySelector('.stopslider-glow');
  ticksWrap.innerHTML=stops.map((_,i)=>`<span class="stopslider-tick" style="left:${(fracOf(i)*100).toFixed(4)}%"><i></i></span>`).join('');
  const ticks=[...ticksWrap.children];
  // Bubble layers: outer (follows + swings, JS) › inner (show/hide, CSS) › body (edge clamp, JS) › text (pop).
  bubble.setAttribute('aria-hidden','true');
  bubble.innerHTML='<span class="stopslider-bubble-inner"><span class="stopslider-bubble-body"><span class="stopslider-bubble-text"></span></span></span>';
  const bubbleBody=bubble.querySelector('.stopslider-bubble-body'),bubbleText=bubble.querySelector('.stopslider-bubble-text');
  let bubbleW=0;
  // Scale of stop labels under the track (decorative; the slider itself carries the a11y semantics).
  let scaleEls=[];
  if(labels){
   const scale=document.createElement('div');scale.className='stopslider-scale';scale.setAttribute('aria-hidden','true');
   scale.innerHTML=labels.map((l,i)=>`<span class="stopslider-stop" data-i="${i}" style="left:${(fracOf(i)*100).toFixed(4)}%">${l}</span>`).join('');
   root.appendChild(scale);
   scaleEls=[...scale.children];
   scale.addEventListener('click',e=>{const s=e.target.closest('.stopslider-stop');if(!s||disabled)return;setIndex(Number(s.dataset.i),{commit:true});});
  }

  let index=Math.max(0,stops.findIndex(s=>valueOf(s)===valueOf(initial)));
  let pos=fracOf(index),vel=0,target=pos,mode='idle';        // pos/vel in track fractions (vel per s)
  let dragTarget=pos,grab=0,dragging=false,press=null,disabled=false;
  let ks=1,kv=0,kTarget=1,hovering=false,focusVis=false;       // knob scale spring
  let swing=0,swingV=0;                                        // bubble pendulum (deg)
  let pointerFocus=false;
  let shownIdx=index,onCount=-1,raf=0,lastT=0,prevPx=0,velPx=0,settleAt=0;
  let INSET=14,TW=1,RW=1;
  const RM=()=>reducedMotion();
  function measure(){
   INSET=(knob.offsetWidth||28)/2;
   root.style.setProperty('--inset',INSET+'px');
   RW=rail.clientWidth||1;
   TW=Math.max(1,RW-INSET*2);
  }
  function fracFromClientX(x){const r=rail.getBoundingClientRect();return (x-r.left-INSET)/TW;}
  const nearestIndex=f=>clamp(Math.round(clamp(f,0,1)*(n-1)),0,n-1);
  // Rubber band past the ends + gentle magnetism towards the nearest stop (a soft detent).
  function shape(raw){
   const L=.045;
   if(raw<0)return -L*(1-1/(1+(-raw)*.55/L));
   if(raw>1)return 1+L*(1-1/(1+(raw-1)*.55/L));
   const s=Math.round(raw*(n-1))/(n-1),half=.5/(n-1),d=raw-s,t=Math.min(1,Math.abs(d)/half);
   return s+d*(.58+.42*t);
  }
  function colorAt(p){
   if(!colors)return null;
   const f=clamp(p,0,1)*(n-1),i=Math.min(n-2,Math.floor(f)),t=f-i;
   if(t<.002)return colors[i];if(t>.998)return colors[i+1];
   return `color-mix(in oklab,${colors[i]} ${((1-t)*100).toFixed(1)}%,${colors[i+1]})`;
  }
  function render(){
   const p=clamp(pos,-.06,1.06),x=INSET+p*TW;
   thumb.style.transform=`translate3d(${x.toFixed(2)}px,-50%,0)`;
   const w=clamp(pos,0,1)*TW;
   fill.style.clipPath=`inset(0 ${(TW-w).toFixed(2)}px 0 0 round 999px)`;
   const sp=Math.min(1,Math.abs(velPx)/2600);
   const sx=1+sp*.16,sy=1-sp*.1;
   knob.style.transform=`scale(${(ks*sx).toFixed(4)},${(ks*sy).toFixed(4)})`;
   if(colors){const c=colorAt(pos);root.style.setProperty('--thumb-c',c);}
   // bubble: attached to the thumb, body clamped inside the rail, swinging from its tail
   const half=bubbleW/2,shift=clamp(x,half+2,RW-half-2)-x;
   bubble.style.transform=`translate3d(${x.toFixed(2)}px,0,0) rotate(${swing.toFixed(2)}deg)`;
   bubbleBody.style.transform=`translateX(${shift.toFixed(1)}px)`;
   const c=clamp(Math.floor(clamp(pos,0,1)*(n-1)+.02)+1,0,n);
   if(c!==onCount){onCount=c;ticks.forEach((t,i)=>t.classList.toggle('on',i<c));}
  }
  function pingTick(i){
   const t=ticks[i];if(!t||RM())return;
   const ring=t.firstElementChild;
   if(ring&&ring.animate)ring.animate([{transform:'scale(.6)',opacity:.55},{transform:'scale(3.2)',opacity:0}],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'});
  }
  function showIdx(i,{detent}={}){
   if(i===shownIdx&&!detent)return;
   const dir=Math.sign(i-shownIdx)||1;
   shownIdx=i;
   paintThumb(stops[i],i,dir);
   bubbleW=bubbleBody.offsetWidth||bubbleW;
   scaleEls.forEach((s,k)=>s.classList.toggle('on',k===i));
   thumb.setAttribute('aria-valuenow',String(i));
   if(detent&&!RM()){
    pingTick(i);
    kv+=dragging?2.2:1.4;                              // knob "click" into the detent
    swingV+=dir*-38;
    if(bubbleText.animate)bubbleText.animate([{transform:'scale(1.12)'},{transform:'none'}],{duration:220,easing:'cubic-bezier(.2,.8,.2,1)'});
    if(dragging&&navigator.vibrate)try{navigator.vibrate(4);}catch(err){}
   }
  }
  // Semi-implicit Euler in 4 ms sub-steps: stable for the stiff drag spring, cheap for the rest.
  function stepSpring(x,v,to,k,zeta,dt){const c=2*Math.sqrt(k)*zeta;const a=-k*(x-to)-c*v;v+=a*dt;x+=v*dt;return[x,v];}
  function frame(now){
   raf=0;
   let dt=Math.min(.034,Math.max(0,(now-lastT)/1000));lastT=now;
   const steps=Math.max(1,Math.ceil(dt/.004)),h=dt/steps;
   for(let s=0;s<steps;s++){
    if(mode==='drag')[pos,vel]=stepSpring(pos,vel,dragTarget,2000,1,h);
    else if(mode==='spring')[pos,vel]=stepSpring(pos,vel,target,380,.56,h);
    [ks,kv]=stepSpring(ks,kv,kTarget,620,.42,h);
    [swing,swingV]=stepSpring(swing,swingV,0,160,.32,h);
   }
   const px=pos*TW;velPx=dt>0?(px-prevPx)/dt:0;prevPx=px;
   swingV+=clamp(-velPx*1.1,-2400,2400)*dt;                   // speed leans the bubble back, like a flag
   swing=clamp(swing,-14,14);
   if(mode==='spring'&&Math.abs(pos-target)<.0006&&Math.abs(vel)<.004){pos=target;vel=0;mode='idle';velPx=0;}
   render();
   const i=nearestIndex(pos);
   if(i!==shownIdx){
    showIdx(i,{detent:true});
    if(dragging)queuePreview(i);
   }
   let busy=mode!=='idle'||Math.abs(ks-kTarget)>.001||Math.abs(kv)>.01||Math.abs(swing)>.05||Math.abs(swingV)>.2;
   if(hooks.onFrame&&!RM()){
    const want=hooks.onFrame({t:now/1000,dt,pos,velPx,idx:shownIdx,active:dragging||hovering||focusVis,sinceSettle:(now-settleAt)/1000,thumbX:INSET+clamp(pos,0,1)*TW});
    busy=busy||!!want;
   }
   if(busy)raf=requestAnimationFrame(frame);
   else{velPx=0;render();}
  }
  // Live results while dragging, but only once the finger settles on a stop for a beat: a fast
  // sweep across several stops never stalls a frame on re-ranking/layout.
  let previewTimer=0;
  function queuePreview(i){clearTimeout(previewTimer);previewTimer=setTimeout(()=>{previewTimer=0;if(dragging)onPreview(stops[i],i);},110);}
  function kick(){if(!raf){lastT=performance.now();prevPx=pos*TW;raf=requestAnimationFrame(frame);}}
  function jumpTo(i){pos=target=dragTarget=fracOf(i);vel=0;mode='idle';velPx=0;render();showIdx(i);}
  function setIndex(i,{commit,animate=true}={}){
   i=clamp(i,0,n-1);
   index=i;target=fracOf(i);settleAt=performance.now();
   if(!animate||RM()){jumpTo(i);}
   else{mode='spring';kick();}
   if(commit){thumb.setAttribute('aria-valuenow',String(i));onCommit(stops[i],i);if(hooks.onCommit)hooks.onCommit(stops[i],i);}
  }
  function updateBubble(){root.classList.toggle('show-bubble',dragging||focusVis);}
  function startDrag(clientX){
   dragging=true;mode='drag';kTarget=1.18;
   root.classList.add('is-dragging');updateBubble();
   dragTarget=shape(fracFromClientX(clientX)-grab);
   if(RM()){pos=dragTarget;}
   kick();
  }
  function release({fling}){
   clearTimeout(previewTimer);previewTimer=0;
   dragging=false;kTarget=hovering?1.07:1;
   root.classList.remove('is-dragging');updateBubble();
   const projected=fling?pos+clamp(vel,-4,4)*.085:pos;
   vel=clamp(vel,-3,3);
   setIndex(nearestIndex(projected),{commit:true});
  }
  rail.addEventListener('pointerdown',e=>{
   if(disabled||(e.pointerType==='mouse'&&e.button!==0))return;
   const onThumb=thumb.contains(e.target);
   measure();
   press={id:e.pointerId,x0:e.clientX,y0:e.clientY,onThumb};
   try{rail.setPointerCapture(e.pointerId);}catch(err){}
   pointerFocus=true;try{thumb.focus({preventScroll:true});}catch(err){}pointerFocus=false;
   setKbd(false);
   if(onThumb){grab=fracFromClientX(e.clientX)-pos;e.preventDefault();startDrag(e.clientX);}
   else if(e.pointerType==='mouse'){grab=0;e.preventDefault();startDrag(e.clientX);}
   else{grab=0;kTarget=1.08;kick();}   // touch on the track: tap-to-set on release, or drag once it moves sideways
  });
  rail.addEventListener('pointermove',e=>{
   if(e.pointerType==='mouse'&&!press){
    const r=thumb.getBoundingClientRect(),over=Math.abs(e.clientX-(r.left+r.width/2))<r.width/2&&Math.abs(e.clientY-(r.top+r.height/2))<r.height/2;
    if(over!==hovering){hovering=over;if(!dragging)kTarget=over?1.07:1;root.classList.toggle('is-hover',over);kick();}
   }
   if(!press||e.pointerId!==press.id)return;
   if(!dragging){
    const dx=e.clientX-press.x0,dy=e.clientY-press.y0;
    if(Math.abs(dx)>6&&Math.abs(dx)>Math.abs(dy))startDrag(e.clientX);
    return;
   }
   dragTarget=shape(fracFromClientX(e.clientX)-grab);
   if(RM()){pos=dragTarget;render();const i=nearestIndex(pos);if(i!==shownIdx){showIdx(i);queuePreview(i);}}
   else kick();
  });
  function endPress(e,cancelled){
   if(!press||e.pointerId!==press.id)return;
   const p=press;press=null;
   if(dragging){release({fling:!cancelled});return;}
   kTarget=hovering?1.07:1;kick();
   if(!cancelled&&!p.onThumb)setIndex(nearestIndex(fracFromClientX(e.clientX)),{commit:true});
  }
  rail.addEventListener('pointerup',e=>endPress(e,false));
  rail.addEventListener('pointercancel',e=>endPress(e,true));
  rail.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&hovering&&!press){hovering=false;kTarget=1;root.classList.remove('is-hover');kick();}});
  // Focus ring + bubble only for keyboard focus (pointer-initiated focus stays quiet).
  function setKbd(v){focusVis=v;root.classList.toggle('kbd-focus',v);updateBubble();if(v)kick();}
  thumb.addEventListener('focus',()=>{if(!pointerFocus&&!press)setKbd(thumb.matches(':focus-visible'));});
  thumb.addEventListener('blur',()=>setKbd(false));
  thumb.addEventListener('keydown',e=>{
   if(disabled)return;
   let next=null;
   if(e.key==='ArrowLeft'||e.key==='ArrowDown'||e.key==='PageDown')next=index-1;
   else if(e.key==='ArrowRight'||e.key==='ArrowUp'||e.key==='PageUp')next=index+1;
   else if(e.key==='Home')next=0;
   else if(e.key==='End')next=n-1;
   if(next==null)return;
   e.preventDefault();
   if(!focusVis)setKbd(true);
   next=clamp(next,0,n-1);
   if(next===index){kv-=1.6*(RM()?0:1);swingV+=(next===0?30:-30);kick();return;} // bump against the end
   setIndex(next,{commit:true});
  });
  window.addEventListener('resize',debounce(()=>{if(!root.isConnected)return;measure();render();},100));
  thumb.setAttribute('aria-valuemin','0');
  thumb.setAttribute('aria-valuemax',String(n-1));
  measure();
  shownIdx=-1;jumpTo(index);
  return {
   setValue(v,{animate}={}){
    const i=stops.findIndex(s=>valueOf(s)===valueOf(v));
    if(i<0||i===index)return;
    setIndex(i,{animate:animate!==false});
   },
   setDisabled(v){disabled=v;thumb.setAttribute('aria-disabled',String(v));thumb.tabIndex=v?-1:0;root.classList.toggle('is-disabled',v);},
  };
 }

 function greeting(){
  const hr=new Date().getHours();
  return hr<12?'Good morning':hr<18?'Good afternoon':'Good evening';
 }
 function poolFor(category,focus,intensity){
  let pool=category==='all'?SESS.sessions.slice():SESS.sessions.filter(s=>s.category===category);
  if(focus)pool=pool.filter(s=>(s.focus||[]).includes(focus));
  // Hip Opener is always relaxed and has its own UI, not this list — the intensity filter never applies to it.
  if(intensity&&intensity!=='any'&&!GEN_CATS.has(category))pool=pool.filter(s=>s.intensity===intensity);
  return pool;
 }
 // Plan.fit is pure for a given session/minutes/countdown — cache it so dragging the time slider back
 // and forth only pays for each stop once (keeps drag frames well under budget).
 const fitCache=new Map();
 function fitCached(s,minutes){
  const key=s.id+'|'+minutes+'|'+countdown();
  let res=fitCache.get(key);
  if(!res){res=Plan.fit(s,minutes,META,{countdown:countdown()});fitCache.set(key,res);if(fitCache.size>2000)fitCache.clear();}
  return res;
 }
 function computeResults(category,minutesSel,focus,intensity){
  const pool=poolFor(category,focus,intensity),isAny=minutesSel==='any';
  const items=pool.map((s,i)=>{
   if(isAny){const plan=Plan.compile(s,META,{countdown:countdown()});return{session:s,plan,changed:[],fits:!!plan.steps.length,idx:i,options:{...Plan.DEFAULTS,countdown:countdown()},score:0};}
   const res=fitCached(s,minutesSel);
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
    <div class="control-panel" id="control-panel">
     <div class="stopslider" id="time-slider">
      <div class="stopslider-head">
       <span class="stopslider-label">${icon('clock')}<span>Time</span></span>
       <span class="stopslider-readout num" id="time-readout"></span>
      </div>
      <div class="stopslider-rail" id="time-rail">
       <div class="stopslider-track-bg"></div>
       <div class="stopslider-fill" id="time-fill"></div>
       <div class="stopslider-ticks"></div>
       <div class="stopslider-thumb" id="time-thumb" role="slider" tabindex="0" aria-label="Time available"></div>
       <span class="stopslider-bubble" id="time-bubble"></span>
      </div>
     </div>
     <div class="stopslider intensity" id="intensity-slider">
      <div class="stopslider-head">
       <span class="stopslider-label">${icon('bolt')}<span>Intensity</span></span>
       <span class="stopslider-readout" id="intensity-readout"></span>
      </div>
      <div class="stopslider-rail" id="intensity-rail">
       <div class="stopslider-track-bg"></div>
       <div class="stopslider-fill" id="intensity-fill"></div>
       <div class="stopslider-ticks"></div>
       <div class="stopslider-thumb" id="intensity-thumb" role="slider" tabindex="0" aria-label="Intensity">
        <span class="stopslider-thumb-icon"></span>
       </div>
       <span class="stopslider-bubble" id="intensity-bubble"></span>
      </div>
     </div>
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
  buildTimeSlider();
  buildIntensitySlider();
  if(intensitySlider)intensitySlider.setDisabled(GEN_CATS.has(homeState.category));
  buildFocusChips(true);
  updateResults();
 }

 function buildCategoryTiles(){
  const row=$('#cat-tiles');
  row.innerHTML=CATEGORY_LIST.map(c=>`
   <button type="button" class="category-tile${c.id==='all'?' is-neutral':''}${homeState.category===c.id?' on':''}" data-cat="${c.id}"
    aria-pressed="${homeState.category===c.id}" style="--tile-c:${c.id==='all'?'var(--ink)':'var(--'+c.id+')'}">
    ${icon(c.icon)}<span class="category-tile-label">${h(c.label)}</span>
   </button>`).join('')+'<span class="tile-indicator" aria-hidden="true"></span>';
  row.addEventListener('click',e=>{
   const btn=e.target.closest('.category-tile');if(!btn)return;
   setCategory(btn.dataset.cat);
  });
  requestAnimationFrame(()=>moveTileIndicator(false));
 }
 // A ring that glides between category tiles (stretching mid-flight), while the chosen tile's tint
 // fades in underneath and its icon does a small bounce.
 function moveTileIndicator(animate){
  const row=$('#cat-tiles');if(!row)return;
  const ind=row.querySelector('.tile-indicator'),t=row.querySelector('.category-tile.on');
  if(!ind)return;
  if(!t){ind.style.opacity='0';return;}
  const x=t.offsetLeft,y=t.offsetTop,w=t.offsetWidth,hh=t.offsetHeight,prev=ind._x;
  ind.style.opacity='1';ind.style.width=w+'px';ind.style.height=hh+'px';
  ind.style.setProperty('--tile-c',t.style.getPropertyValue('--tile-c'));
  ind.classList.toggle('is-neutral',t.classList.contains('is-neutral'));
  ind.style.transform=`translate3d(${x}px,${y}px,0)`;ind._x=x;
  if(animate&&prev!=null&&prev!==x&&!reducedMotion()&&ind.animate){
   const d=x-prev,st=1+Math.min(.28,Math.abs(d)/w*.07);
   if(ind._anim)ind._anim.cancel();
   ind._anim=ind.animate([
    {transform:`translate3d(${prev}px,${y}px,0)`},
    {transform:`translate3d(${prev+d*.5}px,${y}px,0) scale(${st},${(1/Math.sqrt(st)).toFixed(3)})`,offset:.42},
    {transform:`translate3d(${x+Math.sign(d)*Math.min(7,Math.abs(d)*.04)}px,${y}px,0) scale(.985,1.01)`,offset:.78},
    {transform:`translate3d(${x}px,${y}px,0)`}],{duration:560,easing:'cubic-bezier(.3,.7,.3,1)'});
   const ic=t.querySelector('.icon');
   if(ic&&ic.animate)ic.animate([{transform:'scale(1)'},{transform:`scale(.72) rotate(${d>0?-10:10}deg)`,offset:.28},{transform:'scale(1.2) rotate(0deg)',offset:.62},{transform:'scale(1)'}],{duration:520,delay:90,easing:'cubic-bezier(.3,.7,.3,1)'});
  }
 }
 window.addEventListener('resize',debounce(()=>moveTileIndicator(false),120));
 const TIME_STOPS=[5,10,15,20,30,45,60,'any'];
 const timeLabel=v=>v==='any'?'Any':`${v} min`;
 const timeReadout=v=>v==='any'?'<span class="ro-n">Any</span>':`<span class="ro-n">${v}</span><span class="ro-u">min</span>`;
 let timeSlider=null,intensitySlider=null;
 function buildTimeSlider(){
  const root=$('#time-slider');
  const readout=$('#time-readout'),thumb=$('#time-thumb');
  timeSlider=buildStopSlider({
   root,stops:TIME_STOPS,valueOf:v=>v,initial:homeState.minutes,
   labels:TIME_STOPS.map(v=>v==='any'?'Any':String(v)),
   paintThumb(v,i,dir){
    const label=timeLabel(v);
    rollText(readout,timeReadout(v),dir);
    const t=root.querySelector('.stopslider-bubble-text');if(t&&t.textContent!==label)t.textContent=label;
    thumb.setAttribute('aria-valuetext',v==='any'?'Any duration':`${v} minutes`);
   },
   onPreview(v){homeState.minutes=v;updateResults();},
   onCommit(v){setMinutes(v,{fromSlider:true});},
  });
 }
 const intensityLabelOf=v=>(INTENSITY_META[v]||INTENSITY_META.any).label;
 const INTENSITY_STOPS=['any',1,2,3];
 // Multi-part thumb glyphs so each part can move on its own (all 24×24, stroked like Crux icons).
 const INTENSITY_GLYPHS={
  any:`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect class="g-sq" x="4.5" y="4.5" width="6" height="6" rx="1.6"/><rect class="g-sq" x="13.5" y="4.5" width="6" height="6" rx="1.6"/><rect class="g-sq" x="4.5" y="13.5" width="6" height="6" rx="1.6"/><rect class="g-sq" x="13.5" y="13.5" width="6" height="6" rx="1.6"/></svg>`,
  1:`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><g class="g-leaf"><path d="M5 19c9 1 14-4 14-13-9 0-14 4-14 13Z" class="g-leaf-body"/><path d="M5 19c1.5-4.5 4.5-8 9.5-10.5"/></g></svg>`,
  2:`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><g class="g-heart"><path class="g-heart-body" d="M12 20C12 20 4 14 4 8.7 4 5.7 6.4 3.3 9.3 3.3 10.9 3.3 12 4.3 12 4.3 12 4.3 13.1 3.3 14.7 3.3 17.6 3.3 20 5.7 20 8.7 20 14 12 20 12 20Z"/></g><path class="g-ecg" pathLength="1" d="M4.3 11h3l1.4-3 2 5.5 1.3-3.5 1 1.5h6.3"/></svg>`,
  3:`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><g class="g-flame"><path class="g-flame-body" d="M12 21c3.9 0 6.5-2.6 6.5-6.3 0-3.5-2.4-5.8-4.3-8.3-.4 1.7-1.3 3-2.6 3.6.2-2.9-1-5.3-3.1-7-.3 3.3-5 6.1-5 11.7C3.5 18.4 7.6 21 12 21Z"/></g><path class="g-flame-core" d="M12 20.2c-1.8 0-3-1.2-3-2.8 0-1.8 1.4-2.8 2.4-4.3.4 1.3 1.2 1.9 2 2.3.9.5 1.6 1.3 1.6 2.3 0 1.4-1.2 2.5-3 2.5Z"/></svg>`,
 };
 function buildIntensitySlider(){
  const root=$('#intensity-slider');
  const thumb=$('#intensity-thumb'),thumbIcon=thumb.querySelector('.stopslider-thumb-icon'),readout=$('#intensity-readout');
  thumbIcon.innerHTML=INTENSITY_STOPS.map(v=>`<span class="ico ${(INTENSITY_META[v]||{}).cls||'i0'}" data-v="${v}">${INTENSITY_GLYPHS[v]}</span>`).join('');
  const icos=[...thumbIcon.children];
  const q=(i,sel)=>icos[i].querySelector(sel);
  const leaf=q(1,'.g-leaf'),heart=q(2,'.g-heart'),ecg=q(2,'.g-ecg'),flame=q(3,'.g-flame'),core=q(3,'.g-flame-core');
  leaf.style.transformOrigin='5px 19px';heart.style.transformOrigin='12px 13px';flame.style.transformOrigin='12px 21px';core.style.transformOrigin='12px 20.5px';
  const rail=root.querySelector('.stopslider-rail'),glow=()=>thumb.querySelector('.stopslider-glow');
  // ember pool for the strenuous stop
  const embers=[];let emberAt=0,beat=0,lastIdx=-1,burst=0;
  function ember(x,strong){
   let el=embers.find(e=>!e._busy);
   if(!el){if(embers.length>=14)return;el=document.createElement('span');el.className='stopslider-ember';el.setAttribute('aria-hidden','true');rail.appendChild(el);embers.push(el);}
   el._busy=true;
   const dx=(Math.random()-.5)*(strong?34:20),rise=24+Math.random()*(strong?34:22),sz=.6+Math.random()*.7,dur=620+Math.random()*520;
   el.style.left=(x+(Math.random()-.5)*10)+'px';
   const a=el.animate([{transform:`translate(-50%,0) scale(${sz})`,opacity:0},{transform:`translate(calc(-50% + ${dx*.35}px),${-rise*.3}px) scale(${sz})`,opacity:.95,offset:.18},{transform:`translate(calc(-50% + ${dx}px),${-rise}px) scale(0)`,opacity:0}],{duration:dur,easing:'cubic-bezier(.25,.6,.4,1)'});
   a.onfinish=a.oncancel=()=>{el._busy=false;};
  }
  const bump=(f,c,w)=>f>=c&&f<=c+w?Math.sin(Math.PI*(f-c)/w):0;
  function onFrame({t,dt,pos,velPx,idx,active,sinceSettle,thumbX}){
   // energy: full while held / hovered / keyboard-focused, then a ~2 s decaying "arrival" flourish
   const arrive=Math.max(0,1-sinceSettle/2.1),E=active?1:arrive*arrive*(3-2*arrive);
   const lean=Math.max(-1,Math.min(1,velPx/1400));
   // 1 · leaf sways in the breeze and leans against the motion
   leaf.style.transform=`rotate(${(E*Math.sin(t*2.6)*9-lean*16).toFixed(2)}deg)`;
   // 2 · heart beats lub-dub; tempo rises with the slider position (≈70 → 160 bpm)
   const bpm=70+95*Math.max(0,Math.min(1,(pos-.2)/.8));
   beat+=dt*bpm/60;const f=beat%1;
   const s=1+E*(.2*bump(f,0,.13)+.1*bump(f,.2,.12));
   heart.style.transform=`scale(${s.toFixed(3)})`;
   if(E>.02){ecg.style.strokeDasharray='.42 1';ecg.style.strokeDashoffset=String((1.42-f*1.84).toFixed(3));ecg.style.opacity=String(.45+.55*E);}
   else{ecg.style.strokeDasharray='';ecg.style.strokeDashoffset='';ecg.style.opacity='';}
   // 3 · flame flickers (layered sines ≈ noise), leans away from the drag, core breathes
   const heat=Math.max(0,Math.min(1,(pos-.66)/.34));
   const nz=Math.sin(t*13.1)*.5+Math.sin(t*21.7+1.3)*.3+Math.sin(t*7.3+2.1)*.2;
   const fl=E*.5+heat*.5;
   flame.style.transform=`skewX(${(-lean*14+fl*3*Math.sin(t*9.2)).toFixed(2)}deg) scale(${(1-fl*.04*nz).toFixed(3)},${(1+fl*.1*nz).toFixed(3)})`;
   core.style.transform=`scale(${(1+fl*.2*Math.sin(t*17.3+.7)).toFixed(3)})`;
   const g=glow();
   if(g){g.style.opacity=(heat*(.55+.25*E+.12*nz*fl)).toFixed(3);g.style.transform=`translate(-50%,-50%) scale(${(.85+heat*.25+.06*nz*fl).toFixed(3)})`;}
   // embers: a burst on arriving at Strenuous, a trickle while held there
   if(idx!==lastIdx){if(idx===3&&lastIdx!==-1)burst=7;lastIdx=idx;}
   if(heat>.55){
    if(burst>0&&t-emberAt>.035){ember(thumbX,true);burst--;emberAt=t;}
    else if(active&&t-emberAt>.16-.06*heat){ember(thumbX,false);emberAt=t;}
   }
   return E>.01||burst>0;
  }
  intensitySlider=buildStopSlider({
   root,stops:INTENSITY_STOPS,valueOf:v=>v,initial:homeState.intensity,
   labels:INTENSITY_STOPS.map(v=>v==='any'?'Any':`<span class="stop-ico ${INTENSITY_META[v].cls}">${icon(INTENSITY_META[v].icon)}</span>`),
   colors:['var(--ink-2)','var(--intensity-1)','var(--intensity-2)','var(--intensity-3)'],
   hooks:{onFrame,onCommit(v,i){
    if(v==='any'&&!reducedMotion())icos[0].querySelectorAll('.g-sq').forEach((sq,k)=>sq.animate([{transform:'scale(.2)',opacity:0},{transform:'scale(1.15)',opacity:1,offset:.6},{transform:'none',opacity:1}],{duration:420,delay:k*55,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'}));
   }},
   paintThumb(v,i,dir){
    const m=INTENSITY_META[v]||INTENSITY_META.any;
    icos.forEach((el,k)=>el.classList.toggle('is-on',k===i));
    root.dataset.level=String(v);
    rollText(readout,h(m.label),dir);
    const t=root.querySelector('.stopslider-bubble-text');if(t&&t.textContent!==m.label)t.textContent=m.label;
    thumb.setAttribute('aria-valuetext',m.aria);
   },
   onPreview(v){homeState.intensity=v;updateResults();},
   onCommit(v){setIntensity(v);},
  });
  icos[0].querySelectorAll('.g-sq').forEach(sq=>{sq.style.transformBox='fill-box';sq.style.transformOrigin='center';});
 }
 function buildFocusChips(instant){
  const row=$('#focus-chips'),group=$('#focus-group');
  const cat=SESS.categories.find(c=>c.id===homeState.category);
  const list=(cat&&cat.focus)||[];
  const hideRow=homeState.category==='all'||GEN_CATS.has(homeState.category)||!list.length;
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
  $$('#cat-tiles .category-tile').forEach(b=>{const on=b.dataset.cat===id;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});
  moveTileIndicator(true);
  const onTile=$('#cat-tiles .category-tile.on');
  if(onTile){const row=$('#cat-tiles');if(row.scrollWidth>row.clientWidth+2){const l=onTile.offsetLeft-16,r=onTile.offsetLeft+onTile.offsetWidth+16;if(l<row.scrollLeft||r>row.scrollLeft+row.clientWidth)row.scrollTo({left:l<row.scrollLeft?l:r-row.clientWidth,behavior:reducedMotion()?'auto':'smooth'});}}
  buildFocusChips(false);
  if(intensitySlider)intensitySlider.setDisabled(GEN_CATS.has(id));
  updateResults();
 }
 function setMinutes(v){
  homeState.minutes=v;prefs.set('minutes',v);
  if(timeSlider)timeSlider.setValue(v);
  updateResults();
 }
 function setIntensity(v){
  homeState.intensity=v;prefs.set('intensity',v);
  if(intensitySlider)intensitySlider.setValue(v);
  updateResults();
 }
 function setFocus(f){
  homeState.focus=f;prefs.set('focus',f);
  [...$('#focus-chips').children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.focus===f)));
  updateResults();
 }

 function updateResults(){
  const area=$('#results-area');if(!area)return;
  if(GEN_CATS.has(homeState.category)){renderGenSection(homeState.category,area);return;}
  const items=computeResults(homeState.category,homeState.minutes,homeState.focus,homeState.intensity);
  if(!items.length){renderEmptyState(area);return;}
  const countLine=homeState.minutes==='any'?`${items.length} workout${items.length===1?'':'s'}`:`${items.length} workout${items.length===1?'':'s'} fit in ${homeState.minutes} min`;
  const hero=items[0],rest=items.slice(1);
  // Keep the skeleton between updates so the hero can update in place and cards FLIP instead of re-entering.
  if(!area.querySelector(':scope > .results-head')||!$('#hero-slot')||!$('#result-grid')){
   area.innerHTML=`<div class="results-head"><span class="results-count"></span></div><div id="hero-slot" class="hero-slot"></div><div class="result-grid" id="result-grid"></div>`;
  }
  const countEl=area.querySelector('.results-count');
  if(countEl.textContent!==countLine){if(countEl.textContent)rollText(countEl,h(countLine),1);else countEl.textContent=countLine;}
  paintHero($('#hero-slot'),hero);
  flipUpdate($('#result-grid'),rest,x=>x.session.id,(item,el)=>buildResultCard(item,el));
 }

 function countTo(el,to){
  if(!el)return;
  const from=Number(el.textContent)||0;
  if(from===to)return;
  if(reducedMotion()||!el.animate){el.textContent=String(to);return;}
  if(el._pop)el._pop.cancel();
  cancelAnimationFrame(el._raf);
  const t0=performance.now(),dur=Math.min(620,260+Math.abs(to-from)*14);
  const step=now=>{const k=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-k,3);el.textContent=String(Math.round(from+(to-from)*e));if(k<1)el._raf=requestAnimationFrame(step);};
  el._raf=requestAnimationFrame(step);
  el._pop=el.animate([{transform:'scale(1)'},{transform:`translateY(${to>from?-2:2}px) scale(1.08)`,offset:.35},{transform:'none'}],{duration:dur+120,easing:'cubic-bezier(.3,.7,.3,1)'});
 }
 function heroFittedHTML(changed){return changed&&changed.length?`<span class="hero-fitted">${icon('info')} Fitted: ${h(changed.join(', '))}</span>`:'';}
 function paintHero(slot,item){
  const {session:s,plan,changed}=item;
  const mins=Math.round(plan.duration/60);
  const cur=slot.querySelector('.hero-card:not(.is-leaving)');
  if(cur&&cur.dataset.id===s.id){
   // Same workout: update in place — the duration counts to its new value, the fitted note swaps.
   cur._item=item;
   countTo(cur.querySelector('.hero-duration-num'),mins);
   const fw=cur.querySelector('.hero-fitted-wrap'),fh=heroFittedHTML(changed);
   if(fw&&fw.innerHTML!==fh)rollText(fw,fh,1);
   return;
  }
  const el=document.createElement('div');
  el.className='hero-card';el.dataset.id=s.id;el._item=item;
  const equip=equipmentLabels(Plan.equipmentOf(s,META));
  const trainsLine=(s.goals&&s.goals.length)?`<p class="hero-trains">Trains ${h(s.goals.join(', '))}</p>`:'';
  el.innerHTML=`<div class="hero-art-wrap"><div class="art" id="hero-art"></div></div><span class="hero-eyebrow">Best match</span>
   <div class="hero-content">
    <h2 class="hero-title">${h(s.title)}</h2>
    <p class="hero-summary">${h(s.summary)}</p>
    ${trainsLine}
    <div class="hero-tags">
     <span class="tag">${h(s.level)}</span>
     ${equip.map(e=>`<span class="tag">${h(e)}</span>`).join('')}
    </div>
    <div class="hero-fitted-wrap">${heroFittedHTML(changed)}</div>
    <div class="hero-cta">
     <div class="hero-duration">
      <div class="hero-duration-row"><span class="hero-duration-num num" id="hero-duration">${mins}</span>${intensityBadge(s.intensity,'on-dark')}</div>
      <span class="hero-duration-label">minutes</span>
     </div>
     <button type="button" class="btn hero-start" data-stop-tap>${icon('play')} Start</button>
    </div>
   </div>`;
  if(cur){
   // Cross-fade: the outgoing hero lifts off on top while the new one settles in underneath.
   const art=cur.querySelector('.art');if(art)art.style.viewTransitionName='';
   cur.removeAttribute('id');cur.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
   cur.classList.add('is-leaving');cur.setAttribute('aria-hidden','true');cur.inert=true;
   if(reducedMotion()||!cur.animate)cur.remove();
   else{const a=cur.animate([{opacity:1},{opacity:0}],{duration:300,easing:'cubic-bezier(.4,0,.6,1)',fill:'forwards'});a.onfinish=()=>cur.remove();}
   el.classList.add('is-swapping');
  }else el.classList.add('is-arriving');
  slot.insertBefore(el,slot.firstChild);
  mountArt(el.querySelector('#hero-art'),s.id,s.category);
  setVT(el.querySelector('#hero-art'),'card-art-'+s.id);
  makeTappable(el,()=>go('#/session/'+encodeURIComponent(s.id),true),'Open '+s.title+' details');
  el.querySelector('.hero-start').addEventListener('click',()=>startSession(s,el._item.options,s.title));
  // Gentle parallax on the art for mouse/trackpad hover (no-op on touch).
  if(matchMedia('(hover:hover) and (pointer:fine)').matches&&!reducedMotion()){
   let raf=0,px=0,py=0;
   el.addEventListener('pointermove',e=>{
    if(e.pointerType!=='mouse')return;
    const r=el.getBoundingClientRect();px=(e.clientX-r.left)/r.width-.5;py=(e.clientY-r.top)/r.height-.5;
    if(!raf)raf=requestAnimationFrame(()=>{raf=0;el.style.setProperty('--px',px.toFixed(3));el.style.setProperty('--py',py.toFixed(3));});
   });
   el.addEventListener('pointerleave',()=>{el.style.setProperty('--px','0');el.style.setProperty('--py','0');});
  }
  const clear=e=>{if(e.target===el){el.classList.remove('is-arriving','is-swapping');}};
  el.addEventListener('animationend',clear);
 }
 function buildResultCard(item,existingEl){
  const {session:s,plan}=item;
  const mins=Math.round(plan.duration/60);
  if(existingEl&&existingEl.dataset.id===s.id&&existingEl.querySelector('.result-duration-num')){
   const num=existingEl.querySelector('.result-duration-num');
   if(num.textContent!==String(mins))rollText(num,String(mins),mins>Number(num.textContent)?1:-1);
   return existingEl;
  }
  const el=existingEl||document.createElement('button');
  el.dataset.id=s.id;
  if(!existingEl){el.type='button';el.className='result-card';}
  const equip=equipmentLabels(Plan.equipmentOf(s,META));
  el.innerHTML=`<div class="result-art"><div class="art" id="art-${h(s.id)}"></div>
    <span class="result-cat-icon" style="color:var(--${s.category})">${icon(catIcon(s.category))}</span>
    <span class="result-duration-badge"><span class="result-duration-num">${mins}</span> min${intensityBadge(s.intensity,'sm')}</span></div>
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
  if(!el._sheen&&matchMedia('(hover:hover) and (pointer:fine)').matches){
   el._sheen=true;
   el.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const r=el.getBoundingClientRect();el.style.setProperty('--mx',((e.clientX-r.left)/r.width*100).toFixed(1)+'%');el.style.setProperty('--my',((e.clientY-r.top)/r.height*100).toFixed(1)+'%');});
  }
  return el;
 }
 function renderEmptyState(area){
  const pool=poolFor(homeState.category,homeState.focus,homeState.intensity);
  const shortest=pool.map(s=>({s,dur:Plan.compile(s,META,{countdown:countdown()}).duration})).sort((a,b)=>a.dur-b.dur).slice(0,3);
  area.innerHTML=`<div class="empty-state">
   <h3>Nothing fits in ${homeState.minutes==='any'?'that window':homeState.minutes+' min'} yet</h3>
   <p>Try a longer window, a different category, or one of the shortest options here:</p>
   <div class="empty-list">${shortest.map(x=>`<div class="empty-list-item"><span>${h(x.s.title)}</span><span>Needs ${h(Plan.minutes(x.dur))}</span></div>`).join('')||'<div class="empty-list-item"><span>No sessions in this category yet</span></div>'}</div>
  </div>`;
 }

 /* ── Random generator panels: Hip Opener and Foot Training share this UI (count chips,
    Warm-up toggle, list with swap, Shuffle, Start), each driven by its own module + pool. ── */
 const genStates={}; // {hip:{seed,warmup,result}, feet:{...}}
 function genConfig(catId){
  if(catId==='feet')return {
   mod:window.FootTraining,pool:SESS.footPool,secondary:SESS.footGroups,
   countKey:'feetCount',warmupKey:'feetWarmup',label:'Exercises',
   emptyMsg:'Foot Training needs at least 10 minutes to fit an exercise and its rest.',
   ids:result=>result.exercises,
   rowMeta:id=>{const g=(SESS.footPool.find(p=>p.id===id)||{}).group||'';return g.charAt(0).toUpperCase()+g.slice(1);},
   holdText:id=>{const m=META[id]||{},dose=m.dose||{},txt=Plan.fmt(dose.workSeconds||30);return m.unilateral?`${txt} each side`:txt;},
   summary:(result,plan)=>`${result.exercises.length} exercise${result.exercises.length===1?'':'s'} · ${Plan.minutes(plan.duration)}`,
   startLabel:'Foot Training',
  };
  return {
   mod:window.HipOpener,pool:SESS.hipPoses,secondary:SESS.positions,
   countKey:'hipCount',warmupKey:'hipWarmup',label:'Poses',
   emptyMsg:'Hip Opener needs at least 10 minutes — each pose is a 6-minute hold.',
   ids:result=>result.poses,
   rowMeta:id=>{const pos=(SESS.hipPoses.find(p=>p.id===id)||{}).position||'';return pos.charAt(0).toUpperCase()+pos.slice(1);},
   holdText:(id,result)=>{const uni=!!(META[id]&&META[id].unilateral);return uni?`${Plan.minutes(result.perSide)} each side`:Plan.minutes(result.hold);},
   summary:(result,plan)=>`${result.poses.length} pose${result.poses.length===1?'':'s'} · ${Plan.minutes(result.hold)} holds · ${Plan.minutes(result.rest)} rest · ${Plan.minutes(plan.duration)}`,
   startLabel:'Hip Opener',
  };
 }
 function genRegen(catId,count,warmup,opts){
  const cfg=genConfig(catId);opts=opts||{};
  const st=genStates[catId];
  const seed=opts.freshSeed?(Date.now()+Math.floor(Math.random()*1e6)):(st?st.seed:Date.now());
  const keep=opts.keepOverride!==undefined?opts.keepOverride:(st&&st.result?cfg.ids(st.result).slice(0,count):[]);
  const result=cfg.mod.generate({minutes:minutesEff(),count,warmup,seed,countdown:countdown(),keep},cfg.pool,cfg.secondary,META);
  genStates[catId]={seed,warmup,result};
  prefs.set(cfg.countKey,count);
  return result;
 }
 function renderGenSection(catId,area){
  const cfg=genConfig(catId);
  if(!cfg.mod){area.innerHTML=`<div class="empty-state"><h3>${h(cfg.startLabel)} unavailable</h3><p>The generator module did not load.</p></div>`;return;}
  const warmupPref=genStates[catId]?genStates[catId].warmup:prefs.get(cfg.warmupKey,false);
  const max=cfg.mod.maxCount(minutesEff(),warmupPref,META,countdown(),cfg.pool);
  if(!genStates[catId]){
   const saved=prefs.get(cfg.countKey,null);
   const initCount=(saved&&cfg.mod.COUNTS.includes(saved)&&saved<=max)?saved:max;
   if(max>0)genRegen(catId,initCount,warmupPref,{freshSeed:true,keepOverride:[]});
   else genStates[catId]={seed:0,warmup:warmupPref,result:null};
  }else{
   const st=genStates[catId];
   const curCount=st.result?cfg.ids(st.result).length:0;
   if(max===0)st.result=null;
   else if(!st.result||curCount>max)genRegen(catId,Math.min(Math.max(curCount||max,1),max),st.warmup,{});
  }
  paintGenPanel(catId,area);
 }
 // Rebuilds only when coming from the "nothing fits" note; otherwise updates the existing
 // skeleton in place so the list keeps its persistent container for flipUpdate to diff against.
 function paintGenPanel(catId,area){
  const cfg=genConfig(catId),st=genStates[catId];
  if(!st.result){
   area.innerHTML=`<div class="hip-empty">
    <p>${h(cfg.emptyMsg)}</p>
    <button type="button" class="btn btn-sm" id="gen-use-10" style="margin-top:10px">Use 10 min</button>
   </div>`;
   $('#gen-use-10').addEventListener('click',()=>setMinutes(10));
   return;
  }
  let panel=area.querySelector(`.hip-panel[data-gen="${catId}"]`);
  if(!panel){
   area.innerHTML=`<div class="hip-panel" data-gen="${catId}" style="--cat-color:var(--${catId})">
    <div class="hip-count-row"><span class="row-label">${h(cfg.label)}</span><div class="chip-row" id="gen-counts" role="group" aria-label="Number of ${h(cfg.label.toLowerCase())}"></div></div>
    <div class="hip-toolbar">
     <label class="switch"><input type="checkbox" id="gen-warmup"><span class="switch-track"></span><span class="switch-label">Warm-up</span></label>
     <span class="hip-summary num" id="gen-summary"></span>
     <div class="hip-actions"><button type="button" class="btn btn-secondary btn-sm" id="gen-shuffle">${icon('shuffle')} Shuffle</button></div>
    </div>
    <div class="pose-list" id="gen-list"></div>
    <div class="hip-start-row"><button type="button" class="btn" id="gen-start">${icon('play')} Start</button></div>
   </div>`;
   panel=area.querySelector(`.hip-panel[data-gen="${catId}"]`);
   $('#gen-counts').addEventListener('click',e=>{
    const btn=e.target.closest('.chip');if(!btn||btn.disabled)return;
    genRegen(catId,Number(btn.dataset.n),genStates[catId].warmup,{});
    paintGenPanel(catId,area);
   });
   $('#gen-warmup').addEventListener('change',e=>{
    const w=e.target.checked;prefs.set(cfg.warmupKey,w);
    genRegen(catId,cfg.ids(genStates[catId].result).length,w,{});
    paintGenPanel(catId,area);
   });
   $('#gen-shuffle').addEventListener('click',()=>{
    genRegen(catId,cfg.ids(genStates[catId].result).length,genStates[catId].warmup,{freshSeed:true,keepOverride:[]});
    paintGenPanel(catId,area);
   });
  }
  const result=genStates[catId].result,max=cfg.mod.maxCount(minutesEff(),genStates[catId].warmup,META,countdown(),cfg.pool);
  const plan=Plan.compile(result.session,META,{countdown:countdown()});
  const summary=cfg.summary(result,plan);
  $('#gen-counts').innerHTML=cfg.mod.COUNTS.map(n=>`<button type="button" class="chip" data-n="${n}" aria-pressed="${cfg.ids(result).length===n}" ${n>max?'disabled':''}>${n}</button>`).join('');
  const warmupInput=$('#gen-warmup');if(warmupInput)warmupInput.checked=genStates[catId].warmup;
  pulse($('#gen-summary'),summary);
  $('#gen-start').onclick=()=>startSession(result.session,{countdown:countdown()},cfg.startLabel);
  paintGenList(catId,$('#gen-list'),result);
 }
 function paintGenList(catId,container,result){
  const cfg=genConfig(catId),ids=cfg.ids(result);
  flipUpdate(container,ids,id=>id,(id,el)=>{
   const row=el||document.createElement('div');
   if(!el)row.className='pose-row';
   const label=displayName(id);
   row.innerHTML=`<span class="pose-thumb">${thumb(id,'thumb')}</span>
    <span class="pose-info"><span class="pose-name">${h(label)}</span><span class="pose-meta">${h(cfg.rowMeta(id))}</span></span>
    <span class="pose-hold num">${h(cfg.holdText(id,result))}</span>
    <button type="button" class="icon-btn" data-swap="${h(id)}" aria-label="Swap ${h(label)} for another">${icon('swap')}</button>`;
   row.querySelector('[data-swap]').onclick=()=>{
    const keep=ids.filter(p=>p!==id);
    genRegen(catId,ids.length,genStates[catId].warmup,{freshSeed:true,keepOverride:keep});
    paintGenPanel(catId,$('#results-area'));
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
     <div class="stat"><span class="stat-value stat-value-intensity">${intensityBadge(session.intensity)}${h(INTENSITY_META[session.intensity].label)}</span><span class="stat-label">Intensity</span></div>
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
