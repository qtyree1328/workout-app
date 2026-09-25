const assert=require('node:assert/strict');
const C=require('../workout-core.js');
const data=require('../data/classification.json');
const library=require('../data/library.json');
for(const e of library.exercises){assert(data.exercises[e.id],e.id);const m=data.exercises[e.id];assert(['Arms','Legs','Abs','Full body'].includes(m.target));assert(['Beginner','Intermediate','Advanced'].includes(m.difficulty));assert(['Light','Moderate','High'].includes(m.strain));}
for(const g of data.groups)for(const s of g.steps)assert(data.exercises[s.exercise]);
const steps=[{exercise:'arm-circles',mode:'time',work:5,reps:2,rest:2},{exercise:'seated-knee-tuck',mode:'reps',work:5,reps:2,rest:3}];
let s=C.create(steps,2);C.tick(s,3000);assert.equal(s.phase,'work');C.tick(s,5000);assert.equal(s.phase,'rest');C.tick(s,2000);assert.equal(s.index,1);C.tick(s,99999);assert.equal(s.phase,'work');assert.equal(s.complete,false);C.rep(s);assert.equal(s.completedReps,1);s.paused=true;C.rep(s);C.tick(s,1000);assert.equal(s.completedReps,1);s.paused=false;C.rep(s);assert.equal(s.phase,'rest');C.tick(s,3000);assert.equal(s.round,1);assert.equal(s.index,0);C.tick(s,5000);C.tick(s,2000);C.rep(s);C.rep(s);assert.equal(s.complete,true);assert.equal(s.phase,'complete');
s=C.create([steps[0]],1);C.tick(s,3000);C.tick(s,5000);assert(s.complete);assert.equal(C.duration([steps[0]],2),12);assert.equal(C.duration(steps,2),null);
s=C.create([{...steps[0],rest:0},steps[1]]);C.tick(s,3000);C.advance(s);assert.equal(s.index,1);C.previous(s);assert.equal(s.index,0);
const cleaned=C.cleanStep({exercise:'handstand',mode:'reps',work:-10,rest:9999,reps:0,side:'X'},data.exercises);assert.equal(cleaned.mode,'time');assert.equal(cleaned.work,5);assert.equal(cleaned.rest,600);assert.equal(cleaned.reps,1);assert.equal(cleaned.side,'Both');
console.log('PASS: all catalog classifications; group references; mixed time/reps; round breaks; no final break; manual rep progression; pause; previous; holds; input bounds.');
