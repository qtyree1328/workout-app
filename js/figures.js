/* Figures: animated SVG stick-figures for climbing exercises. No dependencies.
   Classic script — defines window.Figures.

   How it works: a tiny skeletal system. Every pose is a small set of joint ANGLES
   (degrees, 0=+x, 90=+y/down) applied via forward-kinematics from a fixed anchor
   (the hands on the board/bar, or the feet on the floor), so bone lengths never
   change no matter how poses are interpolated — limbs cannot stretch. Push-ups use
   a 2-bone IK solve instead, so the hand can stay pinned to the floor while the
   shoulder target moves. Rest is a separate standing pose; switching phases blends
   the two pose's joint positions over ~500ms. */
(function(){

 // ---------------- math ----------------
 const D2R=Math.PI/180;
 const dir=deg=>({x:Math.cos(deg*D2R),y:Math.sin(deg*D2R)});
 const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
 const mirrorA=a=>180-a;
 function chain(root,segs){
  let p=root,out=[];
  for(let i=0;i<segs.length;i++){const dd=dir(segs[i].a);p={x:p.x+dd.x*segs[i].len,y:p.y+dd.y*segs[i].len};out.push(p);}
  return out;
 }
 function ikMid(root,target,l1,l2,bend){
  let dx=target.x-root.x,dy=target.y-root.y;
  let dist=Math.hypot(dx,dy)||0.001;
  dist=Math.min(dist,l1+l2-0.05);
  dist=Math.max(dist,Math.abs(l1-l2)+0.05);
  const a=Math.atan2(dy,dx);
  const cosA=(l1*l1+dist*dist-l2*l2)/(2*l1*dist);
  const ang=Math.acos(Math.max(-1,Math.min(1,cosA)));
  const j=a+bend*ang;
  return {x:root.x+l1*Math.cos(j),y:root.y+l1*Math.sin(j)};
 }
 const isPt=v=>v&&typeof v.x==='number'&&typeof v.y==='number';
 function blendP(a,b,t){
  const out={},keys=new Set(Object.keys(a).concat(Object.keys(b)));
  keys.forEach(k=>{
   const av=a[k],bv=b[k];
   if(av===undefined){out[k]=bv;return;}
   if(bv===undefined){out[k]=av;return;}
   if(typeof av==='number'&&typeof bv==='number'){out[k]=av+(bv-av)*t;return;}
   if(isPt(av)&&isPt(bv)){out[k]={x:av.x+(bv.x-av.x)*t,y:av.y+(bv.y-av.y)*t};return;}
   if(av&&bv&&typeof av==='object'&&typeof bv==='object'){
    const inner={},ik=new Set(Object.keys(av).concat(Object.keys(bv)));let ok=true;
    ik.forEach(kk=>{if(isPt(av[kk])&&isPt(bv[kk]))inner[kk]={x:av[kk].x+(bv[kk].x-av[kk].x)*t,y:av[kk].y+(bv[kk].y-av[kk].y)*t};else ok=false;});
    out[k]=ok?inner:(t<0.5?av:bv);return;
   }
   out[k]=t<0.5?av:bv;
  });
  return out;
 }
 const JKEYS=['head','neck','shL','shR','elL','elR','haL','haR','pelvis','hipL','hipR','knL','knR','ftL','ftR','shC'];
 function lerpJoints(a,b,t){
  if(t<=0)return a;
  if(t>=1)return b;
  const out={};
  for(const k of JKEYS){if(!a[k]||!b[k])continue;out[k]={x:a[k].x+(b[k].x-a[k].x)*t,y:a[k].y+(b[k].y-a[k].y)*t};}
  return out;
 }

 const EASE={
  linear:t=>t,
  sine:t=>-(Math.cos(Math.PI*t)-1)/2,
  outCubic:t=>1-Math.pow(1-t,3),
  outQuad:t=>1-(1-t)*(1-t),
 };

 function tl(keys){const total=keys.reduce((s,k)=>s+(k.t||0)+(k.h||0),0);return {keys,total:total||1};}
 function sample(timeline,ms){
  let t=((ms%timeline.total)+timeline.total)%timeline.total;
  const keys=timeline.keys;
  for(let i=0;i<keys.length;i++){
   const k=keys[i],dur=k.t||0;
   if(t<dur){
    const prev=keys[(i-1+keys.length)%keys.length].p;
    const e=k.e||EASE.sine;
    return blendP(prev,k.p,dur?e(t/dur):1);
   }
   t-=dur;
   const hold=k.h||0;
   if(t<hold)return k.p;
   t-=hold;
  }
  return keys[0].p;
 }

 function idleWobble(t,amp,big){
  amp=amp==null?1:amp;
  const s=Math.sin(t*0.0016)*0.9+Math.sin(t*0.0037+1.1)*0.4;
  return {torso:s*0.5*amp,head:s*0.7*amp,arm:(big?s*2.1:s*0.75)*amp,leg:s*0.45*amp};
 }

 // ---------------- skeleton constants ----------------
 const BONES={head:10,neck:6,upperArm:26,forearm:24,torso:42,thigh:30,shin:28,pelvisHalf:8,shoulderHalf:14};
 const FLOOR_Y=178;
 const HB_HAND={l:{x:80,y:44},r:{x:120,y:44}};
 const BAR_HAND={l:{x:78,y:32},r:{x:122,y:32}};
 const BOX_FOOT={l:{x:90,y:150},r:{x:110,y:150}};
 const merge=(base,hand,foot)=>{const o=Object.assign({},base,{hl:hand.l,hr:hand.r});if(foot)o.footTarget=foot;return o;};

 // ---------------- pose presets (right-side angles; left mirrors automatically) ----------------
 const HANG={fa:100,ua:101,ta:90,tha:88,sha:93,ha:-89,breathe:1};
 const HANG_ENG={fa:97,ua:95,ta:89,tha:88,sha:93,ha:-89,breathe:1};
 const HANG_ENG2={fa:94,ua:91,ta:88,tha:87,sha:92,ha:-90,breathe:1};
 const ASSISTED_BASE={fa:80,ua:74,ta:90,ha:-88,breathe:1};
 const ASSISTED_PEAK={fa:76,ua:68,ta:89,ha:-89,breathe:1};
 const TOP={fa:65,ua:185,ta:90,tha:90,sha:95,ha:-100,breathe:0};
 const SCAP_UP={fa:87,ua:88,ta:88,tha:88,sha:93,ha:-92,breathe:1};
 const EXPLOSIVE_TOP={fa:58,ua:192,ta:91,tha:92,sha:97,ha:-103,breathe:0,burst:1};
 const NEGATIVE_TOP={fa:66,ua:183,ta:90,tha:90,sha:95,ha:-99,breathe:0};
 const RAISED_KR={fa:100,ua:101,ta:97,tha:-80,sha:145,ha:-82,breathe:0.6};

 const HANG_bar=merge(Object.assign({},HANG,{burst:0}),BAR_HAND);
 const TOP_bar=merge(TOP,BAR_HAND);
 const TOPW_bar=merge(blendP(HANG,TOP,0.78),BAR_HAND);
 const SCAP_bar0=merge(HANG,BAR_HAND),SCAP_bar1=merge(SCAP_UP,BAR_HAND);
 const EXPTOP_bar=merge(EXPLOSIVE_TOP,BAR_HAND);
 const NEGTOP_bar=merge(NEGATIVE_TOP,BAR_HAND);
 const L90_bar=blendP(TOP_bar,HANG_bar,0.38);
 const L120_bar=blendP(TOP_bar,HANG_bar,0.64);
 const RAISED_bar=merge(RAISED_KR,BAR_HAND);

 // Push-up (side view): pose = fixed floor hand + a moving shoulder TARGET, solved with 2-bone IK.
 const PUSH_UP={hand:{x:40,y:FLOOR_Y},sh:{x:56.4,y:132.9},body:27,bend:-1,dx:-3,dy:-9};
 const PUSH_DOWN={hand:{x:40,y:FLOOR_Y},sh:{x:72,y:162},body:9,bend:-1,dx:-3,dy:-9};

 function breatheLoop(base,peak,hand,foot){
  const b=merge(base,hand,foot),p=merge(peak,hand,foot);
  return tl([{p:b,t:900,e:EASE.sine,h:1200},{p:p,t:900,e:EASE.sine,h:1200}]);
 }

 // ---------------- forward/inverse kinematics per view ----------------
 function frontHangJoints(p,t){
  const idle=idleWobble(t,p.breathe==null?1:p.breathe);
  const fa=p.fa+idle.arm,ua=p.ua+idle.arm*0.6,ta=p.ta+idle.torso,ha=p.ha+idle.head;
  const [elR,shR]=chain(p.hr,[{len:BONES.forearm,a:fa},{len:BONES.upperArm,a:ua}]);
  const [elL,shL]=chain(p.hl,[{len:BONES.forearm,a:mirrorA(fa)},{len:BONES.upperArm,a:mirrorA(ua)}]);
  const shC=mid(shR,shL);
  const [pelvis]=chain(shC,[{len:BONES.torso,a:ta}]);
  const hipR={x:pelvis.x+BONES.pelvisHalf,y:pelvis.y},hipL={x:pelvis.x-BONES.pelvisHalf,y:pelvis.y};
  let knR,ftR,knL,ftL;
  if(p.footTarget){
   knR=ikMid(hipR,p.footTarget.r,BONES.thigh,BONES.shin,1);ftR=p.footTarget.r;
   knL=ikMid(hipL,p.footTarget.l,BONES.thigh,BONES.shin,-1);ftL=p.footTarget.l;
  }else{
   const tha=p.tha+idle.leg,sha=p.sha+idle.leg*0.7;
   [knR,ftR]=chain(hipR,[{len:BONES.thigh,a:tha},{len:BONES.shin,a:sha}]);
   [knL,ftL]=chain(hipL,[{len:BONES.thigh,a:mirrorA(tha)},{len:BONES.shin,a:mirrorA(sha)}]);
  }
  const [neck,head]=chain(shC,[{len:BONES.neck,a:ha},{len:BONES.head,a:ha}]);
  return {head,neck,shL,shR,elL,elR,haL:p.hl,haR:p.hr,pelvis,hipL,hipR,knL,knR,ftL,ftR,shC};
 }

 function frontStandJoints(t){
  const idle=idleWobble(t,1,true);
  const footR={x:108,y:FLOOR_Y},footL={x:92,y:FLOOR_Y};
  const [knR,hipR]=chain(footR,[{len:BONES.shin,a:-90+idle.leg*0.4},{len:BONES.thigh,a:-90-idle.leg*0.4}]);
  const [knL,hipL]=chain(footL,[{len:BONES.shin,a:-90-idle.leg*0.4},{len:BONES.thigh,a:-90+idle.leg*0.4}]);
  const hipC=mid(hipR,hipL);
  const [shC]=chain(hipC,[{len:BONES.torso,a:-90+idle.torso}]);
  const shoulderR={x:shC.x+BONES.shoulderHalf,y:shC.y},shoulderL={x:shC.x-BONES.shoulderHalf,y:shC.y};
  const [elR,haR]=chain(shoulderR,[{len:BONES.upperArm,a:96+idle.arm},{len:BONES.forearm,a:92+idle.arm*1.3}]);
  const [elL,haL]=chain(shoulderL,[{len:BONES.upperArm,a:mirrorA(96+idle.arm)},{len:BONES.forearm,a:mirrorA(92+idle.arm*1.3)}]);
  const [neck,head]=chain(shC,[{len:BONES.neck,a:-90+idle.head},{len:BONES.head,a:-90+idle.head}]);
  return {head,neck,shL:shoulderL,shR:shoulderR,elL,elR,haL,haR,pelvis:hipC,hipL,hipR,knL,knR,ftL:footL,ftR:footR,shC};
 }

 function sideStandJoints(t){
  const idle=idleWobble(t,1,true);
  const footN={x:120,y:FLOOR_Y};
  const [knN,hipN]=chain(footN,[{len:BONES.shin,a:-90+idle.leg*0.3},{len:BONES.thigh,a:-90-idle.leg*0.3}]);
  const [shN]=chain(hipN,[{len:BONES.torso,a:-90+idle.torso}]);
  const [elN,haN]=chain(shN,[{len:BONES.upperArm,a:100+idle.arm},{len:BONES.forearm,a:95+idle.arm*1.3}]);
  const [neck,head]=chain(shN,[{len:BONES.neck,a:-90+idle.head},{len:BONES.head,a:-90+idle.head}]);
  const off={x:-10,y:3};
  const shift=q=>({x:q.x+off.x,y:q.y+off.y});
  const footF=shift(footN),knF=shift(knN),hipF=shift(hipN),shF=shift(shN),elF=shift(elN),haF=shift(haN);
  return {head,neck,shR:shN,shL:shF,elR:elN,elL:elF,haR:haN,haL:haF,pelvis:hipN,hipR:hipN,hipL:hipF,knR:knN,knL:knF,ftR:footN,ftL:footF,shC:shN};
 }

 function sidePushJoints(p,t){
  const idle=idleWobble(t,0.5);
  const shN={x:p.sh.x,y:p.sh.y+idle.arm*0.15};
  const elN=ikMid(p.hand,shN,BONES.forearm,BONES.upperArm,p.bend);
  const bodyA=p.body+idle.torso*0.3;
  const [pelN,knN,ftN]=chain(shN,[{len:BONES.torso,a:bodyA},{len:BONES.thigh,a:bodyA},{len:BONES.shin,a:bodyA}]);
  const farHand={x:p.hand.x+p.dx,y:p.hand.y+p.dy};
  const shF={x:shN.x+p.dx,y:shN.y+p.dy};
  const elF=ikMid(farHand,shF,BONES.forearm,BONES.upperArm,p.bend);
  const [pelF,knF,ftF]=chain(shF,[{len:BONES.torso,a:bodyA},{len:BONES.thigh,a:bodyA},{len:BONES.shin,a:bodyA}]);
  const [neck,head]=chain(shN,[{len:BONES.neck,a:bodyA-90+idle.head},{len:BONES.head,a:bodyA-90+idle.head}]);
  return {head,neck,shR:shN,shL:shF,elR:elN,elL:elF,haR:p.hand,haL:farHand,pelvis:pelN,hipR:pelN,hipL:pelF,knR:knN,knL:knF,ftR:ftN,ftL:ftF,shC:shN};
 }

 // ---------------- static apparatus markup ----------------
 function apparatusMarkup(ex){
  let s='';
  if(ex.app==='hangboard'){
   s+='<rect x="38" y="21" width="124" height="22" rx="7" fill="var(--fig-wood,#C99B62)"/>';
   s+='<rect x="38" y="33" width="124" height="10" rx="3" fill="var(--fig-wood-2,#9C7443)" opacity="0.5"/>';
   [66,98,130].forEach(x=>{s+=`<rect x="${x-15}" y="35" width="30" height="5" rx="2.2" fill="var(--fig-wood-2,#9C7443)"/>`;});
   if(ex.minEdge)s+='<rect x="83" y="41.5" width="34" height="4.5" rx="2.2" fill="var(--fig-accent,#F2692E)"/>';
  }else if(ex.app==='bar'){
   s+='<line x1="57" y1="19" x2="57" y2="33" stroke="var(--fig-bar,#8C949A)" stroke-width="5" stroke-linecap="round"/>';
   s+='<line x1="143" y1="19" x2="143" y2="33" stroke="var(--fig-bar,#8C949A)" stroke-width="5" stroke-linecap="round"/>';
   s+='<line x1="53" y1="32" x2="147" y2="32" stroke="var(--fig-bar,#8C949A)" stroke-width="6.5" stroke-linecap="round"/>';
  }
  if(ex.box){
   s+='<rect x="76" y="150" width="48" height="28" rx="6" fill="var(--fig-bar,#8C949A)" opacity="0.3"/>';
   s+='<rect x="76" y="150" width="48" height="28" rx="6" fill="none" stroke="var(--fig-bar,#8C949A)" stroke-width="2" opacity="0.85"/>';
  }
  return s;
 }

 // ---------------- DOM builders / per-frame updaters ----------------
 const NS='http://www.w3.org/2000/svg';
 const mkEl=t=>document.createElementNS(NS,t);
 function mkStroke(parent,w,color){
  const p=mkEl('path');
  p.setAttribute('fill','none');p.setAttribute('stroke',color);p.setAttribute('stroke-width',String(w));
  p.setAttribute('stroke-linecap','round');p.setAttribute('stroke-linejoin','round');
  parent.appendChild(p);return p;
 }
 function fmt(p){return p.x.toFixed(1)+' '+p.y.toFixed(1);}

 function buildFrontDOM(svg,ex){
  const appG=mkEl('g');appG.innerHTML=apparatusMarkup(ex);svg.appendChild(appG);

  const floor=mkEl('line');
  floor.setAttribute('x1','18');floor.setAttribute('x2','182');floor.setAttribute('y1',String(FLOOR_Y));floor.setAttribute('y2',String(FLOOR_Y));
  floor.setAttribute('stroke','var(--fig-floor,rgba(0,0,0,.12))');floor.setAttribute('stroke-width','3');floor.setAttribute('stroke-linecap','round');
  svg.appendChild(floor);

  let motionEls=null;
  if(ex.motion){
   motionEls=[0,1,2].map(()=>{
    const p=mkEl('path');
    p.setAttribute('fill','none');p.setAttribute('stroke','var(--fig-accent,#F2692E)');
    p.setAttribute('stroke-width','2.2');p.setAttribute('stroke-linecap','round');p.setAttribute('opacity','0');
    svg.appendChild(p);return p;
   });
  }

  const legL=mkStroke(svg,10,'var(--fig-ink,#1c2220)'),legR=mkStroke(svg,10,'var(--fig-ink,#1c2220)');
  const torso=mkEl('line');
  torso.setAttribute('stroke','var(--fig-ink,#1c2220)');torso.setAttribute('stroke-width','21');torso.setAttribute('stroke-linecap','round');
  svg.appendChild(torso);
  const armL=mkStroke(svg,8.5,'var(--fig-ink,#1c2220)'),armR=mkStroke(svg,8.5,'var(--fig-ink,#1c2220)');

  let plate=null,belt=null;
  if(ex.weighted){
   belt=mkEl('line');belt.setAttribute('stroke','var(--fig-ink,#1c2220)');belt.setAttribute('stroke-width','3');belt.setAttribute('stroke-linecap','round');svg.appendChild(belt);
   const g=mkEl('g');
   const outer=mkEl('circle');outer.setAttribute('r','9');outer.setAttribute('fill','var(--fig-accent,#F2692E)');
   const hole=mkEl('circle');hole.setAttribute('r','3');hole.setAttribute('fill','var(--fig-wood-2,#9C7443)');
   g.appendChild(outer);g.appendChild(hole);svg.appendChild(g);
   plate={g};
  }

  const handL=mkEl('circle'),handR=mkEl('circle');
  [handL,handR].forEach(c=>{c.setAttribute('r','5.4');c.setAttribute('fill','var(--fig-ink,#1c2220)');svg.appendChild(c);});
  const head=mkEl('circle');head.setAttribute('r',String(BONES.head));head.setAttribute('fill','var(--fig-ink,#1c2220)');svg.appendChild(head);

  return {legL,legR,torso,armL,armR,handL,handR,head,motionEls,belt,plate};
 }

 function updateFront(n,j,burst,restBlend){
  n.legR.setAttribute('d',`M${fmt(j.ftR)} L${fmt(j.knR)} L${fmt(j.hipR)}`);
  n.legL.setAttribute('d',`M${fmt(j.ftL)} L${fmt(j.knL)} L${fmt(j.hipL)}`);
  n.torso.setAttribute('x1',j.shC.x.toFixed(1));n.torso.setAttribute('y1',j.shC.y.toFixed(1));
  n.torso.setAttribute('x2',j.pelvis.x.toFixed(1));n.torso.setAttribute('y2',j.pelvis.y.toFixed(1));
  n.armR.setAttribute('d',`M${fmt(j.haR)} L${fmt(j.elR)} L${fmt(j.shR)}`);
  n.armL.setAttribute('d',`M${fmt(j.haL)} L${fmt(j.elL)} L${fmt(j.shL)}`);
  n.handR.setAttribute('cx',j.haR.x.toFixed(1));n.handR.setAttribute('cy',j.haR.y.toFixed(1));
  n.handL.setAttribute('cx',j.haL.x.toFixed(1));n.handL.setAttribute('cy',j.haL.y.toFixed(1));
  n.head.setAttribute('cx',j.head.x.toFixed(1));n.head.setAttribute('cy',j.head.y.toFixed(1));
  if(n.plate){
   const bx=j.pelvis.x+7,by=j.pelvis.y+5,px=bx+4,py=by+46;
   n.belt.setAttribute('x1',bx.toFixed(1));n.belt.setAttribute('y1',by.toFixed(1));
   n.belt.setAttribute('x2',px.toFixed(1));n.belt.setAttribute('y2',py.toFixed(1));
   n.plate.g.setAttribute('transform',`translate(${px.toFixed(1)},${(py+9).toFixed(1)})`);
   const op=(1-(restBlend||0)).toFixed(2);
   n.belt.setAttribute('opacity',op);n.plate.g.setAttribute('opacity',op);
  }
  if(n.motionEls){
   const op=Math.max(0,Math.min(1,burst));
   n.motionEls.forEach((p,i)=>{
    p.setAttribute('opacity',(op*0.75).toFixed(2));
    const sx=j.shR.x+7+i*4,sy=j.shR.y-2+i*8;
    p.setAttribute('d',`M${sx.toFixed(1)} ${sy.toFixed(1)} q9 3 15 ${11+i*3}`);
   });
  }
 }

 function buildSideDOM(svg){
  const floor=mkEl('line');
  floor.setAttribute('x1','12');floor.setAttribute('x2','188');floor.setAttribute('y1',String(FLOOR_Y));floor.setAttribute('y2',String(FLOOR_Y));
  floor.setAttribute('stroke','var(--fig-floor,rgba(0,0,0,.12))');floor.setAttribute('stroke-width','3');floor.setAttribute('stroke-linecap','round');
  svg.appendChild(floor);
  const legFar=mkStroke(svg,8.5,'var(--fig-ink-2,#5b6360)');
  const armFar=mkStroke(svg,7.5,'var(--fig-ink-2,#5b6360)');
  const torsoFar=mkEl('line');torsoFar.setAttribute('stroke','var(--fig-ink-2,#5b6360)');torsoFar.setAttribute('stroke-width','17');torsoFar.setAttribute('stroke-linecap','round');svg.appendChild(torsoFar);
  const legNear=mkStroke(svg,9.5,'var(--fig-ink,#1c2220)');
  const torsoNear=mkEl('line');torsoNear.setAttribute('stroke','var(--fig-ink,#1c2220)');torsoNear.setAttribute('stroke-width','19');torsoNear.setAttribute('stroke-linecap','round');svg.appendChild(torsoNear);
  const armNear=mkStroke(svg,8.5,'var(--fig-ink,#1c2220)');
  const handNear=mkEl('circle');handNear.setAttribute('r','5.4');handNear.setAttribute('fill','var(--fig-ink,#1c2220)');svg.appendChild(handNear);
  const head=mkEl('circle');head.setAttribute('r',String(BONES.head));head.setAttribute('fill','var(--fig-ink,#1c2220)');svg.appendChild(head);
  return {legFar,armFar,torsoFar,legNear,torsoNear,armNear,handNear,head};
 }

 function updateSide(n,j){
  n.torsoFar.setAttribute('x1',j.shL.x.toFixed(1));n.torsoFar.setAttribute('y1',j.shL.y.toFixed(1));
  n.torsoFar.setAttribute('x2',j.hipL.x.toFixed(1));n.torsoFar.setAttribute('y2',j.hipL.y.toFixed(1));
  n.legFar.setAttribute('d',`M${fmt(j.hipL)} L${fmt(j.knL)} L${fmt(j.ftL)}`);
  n.armFar.setAttribute('d',`M${fmt(j.haL)} L${fmt(j.elL)} L${fmt(j.shL)}`);
  n.torsoNear.setAttribute('x1',j.shR.x.toFixed(1));n.torsoNear.setAttribute('y1',j.shR.y.toFixed(1));
  n.torsoNear.setAttribute('x2',j.hipR.x.toFixed(1));n.torsoNear.setAttribute('y2',j.hipR.y.toFixed(1));
  n.legNear.setAttribute('d',`M${fmt(j.hipR)} L${fmt(j.knR)} L${fmt(j.ftR)}`);
  n.armNear.setAttribute('d',`M${fmt(j.haR)} L${fmt(j.elR)} L${fmt(j.shR)}`);
  n.handNear.setAttribute('cx',j.haR.x.toFixed(1));n.handNear.setAttribute('cy',j.haR.y.toFixed(1));
  n.head.setAttribute('cx',j.head.x.toFixed(1));n.head.setAttribute('cy',j.head.y.toFixed(1));
 }

 // ---------------- exercise registry ----------------
 const REGISTRY={
  'hb-warm-up-hangs':{app:'hangboard',box:true,
   timeline:breatheLoop(ASSISTED_BASE,ASSISTED_PEAK,HB_HAND,BOX_FOOT),key:merge(ASSISTED_BASE,HB_HAND,BOX_FOOT)},
  'hb-max-hang-half-crimp':{app:'hangboard',grip:'crimp',
   timeline:breatheLoop(HANG_ENG,HANG_ENG2,HB_HAND),key:merge(HANG_ENG,HB_HAND)},
  'hb-max-hang-open-hand':{app:'hangboard',grip:'open',
   timeline:breatheLoop(HANG_ENG,HANG_ENG2,HB_HAND),key:merge(HANG_ENG,HB_HAND)},
  'hb-min-edge-hang':{app:'hangboard',minEdge:true,grip:'crimp',
   timeline:breatheLoop(HANG_ENG,HANG_ENG2,HB_HAND),key:merge(HANG_ENG,HB_HAND)},
  'hb-repeaters-7-3':{app:'hangboard',
   timeline:breatheLoop(HANG,HANG_ENG,HB_HAND),key:merge(HANG_ENG,HB_HAND)},
  'hb-intermittent-80':{app:'hangboard',
   timeline:breatheLoop(HANG,HANG_ENG,HB_HAND),key:merge(HANG_ENG,HB_HAND)},
  'hb-endurance-60':{app:'hangboard',
   timeline:breatheLoop(HANG,HANG_ENG,HB_HAND),key:merge(HANG_ENG,HB_HAND)},
  'hb-low-intensity':{app:'hangboard',box:true,
   timeline:breatheLoop(ASSISTED_BASE,ASSISTED_PEAK,HB_HAND,BOX_FOOT),key:merge(ASSISTED_BASE,HB_HAND,BOX_FOOT)},
  'bar-scapular-pull-up':{app:'bar',
   timeline:tl([{p:SCAP_bar0,t:500,h:400},{p:SCAP_bar1,t:500,e:EASE.outCubic,h:400}]),key:SCAP_bar1},
  'bar-pull-up':{app:'bar',
   timeline:tl([{p:HANG_bar,t:1300,e:EASE.sine,h:0},{p:TOP_bar,t:1100,e:EASE.sine,h:200}]),key:TOP_bar},
  'bar-weighted-pull-up':{app:'bar',weighted:true,
   timeline:tl([{p:HANG_bar,t:1500,e:EASE.sine,h:150},{p:TOPW_bar,t:1300,e:EASE.sine,h:250}]),key:TOPW_bar},
  'bar-explosive-pull-up':{app:'bar',motion:true,
   timeline:tl([{p:HANG_bar,t:1200,e:EASE.sine,h:150},{p:EXPTOP_bar,t:350,e:EASE.outCubic,h:150}]),key:EXPTOP_bar},
  'bar-slow-negative':{app:'bar',
   timeline:tl([{p:NEGTOP_bar,t:400,e:EASE.outCubic,h:200},{p:HANG_bar,t:3000,e:EASE.sine,h:150}]),key:blendP(NEGTOP_bar,HANG_bar,0.45)},
  'bar-lock-off':{app:'bar',
   timeline:tl([{p:TOP_bar,t:600,e:EASE.sine,h:500},{p:L90_bar,t:500,e:EASE.sine,h:550},{p:L120_bar,t:480,e:EASE.sine,h:550},{p:HANG_bar,t:520,e:EASE.sine,h:350}]),
   key:L90_bar},
  'bar-hanging-knee-raise':{app:'bar',
   timeline:tl([{p:HANG_bar,t:500,h:400},{p:RAISED_bar,t:550,e:EASE.outCubic,h:350}]),key:RAISED_bar},
  'push-up':{view:'side',
   timeline:tl([{p:PUSH_UP,t:900,e:EASE.sine,h:120},{p:PUSH_DOWN,t:850,e:EASE.sine,h:160}]),key:PUSH_DOWN},
 };

 function jointsFor(ex,params,t){return ex.view==='side'?sidePushJoints(params,t):frontHangJoints(params,t);}

 // ---------------- public API ----------------
 function has(id){return Object.prototype.hasOwnProperty.call(REGISTRY,id);}

 function svg(id){
  const ex=REGISTRY[id];
  if(!ex)return '';
  const root=mkEl('svg');
  root.setAttribute('viewBox','0 0 200 200');root.setAttribute('width','100%');root.setAttribute('height','100%');
  root.setAttribute('preserveAspectRatio','xMidYMid meet');
  let nodes;
  if(ex.view==='side'){nodes=buildSideDOM(root);updateSide(nodes,jointsFor(ex,ex.key,0));}
  else{nodes=buildFrontDOM(root,ex);updateFront(nodes,jointsFor(ex,ex.key,0),ex.key.burst||0);}
  return new XMLSerializer().serializeToString(root);
 }

 function mount(el,id,opts){
  opts=opts||{};
  const ex=REGISTRY[id];
  if(!ex)throw new Error('Figures.mount: unknown exercise id "'+id+'"');

  const root=mkEl('svg');
  root.setAttribute('viewBox','0 0 200 200');root.setAttribute('width','100%');root.setAttribute('height','100%');
  root.setAttribute('preserveAspectRatio','xMidYMid meet');
  root.setAttribute('aria-hidden','true');
  root.style.display='block';
  const nodes=ex.view==='side'?buildSideDOM(root):buildFrontDOM(root,ex);

  el.innerHTML='';
  el.appendChild(root);

  let restTarget=(opts.phase||'work')==='rest'?1:0;
  let restBlend=restTarget;
  let paused=false,destroyed=false;
  let clock=0,lastTime=null,raf=0;

  const mq=(typeof window!=='undefined'&&window.matchMedia)?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
  let reduced=!!(mq&&mq.matches);
  function onMQ(){reduced=!!(mq&&mq.matches);}
  if(mq){if(mq.addEventListener)mq.addEventListener('change',onMQ);else if(mq.addListener)mq.addListener(onMQ);}

  function render(){
   const useClock=reduced?0:clock;
   const wp=sample(ex.timeline,useClock);
   const wj=jointsFor(ex,wp,useClock);
   const rj=ex.view==='side'?sideStandJoints(useClock):frontStandJoints(useClock);
   const eased=EASE.sine(restBlend);
   const j=restBlend<=0?wj:restBlend>=1?rj:lerpJoints(wj,rj,eased);
   const burst=(wp.burst||0)*(1-restBlend);
   if(ex.view==='side')updateSide(nodes,j);else updateFront(nodes,j,burst,restBlend);
  }

  function frame(now){
   if(destroyed)return;
   if(lastTime==null)lastTime=now;
   const dt=Math.min(48,now-lastTime);
   lastTime=now;
   if(!paused){
    if(!reduced)clock+=dt;
    const blendMs=reduced?1:500;
    const step=dt/blendMs;
    if(restBlend<restTarget)restBlend=Math.min(restTarget,restBlend+step);
    else if(restBlend>restTarget)restBlend=Math.max(restTarget,restBlend-step);
   }
   render();
   raf=requestAnimationFrame(frame);
  }

  render();
  raf=requestAnimationFrame(frame);

  return {
   setPhase(phase){restTarget=phase==='rest'?1:0;},
   pause(){paused=true;},
   play(){paused=false;lastTime=null;},
   destroy(){
    destroyed=true;
    if(raf)cancelAnimationFrame(raf);
    if(mq){if(mq.removeEventListener)mq.removeEventListener('change',onMQ);else if(mq.removeListener)mq.removeListener(onMQ);}
    if(root.parentNode===el)el.removeChild(root);
   },
  };
 }

 window.Figures={has,svg,mount};
})();
