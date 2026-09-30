/* Hangboard tab: an interactive hangboard diagram (every hold is a symmetric left/right pair, plus the pull-up bar),
   a hang timer (5 s get-ready, then a count-up that stops on tap) and a pull-up counter. Every result is a record in
   Crux.store 'hangLog': {id, hold, type:'hang'|'pullups', seconds|reps, at}. Progress figures are drawn from that log. */
(function(){
 const Crux=window.Crux=window.Crux||{};
 const {h,icon,prefs,toast}=Crux;

 /* ───────────── the board ─────────────
    The hang module is a reversible box: a beech Clevo hangboard on the front face, climbing holds on the back and a
    wooden pull-up bar across the open bottom (reachable from either side). The board view is a 3D model
    (js/hangboard3d.js, three.js, loaded on demand); this flat SVG is its fallback when WebGL or module loading is not
    available. Hold ids are the keys of the 'hangLog' records, so they never change. Front holds left of centre
    mirror the right about x = 500, so each is a pair; centre holds are single, two-handed holds. x/w are for the
    left copy (SVG units, board 56–944 ≈ 60 cm). */
 const VB_W=1000,VB_H=760,MID=VB_W/2;
 const ROWS=[{y:78,h:48},{y:146,h:50},{y:214,h:44}];
 const HOLDS=[
  {id:'top-pocket',name:'Top pocket',kind:'pocket',side:'front',row:0,x:96,w:124},
  {id:'sloper',name:'Angled sloper',kind:'sloper',side:'front',row:0,x:238,w:58},
  {id:'top-rail',name:'Top rail',kind:'rail',side:'front',row:0,x:300,w:76},
  {id:'flat-top',name:'Flat top',kind:'sloper',side:'front',row:0,x:380,w:240,centre:true},
  {id:'pocket-large',name:'Large pocket',kind:'pocket',side:'front',row:1,x:74,w:130},
  {id:'pocket-medium',name:'Medium pocket',kind:'pocket',side:'front',row:1,x:222,w:102},
  {id:'pocket-small',name:'Small pocket',kind:'pocket',side:'front',row:1,x:344,w:76},
  {id:'pocket-centre',name:'Centre pocket',kind:'pocket',side:'front',row:1,x:432,w:136,centre:true},
  {id:'edge-outer',name:'Bottom outer pocket',kind:'pocket',side:'front',row:2,x:72,w:163},
  {id:'edge-inner',name:'Bottom small pocket',kind:'pocket',side:'front',row:2,x:263,w:84},
  {id:'edge-centre',name:'Bottom centre slot',kind:'pocket',side:'front',row:2,x:376,w:248,centre:true},
  {id:'back-triangle',name:'Green triangles',kind:'triangle',side:'back',color:'#97C42A'},
  {id:'back-frog',name:'Frog',kind:'frog',side:'back',centre:true,color:'#2C8A34'},
  {id:'back-dome',name:'Blue domes',kind:'dome',side:'back',color:'#3B7FD8'},
 ];
 const BAR={id:'bar',name:'Pull-up bar',kind:'bar',side:'both'};
 const ALL=[...HOLDS,BAR];
 const byId=Object.fromEntries(ALL.map(x=>[x.id,x]));
 const holdLabel=hd=>hd.kind==='bar'?'Pull-up bar, under both faces':`${hd.name}, ${hd.side==='back'?'back':'front'}, ${hd.centre?'centre':'left and right pair'}`;

 // One copy of a front hold: side 'L', 'R' (mirrored) or 'C' (centre).
 function sideSVG(hd,side){
  const {y,h:hh}=ROWS[hd.row],w=hd.w,x=side==='R'?VB_W-hd.x-w:hd.x,r=Math.min(hh/2,22);
  let s=`<g class="hb-side" data-side="${side}">`;
  s+=`<rect class="hb-ring" x="${x-6}" y="${y-6}" width="${w+12}" height="${hh+12}" rx="${Math.min(r+6,(w+12)/2)}"/>`;
  if(hd.kind==='sloper'||hd.kind==='rail'){
   // raised angled ramp; the rail and the flat top are level
   const flat=hd.kind==='rail'||!!hd.centre,sl=flat?0:(side==='R'?-1:1)*18;
   s+=`<path class="hb-recess hb-slab" d="M${x+Math.max(0,sl)} ${y+4}H${x+w+Math.min(0,sl)}L${x+w} ${y+hh-4}H${x}Z"/>`;
   s+=`<path class="hb-lip" d="M${x+Math.max(0,sl)+6} ${y+8}H${x+w+Math.min(0,sl)-6}L${x+w-8} ${y+hh*.45}H${x+8}Z"/>`;
  }else{
   s+=`<rect class="hb-recess" x="${x}" y="${y}" width="${w}" height="${hh}" rx="${r}"/>`;
   s+=`<rect class="hb-hole" x="${x+7}" y="${y+hh*.3}" width="${w-14}" height="${hh*.56}" rx="${r-6}"/>`;
   s+=`<rect class="hb-lip" x="${x+10}" y="${y+4}" width="${w-20}" height="4" rx="2"/>`;
  }
  return s+`<rect class="hb-hit" x="${x-8}" y="${y-8}" width="${w+16}" height="${hh+16}"/></g>`;
 }
 // Back holds, drawn as seen from behind the module.
 function backShapes(hd){
  const g=(d,extra='')=>`<g class="hb-side">${d}${extra}</g>`;
  if(hd.kind==='triangle')return [[1,0],[-1,1000]].map(([k,o])=>{
   const P=pts=>pts.map(([x,y])=>`${o+k*x},${y}`).join(' ');
   return g(`<polygon class="hb-ring" points="${P([[196,478],[422,496],[236,652]])}" stroke-linejoin="round"/><polygon class="hb-recess" points="${P([[204,486],[412,502],[240,640]])}" stroke-linejoin="round"/><polygon class="hb-lip" points="${P([[222,494],[380,505],[236,520]])}"/>`,`<polygon class="hb-hit" points="${P([[188,470],[432,490],[236,662]])}"/>`);
  }).join('');
  if(hd.kind==='frog')return g(`<ellipse class="hb-ring" cx="500" cy="560" rx="82" ry="86"/><ellipse class="hb-recess" cx="500" cy="585" rx="74" ry="58"/><ellipse class="hb-recess" cx="500" cy="528" rx="52" ry="36"/><circle class="hb-lip" cx="476" cy="500" r="11"/><circle class="hb-lip" cx="524" cy="500" r="11"/><circle class="hb-hole" cx="500" cy="580" r="8"/>`,`<rect class="hb-hit" x="410" y="468" width="180" height="186"/>`);
  return [322,678].map(cx=>g(`<path class="hb-ring" d="M${cx-114} 712A114 114 0 0 1 ${cx+114} 712Z"/><path class="hb-recess" d="M${cx-104} 708A104 104 0 0 1 ${cx+104} 708Z"/><path d="M${cx-58} 640Q${cx} 598 ${cx+58} 640M${cx-80} 684Q${cx} 650 ${cx+80} 684" style="fill:none;stroke:rgba(255,255,255,.28);stroke-width:7;stroke-linecap:round"/><circle class="hb-hole" cx="${cx}" cy="628" r="8"/>`,`<rect class="hb-hit" x="${cx-114}" y="592" width="228" height="124"/>`)).join('');
 }
 function holdSVG(hd){
  const style=hd.color?` style="--hb-base:${hd.color}"`:'';
  const body=hd.side==='back'?backShapes(hd):(hd.centre?['C']:['L','R']).map(sd=>sideSVG(hd,sd)).join('');
  return `<g class="hb-hold" data-hold="${hd.id}" role="button" tabindex="0" aria-pressed="false" aria-label="${h(holdLabel(hd))}"${style}>${body}</g>`;
 }
 function barSVG(){
  return `<g class="hb-hold hb-bar" data-hold="bar" role="button" tabindex="0" aria-pressed="false" aria-label="${h(holdLabel(BAR))}">
   <g class="hb-side">
    <rect class="hb-ring" x="54" y="324" width="892" height="48" rx="24"/>
    <rect class="hb-bar-body" x="62" y="332" width="876" height="32" rx="16"/>
    <rect class="hb-bar-hi" x="80" y="337" width="840" height="6" rx="3"/>
    <text class="hb-bar-label" x="${MID}" y="353" text-anchor="middle">PULL-UP BAR</text>
    <rect class="hb-hit" x="46" y="312" width="908" height="72"/>
   </g></g>`;
 }
 function boardSVG(){
  const bolts=[[34,40],[34,390],[966,40],[966,390]].map(([x,y])=>`<circle class="hb-screw" cx="${x}" cy="${y}" r="5"/>`).join('');
  const screws=[[92,102],[908,102],[MID,171]].map(([x,y])=>`<circle class="hb-screw" cx="${x}" cy="${y}" r="3.5"/>`).join('');
  const front=HOLDS.filter(x=>x.side==='front'),back=HOLDS.filter(x=>x.side==='back');
  return `<svg class="hb-svg" viewBox="0 0 ${VB_W} ${VB_H}" role="group" aria-label="Hang module. Choose a hold on the front or back, or the pull-up bar.">
   <rect class="hb-wall" x="0" y="0" width="${VB_W}" height="${VB_H}" rx="26"/>
   <rect class="hb-back" x="24" y="14" width="952" height="402" rx="10"/>
   <rect class="hb-bracket" x="12" y="8" width="26" height="414" rx="6"/><rect class="hb-bracket" x="962" y="8" width="26" height="414" rx="6"/>
   ${bolts}
   <rect class="hb-board" x="56" y="64" width="888" height="210" rx="18"/>
   <rect class="hb-board-edge" x="56" y="64" width="888" height="210" rx="18"/>
   <line class="hb-seam" x1="60" y1="204" x2="940" y2="204"/>
   ${screws}
   ${front.map(holdSVG).join('')}
   ${barSVG()}
   <text class="hb-face-label" x="${MID}" y="446" text-anchor="middle">BACK</text>
   <rect class="hb-back" x="150" y="462" width="700" height="278" rx="10"/>
   <rect class="hb-bracket" x="138" y="456" width="22" height="290" rx="6"/><rect class="hb-bracket" x="840" y="456" width="22" height="290" rx="6"/>
   ${back.map(holdSVG).join('')}
  </svg>`;
 }
 const webgl=(()=>{let ok=null;return ()=>{
  if(ok!==null)return ok;
  try{const c=document.createElement('canvas');const gl=c.getContext('webgl2');ok=!!gl;const lose=gl&&gl.getExtension('WEBGL_lose_context');if(lose)lose.loseContext();}catch{ok=false;}
  return ok;
 };})();
 let view3d=null,viewObs=null;
 function drop3d(){if(viewObs){viewObs.disconnect();viewObs=null;}if(view3d){try{view3d.dispose();}catch{}view3d=null;}}

 /* ───────────── helpers ───────────── */
 const store=()=>Crux.store;
 const logs=()=>store().items('hangLog').filter(r=>byId[r.hold]&&(r.type==='hang'||r.type==='pullups'));
 const valueOf=r=>r.type==='hang'?r.seconds:r.reps;
 const num=v=>Number.isFinite(v)?v:0;
 function fmtSecs(s){
  s=num(s);
  if(s>=60){const m=Math.floor(s/60);return `${m}:${(s-m*60).toFixed(1).padStart(4,'0')}`;}
  return s.toFixed(1);
 }
 const fmtVal=(type,v)=>type==='hang'?`${fmtSecs(v)} s`:`${v} ${v===1?'rep':'reps'}`;
 function fmtWhen(ts){
  const d=new Date(ts),n=new Date(),day=x=>new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime();
  const diff=Math.round((day(n)-day(d))/86400000);
  const t=d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  if(diff===0)return `Today, ${t}`;
  if(diff===1)return `Yesterday, ${t}`;
  return d.toLocaleDateString([],{month:'short',day:'numeric'})+`, ${t}`;
 }
 const fmtDay=ts=>new Date(ts).toLocaleDateString([],{month:'short',day:'numeric'});
 const reduced=()=>window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 function niceMax(v){
  if(v<=0)return 4;
  const steps=[1,2,5,10,20,25,50,100,200];
  const target=v*1.12;
  for(const st of steps){const top=Math.ceil(target/st)*st;if(top/st<=4)return {top,step:st};}
  return {top:Math.ceil(target/50)*50,step:50};
 }
 // The chart: one dot per record (oldest → newest), the personal best ringed.
 function chartSVG(rows,type,bestId){
  const W=620,H=210,L=46,R=18,T=26,B=32,pw=W-L-R,ph=H-T-B;
  const vals=rows.map(valueOf),max=Math.max(...vals,1);
  const sc=niceMax(max),top=sc.top;
  const y=v=>T+ph-(v/top)*ph;
  const x=i=>rows.length===1?L+pw/2:L+(pw*i)/(rows.length-1);
  let grid='';
  for(let v=0;v<=top+1e-9;v+=sc.step){
   grid+=`<line class="hb-grid" x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text class="hb-axis" x="${L-10}" y="${y(v)+4}" text-anchor="end">${type==='hang'?v+' s':v}</text>`;
  }
  const pts=rows.map((r,i)=>[x(i),y(valueOf(r))]);
  const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join('');
  const area=rows.length>1?`<path class="hb-area" d="${line}L${pts[pts.length-1][0].toFixed(1)} ${y(0)}L${pts[0][0].toFixed(1)} ${y(0)}Z"/>`:'';
  const dots=rows.map((r,i)=>{
   const pb=r.id===bestId;
   return `<g class="hb-pt${pb?' is-pb':''}"><title>${h(fmtVal(type,valueOf(r)))} · ${h(fmtDay(r.at))}</title>${pb?`<circle class="hb-pb-halo" cx="${pts[i][0]}" cy="${pts[i][1]}" r="13"/>`:''}<circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="${pb?7:4.5}"/></g>`;
  }).join('');
  const bi=rows.findIndex(r=>r.id===bestId);
  const bx=bi>=0?pts[bi][0]:0,by=bi>=0?pts[bi][1]:0;
  const anchor=bx>W-80?'end':bx<L+50?'start':'middle';
  const bl=bi>=0?`<text class="hb-pb-label" x="${bx}" y="${by-20}" text-anchor="${anchor}">${h(fmtVal(type,valueOf(rows[bi])))}</text>`:'';
  const x0=`<text class="hb-axis" x="${L}" y="${H-8}" text-anchor="start">${h(fmtDay(rows[0].at))}</text>`;
  const x1=rows.length>1?`<text class="hb-axis" x="${W-R}" y="${H-8}" text-anchor="end">${h(fmtDay(rows[rows.length-1].at))}</text>`:'';
  return `<svg class="hb-chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${rows.length} records, best ${h(fmtVal(type,valueOf(rows[bi>=0?bi:0])))}">${grid}${area}${rows.length>1?`<path class="hb-line" pathLength="1" d="${line}"/>`:''}${dots}${bl}${x0}${x1}</svg>`;
 }

 /* ───────────── page ───────────── */
 const COUNT=5;
 let run=null,unsub=null,lock=null;
 async function keepAwake(){try{if('wakeLock'in navigator&&document.visibilityState==='visible'&&!lock){lock=await navigator.wakeLock.request('screen');lock.addEventListener('release',()=>{lock=null;});}}catch{}}
 function letSleep(){try{if(lock)lock.release();}catch{}lock=null;}
 function stopLoop(){if(run&&run.raf)cancelAnimationFrame(run.raf);run=null;letSleep();}

 function render(view){
  stopLoop();if(unsub){unsub();unsub=null;}drop3d();
  const saved=prefs.get('hbSel',null)||{};
  const latest=logs().sort((a,b)=>b.at-a.at)[0];
  const st={
   hold:byId[saved.hold]?saved.hold:latest?latest.hold:'edge-inner',
   type:saved.type==='pullups'||saved.type==='hang'?saved.type:latest?latest.type:'hang',
   reps:null,scope:'hold',banner:null,
  };
  view.innerHTML=`<div class="page page-hangboard">
   <div class="page-header"><span class="eyebrow">Fingers &amp; pulling</span><h1 class="page-title">Hangboard</h1></div>
   <div class="hb-layout">
    <section class="hb-board-card" aria-label="Hang module">
     <div class="hb3d" id="hb-3d" hidden></div>
     ${boardSVG()}
     <div class="hb-holdlist" id="hb-holdlist" role="group" aria-label="Holds" hidden>${ALL.map(hd=>`<button type="button" data-pick="${hd.id}" aria-pressed="false">${h(holdLabel(hd))}</button>`).join('')}</div>
     <div class="hb-board-foot"><span class="hb-hint">${icon('info')}<span id="hb-hint-text">Tap a hold to pick the pair, or the bar below it.</span></span>
      <span class="hb-legend" aria-label="Training in the last 30 days"><span>Last 30 days</span><i data-heat="0"></i><i data-heat="1"></i><i data-heat="2"></i><i data-heat="3"></i></span></div>
    </section>
    <section class="hb-panel" aria-label="Record">
     <div class="hb-select">
      <div class="hb-select-name" aria-live="polite" aria-atomic="true"><span class="hb-select-kicker" id="hb-kicker"></span><h2 class="hb-select-title" id="hb-title"></h2></div>
      <div class="segmented" id="hb-type" role="group" aria-label="Exercise">
       <button type="button" data-t="hang" aria-pressed="false">${icon('timer')}Hang</button>
       <button type="button" data-t="pullups" aria-pressed="false">${icon('strength')}Pull-ups</button>
       <span class="segmented-indicator" aria-hidden="true"></span></div>
     </div>
     <div class="hb-stage-wrap" id="hb-stage"></div>
     <div class="hb-stats" id="hb-stats"></div>
     <div class="hb-card" id="hb-chart"></div>
     <div class="hb-card" id="hb-bests"></div>
     <div class="hb-card" id="hb-log"></div>
    </section>
   </div>
  </div>`;
  const root=view.querySelector('.page-hangboard');
  const q=s=>root.querySelector(s);
  const svg=q('.hb-svg');
  const sync=()=>{if(Crux.ui&&Crux.ui.syncIndicator)Crux.ui.syncIndicator(q('#hb-type'),'button','.segmented-indicator');};
  const persist=()=>prefs.set('hbSel',{hold:st.hold,type:st.type});
  const rowsFor=(hold,type)=>logs().filter(r=>r.hold===hold&&r.type===type).sort((a,b)=>a.at-b.at||a.updatedAt-b.updatedAt);
  const bestRow=rows=>rows.reduce((b,r)=>!b||valueOf(r)>=valueOf(b)?r:b,null);

  /* board: the 3D model when WebGL is there, the flat SVG otherwise */
  const host3d=q('#hb-3d'),holdList=q('#hb-holdlist');
  function heatMap(){
   const cut=Date.now()-30*86400000,n={};
   for(const r of logs())if(r.at>=cut)n[r.hold]=(n[r.hold]||0)+1;
   const out={};for(const id of Object.keys(byId)){const c=n[id]||0;out[id]=c>=6?3:c>=3?2:c>=1?1:0;}
   return out;
  }
  function paintBoard(){
   const heat=heatMap();
   svg.querySelectorAll('.hb-hold').forEach(g=>{
    const id=g.dataset.hold;
    g.setAttribute('aria-pressed',String(id===st.hold));
    g.dataset.heat=String(heat[id]||0);
   });
   svg.classList.toggle('is-locked',!!run);
   holdList.querySelectorAll('[data-pick]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.pick===st.hold));b.disabled=!!run;});
   if(view3d)view3d.update({selected:st.hold,heat,locked:!!run});
  }
  function useSVG(){
   drop3d();
   host3d.hidden=true;host3d.classList.remove('is-loading');holdList.hidden=true;svg.removeAttribute('hidden');
   q('#hb-hint-text').textContent='Tap a hold to pick the pair, or the bar below it.';
  }
  function load3d(){
   if(!webgl()||!window.ResizeObserver)return;
   host3d.hidden=false;host3d.classList.add('is-loading');svg.setAttribute('hidden','');
   import(new URL('js/hangboard3d.js',document.baseURI).href).then(mod=>{
    if(!root.isConnected)return;
    view3d=mod.mount(host3d,{
     holds:ALL.map(x=>({id:x.id,side:x.side,centre:!!x.centre,name:x.name})),
     onSelect:id=>select(id),
     onFail:()=>{if(root.isConnected)useSVG();},
     icon,
    });
    host3d.classList.remove('is-loading');holdList.hidden=false;
    q('#hb-hint-text').textContent='Drag to turn it · tap a hold · double-tap or Flip for the other side.';
    // tear the model down (and free the GL context) as soon as the page is replaced
    viewObs=new MutationObserver(()=>{if(!root.isConnected)drop3d();});
    viewObs.observe(view,{childList:true});
    paintBoard();
   }).catch(err=>{console.warn('Hangboard 3D unavailable, using the flat board.',err);if(root.isConnected)useSVG();});
  }
  holdList.addEventListener('click',e=>{const b=e.target.closest('[data-pick]');if(b)select(b.dataset.pick);});
  function select(id){
   if(run||!byId[id])return;
   if(id===st.hold)return;
   st.hold=id;st.banner=null;st.reps=null;persist();paintAll();
  }
  svg.addEventListener('click',e=>{const g=e.target.closest('.hb-hold');if(g)select(g.dataset.hold);});
  svg.addEventListener('keydown',e=>{
   const g=e.target.closest&&e.target.closest('.hb-hold');
   if(g&&(e.key==='Enter'||e.key===' ')){e.preventDefault();select(g.dataset.hold);}
  });

  /* header + segmented */
  function paintSelect(){
   const hd=byId[st.hold];
   q('#hb-title').textContent=hd.name;
   q('#hb-kicker').textContent=hd.kind==='bar'?'Overhead bar':`${hd.side==='back'?'Back':'Front'} · ${hd.centre?'Centre hold':'Left + right pair'}`;
   q('#hb-type').querySelectorAll('button').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.t===st.type));b.disabled=!!run;});
   sync();
  }
  q('#hb-type').addEventListener('click',e=>{
   const b=e.target.closest('button[data-t]');if(!b||run||b.dataset.t===st.type)return;
   st.type=b.dataset.t;st.banner=null;st.reps=null;persist();paintAll();
  });

  /* stage: idle → get ready → hanging */
  const stage=q('#hb-stage');
  function paintStage(){
   const hd=byId[st.hold];
   const bn=st.banner?`<div class="hb-banner${st.banner.pb?' is-pb':''}" role="status"><div class="hb-banner-main"><span class="hb-banner-icon">${icon(st.banner.pb?'flame':'check')}</span><div><strong class="num">${h(st.banner.text)}</strong><span>${st.banner.pb?'New personal best':'Saved'} · ${h(hd.name)}</span></div></div><button type="button" class="btn btn-secondary btn-sm" data-act="undo">Undo</button></div>`:'';
   if(st.type==='hang'){
    stage.innerHTML=`<div class="hb-stage is-idle">${bn}<button type="button" class="hb-go" data-act="start"><span class="hb-go-ico">${icon('play')}</span><span class="hb-go-text"><strong>Start hang</strong><span>${COUNT} s to get set, then the timer runs</span></span></button></div>`;
   }else{
    const last=rowsFor(st.hold,'pullups').pop();
    if(st.reps==null)st.reps=last?last.reps:5;
    stage.innerHTML=`<div class="hb-stage is-idle">${bn}<div class="hb-reps"><span class="hb-reps-label">Total pull-ups</span>
     <div class="hb-reps-row"><button type="button" class="hb-rep-btn" data-d="-1" aria-label="One fewer">${icon('minus')}</button>
     <input class="hb-rep-input num" id="hb-reps" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" value="${st.reps}" aria-label="Total pull-ups" autocomplete="off">
     <button type="button" class="hb-rep-btn" data-d="1" aria-label="One more">${icon('plus')}</button></div>
     <button type="button" class="btn hb-save" data-act="save-reps">${icon('check')} Save pull-ups</button></div></div>`;
    syncRepState();
   }
  }
  function syncRepState(){
   const b=stage.querySelector('[data-act="save-reps"]');if(b)b.disabled=!(st.reps>0);
   const m=stage.querySelector('[data-d="-1"]');if(m)m.disabled=!(st.reps>0);
  }
  stage.addEventListener('input',e=>{
   if(e.target.id!=='hb-reps')return;
   const clean=e.target.value.replace(/\D/g,'').slice(0,3);
   if(clean!==e.target.value)e.target.value=clean;
   st.reps=clean===''?0:Number(clean);syncRepState();
  });
  stage.addEventListener('keydown',e=>{
   if(e.target.id==='hb-reps'&&e.key==='Enter'){e.preventDefault();saveReps();}
   if(e.key==='Escape'&&run&&run.phase==='count')abort();
  });
  stage.addEventListener('focusin',e=>{if(e.target.id==='hb-reps')e.target.select();});
  stage.addEventListener('click',e=>{
   const rep=e.target.closest('.hb-rep-btn');
   if(rep){st.reps=Math.max(0,Math.min(200,(st.reps||0)+Number(rep.dataset.d)));const i=stage.querySelector('#hb-reps');i.value=st.reps;syncRepState();return;}
   const a=e.target.closest('[data-act]');if(!a)return;
   const act=a.dataset.act;
   if(act==='start')begin();
   else if(act==='cancel')abort();
   else if(act==='stop')finish();
   else if(act==='save-reps')saveReps();
   else if(act==='undo')undo();
  });

  function record(entry){
   const rows=rowsFor(entry.hold,entry.type),prevBest=rows.length?valueOf(bestRow(rows)):null;
   const rec=store().addHang(entry),v=valueOf(rec);
   st.banner={id:rec.id,text:fmtVal(rec.type,v),pb:prevBest!=null&&v>prevBest};
   return rec;
  }
  function saveReps(){
   if(!(st.reps>0))return;
   record({hold:st.hold,type:'pullups',reps:st.reps});
   paintAll();
  }
  function undo(){
   if(!st.banner)return;
   store().remove('hangLog',st.banner.id);st.banner=null;paintAll();toast('Removed');
  }

  function begin(){
   if(run)return;
   if(Crux.Audio)Crux.Audio.unlock();
   st.banner=null;
   run={phase:'count',t0:performance.now(),n:null,raf:0};
   keepAwake();
   stage.innerHTML=`<button type="button" class="hb-stage hb-run is-count" data-act="cancel" aria-label="Get ready. Tap to cancel.">
    <span class="hb-run-label">Get on the ${h(byId[st.hold].kind==='bar'?'bar':'hold')}</span>
    <span class="hb-ring-wrap"><svg viewBox="0 0 200 200" aria-hidden="true"><circle class="hb-ring-bg" cx="100" cy="100" r="90"/><circle class="hb-ring-fg" cx="100" cy="100" r="90" pathLength="1"/></svg><span class="hb-big num" id="hb-big">${COUNT}</span></span>
    <span class="hb-run-sub">Tap to cancel</span></button>`;
   paintBoard();paintSelect();paintPanels();
   run.raf=requestAnimationFrame(loop);
  }
  function loop(now){
   if(!run)return;
   if(!root.isConnected){stopLoop();return;}
   const big=stage.querySelector('#hb-big');
   if(run.phase==='count'){
    const left=COUNT-(now-run.t0)/1000;
    if(left<=0){
     run.phase='run';run.t0=now;
     if(Crux.Audio)Crux.Audio.beep('go');
     stage.innerHTML=`<button type="button" class="hb-stage hb-run is-run" data-act="stop" aria-label="Stop the hang and save">
      <span class="hb-run-label">Hanging</span>
      <span class="hb-time num"><span id="hb-big">0.0</span><small>s</small></span>
      <span class="hb-run-sub">Tap anywhere to stop</span></button>`;
    }else{
     const n=Math.ceil(left);
     if(n!==run.n){
      run.n=n;if(big){big.textContent=n;big.classList.remove('pop');void big.offsetWidth;big.classList.add('pop');}
      if(Crux.Audio)Crux.Audio.beep('tick');
     }
     const fg=stage.querySelector('.hb-ring-fg');
     if(fg)fg.style.strokeDashoffset=String(1-left/COUNT);
    }
   }else if(big){
    big.textContent=fmtSecs((now-run.t0)/1000);
    const wrap=big.parentElement;if(wrap)wrap.classList.toggle('is-long',(now-run.t0)>=60000);
   }
   run.raf=requestAnimationFrame(loop);
  }
  function abort(){stopLoop();paintAll();}
  function finish(){
   if(!run||run.phase!=='run')return;
   const ms=performance.now()-run.t0;
   if(ms<700)return; // a double tap on "go" should not end the hang
   stopLoop();
   if(Crux.Audio)Crux.Audio.beep('stop');
   if(ms<1500){toast('Too short to record');paintAll();return;}
   record({hold:st.hold,type:'hang',seconds:Math.round(ms/100)/10});
   paintAll();
  }

  /* stats, chart, per-hold bests, log */
  function paintStats(){
   const rows=rowsFor(st.hold,st.type),best=bestRow(rows),last=rows[rows.length-1],prev=rows[rows.length-2];
   const type=st.type,accent=type==='hang'?'is-hang':'is-pull';
   let delta='';
   if(last&&prev){const d=valueOf(last)-valueOf(prev);const ds=type==='hang'?Math.abs(d).toFixed(1)+' s':Math.abs(d);delta=`<em class="${d>0?'up':d<0?'down':''}">${d>0?'+':d<0?'−':'±'}${d===0?'0':ds} vs before</em>`;}
   q('#hb-stats').innerHTML=`
    <div class="hb-stat ${accent}"><span>Best</span><strong class="num">${best?h(fmtVal(type,valueOf(best))):'—'}</strong>${best?`<em>${h(fmtDay(best.at))}</em>`:''}</div>
    <div class="hb-stat"><span>Last</span><strong class="num">${last?h(fmtVal(type,valueOf(last))):'—'}</strong>${delta||(last?`<em>${h(fmtDay(last.at))}</em>`:'')}</div>
    <div class="hb-stat"><span>Logged</span><strong class="num">${rows.length}</strong><em>${type==='hang'?(rows.length===1?'hang':'hangs'):(rows.length===1?'set':'sets')}</em></div>`;
   const c=q('#hb-chart');
   const shown=rows.slice(-30);
   c.className=`hb-card hb-chart ${accent}`;
   c.innerHTML=`<div class="hb-card-head"><h3>Progress</h3><span>${type==='hang'?'Hang time':'Pull-ups per set'} · ${h(byId[st.hold].name)}</span></div>`+
    (rows.length?`<div class="hb-chart-fig">${chartSVG(shown,type,best&&shown.some(r=>r.id===best.id)?best.id:null)}</div>`
     :`<div class="hb-empty">${icon('flame')}<p>${type==='hang'?'Log a hang':'Log a set'} on the ${h(byId[st.hold].name.toLowerCase())} and your progress line starts here.</p></div>`);
  }
  function paintBests(){
   const type=st.type,c=q('#hb-bests');
   const items=ALL.map(hd=>{const b=bestRow(rowsFor(hd.id,type));return b?{hd,v:valueOf(b)}:null;}).filter(Boolean);
   c.className=`hb-card hb-bests ${type==='hang'?'is-hang':'is-pull'}`;
   if(!items.length){c.hidden=true;c.innerHTML='';return;}
   c.hidden=false;
   const max=Math.max(...items.map(i=>i.v));
   c.innerHTML=`<div class="hb-card-head"><h3>Best by hold</h3><span>${type==='hang'?'Longest hang':'Most pull-ups'}</span></div><div class="hb-bars">`+
    items.map(({hd,v})=>`<button type="button" class="hb-bar-row${hd.id===st.hold?' is-sel':''}" data-pick="${hd.id}" ${run?'disabled':''}><span class="hb-bar-name">${h(hd.name)}</span><span class="hb-bar-track"><i style="width:${Math.max(4,v/max*100)}%"></i></span><span class="hb-bar-val num">${h(fmtVal(type,v))}</span></button>`).join('')+`</div>`;
  }
  q('#hb-bests').addEventListener('click',e=>{const b=e.target.closest('[data-pick]');if(b)select(b.dataset.pick);});
  function paintLog(){
   const c=q('#hb-log'),type=st.type;
   let rows=logs().filter(r=>r.type===type);
   if(st.scope==='hold')rows=rows.filter(r=>r.hold===st.hold);
   rows.sort((a,b)=>b.at-a.at||b.updatedAt-a.updatedAt);
   const best=bestRow(rowsFor(st.hold,type));
   c.className='hb-card hb-log';
   const list=rows.slice(0,12);
   c.innerHTML=`<div class="hb-card-head"><h3>Recent</h3><div class="segmented seg-sm" id="hb-scope" role="group" aria-label="Which holds"><button type="button" data-s="hold" aria-pressed="${st.scope==='hold'}">This hold</button><button type="button" data-s="all" aria-pressed="${st.scope==='all'}">All holds</button><span class="segmented-indicator" aria-hidden="true"></span></div></div>`+
    (list.length?`<ul class="hb-rows">${list.map(r=>`<li class="hb-row" data-id="${h(r.id)}"><span class="hb-row-main"><strong class="num">${h(fmtVal(r.type,valueOf(r)))}</strong>${best&&r.id===best.id&&r.hold===st.hold?'<span class="hb-pb-tag">PB</span>':''}<span class="hb-row-sub">${st.scope==='all'?h(byId[r.hold].name)+' · ':''}${h(fmtWhen(r.at))}</span></span><button type="button" class="icon-btn plain hb-del" data-del="${h(r.id)}" aria-label="Delete this record">${icon('trash')}</button></li>`).join('')}</ul>`
     :`<div class="hb-empty small"><p>No ${type==='hang'?'hangs':'pull-up sets'} logged${st.scope==='hold'?' on this hold':''} yet.</p></div>`);
   requestAnimationFrame(()=>{const s=c.querySelector('#hb-scope');if(s&&Crux.ui&&Crux.ui.syncIndicator)Crux.ui.syncIndicator(s,'button','.segmented-indicator');});
  }
  q('#hb-log').addEventListener('click',e=>{
   const sc=e.target.closest('[data-s]');
   if(sc){st.scope=sc.dataset.s;paintLog();return;}
   const del=e.target.closest('[data-del]');
   if(del){
    if(del.dataset.armed){store().remove('hangLog',del.dataset.del);if(st.banner&&st.banner.id===del.dataset.del)st.banner=null;paintAll();return;}
    del.dataset.armed='1';del.classList.add('is-armed');del.setAttribute('aria-label','Tap again to delete');
    setTimeout(()=>{delete del.dataset.armed;del.classList.remove('is-armed');del.setAttribute('aria-label','Delete this record');},2800);
   }
  });
  function paintPanels(){paintStats();paintBests();paintLog();}
  function paintAll(){paintBoard();paintSelect();if(!run)paintStage();paintPanels();}

  unsub=store().on(e=>{
   if(!root.isConnected)return;
   if(e.type==='change'&&e.source!=='local'&&(e.collections.includes('hangLog')||e.collections.includes('*'))){if(!run)paintAll();}
  });
  paintAll();
  load3d();
  requestAnimationFrame(sync);
 }

 Crux.pages=Crux.pages||{};
 Crux.pages.hangboard={render};
 Crux.hangboard={HOLDS,BAR,byId,view3d:()=>view3d};
})();
