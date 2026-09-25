const assert=require('node:assert/strict');
const K=require('../catalog-core.js');
const {exercises,groups}=require('../data/classification.json');
const library=require('../data/library.json');const byId=Object.fromEntries(library.exercises.map(e=>[e.id,e]));
const sources=new Set(library.sources.map(s=>s.id));
// Climbing: every climbing exercise states what it trains and cites a source; every plan is labelled.
const climbing=library.exercises.filter(e=>exercises[e.id].climbing);
assert(climbing.length>=20);
for(const e of climbing){assert(exercises[e.id].climbing.length,e.id);assert(sources.has(e.variants[0].source),e.id);}
for(const e of library.exercises.filter(e=>e.kind==='Climbing'))assert(['Hangboard','Pull-up bar','None'].includes(e.equipment),e.id);
const plans=groups.filter(g=>g.kind==='Climbing');
assert(plans.length>=12);
const goals=new Set(plans.flatMap(g=>g.goals));
for(const goal of ['Max finger strength','Crimps','Strength-endurance','Endurance','Pulling strength','Power','Lock-off strength','Core tension','Antagonists'])assert(goals.has(goal),goal);
for(const g of plans){assert(g.goals.length);assert(g.sources.every(s=>sources.has(s)),g.id);assert(g.steps.some(s=>s.phase==='warm-up'),g.id);
 const main=g.steps.filter(s=>s.phase==='main');
 // Max-intensity finger work: 10 s hangs with ≥3 min between them (López-Rivera MaxHangs).
 main.forEach((s,i)=>{if(exercises[s.exercise].trainingType==='finger-strength'){assert.equal(s.work,10,g.id);if(i<main.length-1)assert(s.rest>=180,g.id);}});
 // Warm-up hangs always come before any max hang.
 const firstMax=g.steps.findIndex(s=>exercises[s.exercise].trainingType==='finger-strength');if(firstMax>=0)assert(g.steps.slice(0,firstMax).some(s=>s.exercise==='hb-warm-up-hangs'),g.id);}
const repeaters=groups.find(g=>g.id==='climb-repeaters').steps.filter(s=>s.exercise==='hb-repeaters-7-3');
assert.equal(repeaters.length,24);assert(repeaters.every(s=>s.work===7));assert.deepEqual(repeaters.filter(s=>s.rest===180).length,3);
const f80=groups.find(g=>g.id==='climb-intermittent-80').steps.filter(s=>s.phase==='main');assert.equal(f80.length,36);assert(f80.every(s=>s.work===10));assert.equal(f80.filter(s=>s.rest===480).length,2);
const find=q=>library.exercises.filter(e=>K.search(K.exerciseText(e,exercises[e.id]),q)).map(e=>e.id);
assert(find('hangboard').includes('hb-max-hang-half-crimp'));assert(find('crimps').includes('hb-min-edge-hang'));assert(find('fingerboard').includes('hb-repeaters-7-3'));assert(find('climbing').includes('bar-lock-off'));
// Hip challenge: 21 days × 2 poses, both sides balanced, stretch holds ≤30 s.
const hip=groups.filter(g=>g.program==='hip-challenge');assert.equal(hip.length,21);
const poses=library.exercises.filter(e=>e.program?.id==='hip-challenge');assert.equal(poses.length,42);
for(const e of poses){assert.equal(e.variants[0].type,'image');assert(e.variants[0].image&&e.variants[0].thumbnail);}
for(const g of hip){const ids=new Set(g.steps.filter(s=>s.phase==='main').map(s=>s.exercise));assert.equal(ids.size,2,g.id);for(const id of ids)assert.equal(byId[id].program.day,g.day,g.id);assert(g.steps.every(s=>s.phase!=='main'||s.work<=30));}
console.log(`PASS: ${climbing.length} climbing exercises with goals and sources, ${plans.length} labelled climbing plans, max-hang rest rules, repeater/intermittent structure, climbing search, 21-day hip challenge (42 poses).`);
