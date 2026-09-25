/* Crux.Player — the immersive full-screen workout player.
   Crux.Player.start({session,options,title}) · resumeAvailable() · resume() · discard()
   Emits Crux.emit('player:closed') when the overlay is torn down. */
(function(){
 const Crux=window.Crux=window.Crux||{};
 const {h,icon,prefs,exercise,thumb,displayName,reducedMotion}=Crux;
 const LIVE_KEY='crux-live',MAX_RESUME_AGE=6*60*60*1000,RING_R=104,RING_CIRC=2*Math.PI*RING_R;
 const HOLD_MS=120000; // timed work at/above this gets m:ss + halfway/1-min/30-s voice cues

 // ── module state ────────────────────────────────────────────────────────────
 let root=null,els={},blockSegEls=[];
 let session=null,options=null,title=null,steps=null,blocks=null,countdownOpt=5,category=null,COLORS=null;
 let state=null,raf=null,lastFrame=0,saveIntervalId=null,wakeLockSentinel=null,confettiRaf=null;
 let previousFocus=null,endConfirmOpen=false,wasPausedBeforeConfirm=false,completionShown=false;
 let currentMediaEx=null,showingOptions=false,figureController=null,ringIsIndeterminate=false;
 let activeGlow='a',lastGlowColor=null;
 let lastRingNum=null,lastRingCap=null,lastTickCheckedSecond=null,lastRemainSec=null,lastElapsedSec=null;
 let milestonesDone=new Set(),lastAnnounced={ex:null,side:null,set:null};

 // ── small pure helpers ──────────────────────────────────────────────────────
 function cssVar(name){try{return (getComputedStyle(document.documentElement).getPropertyValue(name)||'').trim()||null;}catch{return null;}}
 function formatCountdown(sec){sec=Math.max(0,Math.round(sec));return sec>=60?Plan.clock(sec):String(sec);}
 function phaseLabelText(){
  if(!state)return'';
  if(state.phase==='ready')return'GET READY';
  if(state.phase==='work'){
   const st=Engine.current(state);
   if(st&&st.kind==='warm-up')return'WARM-UP';
   if(st&&st.kind==='cool-down')return'COOL-DOWN';
   return'WORK';
  }
  if(state.phase==='rest')return isSideSwitchRest()?'SWITCH SIDES':'REST';
  if(state.phase==='done')return'DONE';
  return'';
 }
 function isSideSwitchRest(){
  if(!state||state.phase!=='rest')return false;
  const cur=Engine.current(state),next=steps[state.index+1];
  return !!(next&&next.ex===cur.ex&&next.side!==cur.side&&cur.rest<=5);
 }
 function stepPrescription(step){
  const parts=[];
  if(step.mode==='reps')parts.push(`${step.reps} reps`);
  else parts.push(step.work>=60?Plan.clock(step.work):`${step.work} s`);
  if(step.hangs)parts.push(`${step.hangs} hangs`);
  if(step.side&&step.side!=='Both')parts.push(`${step.side} side`);
  return parts.join(' · ');
 }
 function stageBadgeText(step){
  if(!step)return'';
  if(step.hangs)return`Hang ${step.hang} of ${step.hangs}`;
  if(step.sets>1)return`Set ${step.set} of ${step.sets}`;
  if(step.rounds>1)return`Round ${step.round} of ${step.rounds}`;
  return'';
 }
 function counterLineText(step){
  if(!step)return'';
  const parts=[];
  if(step.sets>1)parts.push(`Set ${step.set} of ${step.sets}`);
  if(step.hangs)parts.push(`Hang ${step.hang} of ${step.hangs}`);
  if(step.rounds>1)parts.push(`Round ${step.round} of ${step.rounds}`);
  return parts.join(' · ');
 }

 // ── public API ───────────────────────────────────────────────────────────────
 function start({session:sess,options:opts={},title:t}={}){
  if(!sess||!sess.blocks){Crux.toast&&Crux.toast('Nothing to play');return;}
  removeStaleRoot();
  session=sess;options={...opts};title=t||sess.title||'Workout';
  countdownOpt=prefs.get('countdown',5);
  const compiled=Plan.compile(session,Crux.META,{...options,countdown:countdownOpt});
  steps=compiled.steps;blocks=compiled.blocks;
  if(!steps.length){Crux.toast&&Crux.toast('Nothing to play');return;}
  category=session.category;
  COLORS={ready:cssVar('--ready')||'#F5B431',rest:'#DCE4E0',work:cssVar('--'+category)||cssVar('--strength')||'#4D65F2'};
  lastAnnounced={ex:null,side:null,set:null};
  Crux.Audio&&Crux.Audio.unlock();
  state=Engine.create(steps,{countdown:countdownOpt});
  buildUI();
  openOverlay();
  syncDisplay();
  renderFrame();
  saveLive();
 }
 function resumeAvailable(){
  let raw;try{raw=localStorage.getItem(LIVE_KEY);}catch{return null;}
  if(!raw)return null;
  let data;try{data=JSON.parse(raw);}catch{return null;}
  if(!data||!data.savedAt||!data.session)return null;
  if(Date.now()-data.savedAt>=MAX_RESUME_AGE)return null;
  let total=0,idx=0;
  try{
   const compiled=Plan.compile(data.session,Crux.META,{...(data.options||{}),countdown:prefs.get('countdown',5)});
   total=compiled.steps.length;
   idx=data.snapshot&&typeof data.snapshot.index==='number'?data.snapshot.index:0;
  }catch{return null;}
  if(!total)return null;
  return {title:data.title||data.session.title||'Workout',step:Math.min(total,idx+1),total,savedAt:data.savedAt};
 }
 function resume(){
  let raw;try{raw=localStorage.getItem(LIVE_KEY);}catch{raw=null;}
  if(!raw)return;
  let data;try{data=JSON.parse(raw);}catch{data=null;}
  if(!data||!data.session)return;
  removeStaleRoot();
  session=data.session;options={...(data.options||{})};title=data.title||session.title||'Workout';
  countdownOpt=prefs.get('countdown',5);
  const compiled=Plan.compile(session,Crux.META,{...options,countdown:countdownOpt});
  steps=compiled.steps;blocks=compiled.blocks;
  if(!steps.length)return;
  category=session.category;
  COLORS={ready:cssVar('--ready')||'#F5B431',rest:'#DCE4E0',work:cssVar('--'+category)||cssVar('--strength')||'#4D65F2'};
  lastAnnounced={ex:null,side:null,set:null};
  Crux.Audio&&Crux.Audio.unlock();
  state=Engine.restore(steps,data.snapshot,{countdown:countdownOpt});
  buildUI();
  openOverlay();
  syncDisplay();
  renderFrame();
  if(state.paused&&figureController){try{figureController.pause();}catch{}} // restore() always opens paused
  saveLive();
 }
 function discard(){clearLive();}

 // ── persistence ──────────────────────────────────────────────────────────────
 function saveLive(){
  if(!state)return;
  try{localStorage.setItem(LIVE_KEY,JSON.stringify({session,options,title,snapshot:Engine.snapshot(state),savedAt:Date.now()}));}catch{}
 }
 function clearLive(){try{localStorage.removeItem(LIVE_KEY);}catch{}}

 // ── DOM build ────────────────────────────────────────────────────────────────
 function removeStaleRoot(){
  if(raf){try{cancelAnimationFrame(raf);}catch{}raf=null;}
  if(saveIntervalId){clearInterval(saveIntervalId);saveIntervalId=null;}
  if(root){try{root.remove();}catch{}root=null;}
 }
 function buildUI(){
  root=document.createElement('div');
  root.className='crux-player';
  root.setAttribute('role','dialog');
  root.setAttribute('aria-modal','true');
  root.setAttribute('aria-label',title||'Workout player');
  root.tabIndex=-1;
  root.innerHTML=`
   <div class="cp-live visually-hidden" aria-live="polite"></div>
   <div class="cp-glow"><span class="cp-glow-layer a"></span><span class="cp-glow-layer b"></span></div>
   <header class="cp-top">
    <button class="icon-btn plain cp-close" aria-label="Close workout">${icon('close')}</button>
    <div class="cp-top-text">
     <div class="cp-top-title">${h(title)}</div>
     <div class="cp-top-block"></div>
    </div>
    <div class="cp-top-time num"></div>
    <button class="icon-btn plain cp-sound" aria-pressed="true" aria-label="Mute sound"></button>
    <button class="icon-btn plain cp-voice" aria-pressed="true" aria-label="Turn off voice cues">${icon('voice')}</button>
   </header>
   <div class="cp-progress"></div>
   <div class="cp-body">
    <div class="cp-stage" aria-hidden="true">
     <div class="cp-media">
      <video class="cp-video" hidden muted loop playsinline preload="auto"></video>
      <div class="cp-photo-card" hidden><img class="cp-photo-img" alt=""><button type="button" class="cp-easier-btn" hidden>Easier options</button></div>
      <div class="cp-figure" hidden></div>
      <div class="cp-instruction" hidden><div class="cp-instruction-badge"><img class="cp-instruction-img" alt=""></div><p class="cp-instruction-text"></p></div>
     </div>
     <div class="cp-stage-badges"><span class="cp-badge cp-badge-side" hidden></span><span class="cp-badge cp-badge-set" hidden></span></div>
     <div class="cp-upnext-label" hidden>Up next</div>
    </div>
    <div class="cp-controls">
     <div class="cp-phase round"></div>
     <h1 class="cp-exname round"></h1>
     <div class="cp-counter num"></div>
     <div class="cp-ring-wrap">
      <svg class="cp-ring" viewBox="0 0 240 240"><circle class="cp-ring-track" cx="120" cy="120" r="${RING_R}"/><circle class="cp-ring-fill" cx="120" cy="120" r="${RING_R}"/></svg>
      <div class="cp-ring-center"><div class="cp-ring-num num"></div><div class="cp-ring-cap"></div></div>
     </div>
     <div class="cp-elapsed num" hidden></div>
     <p class="cp-cue"></p>
     <p class="cp-target"></p>
     <div class="cp-reps" hidden>
      <button type="button" class="icon-btn cp-rep-minus" aria-label="Decrease reps">${icon('minus')}</button>
      <div class="cp-rep-count num">0</div>
      <button type="button" class="icon-btn cp-rep-plus" aria-label="Increase reps">${icon('plus')}</button>
      <button type="button" class="btn cp-rep-done">Done</button>
     </div>
     <div class="cp-rest-panel" hidden>
      <div class="cp-upnext-card"></div>
      <div class="cp-rest-actions">
       <button type="button" class="btn-secondary btn cp-addtime">+15 s</button>
       <button type="button" class="btn-secondary btn cp-skiprest">Skip rest</button>
      </div>
     </div>
     <div class="cp-transport">
      <button type="button" class="icon-btn cp-prev" aria-label="Previous">${icon('prev')}</button>
      <button type="button" class="cp-playpause" aria-label="Pause workout">${icon('pause')}</button>
      <button type="button" class="icon-btn cp-next" aria-label="Next">${icon('next')}</button>
     </div>
    </div>
   </div>
   <div class="cp-paused"><div class="cp-paused-card"><div class="cp-paused-title">Paused</div><button type="button" class="cp-resume-btn" aria-label="Resume workout">${icon('play')}</button></div></div>
   <div class="cp-endconfirm" role="alertdialog" aria-label="End workout?"><div class="cp-endconfirm-card"><h2>End workout?</h2><div class="cp-endconfirm-actions"><button type="button" class="btn-secondary btn cp-keepgoing">Keep going</button><button type="button" class="btn cp-confirmend">End workout</button></div></div></div>
   <div class="cp-complete" hidden></div>`;
  cacheEls();
  els.ringFill.style.strokeDasharray=String(RING_CIRC);
  els.ringFill.style.strokeDashoffset=String(RING_CIRC);
  blockSegEls=(blocks||[]).map(()=>{const seg=document.createElement('div');seg.className='cp-progress-seg';seg.style.setProperty('--fill-amt','0');els.progress.appendChild(seg);return seg;});
  renderSoundBtn();renderVoiceBtn();
  attachButtonEvents();
  attachStageGestures();
 }
 function cacheEls(){
  const q=s=>root.querySelector(s);
  els={
   live:q('.cp-live'),glowA:q('.cp-glow-layer.a'),glowB:q('.cp-glow-layer.b'),
   close:q('.cp-close'),topTitle:q('.cp-top-title'),blockName:q('.cp-top-block'),timeLeft:q('.cp-top-time'),
   sound:q('.cp-sound'),voice:q('.cp-voice'),progress:q('.cp-progress'),
   stage:q('.cp-stage'),media:q('.cp-media'),video:q('.cp-video'),
   photoCard:q('.cp-photo-card'),photoImg:q('.cp-photo-img'),easierBtn:q('.cp-easier-btn'),
   figureBox:q('.cp-figure'),instructionBox:q('.cp-instruction'),instructionImg:q('.cp-instruction-img'),instructionText:q('.cp-instruction-text'),
   badgeSide:q('.cp-badge-side'),badgeSet:q('.cp-badge-set'),upnextLabel:q('.cp-upnext-label'),
   phase:q('.cp-phase'),exname:q('.cp-exname'),counter:q('.cp-counter'),
   ringWrap:q('.cp-ring-wrap'),ringFill:q('.cp-ring-fill'),ringNum:q('.cp-ring-num'),ringCap:q('.cp-ring-cap'),elapsed:q('.cp-elapsed'),
   cue:q('.cp-cue'),target:q('.cp-target'),
   reps:q('.cp-reps'),repMinus:q('.cp-rep-minus'),repCount:q('.cp-rep-count'),repPlus:q('.cp-rep-plus'),repDone:q('.cp-rep-done'),
   restPanel:q('.cp-rest-panel'),upnextCard:q('.cp-upnext-card'),addTimeBtn:q('.cp-addtime'),skipRestBtn:q('.cp-skiprest'),
   prev:q('.cp-prev'),playpause:q('.cp-playpause'),next:q('.cp-next'),
   paused:q('.cp-paused'),resumeBtn:q('.cp-resume-btn'),
   endConfirm:q('.cp-endconfirm'),keepGoingBtn:q('.cp-keepgoing'),confirmEndBtn:q('.cp-confirmend'),
   top:q('.cp-top'),body:q('.cp-body'),complete:q('.cp-complete'),
  };
 }
 function attachButtonEvents(){
  els.close.addEventListener('click',()=>showEndConfirm(true));
  els.sound.addEventListener('click',()=>{prefs.set('sound',!prefs.get('sound',true));renderSoundBtn();});
  els.voice.addEventListener('click',()=>{prefs.set('voice',!prefs.get('voice',true));renderVoiceBtn();});
  els.prev.addEventListener('click',previous);
  els.next.addEventListener('click',next);
  els.playpause.addEventListener('click',togglePause);
  els.repMinus.addEventListener('click',()=>changeRep(-1));
  els.repPlus.addEventListener('click',()=>changeRep(1));
  els.repDone.addEventListener('click',next);
  els.addTimeBtn.addEventListener('click',()=>{if(state){Engine.addTime(state,15000);}});
  els.skipRestBtn.addEventListener('click',next);
  els.resumeBtn.addEventListener('click',()=>setPaused(false));
  els.keepGoingBtn.addEventListener('click',keepGoing);
  els.confirmEndBtn.addEventListener('click',confirmEndWorkout);
 }
 function attachStageGestures(){
  let sx=0,sy=0,st=0,pid=null;
  els.stage.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;pid=e.pointerId;sx=e.clientX;sy=e.clientY;st=Date.now();});
  els.stage.addEventListener('pointerup',e=>{
   if(pid!==e.pointerId)return;pid=null;
   if(e.target.closest('button'))return;
   const dx=e.clientX-sx,dy=e.clientY-sy,dt=Date.now()-st;
   if(Math.abs(dx)>44&&Math.abs(dx)>Math.abs(dy)*1.4){dx<0?next():previous();return;}
   if(Math.abs(dx)<12&&Math.abs(dy)<12&&dt<450)togglePause();
  });
 }

 // ── open / teardown ──────────────────────────────────────────────────────────
 function openOverlay(){
  previousFocus=document.activeElement;
  document.body.appendChild(root);
  document.documentElement.classList.add('crux-no-scroll');
  document.addEventListener('keydown',onKeydown,true);
  document.addEventListener('visibilitychange',onVisibility);
  saveIntervalId=setInterval(()=>{if(state&&!state.paused&&!state.done)saveLive();},5000);
  requestWakeLock();
  startLoop();
  try{els.close.focus();}catch{}
 }
 function teardown(){
  stopConfetti();
  if(raf){cancelAnimationFrame(raf);raf=null;}
  if(saveIntervalId){clearInterval(saveIntervalId);saveIntervalId=null;}
  releaseWakeLock();
  document.removeEventListener('keydown',onKeydown,true);
  document.removeEventListener('visibilitychange',onVisibility);
  if(figureController){try{figureController.destroy();}catch{}figureController=null;}
  document.documentElement.classList.remove('crux-no-scroll');
  if(root&&root.parentNode)root.remove();
  root=null;els={};blockSegEls=[];
  const pf=previousFocus;previousFocus=null;
  if(pf&&typeof pf.focus==='function'){try{pf.focus();}catch{}}
  state=null;completionShown=false;endConfirmOpen=false;currentMediaEx=null;
  Crux.emit&&Crux.emit('player:closed');
 }

 // ── main loop ────────────────────────────────────────────────────────────────
 function startLoop(){lastFrame=0;raf=requestAnimationFrame(loop);}
 function loop(ts){
  raf=requestAnimationFrame(loop);
  if(!state||state.done)return;
  if(!lastFrame)lastFrame=ts;
  let dt=ts-lastFrame;lastFrame=ts;
  if(dt>1000)dt=1000;if(dt<0)dt=0;
  const before={phase:state.phase,index:state.index};
  Engine.tick(state,dt);
  const after={phase:state.phase,index:state.index};
  if(before.phase!==after.phase||before.index!==after.index)onTransition(before,after);
  renderFrame();
 }
 function withTransition(fn){
  if(!state)return;
  const before={phase:state.phase,index:state.index};
  fn();
  const after={phase:state.phase,index:state.index};
  if(before.phase!==after.phase||before.index!==after.index)onTransition(before,after);
  renderFrame();
 }
 function onTransition(before,after){
  if(before.phase==='work'&&after.phase!=='done')Crux.Audio&&Crux.Audio.beep('stop');
  if(after.phase==='work')Crux.Audio&&Crux.Audio.beep('go');
  syncDisplay();
  if(after.phase==='work')maybeAnnounceWork();
  if(after.phase==='rest')maybeAnnounceRest();
  if(after.phase==='done'){onComplete();return;}
  saveLive();
 }
 function maybeAnnounceWork(){
  const st=Engine.current(state);
  if(st.hang&&st.hang!==1)return; // only the first hang of an interval set
  if(st.ex===lastAnnounced.ex&&st.side===lastAnnounced.side&&st.set===lastAnnounced.set)return;
  lastAnnounced={ex:st.ex,side:st.side,set:st.set};
  let phrase=displayName(st.ex,st.label);
  if(st.side&&st.side!=='Both')phrase+=`, ${st.side.toLowerCase()} side`;
  phrase+='.';
  if(st.sets>1)phrase+=` Set ${st.set} of ${st.sets}.`;
  Crux.Audio&&Crux.Audio.say(phrase);
 }
 function maybeAnnounceRest(){
  const cur=Engine.current(state),nxt=steps[state.index+1];
  if(!nxt||cur.rest<10)return;
  const sideSwitch=nxt.ex===cur.ex&&nxt.side!==cur.side;
  Crux.Audio&&Crux.Audio.say(sideSwitch?'Switch sides.':`Rest. Next up: ${displayName(nxt.ex,nxt.label)}.`);
 }
 function checkHoldMilestones(secLeft,totalSec){
  const order=[['half',Math.round(totalSec/2)],['min1',60],['sec30',30]];
  for(const [id,target] of order){
   if(milestonesDone.has(id))continue;
   if(secLeft<=target){
    milestonesDone.add(id);
    Crux.Audio&&Crux.Audio.say(id==='half'?'Halfway.':id==='min1'?'One minute left.':'Thirty seconds.');
    break;
   }
  }
 }
 function onComplete(){
  if(raf){cancelAnimationFrame(raf);raf=null;}
  if(saveIntervalId){clearInterval(saveIntervalId);saveIntervalId=null;}
  releaseWakeLock();
  clearLive();
  Crux.Audio&&Crux.Audio.beep('done');
  Crux.Audio&&Crux.Audio.say('Workout complete. Nice work.');
  showCompletion();
 }

 // ── per-frame render (cheap, called every rAF) ────────────────────────────────
 function ringInfo(){
  const st=Engine.current(state);
  if(state.phase==='work'&&st.mode==='reps')return{indeterminate:true,num:String(st.reps||0),cap:'REPS'};
  const totalMs=state.phaseTotal||0,secLeft=Math.max(0,Math.ceil((state.remaining||0)/1000));
  const text=formatCountdown(secLeft);
  return{indeterminate:false,num:text,cap:'',longClass:text.length>=4,
   fraction:totalMs>0?Math.min(1,Math.max(0,1-(state.remaining||0)/totalMs)):1,secLeft};
 }
 function renderFrame(){
  if(!state)return;
  const info=ringInfo();
  if(info.indeterminate!==ringIsIndeterminate){
   ringIsIndeterminate=info.indeterminate;
   els.ringWrap.classList.toggle('is-indeterminate',ringIsIndeterminate);
   els.ringFill.style.strokeDasharray=ringIsIndeterminate?`${RING_CIRC*0.26} ${RING_CIRC}`:String(RING_CIRC);
   els.ringFill.style.strokeDashoffset='0';
  }
  if(!info.indeterminate)els.ringFill.style.strokeDashoffset=String(RING_CIRC*(1-info.fraction));
  if(info.num!==lastRingNum){lastRingNum=info.num;els.ringNum.textContent=info.num;els.ringNum.classList.toggle('is-long',!!info.longClass);}
  if(info.cap!==lastRingCap){lastRingCap=info.cap;els.ringCap.textContent=info.cap;}

  const pulse=!info.indeterminate&&state.phase!=='done'&&info.secLeft<=3&&!state.paused&&!reducedMotion();
  els.ringWrap.classList.toggle('is-pulse',pulse);

  if(info.indeterminate){
   const elSec=Math.floor((state.phaseElapsed||0)/1000);
   if(elSec!==lastElapsedSec){lastElapsedSec=elSec;els.elapsed.textContent=formatCountdown(elSec);}
  }

  if(!state.paused&&!info.indeterminate&&info.secLeft!==lastTickCheckedSecond){
   lastTickCheckedSecond=info.secLeft;
   const st=Engine.current(state);
   if(info.secLeft>=0&&info.secLeft<=3&&(state.phase==='ready'||state.phase==='rest'||(state.phase==='work'&&st.mode==='time'))){
    Crux.Audio&&Crux.Audio.beep('tick',{quiet:state.phase==='work'});
   }
   if(state.phase==='work'&&st.mode==='time'&&state.phaseTotal>=HOLD_MS){
    checkHoldMilestones(info.secLeft,Math.round(state.phaseTotal/1000));
   }
  }

  const remainSec=Math.ceil(Engine.remainingPlanned(state));
  if(remainSec!==lastRemainSec){lastRemainSec=remainSec;els.timeLeft.textContent=Plan.clock(remainSec);}

  updateProgressFractions();
 }
 function blockFraction(b){
  if(state.done||state.index>b.end)return 1;
  if(state.index<b.start)return 0;
  const n=b.end-b.start+1,doneSteps=state.index-b.start,st=Engine.current(state);
  const stepTotal=(st.work||0)+(st.rest||0);
  let cur=stepTotal;
  if(state.phase==='ready')cur=0;
  else if(state.phase==='work')cur=st.mode==='reps'?Math.min(st.work||1,(state.phaseElapsed||0)/1000):Math.max(0,st.work-Math.max(0,state.remaining||0)/1000);
  else if(state.phase==='rest')cur=st.work+Math.max(0,st.rest-Math.max(0,state.remaining||0)/1000);
  return n>0?Math.min(1,Math.max(0,(doneSteps+(stepTotal>0?cur/stepTotal:1))/n)):0;
 }
 function updateProgressFractions(){
  (blocks||[]).forEach((b,i)=>{const seg=blockSegEls[i];if(seg)seg.style.setProperty('--fill-amt',String(blockFraction(b)));});
 }

 // ── transition-time render (discrete; media/text/badges) ──────────────────────
 // Swaps text immediately (never leaves it blank under rapid-fire changes) and layers a
 // fade+slide-in entrance on top, rather than fading out/in with a setTimeout in between.
 function crossfadeText(el,text){
  if(!el||el.textContent===text)return;
  el.textContent=text;
  if(reducedMotion())return;
  el.style.transition='none';
  el.style.opacity='0';el.style.transform='translateY(3px) scale(.98)';
  void el.offsetWidth;
  el.style.transition='opacity .28s ease, transform .28s ease';
  el.style.opacity='1';el.style.transform='none';
 }
 function setGlow(color){
  if(!els.glowA)return;
  const useA=activeGlow!=='a';
  const nextEl=useA?els.glowA:els.glowB,curEl=useA?els.glowB:els.glowA;
  nextEl.style.background=`radial-gradient(circle at 70% 38%, color-mix(in srgb, ${color} 42%, transparent), transparent 62%)`;
  nextEl.classList.add('is-on');curEl.classList.remove('is-on');
  activeGlow=useA?'a':'b';
 }
 function renderMediaContent(displayStep){
  const x=exercise(displayStep.ex);
  els.video.hidden=true;els.photoCard.hidden=true;els.figureBox.hidden=true;els.instructionBox.hidden=true;
  if(figureController){try{figureController.destroy();}catch{}figureController=null;}
  if(!x)return;
  if(x.media.type==='figure'){
   els.figureBox.hidden=false;els.figureBox.innerHTML='';
   if(window.Figures)figureController=Figures.mount(els.figureBox,x.id,{phase:state.phase==='work'?'work':'ready'});
  }else if(x.media.type==='image'){
   els.photoCard.hidden=false;showingOptions=false;
   els.photoImg.src=x.media.src||'';els.photoImg.alt=x.name||'';
   els.easierBtn.hidden=!x.media.options;els.easierBtn.textContent='Easier options';els.easierBtn.classList.remove('is-on');
   els.easierBtn.onclick=ev=>{
    ev.stopPropagation();showingOptions=!showingOptions;
    els.photoImg.src=(showingOptions?x.media.options:x.media.src)||'';
    els.easierBtn.classList.toggle('is-on',showingOptions);
    els.easierBtn.textContent=showingOptions?'Original':'Easier options';
   };
  }else if(x.media.type==='instruction'){
   els.instructionBox.hidden=false;
   els.instructionImg.src=x.media.thumb||'';els.instructionImg.alt='';
   els.instructionText.textContent=x.media.note||x.cue||'';
  }else{
   els.video.hidden=false;
   els.video.src=x.media.src||'';
   els.video.poster=x.media.poster||x.media.thumb||'';
   els.video.load();
   const p=els.video.play();if(p&&p.catch)p.catch(()=>{});
  }
 }
 function swapMedia(displayStep){
  const ex=displayStep.ex;
  if(ex===currentMediaEx){
   if(figureController)figureController.setPhase(state.phase==='work'?'work':'ready');
   return;
  }
  currentMediaEx=ex;
  renderMediaContent(displayStep); // swap immediately — never blank/stale under rapid changes
  if(reducedMotion())return;
  els.media.style.transition='none';
  els.media.style.opacity='0';els.media.style.transform='scale(.97)';
  void els.media.offsetWidth;
  els.media.style.transition='opacity .3s ease, transform .3s ease';
  els.media.style.opacity='1';els.media.style.transform='none';
 }
 function renderUpnextCard(nextStep){
  const name=displayName(nextStep.ex,nextStep.label);
  els.upnextCard.innerHTML=`${thumb(nextStep.ex,'thumb')}<div class="cp-upnext-info"><div class="cp-upnext-name">${h(name)}</div><div class="cp-upnext-desc">${h(stepPrescription(nextStep))}</div></div>`;
 }
 function renderPlayPause(){
  const running=state&&!state.paused;
  els.playpause.innerHTML=icon(running?'pause':'play');
  els.playpause.setAttribute('aria-label',running?'Pause workout':'Resume workout');
 }
 function renderPausedOverlay(){
  const show=!!(state&&state.paused&&!completionShown&&!endConfirmOpen);
  els.paused.classList.toggle('is-shown',show);
  els.paused.toggleAttribute('inert',!show);
 }
 function renderSoundBtn(){
  const on=prefs.get('sound',true);
  els.sound.innerHTML=icon(on?'sound':'mute');
  els.sound.setAttribute('aria-pressed',String(on));
  els.sound.setAttribute('aria-label',on?'Mute sound':'Unmute sound');
 }
 function renderVoiceBtn(){
  const on=prefs.get('voice',true);
  els.voice.classList.toggle('is-off',!on);
  els.voice.setAttribute('aria-pressed',String(on));
  els.voice.setAttribute('aria-label',on?'Turn off voice cues':'Turn on voice cues');
 }
 function announceLive(text){if(els.live)els.live.textContent=text;}

 function syncDisplay(){
  if(!state)return;
  const isRest=state.phase==='rest',cur=Engine.current(state);
  const displayStep=isRest?(steps[state.index+1]||cur):cur;

  swapMedia(displayStep);
  els.stage.classList.toggle('is-dim',isRest);
  els.upnextLabel.hidden=!isRest;
  const sideTxt=displayStep.side&&displayStep.side!=='Both'?`${displayStep.side} side`:'';
  els.badgeSide.hidden=!sideTxt;els.badgeSide.textContent=sideTxt;
  const setTxt=stageBadgeText(displayStep);
  els.badgeSet.hidden=!setTxt;els.badgeSet.textContent=setTxt;

  const color=state.phase==='ready'?COLORS.ready:state.phase==='rest'?COLORS.rest:COLORS.work;
  if(color!==lastGlowColor){setGlow(color);lastGlowColor=color;}
  els.ringFill.style.stroke=color;els.phase.style.color=color;els.target.style.color=color;
  root.style.setProperty('--phase-color',color);
  crossfadeText(els.phase,phaseLabelText());
  crossfadeText(els.exname,displayName(displayStep.ex,displayStep.label));
  els.counter.textContent=counterLineText(displayStep);
  els.cue.textContent=displayStep.cue||'';
  els.target.textContent=displayStep.target?`Aim for ~${displayStep.target} reps`:'';

  const repsMode=state.phase==='work'&&cur.mode==='reps';
  els.reps.hidden=!repsMode;
  if(repsMode)els.repCount.textContent=String(state.repsDone||0);
  els.elapsed.hidden=!repsMode;

  els.restPanel.hidden=!isRest;
  if(isRest)renderUpnextCard(displayStep);

  const b=(blocks||[]).find(bl=>state.index>=bl.start&&state.index<=bl.end);
  els.blockName.textContent=b?b.name:'';
  blockSegEls.forEach((seg,i)=>seg.classList.toggle('is-current',!!(blocks[i]&&state.index>=blocks[i].start&&state.index<=blocks[i].end)));

  renderPlayPause();renderPausedOverlay();
  announceLive(`${phaseLabelText()}. ${displayName(displayStep.ex,displayStep.label)}${sideTxt?', '+sideTxt:''}.`);

  lastTickCheckedSecond=null;lastRingNum=null;lastRingCap=null;lastRemainSec=null;lastElapsedSec=null;
  milestonesDone=new Set();
 }

 // ── transport / controls ────────────────────────────────────────────────────
 function next(){withTransition(()=>Engine.advance(state));}
 function previous(){withTransition(()=>Engine.previous(state));}
 function changeRep(d){if(!state)return;Engine.rep(state,d);els.repCount.textContent=String(state.repsDone||0);}
 function setPaused(p){
  if(!state||state.done)return;
  state.paused=p;
  if(figureController){try{p?figureController.pause():figureController.play();}catch{}}
  if(p)releaseWakeLock();else{requestWakeLock();lastFrame=0;}
  renderPlayPause();renderPausedOverlay();
  saveLive();
 }
 function togglePause(){if(state)setPaused(!state.paused);}

 // ── wake lock / visibility ──────────────────────────────────────────────────
 async function requestWakeLock(){
  try{
   if('wakeLock'in navigator&&document.visibilityState==='visible'){
    wakeLockSentinel=await navigator.wakeLock.request('screen');
    wakeLockSentinel.addEventListener('release',()=>{wakeLockSentinel=null;});
   }
  }catch{wakeLockSentinel=null;}
 }
 function releaseWakeLock(){try{wakeLockSentinel&&wakeLockSentinel.release();}catch{}wakeLockSentinel=null;}
 function onVisibility(){
  if(!state)return;
  if(document.hidden){if(!state.paused)setPaused(true);releaseWakeLock();}
  else if(!state.paused)requestWakeLock();
 }

 // ── keyboard / focus trap ────────────────────────────────────────────────────
 function focusables(){
  return [...root.querySelectorAll('button')].filter(b=>!b.disabled&&!b.closest('[inert]')&&!b.closest('[hidden]')&&b.offsetParent!==null);
 }
 function trapFocus(e){
  const list=focusables();if(!list.length)return;
  const first=list[0],last=list[list.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 }
 function onKeydown(e){
  if(!state)return;
  if(completionShown)return;
  if(e.key==='Tab'){trapFocus(e);return;}
  if(e.key==='Escape'){e.preventDefault();endConfirmOpen?keepGoing():showEndConfirm(true);return;}
  if(endConfirmOpen)return;
  if(e.key===' '||e.code==='Space'){e.preventDefault();togglePause();return;}
  if(e.key==='ArrowRight'){e.preventDefault();next();return;}
  if(e.key==='ArrowLeft'){e.preventDefault();previous();return;}
 }

 // ── end confirm ──────────────────────────────────────────────────────────────
 function showEndConfirm(open){
  if(!state||open===endConfirmOpen)return;
  endConfirmOpen=open;
  if(open){wasPausedBeforeConfirm=!!state.paused;setPaused(true);}
  els.endConfirm.classList.toggle('is-shown',open);
  els.endConfirm.toggleAttribute('inert',!open);
  renderPausedOverlay();
  if(open){try{els.keepGoingBtn.focus();}catch{}}
  else if(!wasPausedBeforeConfirm){setPaused(false);try{els.close.focus();}catch{}}
 }
 function keepGoing(){showEndConfirm(false);}
 function confirmEndWorkout(){clearLive();teardown();}

 // ── completion ───────────────────────────────────────────────────────────────
 function showCompletion(){
  completionShown=true;
  [els.top,els.progress,els.body].forEach(el=>el&&el.setAttribute('inert',''));
  const totalSec=Math.round((state.elapsed||0)/1000),workSec=Math.round((state.workTime||0)/1000);
  const exCount=new Set((state.completed||[]).map(i=>steps[i]&&steps[i].ex).filter(Boolean)).size;
  const colors=[COLORS.work,COLORS.ready,COLORS.rest];
  els.complete.innerHTML=`
   <canvas class="cp-confetti"></canvas>
   <svg class="cp-check" viewBox="0 0 88 88" aria-hidden="true"><circle cx="44" cy="44" r="38"/><path d="M28 45l11 11 21-23"/></svg>
   <h1 class="cp-complete-title round">Workout complete</h1>
   <p class="cp-complete-sub">${h(title||session.title||'')}</p>
   <div class="cp-stats">
    <div class="cp-stat"><div class="cp-stat-num num">${h(Plan.clock(totalSec))}</div><div class="cp-stat-label">Total time</div></div>
    <div class="cp-stat"><div class="cp-stat-num num">${exCount}</div><div class="cp-stat-label">Exercises</div></div>
    <div class="cp-stat"><div class="cp-stat-num num">${h(Plan.clock(workSec))}</div><div class="cp-stat-label">Time under work</div></div>
   </div>
   <div class="cp-complete-actions">
    <button type="button" class="btn-secondary btn cp-again">Do it again</button>
    <button type="button" class="btn cp-donebtn">Done</button>
   </div>`;
  els.complete.hidden=false;
  const canvas=els.complete.querySelector('.cp-confetti');
  if(canvas)startConfetti(canvas,colors);
  els.complete.querySelector('.cp-again').addEventListener('click',doAgain);
  const doneBtn=els.complete.querySelector('.cp-donebtn');
  doneBtn.addEventListener('click',()=>teardown());
  try{doneBtn.focus();}catch{}
 }
 function doAgain(){const s=session,o=options,t=title;teardown();start({session:s,options:o,title:t});}
 function startConfetti(canvas,colors){
  if(reducedMotion())return;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const dpr=window.devicePixelRatio||1,W=canvas.clientWidth||window.innerWidth,H=canvas.clientHeight||window.innerHeight;
  canvas.width=W*dpr;canvas.height=H*dpr;
  const N=90,parts=Array.from({length:N},()=>({
   x:Math.random()*W,y:-20-Math.random()*H*.5,vx:(Math.random()-.5)*2.2,vy:2+Math.random()*3.2,
   r:3+Math.random()*4,rot:Math.random()*Math.PI*2,vr:(Math.random()-.5)*.3,
   color:colors[(Math.random()*colors.length)|0],shape:Math.random()<.5?'rect':'circle'}));
  const t0=performance.now();
  function frame(ts){
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
   const life=ts-t0;let alive=false;
   for(const p of parts){
    p.x+=p.vx;p.y+=p.vy;p.vy+=.045;p.rot+=p.vr;
    if(p.y<H+30)alive=true;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.globalAlpha=Math.max(0,1-life/2600);
    ctx.fillStyle=p.color;
    if(p.shape==='rect')ctx.fillRect(-p.r,-p.r*.6,p.r*2,p.r*1.2);else{ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();}
    ctx.restore();
   }
   if(alive&&life<2600)confettiRaf=requestAnimationFrame(frame);
  }
  confettiRaf=requestAnimationFrame(frame);
 }
 function stopConfetti(){if(confettiRaf)cancelAnimationFrame(confettiRaf);confettiRaf=null;}

 Crux.Player={start,resumeAvailable,resume,discard};
})();
