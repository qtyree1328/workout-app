// Curated sessions (data/sessions.js) + the Hip Opener generator (js/core/hip.js).
const assert = require('node:assert/strict');
const Plan = require('../js/core/plan.js');
const HipOpener = require('../js/core/hip.js');
const { exercises: meta } = require('../data/classification.json');
const library = require('../data/library.json');
const { sessions, categories, hipPoses, positions, hipOpener } = require('../data/sessions.js');

const byId = Object.fromEntries(library.exercises.map(e => [e.id, e]));
const catById = Object.fromEntries(categories.map(c => [c.id, c]));
const MINUTES = [5, 10, 15, 20, 30, 45, 60];

// ── Every session: exercises exist, category/focus valid, compiles ─────────
const plans = {};
for (const s of sessions) {
  for (const b of s.blocks) for (const item of b.items) assert(byId[item.ex], `${s.id}: unknown exercise "${item.ex}"`);
  const cat = catById[s.category];
  assert(cat, `${s.id}: unknown category "${s.category}"`);
  assert(cat.focus, `${s.id}: category "${cat.id}" has no focus list`);
  for (const f of s.focus) assert(cat.focus.includes(f), `${s.id}: focus "${f}" not in category "${cat.id}" (${cat.focus})`);
  const plan = Plan.compile(s, meta);
  assert(plan.steps.length > 0, `${s.id}: compiled to 0 steps`);
  plans[s.id] = plan;
}

// ── Fixed finger protocols keep their published structure ──────────────────
// Any finger-strength step is a 10 s hang and, unless it is the plan's very last step,
// rests >= 180 s before the next one (López-Rivera MaxHangs: 3-minute rests).
for (const s of sessions.filter(s => s.fixed)) {
  const plan = plans[s.id];
  plan.steps.forEach((step, i) => {
    if (meta[step.ex] && meta[step.ex].trainingType === 'finger-strength') {
      assert.equal(step.work, 10, `${s.id}: ${step.ex} finger-strength work should be 10 s, got ${step.work}`);
      if (i < plan.steps.length - 1) {
        assert(step.rest >= 180, `${s.id}: ${step.ex} finger-strength rest should be >=180 s, got ${step.rest}`);
      }
    }
  });
}

// ── Warm-up hangs always precede the first finger-strength step, in every session ──
for (const s of sessions) {
  const plan = plans[s.id];
  const firstFinger = plan.steps.findIndex(st => meta[st.ex] && meta[st.ex].trainingType === 'finger-strength');
  if (firstFinger >= 0) {
    assert(plan.steps.slice(0, firstFinger).some(st => st.ex === 'hb-warm-up-hangs'),
      `${s.id}: no hb-warm-up-hangs before the first finger-strength step`);
  }
}

// ── 'repeaters': 4 sets of six 7 s hangs (24 total) ─────────────────────────
{
  const s = sessions.find(s => s.id === 'repeaters');
  assert(s, 'repeaters session not found');
  const hangs = plans['repeaters'].steps.filter(st => st.ex === 'hb-repeaters-7-3');
  assert.equal(hangs.length, 24, `repeaters: expected 24 hang steps, got ${hangs.length}`);
  assert(hangs.every(st => st.work === 7), 'repeaters: every hang should be 7 s');
  // One 180 s rest ends each of the 4 sets; the session's own Cool-down block (armsLoose)
  // follows the Repeaters block, so - unlike a session with no cool-down - none of those
  // 4 set-rests is the plan's global-last step, so none gets zeroed to 0. See final report.
  assert.equal(hangs.filter(st => st.rest === 180).length, 4, 'repeaters: expected 4 set rests of 180 s');
}

// ── 'intermittent-hard': 3 sets of twelve 10 s hangs (36 total) ────────────
{
  const s = sessions.find(s => s.id === 'intermittent-hard');
  assert(s, 'intermittent-hard session not found');
  const hangs = plans['intermittent-hard'].steps.filter(st => st.ex === 'hb-intermittent-80');
  assert.equal(hangs.length, 36, `intermittent-hard: expected 36 main steps, got ${hangs.length}`);
  assert(hangs.every(st => st.work === 10), 'intermittent-hard: every hang should be 10 s');
  // No cool-down follows, so the 3rd set's rest is the plan's global-last step and gets zeroed: 2 remain.
  assert.equal(hangs.filter(st => st.rest === 480).length, 2, 'intermittent-hard: expected two 480 s rests');
}

// ── Plan.fit: every session, every duration budget ──────────────────────────
for (const s of sessions) {
  for (const minutes of MINUTES) {
    const r = Plan.fit(s, minutes, meta);
    if (!r.fits) continue;
    assert(r.plan.duration <= minutes * 60 * 1.05 + 1e-9,
      `${s.id} @ ${minutes}min: fit duration ${r.plan.duration}s exceeds ${minutes * 60 * 1.05}s`);
    if (s.fixed) {
      assert.equal(r.options.setsDelta, 0, `${s.id} @ ${minutes}min: fixed session changed setsDelta`);
      assert.equal(r.options.warmup, true, `${s.id} @ ${minutes}min: fixed session changed warmup`);
    }
  }
}

