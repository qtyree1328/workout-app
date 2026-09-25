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
  // categories
  climbing:'M8.5 4.5c2.8-1.4 7.3-.9 9.3 1.6 2 2.6 1.3 7-1.3 9.8-2.8 2.9-7.6 4.6-10.3 2.9C3.5 17 3.8 12.5 4.6 9.6c.6-2.2 1.9-4.2 3.9-5.1ZM11.5 9.5a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Z',
  strength:'M3 10v4M6 7.5v9M18 7.5v9M21 10v4M6 12h12',
  mobility:'M12 21c4.5-3 7-6.6 7-10.5A7 7 0 0 0 12 3.5c-2.6 3.3-2.6 6.6 0 10 2.6 3.4 2.6 5.3 0 7.5ZM12 21c-4.5-3-7-6.6-7-10.5',
  hip:'M12 20c-3.8-1.8-6.5-4.7-6.5-8.6 0-1.3.3-2.5.8-3.4 2.9.6 4.9 2.3 5.7 4.8.8-2.5 2.8-4.2 5.7-4.8.5.9.8 2.1.8 3.4 0 3.9-2.7 6.8-6.5 8.6ZM12 12.8V6.5c-1-.9-1.6-2-1.8-3 .9.3 1.4.6 1.8 1 .4-.4.9-.7 1.8-1-.2 1-.8 2.1-1.8 3',
  recovery:'M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z',
  all:'M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z',
  layers:'M12 4 3 9l9 5 9-5-9-5ZM3 14l9 5 9-5',
  grid:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon:'M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z',
  auto:'M12 4a8 8 0 1 0 0 16V4Z',
  flame:'M12 21c3.9 0 6.5-2.6 6.5-6.3 0-3.5-2.4-5.8-4.3-8.3-.4 1.7-1.3 3-2.6 3.6.2-2.9-1-5.3-3.1-7-.3 3.3-5 6.1-5 11.7C3.5 18.4 7.6 21 12 21Z',
  target:'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM12 12h.01',
  refresh:'M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4',
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
  recovery:{label:'Recovery',icon:'recovery',blurb:'Cool-downs, resets and wind-downs'}};
 const EQUIPMENT={'hangboard':'Hangboard','pull-up bar':'Pull-up bar','band':'Band','bar':'Dowel','weighted bar':'Weighted dowel','block':'Yoga block','chair':'Chair','wall':'Wall','bench':'Bench','strap':'Strap','table':'Table','pole':'Pole','weights':'Light weights'};
 const PROPS=new Set(['chair','wall','bench','strap','table','pole']); // household props: shown, never required
 const displayName=(id,label)=>label||byId[id]?.name||id;

 // One exercise with its display media: video loop, photo (+ easier options), animated figure, or instruction.
 function exercise(id){
  const e=byId[id];if(!e)return null;
  const v=e.variants[0]||{},m=META[id]||{};
  let media;
  if(window.Figures&&Figures.has(id))media={type:'figure',poster:null};
  else if(v.type==='image')media={type:'image',src:v.image||v.thumbnail,thumb:v.thumbnail,options:v.options||null,credit:v.credit||''};
  else if(v.type==='instruction')media={type:'instruction',thumb:v.thumbnail,note:v.note};
  else media={type:'video',src:v.clip,thumb:v.thumbnail,poster:v.thumbnail};
  return {id,name:e.name,kind:e.kind,area:e.area,equipment:m.equipment||[],meta:m,variant:v,media,source:sourceById[v.source]||null,cue:m.dose?.cue||v.note||'',
   note:v.note||'',climbing:m.climbing||null};
 }
 // Small square/portrait preview markup for lists
 function thumb(id,cls='thumb'){
  const x=exercise(id);if(!x)return `<span class="${cls}"></span>`;
  if(x.media.type==='figure')return `<span class="${cls} is-figure">${Figures.svg(id)}</span>`;
  return `<span class="${cls}${x.media.type==='image'?' is-photo':''}"><img loading="lazy" decoding="async" src="${h(x.media.thumb||x.media.src)}" alt=""></span>`;
 }
 function equipmentOf(ids){const set=new Set(ids.flatMap(id=>META[id]?.equipment||[]));return [...set];}
 function equipmentLabels(list,{props=false}={}){return list.filter(e=>props||!PROPS.has(e)).map(e=>EQUIPMENT[e]||e);}

 // Toast
 let toastTimer;
 function toast(text){let el=$('.toast');if(!el){el=document.createElement('div');el.className='toast';el.setAttribute('role','status');document.body.appendChild(el);}el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}

 // Tiny event bus
 const handlers={};
 const on=(name,fn)=>(handlers[name]=handlers[name]||[]).push(fn),emit=(name,data)=>(handlers[name]||[]).forEach(fn=>fn(data));
 const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

 Object.assign(Crux,{$,$$,h,icon,prefs,applyTheme,exercise,thumb,equipmentOf,equipmentLabels,displayName,toast,on,emit,reducedMotion,
  CATEGORIES,EQUIPMENT,PROPS,META,LIB,SESS,byId,sourceById});
})();
