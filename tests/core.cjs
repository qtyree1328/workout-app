// Plan compiler + timer engine.
const assert=require('node:assert/strict');
const P=require('../js/core/plan.js'),E=require('../js/core/engine.js');
const meta={a:{},b:{},u:{unilateral:true}};

// ── Compiler ──
let c=P.compile({blocks:[{name:'Warm-up',items:[{ex:'a',mode:'time',work:30,rest:10}]},{name:'Main',items:[{ex:'b',mode:'time',work:10,sets:3,rest:60}]},{name:'Cool-down',items:[{ex:'a',mode:'time',work:20}]}]},meta,{countdown:5});
assert.equal(c.steps.length,5);
assert.deepEqual(c.steps.map(s=>s.rest),[10,60,60,60,0]); // last set of an item rests `rest` before the next block; last step rests 0
assert.equal(c.duration,5+(30+10*3+20)+(10+60*3));
assert.deepEqual(c.blocks.map(b=>[b.kind,b.start,b.end]),[['warm-up',0,0],['main',1,3],['cool-down',4,4]]);
// Options: skip warm-up/cool-down, adjust sets, scale rest (≥30 s only)
c=P.compile({blocks:[{name:'Warm-up',items:[{ex:'a',mode:'time',work:30}]},{name:'Main',items:[{ex:'b',mode:'time',work:10,sets:3,rest:60},{ex:'a',mode:'time',work:10,sets:2,rest:20}]}]},meta,{warmup:false,setsDelta:1,restScale:1.5});
assert.equal(c.steps.filter(s=>s.ex==='b').length,4);assert.equal(c.steps.filter(s=>s.ex==='a').length,3);
assert(c.steps.filter(s=>s.ex==='b').slice(0,3).every(s=>s.rest===90));assert.equal(c.steps.find(s=>s.ex==='a').rest,20);
c=P.compile({blocks:[{name:'Main',items:[{ex:'b',mode:'time',work:10,sets:1,rest:60}]}]},meta,{setsDelta:-3});assert.equal(c.steps.length,1);
// Sides: unilateral metadata → Left then Right with a 5 s switch; explicit sides:'both' overrides
c=P.compile({blocks:[{name:'Main',items:[{ex:'u',mode:'time',work:30,sets:2,rest:10},{ex:'u',mode:'time',work:20,sides:'both'}]}]},meta);
assert.deepEqual(c.steps.map(s=>s.side),['Left','Right','Left','Right','Both']);assert.deepEqual(c.steps.map(s=>s.rest),[5,10,5,10,0]);
// Intervals: on/off inside a set, set rest between sets, hang counters
c=P.compile({blocks:[{name:'Main',items:[{ex:'b',mode:'interval',on:7,off:3,count:6,sets:2,rest:180}]}]},meta);
assert.equal(c.steps.length,12);assert(c.steps.every(s=>s.work===7));assert.deepEqual(c.steps.slice(0,6).map(s=>s.rest),[3,3,3,3,3,180]);assert.equal(c.steps[11].rest,0);assert.equal(c.steps[8].hang,3);assert.equal(c.steps[8].set,2);
// Circuits: rounds repeat the item list; roundRest replaces the last item's rest between rounds
c=P.compile({blocks:[{name:'Circuit',rounds:3,roundRest:90,items:[{ex:'a',mode:'time',work:30,rest:15},{ex:'b',mode:'time',work:30,rest:15}]}]},meta);
assert.equal(c.steps.length,6);assert.deepEqual(c.steps.map(s=>s.rest),[15,90,15,90,15,0]);assert.deepEqual(c.steps.map(s=>s.round),[1,1,2,2,3,3]);
assert.equal(P.compile({blocks:[{name:'Circuit',rounds:3,items:[{ex:'a',mode:'time',work:30}]}]},meta,{setsDelta:-1}).steps.length,2);
// Reps: estimated work, flagged as estimated; per-set cues
c=P.compile({blocks:[{name:'Main',items:[{ex:'a',mode:'reps',reps:5,sets:2,rest:120,estimate:25,cues:['one','two']}]}]},meta);
assert(c.estimated);assert.equal(c.steps[0].work,25);assert.equal(c.steps[0].reps,5);assert.deepEqual(c.steps.map(s=>s.cue),['one','two']);
// Descriptions
assert.equal(P.describe({mode:'time',work:10,sets:5,rest:180},{}),'5 × 10 s · 3 min rest');
assert.equal(P.describe({mode:'interval',on:7,off:3,count:6,sets:4,rest:180},{}),'4 × 6 hangs · 7 s on / 3 s off · 3 min rest');
assert.equal(P.describe({mode:'reps',reps:8},{}),'8 reps');
assert.equal(P.describe({mode:'time',work:30,sets:2,rest:10},{unilateral:true}),'2 × 30 s each side');
assert.equal(P.clock(3725),'1:02:05');assert.equal(P.clock(65),'1:05');
// Builder rows round-trip
const rows=P.toRows({blocks:[{name:'Warm-up',items:[{ex:'a',mode:'time',work:30}]},{name:'Main',items:[{ex:'b',mode:'time',work:10},{ex:'a',mode:'time',work:10}]}]});
assert.deepEqual(P.toBlocks(rows).map(b=>[b.name,b.items.length]),[['Warm-up',1],['Main',2]]);

// ── Engine ──
const steps=[{ex:'a',mode:'time',work:5,rest:2},{ex:'b',mode:'reps',reps:3,work:20,rest:3},{ex:'a',mode:'time',work:4,rest:0}];
let s=E.create(steps,{countdown:3});
assert.equal(s.phase,'ready');E.tick(s,3000);assert.equal(s.phase,'work');assert.equal(s.index,0);
E.tick(s,5000);assert.equal(s.phase,'rest');E.tick(s,2000);assert.equal(s.phase,'work');assert.equal(s.index,1);
E.tick(s,60000);assert.equal(s.phase,'work');assert.equal(s.index,1);// reps wait for Done
E.rep(s);E.rep(s);assert.equal(s.repsDone,2);s.paused=true;E.rep(s);E.tick(s,1000);assert.equal(s.repsDone,2);s.paused=false;
E.advance(s);assert.equal(s.phase,'rest');E.addTime(s,15000);assert.equal(s.remaining,18000);
E.advance(s);assert.equal(s.index,2);E.tick(s,4000);assert(s.done);assert.equal(s.phase,'done');assert.deepEqual(s.completed,[0,1,2]);
// Overshoot carries into the next phase; previous restarts or steps back
s=E.create(steps,{countdown:1});E.tick(s,1500);assert.equal(s.phase,'work');assert.equal(Math.round(s.remaining),4500);
E.tick(s,3500);E.previous(s);assert.equal(s.index,0);assert.equal(s.remaining,5000);
E.advance(s);E.previous(s);assert.equal(s.phase,'work');assert.equal(s.index,0);
E.jump(s,2);assert.equal(s.index,2);E.previous(s);assert.equal(s.index,1);
// Planned time left + snapshot/restore
s=E.create(steps,{countdown:3});const planned=3+5+2+20+3+4;assert.equal(E.remainingPlanned(s),planned);E.tick(s,3000);assert.equal(E.remainingPlanned(s),planned-3);
E.tick(s,2000);const snap=E.snapshot(s);const back=E.restore(steps,snap,{countdown:3});assert.equal(back.index,0);assert(back.paused);assert.equal(back.phase,'work');
assert.equal(E.create([]).done,true);
console.log('PASS core: compile (blocks, sides, intervals, circuits, reps, options), descriptions, builder rows, engine (phases, reps, add time, overshoot, previous/jump, planned time, restore).');
