/* Art: deterministic generative SVG cover art for workout cards.
   No dependencies. Classic script — defines window.Art. Safe in any modern browser (iPad Safari, Chrome). */
(function(){
 const PALETTES={
  climbing:['#F58A3C','#D63F2A'],
  strength:['#5B73F7','#2F3CC4'],
  mobility:['#1BB394','#0A7667'],
  hip:['#EE6D8F','#B5335F'],
  recovery:['#9A7CF4','#5A43C4'],
 };
 const FALLBACK=['#8A93A6','#4E5768'];
 const colors=category=>PALETTES[category]||FALLBACK;
 const escAttr=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

 // ---- deterministic hash + PRNG (no Math.random) ----
 function hashStr(s){
  let h=2166136261>>>0;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
  return h>>>0;
 }
 function mulberry32(seed){
  let a=seed>>>0;
  return function(){
   a|=0;a=a+0x6D2B79F5|0;
   let t=Math.imul(a^a>>>15,1|a);
   t=t+Math.imul(t^t>>>7,61|t)^t;
   return ((t^t>>>14)>>>0)/4294967296;
  };
 }
 const r1=v=>Math.round(v*10)/10;

 // ---- closed Catmull-Rom -> cubic Bezier path, coords rounded to 1 decimal ----
 function closedSmoothPath(points){
  const n=points.length,d=[];
  d.push(`M${r1(points[0].x)} ${r1(points[0].y)}`);
  for(let i=0;i<n;i++){
   const p0=points[(i-1+n)%n],p1=points[i],p2=points[(i+1)%n],p3=points[(i+2)%n];
   const c1x=p1.x+(p2.x-p0.x)/6,c1y=p1.y+(p2.y-p0.y)/6;
   const c2x=p2.x-(p3.x-p1.x)/6,c2y=p2.y-(p3.y-p1.y)/6;
   d.push(`C${r1(c1x)} ${r1(c1y)} ${r1(c2x)} ${r1(c2y)} ${r1(p2.x)} ${r1(p2.y)}`);
  }
  d.push('Z');
  return d.join('');
 }

 function buildRings(rng,cx,cy,ringCount,maxSpan){
  // Shared terrain harmonics: every ring bulges/pinches at the same angles (like real elevation contours),
  // with the perturbation amplitude growing for outer (higher-index) rings.
  const harmonics=[2,3,5].map(freq=>({freq,phase:rng()*Math.PI*2,amp:0.05+rng()*0.09}));
  const terrain=theta=>harmonics.reduce((s,h)=>s+h.amp*Math.sin(h.freq*theta+h.phase),0);
  const r0=maxSpan*0.09,dr=(maxSpan-r0)/Math.max(1,ringCount-1);
  const steps=22;
  const rings=[];
  for(let i=0;i<ringCount;i++){
   const base=r0+dr*i;
   const growth=0.16+0.055*i;
   const pts=[];
   for(let k=0;k<steps;k++){
    const theta=(k/steps)*Math.PI*2;
    const rad=base*(1+terrain(theta)*growth);
    pts.push({x:cx+Math.cos(theta)*rad,y:cy+Math.sin(theta)*rad*0.86});
   }
   rings.push({d:closedSmoothPath(pts)});
  }
  return rings;
 }

 const cache=new Map();

 function cover(seed,category,opts){
  opts=opts||{};
  const key=category+'\u0000'+String(seed)+'\u0000'+(opts.ringCount||'');
  if(cache.has(key))return cache.get(key);

  const [c1,c2]=colors(category);
  const rng=mulberry32(hashStr(category+'|'+String(seed)));
  const W=opts.width||400,H=opts.height||300;

  // Off-centre summit, biased away from the very edges.
  const cx=W*(0.3+rng()*0.42);
  const cy=H*(0.26+rng()*0.46);
  const ringCount=opts.ringCount||(9+Math.floor(rng()*6));
  const maxSpan=Math.max(W,H)*0.62;
  const rings=buildRings(rng,cx,cy,ringCount,maxSpan);

  const uid='art'+hashStr(key).toString(36);
  const gx1=r1(W*0.05),gy1=r1(H*0.02),gx2=r1(W*0.95),gy2=r1(H*0.98);

  const ringPaths=rings.map((ring,i)=>{
   const thick=i%4===0;
   return `<path d="${ring.d}" fill="none" stroke="#fff" stroke-opacity="${thick?0.16:0.12}" stroke-width="${thick?1.6:0.9}"/>`;
  }).join('');

  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" role="img" aria-label="${escAttr(category||'workout')} cover art">`
   +`<defs>`
   +`<linearGradient id="${uid}g" x1="${gx1}" y1="${gy1}" x2="${gx2}" y2="${gy2}" gradientUnits="userSpaceOnUse">`
   +`<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`
   +`<radialGradient id="${uid}h" cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(maxSpan*0.55)}" gradientUnits="userSpaceOnUse">`
   +`<stop offset="0" stop-color="#fff" stop-opacity="0.4"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`
   +`</defs>`
   +`<rect width="${W}" height="${H}" fill="url(#${uid}g)"/>`
   +`<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(maxSpan*0.55)}" fill="url(#${uid}h)"/>`
   +`<g>${ringPaths}</g>`
   +`</svg>`;

  cache.set(key,svg);
  return svg;
 }

 window.Art={cover,colors};
})();
