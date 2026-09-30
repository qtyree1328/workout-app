/* Crux — Hangboard tab, 3D model of the reversible hang module (three.js, loaded on demand from hangboard.js).
   Modelled procedurally from photos of the real thing, in centimetres, y up, front face towards +z:
   two black steel U-channel side brackets, a birch-plywood panel on each face, a beech Clevo hangboard on the
   front, climbing holds (two lime triangles, a frog, two blue domes) on the back and a beech pull-up dowel across
   the open bottom. Every grip is pickable; both halves of a pair light up together.
   Renders on demand only (drag, inertia, tweens), caps the pixel ratio at 2 and stops when hidden.
   API: mount(host,{holds,onSelect,onFail,icon}) → {update({selected,heat,locked}),showSide(side),dispose()}. */
import * as THREE from './vendor/three.module.min.js';

const ACCENT = '#F2692E';
const MAXH = 16;             // size of the per-hold uniform arrays
const REST = 0.2;            // resting yaw: a slight three-quarter view reads as 3D
const TOP_HOLDS = new Set(['top-rail', 'sloper', 'flat-top']); // grips on the top edge: tilt so they show
const PITCH0 = 0.12, PITCH_TOP = 0.38, PITCH_MIN = -0.36, PITCH_MAX = 0.6;

/* ───────────── dimensions (cm) ───────────── */
const TOP = 23, BOT = -23;            // bracket height
const ZF = 11;                        // outer face of each plywood panel (front +z, back −z)
const PLY = 1.8, PANEL_W = 54.4;
const WEB_X = 30.8, STEEL = 0.4;      // inner face of the side plate, sheet thickness
const FLANGE_X = 26.5;                // flange strips run from here out to the bend
const FRONT_BOT = -6, BACK_BOT = -16.2;
const BAR_Y = -20.7, BAR_R = 1.75;
const BOARD = {y: -5.8, z: 12.6};     // hangboard origin (bottom, back face)
const UP_D = 4.2, LO_D = 3.4, TIER = 6; // upper / lower tier depth, tier line

/* ───────────── small utils ───────────── */
function rng(seed) {
  return () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Smooth normals across duplicated vertices (UV seams, non-indexed extrusions) by welding on position.
function weldNormals(geo, creaseDeg = 180) {
  const pos = geo.attributes.position, n = pos.count;
  const idx = geo.index ? geo.index.array : null;
  const tri = idx ? idx.length / 3 : n / 3;
  const acc = new Map(), fn = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const key = i => `${Math.round(pos.getX(i) * 200)},${Math.round(pos.getY(i) * 200)},${Math.round(pos.getZ(i) * 200)}`;
  const keys = new Array(n);
  for (let i = 0; i < n; i++) keys[i] = key(i);
  for (let t = 0; t < tri; t++) {
    const i0 = idx ? idx[t * 3] : t * 3, i1 = idx ? idx[t * 3 + 1] : t * 3 + 1, i2 = idx ? idx[t * 3 + 2] : t * 3 + 2;
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    const f = new THREE.Vector3().subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)); // area weighted
    fn[t] = f;
    for (const i of [i0, i1, i2]) { const k = keys[i]; let s = acc.get(k); if (!s) acc.set(k, s = []); s.push(f); }
  }
  const out = new Float32Array(n * 3), cos = Math.cos(creaseDeg * Math.PI / 180), v = new THREE.Vector3();
  for (let t = 0; t < tri; t++) {
    const own = fn[t].clone().normalize();
    for (let j = 0; j < 3; j++) {
      const i = idx ? idx[t * 3 + j] : t * 3 + j;
      v.set(0, 0, 0);
      for (const f of acc.get(keys[i])) if (creaseDeg >= 180 || f.clone().normalize().dot(own) >= cos) v.add(f);
      v.normalize();
      out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z;
    }
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(out, 3));
  return geo;
}

