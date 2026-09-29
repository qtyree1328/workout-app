/* Crux shared helpers: DOM, icons, preferences, exercise/media lookup, categories.
   Loaded after data/*.js and js/core/*.js, before js/app.js and js/player.js. */
(function(){
 const Crux=window.Crux=window.Crux||{};
 const $=(s,root=document)=>root.querySelector(s),$$=(s,root=document)=>[...root.querySelectorAll(s)];
 const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

 // 24×24 stroke icons (fill icons marked with a leading "F:")
 const PATHS={
  search:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-3.5-3.5',
  settings:'M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6',
  close:'M6 6l12 12M18 6 6 18',back:'M15 5l-7 7 7 7',chevron:'M9 5l7 7-7 7',down:'M6 9l6 6 6-6',
  play:'F:M8 5.2v13.6a1 1 0 0 0 1.5.86l11-6.8a1 1 0 0 0 0-1.72l-11-6.8A1 1 0 0 0 8 5.2Z',
  pause:'F:M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
  next:'M5 6l9 6-9 6V6ZM18 6v12',prev:'M19 6l-9 6 9 6V6ZM6 6v12',
  plus:'M12 5v14M5 12h14',minus:'M5 12h14',check:'M5 12.5l4.5 4.5L19 7.5',
  clock:'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM12 8v4.5l3 2',
  shuffle:'M4 7h3c4 0 6 10 10 10h3M4 17h3c1.6 0 2.8-1.5 3.8-3.4M17 4l3 3-3 3M17 14l3 3-3 3M14 8.8C15 7.6 16 7 17 7h3',
  swap:'M7 4 4 7l3 3M4 7h13M17 20l3-3-3-3M20 17H7',
  sound:'M4 9.5v5h3.5L12 18V6L7.5 9.5H4ZM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11',
  mute:'M4 9.5v5h3.5L12 18V6L7.5 9.5H4ZM16 9.5l5 5M21 9.5l-5 5',
  voice:'M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4.5 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM8 10.5h8M8 13h5',
  info:'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM12 11v5M12 8h.01',
  timer:'M12 7a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM12 11v3.5M9.5 3h5M18.5 6.5l1.5-1.5',
  bolt:'M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z',
  leaf:'M5 19c9 1 14-4 14-13-9 0-14 4-14 13ZM5 19c1.5-4.5 4.5-8 9.5-10.5',
  heartpulse:'M12 20C12 20 4 14 4 8.7 4 5.7 6.4 3.3 9.3 3.3 10.9 3.3 12 4.3 12 4.3 12 4.3 13.1 3.3 14.7 3.3 17.6 3.3 20 5.7 20 8.7 20 14 12 20 12 20ZM4.3 11h3l1.4-3 2 5.5 1.3-3.5 1 1.5h6.3',
  // categories
  climbing:'M8.5 4.5c2.8-1.4 7.3-.9 9.3 1.6 2 2.6 1.3 7-1.3 9.8-2.8 2.9-7.6 4.6-10.3 2.9C3.5 17 3.8 12.5 4.6 9.6c.6-2.2 1.9-4.2 3.9-5.1ZM11.5 9.5a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Z',
  strength:'M3 10v4M6 7.5v9M18 7.5v9M21 10v4M6 12h12',
  mobility:'M12 21c4.5-3 7-6.6 7-10.5A7 7 0 0 0 12 3.5c-2.6 3.3-2.6 6.6 0 10 2.6 3.4 2.6 5.3 0 7.5ZM12 21c-4.5-3-7-6.6-7-10.5',
  hip:'M12 20c-3.8-1.8-6.5-4.7-6.5-8.6 0-1.3.3-2.5.8-3.4 2.9.6 4.9 2.3 5.7 4.8.8-2.5 2.8-4.2 5.7-4.8.5.9.8 2.1.8 3.4 0 3.9-2.7 6.8-6.5 8.6ZM12 12.8V6.5c-1-.9-1.6-2-1.8-3 .9.3 1.4.6 1.8 1 .4-.4.9-.7 1.8-1-.2 1-.8 2.1-1.8 3',
  recovery:'M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z',
  feet:'M9.5 20c-2.6 0-4-1.4-4-3.7 0-1.9.9-2.9.9-4.9 0-2.3-1-3.5-1-5.8C5.4 3.3 7 2 9 2c1.6 0 2.6 1.1 2.6 2.7 0 1.5-.7 2.3-.7 4 0 1.4.8 2.1 1.9 3.2 1.3 1.3 2.2 2.5 2.2 4.6C15 19 12.4 20 9.5 20ZM8.4 12.2c1.2-.4 3.1-.4 4.6.4M8.2 14.6c1.4-.6 3.6-.6 5.2.3',
  all:'M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z',
  layers:'M12 4 3 9l9 5 9-5-9-5ZM3 14l9 5 9-5',
  grid:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon:'M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z',
  auto:'M12 4a8 8 0 1 0 0 16V4Z',
  flame:'M12 21c3.9 0 6.5-2.6 6.5-6.3 0-3.5-2.4-5.8-4.3-8.3-.4 1.7-1.3 3-2.6 3.6.2-2.9-1-5.3-3.1-7-.3 3.3-5 6.1-5 11.7C3.5 18.4 7.6 21 12 21Z',
  target:'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM12 12h.01',
  refresh:'M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4',
  star:'M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8L12 3.6Z',
  starfill:'F:M12 3.3a1 1 0 0 1 .9.6l2.1 4.5 4.9.7a1 1 0 0 1 .6 1.7l-3.6 3.5.9 4.9a1 1 0 0 1-1.4 1.1L12 17.9l-4.4 2.4a1 1 0 0 1-1.4-1.1l.9-4.9-3.6-3.5a1 1 0 0 1 .6-1.7l4.9-.7 2.1-4.5a1 1 0 0 1 .9-.6Z',
  edit:'M4 20h4L19.500 8.500a2.800 2.800 0 0 0-4-4L4 16v4ZM13.500 6.500l4 4',
  trash:'M5 7h14M10 7V4.500h4V7M7 7l.8 12.500h8.400L17 7M10.200 11v5M13.800 11v5',
  copy:'M9 9h11v11H9zM15 9V4H4v11h5',
  grip:'M8 8h8M8 12h8M8 16h8',
  up:'M6 15l6-6 6 6',
  history:'M4 12a8 8 0 1 0 2.500-5.800L4 8M4 4v4h4M12 8v4l3 2',
  build:'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM12 8.500v7M8.500 12h7',
  camera:'M4 8h3l1.500-2h7L17 8h3v11H4zM12 10.200a3.100 3.100 0 1 0 0 6.200 3.100 3.100 0 0 0 0-6.200Z',
  download:'M12 4v11M7 11l5 5 5-5M5 20h14',
  cloud:'M7 18a4 4 0 0 1-.5-8A5.500 5.500 0 0 1 17 8.500 4.800 4.800 0 0 1 17 18H7Z',
  repeat:'M17 4l3 3-3 3M4 11V9a2 2 0 0 1 2-2h14M7 20l-3-3 3-3M20 13v2a2 2 0 0 1-2 2H4',
  workouts:'M4 6h16M4 12h16M4 18h10',
 };
 function icon(name,cls=''){const d=PATHS[name]||PATHS.info,fill=d.startsWith('F:');return `<svg class="icon${fill?' fill':''}${cls?' '+cls:''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${fill?d.slice(2):d}"/></svg>`;}

 // Preferences (UI only; nothing is tracked)
 const PREF_KEY='crux-prefs';
 function readPrefs(){try{return JSON.parse(localStorage.getItem(PREF_KEY))||{};}catch{return {};}}
 const prefs={get(key,fallback){const v=readPrefs()[key];return v===undefined?fallback:v;},set(key,value){const all=readPrefs();all[key]=value;try{localStorage.setItem(PREF_KEY,JSON.stringify(all));}catch{}}};
 function applyTheme(){const t=prefs.get('theme','auto');if(t==='auto')document.documentElement.removeAttribute('data-theme');else document.documentElement.dataset.theme=t;}
 applyTheme();

 // Data
 const LIB=window.LIBRARY,META=window.CLASSIFICATION.exercises,SESS=window.SESSIONS;
 const byId=Object.fromEntries(LIB.exercises.map(e=>[e.id,e]));
 const sourceById=Object.fromEntries(LIB.sources.map(s=>[s.id,s]));
 const CATEGORIES={
  climbing:{label:'Climbing',icon:'climbing',blurb:'Hangboard, pull-up bar and body tension'},
  strength:{label:'Strength',icon:'strength',blurb:'Bodyweight, bar and band strength'},
  mobility:{label:'Mobility',icon:'mobility',blurb:'Active range for hips, shoulders and spine'},
  hip:{label:'Hip Opener',icon:'hip',blurb:'Random poses from the hip chart, timed to fit'},
  feet:{label:'Feet',icon:'feet',blurb:'Random foot & ankle strength, mobility and balance'},
  recovery:{label:'Recovery',icon:'recovery',blurb:'Cool-downs, resets and wind-downs'}};
 const EQUIPMENT={'hangboard':'Hangboard','pull-up bar':'Pull-up bar','band':'Band','bar':'Dowel','weighted bar':'Weighted dowel','block':'Yoga block','chair':'Chair','wall':'Wall','bench':'Bench','strap':'Strap','table':'Table','pole':'Pole','weights':'Light weights','ball':'Small ball','foam roller':'Foam roller'};
 const PROPS=new Set(['chair','wall','bench','strap','table','pole']); // household props: shown, never required
 const displayName=(id,label)=>label||byId[id]?.name||(id==='timer-interval'?'Interval':id);


 /* ── Generic interval-timer step (no exercise): the Timer tab plays sessions made of this id ── */
 const TIMER_ID='timer-interval';
 const CAT_COLOR={climbing:'#F2692E',strength:'#4D65F2',mobility:'#12A58A',hip:'#E4577E',feet:'#D99A2B',recovery:'#8A6CEF',timer:'#141715'};
 function iconURI(name,color){
  const d=PATHS[name]||PATHS.info,fill=d.startsWith('F:'),path=fill?d.slice(2):d;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="${color}"/><g transform="translate(24 24) scale(2)" fill="${fill?'#fff':'none'}" stroke="${fill?'none':'#fff'}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></g></svg>`;
  return 'data:image/svg+xml,'+encodeURIComponent(svg);
 }
 function timerExercise(){
  const src=iconURI('timer','#1F2422');
  return {id:TIMER_ID,name:'Interval timer',kind:'Timer',area:'',custom:false,customCategory:null,equipment:[],meta:META[TIMER_ID],variant:{},
   media:{type:'instruction',thumb:src,note:''},cover:null,source:null,cue:'',note:'',climbing:null};
 }
 META[TIMER_ID]={work:30,rest:15,reps:1,unilateral:false,equipment:[],trainingType:'timer',hold:true,tags:[],regions:[],aliases:[]};

 /* ── Custom exercises live in the store; mirror them into LIB/byId/META so every existing code path just works ── */
 const CUSTOM_KIND={climbing:'Climbing',strength:'Strength',mobility:'Mobility',hip:'Mobility',feet:'Mobility',recovery:'Warm-up'};
 const CUSTOM_TYPE={climbing:'isometric',strength:'strength',mobility:'active-mobility',hip:'static-stretch',feet:'active-mobility',recovery:'static-stretch'};
 const CUSTOM_CATS=[['climbing','Climbing'],['strength','Strength'],['mobility','Mobility'],['hip','Hips'],['feet','Feet'],['recovery','Recovery']];
 // The mode a fresh set of this exercise runs in: the exercise's own default, else derived from its training type.
 function modeOf(m){m=m||{};if(m.defaultMode)return m.defaultMode;return (m.hold||!['strength','power'].includes(m.trainingType))?'time':'reps';}
 function applyCustom(){
  for(const id of Object.keys(byId))if(byId[id].custom){delete byId[id];delete META[id];}
  const list=(Crux.store?Crux.store.items('customExercises'):[]);
  for(const c of list){
   const cat=CUSTOM_CATS.some(x=>x[0]===c.category)?c.category:'strength';
   const timeMode=c.mode!=='reps',eq=String(c.equipment||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
   const work=Math.max(5,Number(c.work)||30),reps=Math.max(1,Number(c.reps)||10),sets=Math.max(1,Number(c.sets)||3),rest=Math.max(0,Number(c.rest)||30);
   const hasPhoto=!!c.photo;
   byId[c.id]={id:c.id,name:c.name||'Untitled',area:'My exercises',kind:CUSTOM_KIND[cat],equipment:eq.join(', ')||'None',level:'Custom',custom:true,customCategory:cat,
    variants:[hasPhoto?{type:'image',image:c.photo,thumbnail:c.photo,note:c.notes||'',label:c.name,named:true}
     :{type:'instruction',thumbnail:iconURI(cat==='hip'?'hip':cat,CAT_COLOR[cat]),note:c.notes||'',label:c.name,named:true}]};
   META[c.id]={target:'',difficulty:'',strain:'Moderate',hold:timeMode,work,rest,reps,detail:'My exercises',regions:[],pattern:'custom',trainingType:CUSTOM_TYPE[cat],
    unilateral:!!c.oneSided,defaultMode:timeMode?'time':'reps',aliases:['mine','custom','my exercise'],phase:['main'],
    dose:{workSeconds:work,restSeconds:rest,sets,reps,basis:'Your own settings',cue:c.notes||''},
    tags:[c.name,CUSTOM_KIND[cat],cat,...eq,'mine','custom'].filter(Boolean),equipment:eq};
  }
 }
 // A custom workout as a normal session object (what Plan.compile and the player expect).
 function customSession(w){
  const items=(w.items||[]).filter(i=>i&&(i.ex===TIMER_ID||byId[i.ex])).map(i=>{
   const out={ex:i.ex,mode:i.mode==='reps'?'reps':'time',sets:Math.max(1,Number(i.sets)||1),rest:Math.max(0,Number(i.rest)||0)};
   if(out.mode==='reps'){out.reps=Math.max(1,Number(i.reps)||10);}else out.work=Math.max(5,Number(i.work)||30);
   if(i.sides==='each')out.sides='each';else if(i.sides==='both')out.sides='both';
   if(i.label)out.label=i.label;
   return out;
  });
  return {id:w.id,title:w.title||'My workout',category:w.category||'strength',level:'Custom',intensity:w.intensity||2,goals:[],focus:[],custom:true,
   summary:w.summary||`${items.length} exercise${items.length===1?'':'s'} you put together.`,why:'',sources:[],blocks:items.length?[{name:'Main',items}]:[]};
 }
 const findSession=id=>SESS.sessions.find(x=>x.id===id)||customSessions().find(x=>x.id===id)||null;
 const customSessions=()=>(Crux.store?Crux.store.items('customWorkouts'):[]).map(customSession).filter(s=>s.blocks.length);
 // Which built-in category an exercise belongs to (colours, icons, Try-it sessions).
 function exerciseCategory(x){
  if(x.custom&&x.customCategory)return x.customCategory;
  if(x.id.startsWith('hip-'))return 'hip';
  if(x.id.startsWith('foot-'))return 'feet';
  if(x.kind==='Climbing')return 'climbing';
  if(x.kind==='Mobility')return 'mobility';
  if(x.kind==='Warm-up')return 'recovery';
  return 'strength';
 }
 // Workouts finished in the last N days (history lives in the store).
 function recentDone(sessionId,days=7){
  if(!Crux.store)return 0;
  const since=Date.now()-days*86400000;
  return Crux.store.items('history').filter(h=>h.sessionId===sessionId&&(h.startedAt||0)>=since).length;
 }

 // ★ toggle. A <span role="button"> (cards are buttons already). One delegated handler keeps every copy in sync.
 function favBtn(kind,id,cls=''){
  const on=Crux.store&&Crux.store.isFav(kind,id);
  return `<span class="fav-btn${cls?' '+cls:''}${on?' on':''}" role="button" tabindex="0" data-fav-kind="${h(kind)}" data-fav-id="${h(id)}" aria-pressed="${!!on}" aria-label="${on?'Remove from favorites':'Add to favorites'}" data-stop-tap>${icon(on?'starfill':'star')}</span>`;
 }
 function paintFav(el,on){
  el.classList.toggle('on',on);el.setAttribute('aria-pressed',String(on));
  el.setAttribute('aria-label',on?'Remove from favorites':'Add to favorites');
  el.innerHTML=icon(on?'starfill':'star');
 }
 function toggleFavEl(el){
  const kind=el.dataset.favKind,id=el.dataset.favId;
  const on=Crux.store.toggleFav(kind,id);
  document.querySelectorAll(`.fav-btn[data-fav-kind="${kind}"]`).forEach(b=>{if(b.dataset.favId===id)paintFav(b,on);});
  if(on&&el.animate&&!reducedMotion())el.animate([{transform:'scale(1)'},{transform:'scale(1.35) rotate(-10deg)'},{transform:'scale(1)'}],{duration:380,easing:'cubic-bezier(.34,1.45,.64,1)'});
  Crux.emit('favorites:changed',{kind,id,on});
 }
 document.addEventListener('click',e=>{const el=e.target.closest&&e.target.closest('.fav-btn');if(!el)return;e.preventDefault();e.stopPropagation();toggleFavEl(el);},true);
 document.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const el=e.target.closest&&e.target.closest('.fav-btn');if(!el)return;e.preventDefault();e.stopPropagation();toggleFavEl(el);},true);

 // One exercise with its display media: video loop, photo (+ easier options), animated figure, or instruction.
 function exercise(id){
  if(id===TIMER_ID)return timerExercise();
  const e=byId[id];if(!e)return null;
  const v=e.variants[0]||{},m=META[id]||{};
  let media;
  if(window.Figures&&Figures.has(id))media={type:'figure',poster:null};
  else if(v.type==='image')media={type:'image',src:v.image||v.thumbnail,thumb:v.thumbnail,options:v.options||null,credit:v.credit||''};
  else if(v.type==='instruction')media={type:'instruction',thumb:v.thumbnail,note:v.note};
  else media={type:'video',src:v.clip,thumb:v.thumbnail,poster:v.thumbnail};
  const cover=window.EXERCISE_COVERS?.[id]?.src||null; // drawn cover art (consistent style); demos stay in media
  return {id,name:e.name,kind:e.kind,area:e.area,custom:!!e.custom,customCategory:e.customCategory||null,equipment:m.equipment||[],meta:m,variant:v,media,cover,source:sourceById[v.source]||null,cue:m.dose?.cue||v.note||'',
   note:v.note||'',climbing:m.climbing||null};
 }
 // Small square/portrait preview markup for lists
 function thumb(id,cls='thumb'){
  const x=exercise(id);if(!x)return `<span class="${cls}"></span>`;
  if(x.cover)return `<span class="${cls} is-cover"><img loading="lazy" decoding="async" src="${h(x.cover)}" alt=""></span>`;
  if(x.media.type==='figure')return `<span class="${cls} is-figure">${Figures.svg(id)}</span>`;
  return `<span class="${cls}${x.media.type==='image'?' is-photo':''}"><img loading="lazy" decoding="async" src="${h(x.media.thumb||x.media.src)}" alt=""></span>`;
 }
 function equipmentOf(ids){const set=new Set(ids.flatMap(id=>META[id]?.equipment||[]));return [...set];}
 function equipmentLabels(list,{props=false}={}){return list.filter(e=>props||!PROPS.has(e)).map(e=>EQUIPMENT[e]||e.charAt(0).toUpperCase()+e.slice(1));}

 // Toast
 let toastTimer;
 function toast(text){let el=$('.toast');if(!el){el=document.createElement('div');el.className='toast';el.setAttribute('role','status');document.body.appendChild(el);}el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}

 // Tiny event bus
 const handlers={};
 const on=(name,fn)=>(handlers[name]=handlers[name]||[]).push(fn),emit=(name,data)=>(handlers[name]||[]).forEach(fn=>fn(data));
 const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

 Object.assign(Crux,{$,$$,h,icon,iconURI,PATHS,prefs,applyTheme,exercise,thumb,TIMER_ID,CUSTOM_CATS,CAT_COLOR,modeOf,applyCustom,customSession,customSessions,findSession,exerciseCategory,recentDone,favBtn,equipmentOf,equipmentLabels,displayName,toast,on,emit,reducedMotion,
  CATEGORIES,EQUIPMENT,PROPS,META,LIB,SESS,byId,sourceById});
 applyCustom();
 if(Crux.store)Crux.store.on(e=>{if(e.type!=='change')return;const c=e.collections||[];if(c.includes('*')||c.includes('customExercises')){applyCustom();Crux.emit('custom:changed');}});
})();
