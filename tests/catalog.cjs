// Exercise catalog: classification completeness, media files on disk, search.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Search = require('../js/core/search.js');
const { exercises } = require('../data/classification.json');
const library = require('../data/library.json');
const ROOT = path.join(__dirname, '..');

assert.equal(library.exercises.length, 185, 'library exercise count');

for (const e of library.exercises) {
  const m = exercises[e.id];
  assert(m, `${e.id}: missing classification metadata`);
  assert(m.target, `${e.id}: missing target`);
  assert(m.difficulty, `${e.id}: missing difficulty`);
  assert(m.strain, `${e.id}: missing strain`);
  assert(Array.isArray(m.regions) && m.regions.length, `${e.id}: missing regions`);
  assert(m.pattern, `${e.id}: missing pattern`);
  assert(m.trainingType, `${e.id}: missing trainingType`);
  assert(m.dose && typeof m.dose === 'object', `${e.id}: missing dose`);
  assert(Array.isArray(m.tags) && m.tags.length >= 5, `${e.id}: tags must have >=5 entries, has ${m.tags && m.tags.length}`);

  for (const v of e.variants) {
    for (const key of ['clip', 'thumbnail', 'image', 'options']) {
      if (v[key]) assert(fs.existsSync(path.join(ROOT, v[key])), `${e.id}: ${key} file missing on disk: ${v[key]}`);
    }
  }
}

// ── Search ──────────────────────────────────────────────────────────────────
// Searchable text per exercise: name/area/kind/equipment plus the classification
// tags (which already fold in regions, pattern, trainingType, aliases and variant
// labels - see catalog_rules.py:enrich) plus each variant's own label.
function textFor(e) {
  const m = exercises[e.id] || {};
  return [e.name, e.area, e.kind, e.equipment, ...(m.tags || []), ...e.variants.map(v => v.label)].join(' ');
}
function find(query) {
  return library.exercises.filter(e => Search.matches(textFor(e), query)).map(e => e.id);
}

assert(find('hips').includes('90-90-hip-switches'), 'hips -> 90-90-hip-switches');
assert(find('sholders').includes('arm-circles'), 'sholders (typo) -> arm-circles');
assert(find('hangboard').includes('hb-max-hang-half-crimp'), 'hangboard -> hb-max-hang-half-crimp');
assert(find('crimps').includes('hb-min-edge-hang'), 'crimps -> hb-min-edge-hang');
assert(find('pull ups').includes('bar-pull-up'), 'pull ups -> bar-pull-up');
assert(find('pigeon').includes('hip-pigeon'), 'pigeon -> hip-pigeon');
assert(find('ankle').includes('foot-banded-ankle-circles'), 'ankle -> foot-banded-ankle-circles');
assert(find('heel raise').includes('foot-double-heel-raise'), 'heel raise -> foot-double-heel-raise');

// ── Foot exercises: video set (clip + drawing) and researched set (instruction icon), no duplicates ──
const foot = library.exercises.filter(e => e.id.startsWith('foot-'));
assert.equal(foot.length, 35, 'foot exercise count (21 video + 14 researched)');
const video = foot.filter(e => e.variants[0].clip);
assert.equal(video.length, 21, 'video foot exercises');
for (const e of video) {
  const v = e.variants[0];
  assert.equal(v.type, 'video', `${e.id}: video-branch foot exercises use media type video`);
  assert(v.thumbnail.startsWith('media/covers/'), `${e.id}: drawing is the poster`);
}
for (const e of foot.filter(e => !e.variants[0].clip)) assert.equal(e.variants[0].type, 'instruction', `${e.id}: researched foot exercise is instruction-only`);
for (const id of ['foot-ankle-circles', 'foot-short-foot-hold', 'foot-toe-splay-lift', 'foot-toe-spread-squeeze', 'foot-heel-raise-toes-elevated'])
  assert(!library.exercises.some(e => e.id === id), `${id}: duplicate of a video exercise must not exist`);
const ballRoll = library.exercises.find(e => e.id === 'foot-ball-roll');
assert(ballRoll.variants[0].clip && ballRoll.variants[0].note.includes('Researched how-to'), 'foot-ball-roll keeps the clip and carries the researched how-to');
assert.equal(new Set(library.exercises.map(e => e.id)).size, library.exercises.length, 'exercise ids unique');
assert.equal(find('zqxxnonsense').length, 0, 'nonsense finds nothing');

console.log('PASS catalog: 185 exercises with complete classification (target/difficulty/strain/regions/pattern/trainingType/dose/tags>=5); every referenced media file (clip/thumbnail/image/options) exists on disk; search synonyms, typos, multi-word and nonsense queries.');