// A closed outline with a rounded corner (quadratic) at every point; r may be a number or an array.
function roundedShape(pts, r, S = THREE.Shape) {
  const s = new S(), n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n], rr = Array.isArray(r) ? r[i] : r;
    const da = Math.hypot(a[0] - p[0], a[1] - p[1]), db = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const ra = Math.min(rr, da / 2), rb = Math.min(rr, db / 2);
    const p1 = [p[0] + (a[0] - p[0]) * ra / da, p[1] + (a[1] - p[1]) * ra / da];
    const p2 = [p[0] + (b[0] - p[0]) * rb / db, p[1] + (b[1] - p[1]) * rb / db];
    if (i === 0) s.moveTo(p1[0], p1[1]); else s.lineTo(p1[0], p1[1]);
    if (rr > 0) s.quadraticCurveTo(p[0], p[1], p2[0], p2[1]);
  }
  s.closePath();
  return s;
}
// Stadium / rounded rectangle.
function roundRect(x0, y0, x1, y1, r, S = THREE.Shape) {
  const s = new S(), w = x1 - x0, h = y1 - y0;
  r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3);
  s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x1, y1 - r); s.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  s.lineTo(x0 + r, y1); s.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + r); s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/* ───────────── procedural textures ───────────── */
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, {srgb = true, repeat = null, rot = 0} = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  if (rot) { t.center.set(.5, .5); t.rotation = rot; }
  return t;
}
// Beech: pale pinkish tan, straight close grain along x, tiny ray flecks.
function beechCanvas(seed = 7) {
  const S = 1024, c = canvas(S, S), g = c.getContext('2d'), R = rng(seed);
  g.fillStyle = '#E4C69E'; g.fillRect(0, 0, S, S);
  // broad tonal bands (tile vertically: integer periods)
  for (let y = 0; y < S; y++) {
    const v = Math.sin(y / S * Math.PI * 2 * 3 + 1.3) * .5 + Math.sin(y / S * Math.PI * 2 * 7 + .4) * .3 + Math.sin(y / S * Math.PI * 2 * 17) * .2;
    g.fillStyle = v > 0 ? `rgba(255,236,214,${v * .10})` : `rgba(170,110,70,${-v * .07})`;
    g.fillRect(0, y, S, 1);
  }
  g.lineCap = 'round';
  for (let i = 0; i < 520; i++) {
    const y0 = R() * S, a1 = 1 + R() * 5, k1 = 1 + (R() * 3 | 0), p1 = R() * 6.3, a2 = R() * 2, k2 = 3 + (R() * 5 | 0), p2 = R() * 6.3;
    const dark = R() < .78;
    g.strokeStyle = dark ? `rgba(150,96,56,${.03 + R() * .09})` : `rgba(255,240,220,${.05 + R() * .08})`;
    g.lineWidth = .5 + R() * (dark ? 1.8 : 2.6);
    for (const off of [-S, 0, S]) {
      g.beginPath();
      for (let x = 0; x <= S; x += 16) {
        const y = y0 + off + a1 * Math.sin(x / S * Math.PI * 2 * k1 + p1) + a2 * Math.sin(x / S * Math.PI * 2 * k2 + p2);
        x ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
  }
  // ray flecks: short, across the grain
  for (let i = 0; i < 2600; i++) {
    const x = R() * S, y = R() * S, l = 1.5 + R() * 5, w = .6 + R() * 1.2;
    g.fillStyle = R() < .65 ? `rgba(168,108,66,${.10 + R() * .16})` : `rgba(255,238,215,${.10 + R() * .12})`;
    g.beginPath(); g.ellipse(x, y, w, l, 0, 0, Math.PI * 2); g.fill();
  }
  return c;
}
// Birch plywood face: very pale with wide, soft cathedral figure.
function plyCanvas(seed = 3) {
  const S = 1024, c = canvas(S, S), g = c.getContext('2d'), R = rng(seed);
  g.fillStyle = '#ECD8B8'; g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y++) {
    const v = Math.sin(y / S * Math.PI * 2 * 2 + .7) * .6 + Math.sin(y / S * Math.PI * 2 * 5) * .4;
    g.fillStyle = v > 0 ? `rgba(255,244,228,${v * .12})` : `rgba(190,140,90,${-v * .06})`;
    g.fillRect(0, y, S, 1);
  }
  const arches = [[.28, .6, .22], [.74, .5, .18]];
  g.lineCap = 'round';
  for (const [cx, cyF, wF] of arches) {
    const cy = cyF * S, w = wF * S;
    for (let k = -14; k < 14; k++) {
      const amp = (14 - Math.abs(k)) * 9 + 20;
      g.strokeStyle = `rgba(170,118,70,${.05 + R() * .08})`; g.lineWidth = 1 + R() * 2.2;
      for (const off of [-S, 0, S]) {
        g.beginPath();
        for (let x = 0; x <= S; x += 8) {
          let bump = 0;
          for (const dx of [-S, 0, S]) bump += Math.exp(-Math.pow((x - cx * S + dx) / (w * (1 + Math.abs(k) * .05)), 2));
          const y = cy + k * 22 + off - amp * bump + 3 * Math.sin(x / S * Math.PI * 6 + k);
          x ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
      }
    }
  }
  for (let i = 0; i < 180; i++) {
    const y0 = R() * S;
    g.strokeStyle = `rgba(175,125,80,${.02 + R() * .05})`; g.lineWidth = .6 + R() * 1.5;
    g.beginPath(); g.moveTo(0, y0);
    for (let x = 0; x <= S; x += 32) g.lineTo(x, y0 + 3 * Math.sin(x / S * Math.PI * 4 + y0));
    g.stroke();
  }
  return c;
}
// Plywood edge: alternating plies across the thickness (v direction).
function plyEdgeCanvas() {
  const c = canvas(8, 256), g = c.getContext('2d'), n = 9, h = 256 / n;
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 2 ? '#D9BA8C' : '#EFDDBE'; g.fillRect(0, i * h, 8, h);
    g.fillStyle = 'rgba(120,80,40,.35)'; g.fillRect(0, i * h, 8, 1.5);
  }
  return c;
}
// Fine sandy grain for the climbing holds (used as a bump map).
function grainCanvas(seed = 11) {
  const S = 256, c = canvas(S, S), g = c.getContext('2d'), R = rng(seed), img = g.createImageData(S, S);
  for (let i = 0; i < S * S; i++) { const v = 110 + R() * 110 | 0; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${R() < .5 ? '0,0,0' : '255,255,255'},${.15 + R() * .25})`; g.beginPath(); g.arc(R() * S, R() * S, .6 + R() * 1.6, 0, 7); g.fill(); }
  return c;
}
function logoCanvas() {
  const c = canvas(1024, 380), g = c.getContext('2d');
  g.fillStyle = 'rgba(122,74,38,.82)'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = '500 190px Georgia, "Times New Roman", serif';
  if ('letterSpacing' in g) g.letterSpacing = '6px';
  g.fillText('CLEVO', 512, 205);
  g.font = 'italic 400 70px Georgia, "Times New Roman", serif';
  if ('letterSpacing' in g) g.letterSpacing = '1px';
  g.fillText('Climbing Evolution', 512, 322);
  return c;
}
function peaksCanvas() {
  const c = canvas(512, 200), g = c.getContext('2d');
  g.strokeStyle = 'rgba(122,74,38,.85)'; g.fillStyle = 'rgba(122,74,38,.28)'; g.lineWidth = 7; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(40, 180); g.lineTo(170, 70); g.lineTo(215, 110); g.lineTo(290, 22); g.lineTo(360, 104); g.lineTo(395, 80); g.lineTo(472, 180); g.closePath(); g.fill(); g.stroke();
  g.lineWidth = 5; g.beginPath(); g.moveTo(290, 22); g.lineTo(270, 70); g.lineTo(300, 60); g.lineTo(320, 86); g.stroke();
  g.beginPath(); g.moveTo(170, 70); g.lineTo(160, 100); g.lineTo(186, 94); g.stroke();
  return c;
}

/* ───────────── the model ───────────── */
function buildModel(ids) {
  const I = Object.fromEntries(ids.map((id, i) => [id, i]));
  const disposables = [];
  const keep = x => (disposables.push(x), x);
  const accent = new THREE.Color(ACCENT);

  // shared hold-state uniforms, patched into every material that can belong to a hold
  const U = {
    uSel: {value: new Array(MAXH).fill(0)}, uHover: {value: new Array(MAXH).fill(0)},
    uHeat: {value: new Array(MAXH).fill(0)}, uLock: {value: 0}, uAccent: {value: accent},
  };
  function patch(mat, wood = true) {
    if (wood) mat.defines = {...(mat.defines || {}), HOLD_WOOD: ''};
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aHold;\nvarying float vHold;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHold = aHold;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
varying float vHold;
uniform float uSel[${MAXH}];uniform float uHover[${MAXH}];uniform float uHeat[${MAXH}];uniform float uLock;uniform vec3 uAccent;`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
if(vHold>-.5){
 int hi=int(vHold+.5);
 float s=uSel[hi],hv=uHover[hi],ht=uHeat[hi];
 vec3 base=diffuseColor.rgb;
 float rim=pow(1.-clamp(abs(dot(normalize(normal),normalize(vViewPosition))),0.,1.),2.2);
 #ifdef HOLD_WOOD
 diffuseColor.rgb=mix(base,base*.62+uAccent*.4,ht*.3);   // wood: warm the grip itself
 #else
 totalEmissiveRadiance+=uAccent*ht*(.02+rim*.28);           // coloured holds: a warm rim instead of muddying the colour
 #endif
 diffuseColor.rgb=mix(diffuseColor.rgb,uAccent*.95+base*.12,s*.62);
 totalEmissiveRadiance+=uAccent*(s*(.16+rim*.9)+hv*(.10+rim*.45));
 float l=dot(diffuseColor.rgb,vec3(.3,.59,.11));
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(l)*.85,uLock*(1.-s)*.7);
}`);
    };
    mat.customProgramCacheKey = () => 'crux-hold';
    return mat;
  }
  const setHold = (geo, id) => {
    const v = id == null ? -1 : I[id];
    geo.setAttribute('aHold', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count).fill(v), 1));
    return geo;
  };

  /* textures + materials */
  const beechC = beechCanvas(), plyC = plyCanvas(), edgeC = plyEdgeCanvas(), grainC = grainCanvas();
  const tBeech = keep(tex(beechC, {repeat: [1 / 38, 1 / 38]}));
  const tBeechBar = keep(tex(beechC, {repeat: [1, 1 / 40], rot: Math.PI / 2}));
  const tBeechSide = keep(tex(beechC, {repeat: [1 / 38, 1 / 12]}));
  const tPly = (w, h) => keep(tex(plyC, {repeat: [w / 70, h / 70]}));
  const tEdgeH = keep(tex(edgeC)), tEdgeV = keep(tex(edgeC, {rot: Math.PI / 2}));
  const tGrain = keep(tex(grainC, {srgb: false, repeat: [3, 3]}));

  const M = {
    beech: patch(keep(new THREE.MeshStandardMaterial({map: tBeech, color: 0xffffff, roughness: .62, metalness: 0}))),
    beechBlock: patch(keep(new THREE.MeshStandardMaterial({map: tBeech, color: 0xfff6ec, roughness: .6}))),
    liner: patch(keep(new THREE.MeshStandardMaterial({map: tBeech, color: 0xd9b996, roughness: .8, side: THREE.BackSide, vertexColors: true}))),
    bar: patch(keep(new THREE.MeshStandardMaterial({map: tBeechBar, color: 0xfff4e8, roughness: .5}))),
    steel: keep(new THREE.MeshStandardMaterial({color: 0x1a1b1d, roughness: .5, metalness: .25})),
    steelDark: keep(new THREE.MeshStandardMaterial({color: 0x0b0b0c, roughness: .6, metalness: .3})),
    zinc: keep(new THREE.MeshStandardMaterial({color: 0xc9ccd1, roughness: .32, metalness: 1})),
    lime: patch(keep(new THREE.MeshStandardMaterial({color: 0x97c42a, roughness: .9, bumpMap: tGrain, bumpScale: 1.2})), false),
    frog: patch(keep(new THREE.MeshStandardMaterial({color: 0x2c8a34, roughness: .88, bumpMap: tGrain, bumpScale: 1.2})), false),
    blue: patch(keep(new THREE.MeshStandardMaterial({color: 0x4485dc, roughness: .9, bumpMap: tGrain, bumpScale: 1.4})), false),
    frogDark: keep(new THREE.MeshStandardMaterial({color: 0x1d5a22, roughness: .9})),
    socket: keep(new THREE.MeshStandardMaterial({color: 0x121314, roughness: .45, metalness: .6})),
    proxy: keep(new THREE.MeshBasicMaterial({visible: false})),
  };
  const edgeH = keep(new THREE.MeshStandardMaterial({map: tEdgeH, roughness: .8}));
  const edgeV = keep(new THREE.MeshStandardMaterial({map: tEdgeV, roughness: .8}));

  const root = new THREE.Group();
  const add = (parent, geo, mat, {hold = null, pos, rot, scale, shadow = true, name} = {}) => {
    keep(geo);
    if (!geo.attributes.aHold) setHold(geo, hold);
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    if (scale) m.scale.set(...scale);
    m.castShadow = shadow; m.receiveShadow = true;
    if (hold) m.userData.hold = hold;
    if (name) m.name = name;
    parent.add(m);
    return m;
  };
  const proxies = [];
  const proxy = (parent, id, x0, x1, y0, y1, z0, z1) => {
    const m = add(parent, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), M.proxy, {hold: id, pos: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], shadow: false});
    m.receiveShadow = false; m.userData.proxy = true; proxies.push(m);
    return m;
  };

  /* plywood panels */
  function panel(h, yc, zc, flip) {
    const face = keep(new THREE.MeshStandardMaterial({map: tPly(PANEL_W, h), color: 0xe6d9c6, roughness: .72}));
    const mats = [edgeV, edgeV, edgeH, edgeH, face, face];
    const m = add(root, new THREE.BoxGeometry(PANEL_W, h, PLY), mats, {pos: [0, yc, zc]});
    if (flip) m.rotation.y = Math.PI;
    return m;
  }
  panel(TOP - FRONT_BOT, (TOP + FRONT_BOT) / 2, ZF - PLY / 2);
  panel(TOP - BACK_BOT, (TOP + BACK_BOT) / 2, -ZF + PLY / 2, true);
  // hangboard mounting plate (thin plywood, spans onto the brackets)
  {
    const h = 15.2, face = keep(new THREE.MeshStandardMaterial({map: tPly(62, h), roughness: .7}));
    add(root, new THREE.BoxGeometry(61.8, h, 1.2), [edgeV, edgeV, edgeH, edgeH, face, face], {pos: [0, BOARD.y - .4 + h / 2, ZF + STEEL + .6]});
  }

  /* steel U-channel side brackets */
  function bracket(s) {
    const g = new THREE.Group(); g.scale.x = s; root.add(g);
    const R0 = 3.6, zi = ZF + STEEL - .9; // web stops where the bends start
    const web = roundedShape([[-zi, BOT], [zi, BOT], [zi, TOP], [-zi, TOP]], [R0, R0, .2, .2]);
    const wg = new THREE.ExtrudeGeometry(web, {depth: STEEL, bevelEnabled: false, curveSegments: 10});
    wg.rotateY(Math.PI / 2); // shape (u,v,w) → world (w, v, −u)
    add(g, wg, M.steel, {pos: [WEB_X, 0, 0]});
    // flange + bend profile in (x, −z), extruded along y
    const ri = .5, ro = ri + STEEL, cx = WEB_X - ri, cz = ZF - ri;
    const prof = new THREE.Shape();
    prof.moveTo(FLANGE_X, -ZF);
    prof.lineTo(cx, -ZF);
    prof.absarc(cx, -cz, ri, Math.PI / 2 * 3, Math.PI * 2, false);      // inner bend, down to the web
    prof.lineTo(WEB_X + STEEL, -cz);
    prof.absarc(cx, -cz, ro, 0, -Math.PI / 2, true);                     // outer bend
    prof.lineTo(FLANGE_X + .25, -ZF - STEEL);
    prof.quadraticCurveTo(FLANGE_X, -ZF - STEEL, FLANGE_X, -ZF);
    const len = TOP - (BOT + R0);
    for (const f of [1, -1]) {
      const fg = new THREE.ExtrudeGeometry(prof, {depth: len, bevelEnabled: false, curveSegments: 8});
      fg.rotateX(-Math.PI / 2); // shape y → world −z, extrusion → world y
      const m = add(g, fg, M.steel, {pos: [0, BOT + R0, 0]});
      m.scale.z = f;
      // countersunk screws along the flange
      const ys = f > 0 ? [20.5, 14, -2.5] : [20.5, 11, 1, -9, -16.5];
      for (const y of ys) {
        add(g, new THREE.CylinderGeometry(.62, .62, .1, 18), M.steelDark, {pos: [(FLANGE_X + WEB_X) / 2, y, f * (ZF + STEEL + .04)], rot: [Math.PI / 2, 0, 0], shadow: false});
        add(g, new THREE.CylinderGeometry(.24, .24, .12, 6), M.socket, {pos: [(FLANGE_X + WEB_X) / 2, y, f * (ZF + STEEL + .06)], rot: [Math.PI / 2, 0, 0], shadow: false});
      }
    }
    // mounting bolts at the top corners: washer, nut, thread
    for (const z of [7.4, -7.4]) {
      const x = WEB_X + STEEL;
      add(g, new THREE.CylinderGeometry(1.25, 1.25, .22, 24), M.zinc, {pos: [x + .11, TOP - 2.4, z], rot: [0, 0, Math.PI / 2]});
      add(g, new THREE.CylinderGeometry(.95, .95, .75, 6), M.zinc, {pos: [x + .6, TOP - 2.4, z], rot: [Math.PI / 6, 0, Math.PI / 2]});
      add(g, new THREE.CylinderGeometry(.48, .48, 2.1, 14), M.zinc, {pos: [x + 1.6, TOP - 2.4, z], rot: [0, 0, Math.PI / 2]});
    }
    // screw heads holding the dowel
    add(g, new THREE.CylinderGeometry(.75, .75, .18, 20), M.steelDark, {pos: [WEB_X + STEEL + .09, BAR_Y, 0], rot: [0, 0, Math.PI / 2]});
    // two small holes seen in the side plate
    for (const z of [-6.5, 6.5]) add(g, new THREE.CylinderGeometry(.42, .42, .06, 14), M.socket, {pos: [WEB_X + STEEL + .03, -15.5, z], rot: [0, 0, Math.PI / 2], shadow: false});
  }
  bracket(1); bracket(-1);

  /* pull-up dowel */
  {
    const L = WEB_X * 2, c = .35, p = [];
    p.push(new THREE.Vector2(0, -L / 2), new THREE.Vector2(BAR_R - c, -L / 2), new THREE.Vector2(BAR_R - c * .3, -L / 2 + c * .3), new THREE.Vector2(BAR_R, -L / 2 + c));
    p.push(new THREE.Vector2(BAR_R, L / 2 - c), new THREE.Vector2(BAR_R - c * .3, L / 2 - c * .3), new THREE.Vector2(BAR_R - c, L / 2), new THREE.Vector2(0, L / 2));
    const g = new THREE.LatheGeometry(p, 40); g.rotateZ(Math.PI / 2);
    weldNormals(g, 40);
    add(root, g, M.bar, {hold: 'bar', pos: [0, BAR_Y, 0]});
    const pg = new THREE.CylinderGeometry(BAR_R + 1.1, BAR_R + 1.1, L, 16); pg.rotateZ(Math.PI / 2);
    const pm = add(root, pg, M.proxy, {hold: 'bar', pos: [0, BAR_Y, 0], shadow: false}); pm.userData.proxy = true; proxies.push(pm);
  }

  /* the hangboard */
  const hb = new THREE.Group(); hb.position.set(0, BOARD.y, BOARD.z); root.add(hb);
  const pockets = [];
  const P = (id, x0, x1, y0, y1, tier, centre) => { if (centre) pockets.push({id, x0: -x1, x1, y0, y1, tier}); else { pockets.push({id, x0, x1, y0, y1, tier}); pockets.push({id, x0: -x1, x1: -x0, y0, y1, tier}); } };
  P('top-pocket', 19.0, 27.2, 10.9, 13.35, 0);
  P('pocket-large', 20.0, 28.8, 6.9, 9.5, 0);
  P('pocket-medium', 11.9, 18.8, 6.9, 9.5, 0);
  P('pocket-small', 5.4, 10.5, 6.9, 9.5, 0);
  P('pocket-centre', 0, 4.6, 6.9, 9.5, 0, true);
  P('edge-outer', 17.9, 28.9, 1.6, 4.3, 1);
  P('edge-inner', 10.3, 16.0, 1.6, 4.3, 1);
  P('edge-centre', 0, 8.4, 1.6, 4.3, 1, true);
  const BV = .45;
  {
    // upper tier outline: raised outer ends, scooped ramps down to the rails
    const ramp = (x0, sgn) => { const pts = []; for (let i = 1; i < 6; i++) { const t = i / 6, a = [x0, 15], cp = [sgn * 16.25, 13.55], b = [sgn * 14.3, 13.1]; pts.push([(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * cp[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * cp[1] + t * t * b[1]]); } return pts; };
    const rR = ramp(17.1, 1), rL = ramp(-17.1, -1).reverse();
    const pts = [[-30, TIER], [30, TIER], [30, 15], [17.1, 15], ...rR, [14.3, 13.1], [11.2, 13.1], [8.2, 13.1], [4, 13.1], [-4, 13.1], [-8.2, 13.1], [-11.2, 13.1], [-14.3, 13.1], ...rL, [-17.1, 15], [-30, 15]];
    const radii = pts.map((p, i) => i < 2 ? .5 : (i === 2 || i === pts.length - 1) ? 1.6 : (p[1] === 15 || Math.abs(p[0]) === 14.3) ? .5 : 0);
    const up = roundedShape(pts, radii);
    const lo = roundRect(-30, 0, 30, TIER + .3, .8);
    for (const pk of pockets) (pk.tier ? lo : up).holes.push(roundRect(pk.x0, pk.y0, pk.x1, pk.y1, (pk.y1 - pk.y0) / 2, THREE.Path));
    const gu = new THREE.ExtrudeGeometry(up, {depth: UP_D - 2 * BV, bevelEnabled: true, bevelThickness: BV, bevelSize: BV, bevelSegments: 4, curveSegments: 12});
    gu.translate(0, 0, BV);
    // which triangles are the rails and the ramps
    const pos = gu.attributes.position, hold = new Float32Array(pos.count).fill(-1);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
    for (let t = 0; t < pos.count; t += 3) {
      a.fromBufferAttribute(pos, t); b.fromBufferAttribute(pos, t + 1); c.fromBufferAttribute(pos, t + 2);
      n.subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize();
      const cxm = Math.abs((a.x + b.x + c.x) / 3), cym = (a.y + b.y + c.y) / 3;
      let id = -1;
      if (cym > 13.12 && n.y > .3 && cxm > 7.9 && cxm < 14.35) id = I['top-rail'];
      else if (cym > 13.12 && n.y > .15 && cxm >= 14.35 && cxm < 17.35) id = I['sloper'];
      if (id >= 0) hold[t] = hold[t + 1] = hold[t + 2] = id;
    }
    gu.setAttribute('aHold', new THREE.BufferAttribute(hold, 1));
    add(hb, gu, M.beech, {name: 'board-upper'});
    const gl = new THREE.ExtrudeGeometry(lo, {depth: LO_D - 2 * BV, bevelEnabled: true, bevelThickness: BV, bevelSize: BV, bevelSegments: 4, curveSegments: 12});
    gl.translate(0, 0, BV);
    add(hb, gl, M.beech, {name: 'board-lower'});
  }
  // pocket liners: inside walls + floor, darkened towards the back (baked occlusion)
  for (const pk of pockets) {
    const front = pk.tier ? LO_D : UP_D, d = pk.tier ? 1.9 : 2.3, ins = BV + .06;
    const sh = roundRect(pk.x0 + ins, pk.y0 + ins, pk.x1 - ins, pk.y1 - ins, (pk.y1 - pk.y0) / 2 - ins);
    const g = new THREE.ExtrudeGeometry(sh, {depth: d, bevelEnabled: false, curveSegments: 12});
    const z0 = front - BV - d;
    g.translate(0, 0, z0);
    const p = g.attributes.position, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const t = clamp((p.getZ(i) - z0) / d, 0, 1), y = clamp((p.getY(i) - pk.y0) / (pk.y1 - pk.y0), 0, 1);
      const v = .28 + .62 * Math.pow(t, 1.3) + .08 * y;
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = Math.min(1, v);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    add(hb, g, M.liner, {hold: pk.id, shadow: false});
    proxy(hb, pk.id, pk.x0 - .5, pk.x1 + .5, pk.y0 - .55, pk.y1 + .55, front - 1, front + .25);
  }
  // raised centre block (flat top) + engraving
  {
    const x = 8.2, y0 = 12.3, y1 = 14.5, bv = .3;
    const g = new THREE.ExtrudeGeometry(roundRect(-x + bv, y0 + bv, x - bv, y1 - bv, .35), {depth: UP_D - .2 - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: 3});
    g.translate(0, 0, .3 + bv);
    add(hb, g, M.beechBlock, {hold: 'flat-top'});
    proxy(hb, 'flat-top', -x, x, y0 - .1, y1 + .5, 0, UP_D + .4);
  }
  for (const s of [1, -1]) {
    proxy(hb, 'top-rail', s > 0 ? 8.2 : -14.3, s > 0 ? 14.3 : -8.2, 12.1, 14.0, 0, UP_D + .25);
    proxy(hb, 'sloper', s > 0 ? 14.3 : -17.4, s > 0 ? 17.4 : -14.3, 12.1, 15.5, 0, UP_D + .25);
  }
  const decal = (c, w, h, x, y, z) => {
    const t = keep(tex(c)); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 4;
    const m = keep(new THREE.MeshStandardMaterial({map: t, transparent: true, roughness: .7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2}));
    const mesh = add(hb, new THREE.PlaneGeometry(w, h), m, {pos: [x, y, z], shadow: false});
    mesh.userData.decal = true;
  };
  decal(logoCanvas(), 5.9, 2.19, 0, 11.05, UP_D + .01);
  decal(peaksCanvas(), 3.1, 1.21, 0, 13.45, UP_D + .12);
  // a few screws in the pockets, like the real board
  for (const [x, y, z] of [[-23.5, 12.1, 1.5], [23.2, 12.1, 1.5], [0, 8.0, 1.5], [-23, 2.9, 1.1], [23, 2.9, 1.1]]) {
    add(hb, new THREE.CylinderGeometry(.36, .36, .08, 14), M.zinc, {pos: [x, y, z + .06], rot: [Math.PI / 2, 0, 0], shadow: false});
  }

  /* back face: climbing holds (local frame: x as seen from behind, z out of the panel) */
  const back = new THREE.Group(); back.position.z = -ZF; back.rotation.y = Math.PI; root.add(back);
  const bolt = (parent, x, y, z, nrm, hold) => {
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm);
    const w = add(parent, new THREE.CylinderGeometry(.85, .85, .2, 20), M.socket, {hold, pos: [x, y, z], shadow: false}); w.quaternion.copy(q);
    const h = add(parent, new THREE.CylinderGeometry(.34, .34, .26, 6), M.steelDark, {hold, pos: [x + nrm.x * .03, y + nrm.y * .03, z + nrm.z * .03], shadow: false}); h.quaternion.copy(q);
  };
  // lime triangles: rounded wedge, thick along the top edge, thin at the lower point
  for (const s of [-1, 1]) {
    const tri = [[-25.6, 21.0], [-9.4, 19.7], [-22.6, 8.3]];
    const pts = s < 0 ? tri : tri.map(([x, y]) => [-x, y]).reverse();
    const sh = roundedShape(pts, 2.2);
    const H = 5.2, bt = 1.1;
    const g = new THREE.ExtrudeGeometry(sh, {depth: H - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: 1.1, bevelSegments: 6, curveSegments: 10});
    g.translate(0, 0, bt);
    const p = g.attributes.position, yTop = 21, yApex = 8.3;
    for (let i = 0; i < p.count; i++) {
      const t = clamp((p.getY(i) - yApex) / (yTop - yApex), 0, 1);
      p.setZ(i, p.getZ(i) * (.38 + .62 * Math.pow(t, .8)));
    }
    weldNormals(g, 55);
    add(back, g, M.lime, {hold: 'back-triangle'});
    const bx = s < 0 ? -21.8 : 21.8, bz = H * (.38 + .62 * Math.pow((19.2 - yApex) / (yTop - yApex), .8));
    bolt(back, bx, 19.2, bz + .05, new THREE.Vector3(0, .25, 1).normalize(), 'back-triangle');
  }
  // blue domes: hemispheres with pillowy Worley cells
  function dome(cx, cy, seed) {
    const r = 8.8, R = rng(seed), seeds = [];
    for (let i = 0; i < 19; i++) {
      const u = R() * Math.PI * 2, v = Math.acos(1 - R() * .98);
      seeds.push({d: new THREE.Vector3(Math.sin(v) * Math.cos(u), Math.sin(v) * Math.sin(u), Math.cos(v)), a: R()});
    }
    const g = new THREE.SphereGeometry(r, 120, 60, 0, Math.PI * 2, 0, Math.PI / 2);
    g.rotateX(Math.PI / 2);
    const p = g.attributes.position, d = new THREE.Vector3();
    const surf = dir => {
      let f1 = 9, f2 = 9, a1 = 0;
      for (const sd of seeds) { const q = dir.distanceTo(sd.d); if (q < f1) { f2 = f1; f1 = q; a1 = sd.a; } else if (q < f2) f2 = q; }
      const e = clamp((f2 - f1) / .34, 0, 1), pillow = Math.sqrt(1 - (1 - e) * (1 - e)), w = smooth(.0, .3, dir.z);
      const k = 1 + w * (-.075 + .075 * pillow + .02 * (a1 - .5) * pillow);
      return new THREE.Vector3(dir.x * r * k, dir.y * r * k, dir.z * r * k * .8);
    };
    for (let i = 0; i < p.count; i++) {
      d.fromBufferAttribute(p, i).normalize();
      const v = surf(d); p.setXYZ(i, v.x, v.y, Math.max(0, v.z));
    }
    weldNormals(g);
    const m = add(back, g, M.blue, {hold: 'back-dome', pos: [cx, cy, 0]});
    const bd = new THREE.Vector3(0, .5, .87).normalize(), bp = surf(bd);
    bolt(back, cx + bp.x, cy + bp.y, bp.z - .02, new THREE.Vector3(0, .5 * .8, .87).normalize(), 'back-dome');
    return m;
  }
  dome(-12.6, 1.8, 21); dome(12.6, 1.8, 42);
  // the frog: a sitting frog, in one moulded green
  {
    const fg = new THREE.Group(); fg.position.set(0, 15.2, 0); back.add(fg);
    const blob = (r, [x, y, z], [sx, sy, sz], seg = 32) => {
      const g = new THREE.SphereGeometry(r, seg, Math.round(seg * .7));
      g.scale(sx, sy, sz); weldNormals(g);
      return add(fg, g, M.frog, {hold: 'back-frog', pos: [x, y, z]});
    };
    blob(4.6, [0, -1.4, 0], [1.05, .98, .62], 40);   // body
    blob(3.5, [0, 3.2, .9], [1.22, .82, .66], 36);   // head
    for (const s of [-1, 1]) {
      blob(1.1, [s * 2.25, 5.2, 2.2], [1, 1, .9]);        // eyes
      blob(2.9, [s * 4.6, -3.4, .2], [1.15, .95, .55]);  // haunches
      blob(1.25, [s * 5.9, -6.1, .5], [1.6, .75, .7]);   // back feet
      blob(.95, [s * 1.9, -5.2, 2.4], [1.3, .7, .8]);    // front feet
      const arm = new THREE.CapsuleGeometry(.72, 3.2, 6, 14);
      weldNormals(arm);
      const m = add(fg, arm, M.frog, {hold: 'back-frog', pos: [s * 2.6, -2.6, 2.3], rot: [.35, 0, s * .32]});
      m.userData.hold = 'back-frog';
    }
    const smile = new THREE.TorusGeometry(1.5, .16, 8, 24, Math.PI * .8);
    add(fg, smile, M.frogDark, {hold: 'back-frog', pos: [0, 3.0, 2.95], rot: [-.1, 0, Math.PI + Math.PI * .1], shadow: false});
    bolt(fg, 0, -1.2, 2.85, new THREE.Vector3(0, .15, 1).normalize(), 'back-frog');
    for (const x of [-.9, .9]) add(fg, new THREE.CylinderGeometry(.3, .3, .1, 12), M.steelDark, {hold: 'back-frog', pos: [x, -4.3, 2.55], rot: [Math.PI / 2, 0, 0], shadow: false});
  }

  // every geometry needs the attribute the patched shader reads
  root.traverse(o => { if (o.isMesh && !o.geometry.attributes.aHold) setHold(o.geometry, null); });
  return {root, U, disposables, proxies};
}

/* ───────────── mount ───────────── */
export function mount(host, opts = {}) {
  const holds = opts.holds || [];
  const ids = holds.map(h => h.id);
  const sideOf = Object.fromEntries(holds.map(h => [h.id, h.side || 'both']));
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const icon = opts.icon || (() => '');

  host.innerHTML = `<canvas class="hb3d-canvas" tabindex="0" aria-label="3D model of the hang module. Drag or use the arrow keys to turn it, F to flip it over; the hold buttons that follow choose a hold."></canvas>
   <div class="hb3d-ui"><span class="hb3d-face" aria-hidden="true"><i></i><span>Front</span></span>
   <button type="button" class="hb3d-flip" aria-label="Show the back">${icon('refresh')}<span>Flip</span></button></div>`;
  const cv = host.querySelector('canvas'), faceEl = host.querySelector('.hb3d-face span'), flipBtn = host.querySelector('.hb3d-flip');

  const renderer = new THREE.WebGLRenderer({canvas: cv, antialias: true, alpha: true, powerPreference: 'default'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; // the model and lights never move relative to each other

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new THREE.RoomEnvironment();
  const envRT = pmrem.fromScene(room, .04);
  room.dispose();
  scene.environment = envRT.texture; scene.environmentIntensity = .45;
  pmrem.dispose();

  const model = buildModel(ids);
  scene.add(model.root);
  const U = model.U;

  // lights: sky/ground fill + a warm key over each face (static shadows)
  scene.add(new THREE.HemisphereLight(0xffffff, 0xbfa888, .9));
  const key = (x, y, z, i) => {
    const l = new THREE.DirectionalLight(0xfff3e4, i); l.position.set(x, y, z); l.castShadow = true;
    const c = l.shadow.camera; c.left = -48; c.right = 48; c.top = 48; c.bottom = -48; c.near = 20; c.far = 260;
    l.shadow.mapSize.set(1536, 1536); l.shadow.bias = -.0006; l.shadow.normalBias = .05; l.shadow.radius = 3;
    scene.add(l); return l;
  };
  key(42, 75, 85, 2.35); key(-42, 75, -85, 2.2);
  const rim = new THREE.DirectionalLight(0xe8efff, .55); rim.position.set(-80, 20, 30); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xe8efff, .45); rim2.position.set(80, 10, -30); scene.add(rim2);
  renderer.shadowMap.needsUpdate = true;

  const camera = new THREE.PerspectiveCamera(28, 1, 5, 1200);
  const target = new THREE.Vector3(0, -.5, 0);

  /* ── view state ── */
  const v = {
    yaw: REST - .75, pitch: PITCH0 + .2, yawT: REST, pitchT: PITCH0, vel: 0, velP: 0,
    dist: 190, tween: null, dragging: false, faceBack: null,
  };
  const idx = Object.fromEntries(ids.map((id, i) => [id, i]));
  const tgt = {sel: new Array(MAXH).fill(0), hover: new Array(MAXH).fill(0), heat: new Array(MAXH).fill(0), lock: 0};
  let selected = null, hovered = null, locked = false;
  let raf = 0, last = 0, visible = !document.hidden, inView = true, disposed = false, lastInteract = performance.now(), swayTimer = 0;

  function fit() {
    const w = host.clientWidth || 1, h = cv.clientHeight || 1, aspect = w / h;
    camera.aspect = aspect;
    const vf = camera.fov * Math.PI / 360, hf = Math.atan(Math.tan(vf) * aspect);
    v.dist = Math.max(35 / Math.tan(hf), 27.5 / Math.tan(vf)) + 15;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  function place() {
    const cp = Math.cos(v.pitch);
    camera.position.set(Math.sin(v.yaw) * cp * v.dist, Math.sin(v.pitch) * v.dist, Math.cos(v.yaw) * cp * v.dist).add(target);
    camera.lookAt(target);
  }
  function syncFace() {
    const back = Math.cos(v.yaw) < 0;
    if (back === v.faceBack) return;
    v.faceBack = back;
    faceEl.textContent = back ? 'Back · climbing holds' : 'Front · hangboard';
    flipBtn.setAttribute('aria-label', back ? 'Show the front' : 'Show the back');
    host.classList.toggle('is-back', back);
  }

  /* ── frame loop (on demand) ── */
  function kick() { if (!raf && !disposed && visible) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0;
    if (disposed) return;
    const dt = Math.min(.05, Math.max(.001, (now - last) / 1000)); last = now;
    let busy = false;
    if (v.tween) {
      const t = Math.min(1, (now - v.tween.t0) / v.tween.ms), e = ease(t);
      v.yawT = v.tween.y0 + (v.tween.y1 - v.tween.y0) * e;
      if (v.tween.p1 != null) v.pitchT = v.tween.p0 + (v.tween.p1 - v.tween.p0) * e;
      if (v.tween.sway) v.yawT = v.tween.y0 + Math.sin(t * Math.PI * 2) * .13 * Math.sin(t * Math.PI);
      if (t >= 1) v.tween = null;
      busy = true;
    } else if (!v.dragging && (Math.abs(v.vel) > .01 || Math.abs(v.velP) > .01)) {
      v.yawT += v.vel * dt; v.pitchT = clamp(v.pitchT + v.velP * dt, PITCH_MIN, PITCH_MAX);
      const k = Math.exp(-dt * 3.4); v.vel *= k; v.velP *= k;
      busy = true;
    }
    const kf = 1 - Math.exp(-dt * (v.dragging ? 22 : 11));
    v.yaw += (v.yawT - v.yaw) * kf; v.pitch += (v.pitchT - v.pitch) * kf;
    if (Math.abs(v.yawT - v.yaw) > 1e-4 || Math.abs(v.pitchT - v.pitch) > 1e-4) busy = true;
    const ks = 1 - Math.exp(-dt * 10);
    for (let i = 0; i < MAXH; i++) {
      for (const [a, b] of [[U.uSel.value, tgt.sel], [U.uHover.value, tgt.hover], [U.uHeat.value, tgt.heat]]) {
        const d = b[i] - a[i];
        if (Math.abs(d) > .002) { a[i] += d * ks; busy = true; } else a[i] = b[i];
      }
    }
    { const d = tgt.lock - U.uLock.value; if (Math.abs(d) > .002) { U.uLock.value += d * ks; busy = true; } else U.uLock.value = tgt.lock; }
    place(); syncFace();
    renderer.render(scene, camera);
    if (busy || v.dragging) kick();
  }
  const render = () => kick();

  function tweenYaw(y1, ms = 950, p1 = null) {
    if (reduced()) { v.yaw = v.yawT = y1; if (p1 != null) v.pitch = v.pitchT = p1; v.tween = null; v.vel = v.velP = 0; render(); return; }
    v.vel = v.velP = 0;
    v.tween = {t0: performance.now(), ms, y0: v.yawT, y1, p0: v.pitchT, p1};
    render();
  }
  const faceIndex = () => Math.round((v.yawT - REST) / Math.PI);
  function flip() { lastInteract = performance.now(); tweenYaw(REST + (faceIndex() + 1) * Math.PI, 1000, PITCH0); }
  function showSide(side) {
    const k = faceIndex(), isBack = Math.abs(k % 2) === 1;
    if ((side === 'back') === isBack) return;
    tweenYaw(REST + (k + 1) * Math.PI, 1000, PITCH0);
  }

  /* ── picking ── */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pickables = [];
  model.root.traverse(o => { if (o.isMesh && !o.userData.decal) pickables.push(o); });
  function pick(clientX, clientY) {
    const r = cv.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    place();
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(pickables, false);
    for (const h of hits) {
      const o = h.object;
      if (o.userData.hold) return o.userData.hold;
      const a = o.geometry.attributes.aHold;
      if (a && h.face) { const i = a.getX(h.face.a); return i >= 0 ? ids[Math.round(i)] : null; }
      return null;
    }
    return null;
  }
  function setHover(id) {
    if (id === hovered) return;
    hovered = id;
    tgt.hover.fill(0);
    if (id && !locked && id !== selected) tgt.hover[idx[id]] = 1;
    cv.style.cursor = v.dragging ? 'grabbing' : id && !locked ? 'pointer' : 'grab';
    render();
  }

  /* ── pointer input: drag to turn (with inertia), tap to pick, double-tap to flip ── */
  let ptr = null, lastTap = null, hoverRaf = 0, hoverEv = null;
  function onDown(e) {
    if (ptr || (e.pointerType === 'mouse' && e.button !== 0)) return;
    ptr = {id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), moved: false, samples: []};
    try { cv.setPointerCapture(e.pointerId); } catch {}
    v.vel = v.velP = 0;
    if (v.tween && !v.tween.sway) { /* let a flip finish unless the user drags */ }
    lastInteract = performance.now();
  }
  function onMove(e) {
    if (!ptr || e.pointerId !== ptr.id) {
      if (e.pointerType === 'mouse' && !ptr) { hoverEv = e; if (!hoverRaf) hoverRaf = requestAnimationFrame(() => { hoverRaf = 0; if (hoverEv && !disposed) setHover(pick(hoverEv.clientX, hoverEv.clientY)); }); }
      return;
    }
    const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y, now = performance.now();
    if (!ptr.moved && Math.hypot(e.clientX - ptr.x0, e.clientY - ptr.y0) > (e.pointerType === 'touch' ? 9 : 5)) {
      ptr.moved = true; v.dragging = true; v.tween = null; cv.style.cursor = 'grabbing'; host.classList.add('is-dragging'); setHover(null);
    }
    ptr.x = e.clientX; ptr.y = e.clientY;
    if (!ptr.moved) return;
    const k = 5.2 / Math.max(420, host.clientWidth);
    v.yawT -= dx * k; v.pitchT = clamp(v.pitchT + dy * k * .8, PITCH_MIN, PITCH_MAX);
    ptr.samples.push({t: now, dx: -dx * k, dy: dy * k * .8});
    while (ptr.samples.length && now - ptr.samples[0].t > 90) ptr.samples.shift();
    lastInteract = now;
    render();
  }
  function onUp(e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    const p = ptr; ptr = null;
    try { cv.releasePointerCapture(e.pointerId); } catch {}
    host.classList.remove('is-dragging');
    const now = performance.now();
    if (p.moved) {
      v.dragging = false;
      const span = p.samples.length ? Math.max(16, now - p.samples[0].t) / 1000 : 1;
      const sx = p.samples.reduce((s, q) => s + q.dx, 0), sy = p.samples.reduce((s, q) => s + q.dy, 0);
      if (now - (p.samples.length ? p.samples[p.samples.length - 1].t : 0) < 80 && !reduced()) { v.vel = clamp(sx / span, -9, 9); v.velP = clamp(sy / span, -4, 4); }
      cv.style.cursor = 'grab';
      render();
      return;
    }
    if (e.type === 'pointercancel') return;
    // a tap
    if (lastTap && now - lastTap.t < 330 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 36) { lastTap = null; flip(); return; }
    lastTap = {t: now, x: e.clientX, y: e.clientY};
    const id = pick(e.clientX, e.clientY);
    if (id && !locked && opts.onSelect) opts.onSelect(id);
  }
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp);
  cv.addEventListener('pointercancel', onUp);
  cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !ptr) setHover(null); });
  cv.addEventListener('dblclick', e => e.preventDefault());
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('keydown', e => {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); v.tween = null; v.yawT += (k === 'ArrowLeft' ? 1 : -1) * .35; render(); }
    else if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); v.tween = null; v.pitchT = clamp(v.pitchT + (k === 'ArrowUp' ? 1 : -1) * .15, PITCH_MIN, PITCH_MAX); render(); }
    else if (k === 'f' || k === 'F' || k === 'Enter' || k === ' ') { e.preventDefault(); flip(); }
    lastInteract = performance.now();
  });
  flipBtn.addEventListener('click', flip);

  /* ── lifecycle: resize, visibility, idle presentation, context loss ── */
  const ro = new ResizeObserver(() => { if (!disposed) { fit(); render(); } });
  ro.observe(host);
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { inView = es.some(x => x.isIntersecting); if (inView) render(); }) : null;
  if (io) io.observe(host);
  const onVis = () => { visible = !document.hidden; if (visible) render(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } };
  document.addEventListener('visibilitychange', onVis);
  function idleTick() {
    if (disposed) return;
    const quiet = performance.now() - lastInteract;
    if (quiet > 14000 && visible && inView && !locked && !ptr && !v.tween && Math.abs(v.vel) < .01 && !reduced()) {
      v.tween = {t0: performance.now(), ms: 5200, y0: v.yawT, y1: v.yawT, p0: v.pitchT, p1: null, sway: true};
      lastInteract = performance.now() + 20000; // next sway ~34 s later
      render();
    }
    swayTimer = setTimeout(idleTick, 2000);
  }
  swayTimer = setTimeout(idleTick, 2000);
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); if (!disposed && opts.onFail) opts.onFail(new Error('WebGL context lost')); });

  fit();
  if (reduced()) { v.yaw = v.yawT; v.pitch = v.pitchT; }
  else v.tween = {t0: performance.now() + 120, ms: 1500, y0: v.yaw, y1: REST, p0: v.pitch, p1: PITCH0};
  v.yawT = v.yaw; v.pitchT = v.pitch;
  syncFace(); render();

  function update(st = {}) {
    if (disposed) return;
    if ('heat' in st) for (const id of ids) tgt.heat[idx[id]] = clamp((st.heat[id] || 0) / 3, 0, 1);
    if ('locked' in st && st.locked !== locked) { locked = !!st.locked; tgt.lock = locked ? 1 : 0; host.classList.toggle('is-locked', locked); setHover(null); }
    if ('selected' in st && st.selected !== selected) {
      const first = selected == null;
      selected = st.selected;
      tgt.sel.fill(0);
      if (selected in idx) tgt.sel[idx[selected]] = 1;
      tgt.hover.fill(0);
      const side = sideOf[selected];
      if (side === 'front' || side === 'back') {
        if (first && side === 'back') { v.tween = null; const y = REST + Math.PI; v.yaw = y - .75; v.yawT = v.yaw; v.tween = reduced() ? null : {t0: performance.now() + 120, ms: 1500, y0: v.yaw, y1: y, p0: v.pitch, p1: PITCH0}; if (reduced()) v.yaw = v.yawT = y; }
        else if (!first) showSide(side);
      }
      if (TOP_HOLDS.has(selected) && v.pitchT < PITCH_TOP - .08) {
        if (first) { v.pitchT = PITCH_TOP; if (v.tween) v.tween.p1 = PITCH_TOP; }
        else if (reduced()) v.pitch = v.pitchT = PITCH_TOP;
        else if (!v.tween) v.tween = {t0: performance.now(), ms: 700, y0: v.yawT, y1: v.yawT, p0: v.pitchT, p1: PITCH_TOP};
        else v.tween.p1 = PITCH_TOP;
      }
    }
    render();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (hoverRaf) cancelAnimationFrame(hoverRaf);
    clearTimeout(swayTimer);
    ro.disconnect(); if (io) io.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    for (const d of model.disposables) { try { d.dispose(); } catch {} }
    envRT.dispose();
    renderer.dispose();
    try { renderer.forceContextLoss(); } catch {}
    host.innerHTML = '';
  }
  return {update, showSide, flip, dispose, _debug: {scene, camera, renderer, model, v, pick, render, holdScreen}};

  // Screen position (client px) of each copy of a hold, for tests: centre of its proxy/mesh bounding boxes.
  function holdScreen(id) {
    place(); camera.updateMatrixWorld();
    const r = cv.getBoundingClientRect(), out = [], box = new THREE.Box3(), c = new THREE.Vector3();
    const list = model.proxies.filter(p => p.userData.hold === id);
    const src = list.length ? list : pickables.filter(o => o.userData.hold === id);
    for (const o of src) {
      box.setFromObject(o); box.getCenter(c);
      if (o.userData.proxy) c.z = v.faceBack ? box.min.z : box.max.z;
      c.project(camera);
      out.push({x: r.left + (c.x + 1) / 2 * r.width, y: r.top + (1 - c.y) / 2 * r.height});
    }
    return out;
  }
}