// ── Hip Opener ───────────────────────────────────────────────────────────────
const posRank = Object.fromEntries(hipPoses.map(p => [p.id, positions.indexOf(p.position)]));
const poseIds = new Set(hipPoses.map(p => p.id));
const SEEDS = [1, 2, 12345];
const HOLD_MINUTES = [10, 15, 20, 30, 45, 60]; // maxCount(5,...) is 0, nothing to generate

for (const minutes of HOLD_MINUTES) {
  for (const warmup of [false, true]) {
    const maxN = HipOpener.maxCount(minutes, warmup, meta);
    assert(maxN >= 1, `maxCount(${minutes}, warmup=${warmup}) should be >=1`);
    for (let count = 1; count <= maxN; count++) {
      for (const seed of SEEDS) {
        const { session, poses, feasible } = HipOpener.generate({ minutes, count, warmup, seed }, hipPoses, positions, meta);
        const tag = `hip-opener minutes=${minutes} warmup=${warmup} count=${count} seed=${seed}`;
        assert.equal(feasible, true, `${tag}: expected feasible`);
        assert.equal(poses.length, count, `${tag}: expected ${count} poses, got ${poses.length}`);
        assert.equal(new Set(poses).size, count, `${tag}: poses should be unique`);
        for (const id of poses) assert(poseIds.has(id), `${tag}: "${id}" is not in hipPoses`);
        for (let i = 1; i < poses.length; i++) {
          assert(posRank[poses[i - 1]] <= posRank[poses[i]], `${tag}: poses not ordered by position index`);
        }

        const plan = Plan.compile(session, meta);
        assert(plan.duration <= minutes * 60 * 1.05 + 1e-9, `${tag}: compiled duration ${plan.duration}s exceeds ${minutes * 60 * 1.05}s`);
        const globalLast = plan.steps[plan.steps.length - 1];
        assert.equal(globalLast.rest, 0, `${tag}: plan's last step should have rest 0`);

        poses.forEach(id => {
          const poseSteps = plan.steps.filter(st => st.ex === id);
          const unilateral = !!(meta[id] && meta[id].unilateral);
          const lastOfPose = poseSteps[poseSteps.length - 1];
          const isGlobalLast = lastOfPose === globalLast;
          if (unilateral) {
            assert.equal(poseSteps.length, 2, `${tag}: ${id} (unilateral) should have 2 steps`);
            assert.equal(poseSteps[0].side, 'Left', `${tag}: ${id} first side should be Left`);
            assert.equal(poseSteps[1].side, 'Right', `${tag}: ${id} second side should be Right`);
            assert.equal(poseSteps[0].work, HipOpener.HOLD / 2, `${tag}: ${id} Left hold should be ${HipOpener.HOLD / 2}s`);
            assert.equal(poseSteps[1].work, HipOpener.HOLD / 2, `${tag}: ${id} Right hold should be ${HipOpener.HOLD / 2}s`);
            assert.equal(poseSteps[0].rest, HipOpener.SWITCH, `${tag}: ${id} switch rest should be ${HipOpener.SWITCH}s`);
          } else {
            assert.equal(poseSteps.length, 1, `${tag}: ${id} (bilateral) should have 1 step`);
            assert.equal(poseSteps[0].side, 'Both', `${tag}: ${id} side should be Both`);
            assert.equal(poseSteps[0].work, HipOpener.HOLD, `${tag}: ${id} hold should be ${HipOpener.HOLD}s`);
          }
          assert.equal(lastOfPose.rest, isGlobalLast ? 0 : HipOpener.REST,
            `${tag}: ${id} rest between poses should be ${HipOpener.REST}s (0 if the plan's last step)`);
        });
      }
    }
    // A count above maxCount is never feasible.
    const over = HipOpener.generate({ minutes, count: maxN + 1, warmup, seed: 1 }, hipPoses, positions, meta);
    assert.equal(over.feasible, false, `count ${maxN + 1} > maxCount(${minutes}, warmup=${warmup}) should be infeasible`);
  }
}

// `keep` always keeps the given poses.
{
  const keep = [hipPoses[0].id, hipPoses[5].id];
  const { poses } = HipOpener.generate({ minutes: 60, count: 6, warmup: false, seed: 42, keep }, hipPoses, positions, meta);
  for (const id of keep) assert(poses.includes(id), `keep: "${id}" should be kept`);
}

// ── Every session (and hipOpener) has a valid intensity ─────────────────────
for (const s of sessions) {
  assert([1, 2, 3].includes(s.intensity), `${s.id}: intensity should be 1, 2 or 3, got ${s.intensity}`);
}
assert([1, 2, 3].includes(hipOpener.intensity), `hipOpener: intensity should be 1, 2 or 3, got ${hipOpener.intensity}`);

console.log('PASS sessions: exercises/categories/focus valid, all sessions compile, fixed finger protocols (work/rest, warm-up-hangs ordering), repeaters (24x7s/4x180), intermittent-hard (36x10s/2x480), Plan.fit duration budgets + fixed setsDelta/warmup invariants, Hip Opener (feasibility, uniqueness, position order, 360s holds, 60s pose rests, duration, keep), session/hipOpener intensity in {1,2,3}.');
