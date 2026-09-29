"""Foot & ankle exercise catalog and the Feet generator pool.

Two sets live together here:
  * VIDEO set: 21 exercises extracted from social videos (data/foot-extraction.json), each with a
    clip (media/clips/foot-*.mp4) and a drawing (media/covers/foot-*.webp). They are already in the
    catalog; this script only normalises them (media type 'video', taxonomy/dose for classify.py).
  * RESEARCHED set (EXERCISES below): instruction-only exercises with a placeholder icon
    (media/examples/foot.svg) and a study citation, for movements the video set does not cover.
Researched exercises that duplicate a video exercise are NOT created (see DUPLICATES); their how-to
text and source citation are carried onto the video exercise instead (see CARRY).
See RESEARCH.md -> Foot training for the evidence summary.
"""
import json, pathlib
import pathlib
from add_hip_poses import merge
ROOT = pathlib.Path(__file__).resolve().parents[1]
ICON = 'media/examples/foot.svg'

SOURCES = [
 ('mckeon-2015', 'McKeon, Hertel, Bramble & Davis (2015), Br J Sports Med', 'https://pubmed.ncbi.nlm.nih.gov/24659509/',
  'The "foot core system": intrinsic foot muscles act as local stabilizers of the arch, parallel to the trunk core. '
  'The short-foot exercise is the standard way to isolate and train them.'),
 ('knee-to-wall-2024', 'Weight-bearing lunge (knee-to-wall) dorsiflexion test/drill', 'https://www.physio-pedia.com/Knee_to_Wall_Test',
  'A reliable, widely used measure and mobilization drill for weight-bearing ankle dorsiflexion; roughly 3.6 degrees of '
  'dorsiflexion per centimetre the knee travels past the toes with the heel down.'),
 ('achilles-loading-2017', 'Baxter, Corrigan, Hullfish et al. (2017), Med Sci Sports Exerc — Achilles tendon loading review', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5343533/',
  'Heel-raise and heel-drop exercises progressively and reliably load the Achilles tendon and calf, from an easy seated '
  'raise up through single-leg and eccentric variations; the standard rehab progression is double leg to single leg to slow eccentric.'),
 ('digiovanni-2006', 'DiGiovanni et al. (2006), J Bone Joint Surg — 2-year follow-up RCT', 'https://pubmed.ncbi.nlm.nih.gov/16882901/',
  'A plantar-fascia-specific stretch (pulling the toes back to tension the arch, not just the calf) outperformed a '
  'calf-stretch-only protocol for chronic plantar heel pain, with benefits holding at two years.'),
 ('balance-cai-2024', 'Balance training in chronic ankle instability — systematic review & meta-analysis (2024)', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10860262/',
  'Single-leg balance and proprioceptive training improve postural control and self-reported ankle function, and lower '
  're-sprain rates; progressing from eyes-open to eyes-closed increases the demand on the ankle\'s balance receptors.'),
]
SOURCES = [{'id': id, 'author': author, 'url': url, 'status': 'referenced', 'text': text, 'media': []} for id, author, url, text in SOURCES]

# id, name, equipment, group, goals(aliases extra), pattern, training, regions, unilateral, difficulty, strain, hold, work, rest, reps, source, how
EXERCISES = [
 # Mobility / warm-up
 ('foot-knee-to-wall-mobilization', 'Knee-to-wall ankle mobilization', 'Wall', 'mobility', 'dorsiflexion|ankle mobility|lunge stretch', 'dorsiflexion', 'active-mobility',
  'ankles|calves', True, 'Beginner', 'Light', False, 40, 15, 10, 'knee-to-wall-2024',
  'Half-kneel facing a wall, front foot a few inches back. Keeping the heel down, drive the knee forward over the toes toward the wall and back, 10 slow reps, then switch feet. Move the foot back as it gets easy.'),
 # Intrinsic foot muscles
 ('foot-towel-curl', 'Towel curls', 'Towel', 'intrinsic', 'towel scrunch|toe curls', 'toe-flexion', 'strength',
  'feet|toes|arches', True, 'Beginner', 'Light', False, 40, 20, 15, 'mckeon-2015',
  'Lay a towel flat on the floor under one foot. Scrunch it toward you using only your toes, then reset and repeat. Add a light weight on the far end of the towel to make it harder.'),
 ('foot-marble-pickup', 'Marble pickups', 'Ball', 'intrinsic', 'marble pickup|toe pickup|object pickup', 'toe-flexion', 'strength',
  'feet|toes|arches', True, 'Beginner', 'Light', False, 40, 20, 15, 'mckeon-2015',
  'Pick up small objects (marbles, a scrunched sock, pebbles) one at a time with your toes and place them in a cup. Keeps the toe flexors and arch working through a full range.'),
 # Strength: heel/tibialis raises and ankle band work
 ('foot-double-heel-raise', 'Double-leg heel raises', 'None', 'strength', 'calf raise|heel raise', 'plantarflexion', 'strength',
  'calves|ankles', False, 'Beginner', 'Moderate', False, 40, 30, 15, 'achilles-loading-2017',
  'Rise onto the balls of both feet as high as you can, then lower slowly over about 3 s. Hold a wall or chair for balance if needed. The easiest, lowest-load way to build calf and Achilles capacity.'),
 ('foot-single-heel-raise', 'Single-leg heel raises', 'None', 'strength', 'calf raise|single leg calf raise', 'plantarflexion', 'strength',
  'calves|ankles', True, 'Intermediate', 'Moderate', False, 40, 30, 12, 'achilles-loading-2017',
  'Standing on one foot (fingertips on a wall for balance), rise onto the ball of the foot and lower slowly. Roughly double the load of a two-footed raise — progress here once double raises feel easy.'),
 ('foot-bent-knee-heel-raise', 'Bent-knee heel raises', 'None', 'strength', 'soleus raise|bent knee calf raise', 'plantarflexion', 'strength',
  'calves|ankles', False, 'Beginner', 'Moderate', False, 40, 30, 15, 'achilles-loading-2017',
  'Soften the knees into a slight bend and hold it while you raise and lower onto the balls of the feet. Bending the knee takes the gastrocnemius out and shifts the load onto the soleus, deeper in the calf.'),
 ('foot-tibialis-raise', 'Tibialis raises', 'Wall', 'strength', 'toe raise|shin raise|tib raise', 'dorsiflexion', 'strength',
  'shins|ankles|feet', False, 'Beginner', 'Light', False, 40, 20, 15, 'achilles-loading-2017',
  'Lean your back against a wall, feet a little out in front, and lift the toes and forefoot up off the floor as high as you can, then lower slowly. Trains the tibialis anterior, the dorsiflexor that balances all the calf-raise work.'),
 ('foot-band-eversion-inversion', 'Ankle eversion & inversion with band', 'Band', 'strength', 'ankle band|eversion|inversion|peroneal', 'eversion-inversion', 'strength',
  'ankles|calves', True, 'Intermediate', 'Light', False, 40, 20, 12, 'balance-cai-2024',
  'Loop a band around the forefoot and anchor it to the side. Turn the foot outward (away from the band) for the reps, then turn the foot inward against the band, then switch feet. Trains the muscles that resist rolling an ankle.'),
 ('foot-toe-heel-walks', 'Toe & heel walks in place', 'None', 'strength', 'toe walk|heel walk|walking drill', 'gait', 'strength',
  'calves|shins|feet|ankles', False, 'Beginner', 'Light', False, 40, 20, 1, 'achilles-loading-2017',
  'March in place on your tiptoes for 20 s, then flip to walking on your heels with the toes lifted for 20 s. Builds calf and shin endurance through the ranges you actually walk in.'),
 # Balance
 ('foot-single-leg-balance', 'Single-leg balance', 'None', 'balance', 'balance|proprioception|stork stand', 'balance', 'isometric',
  'ankles|feet|hips', True, 'Beginner', 'Light', True, 30, 15, 1, 'balance-cai-2024',
  'Stand on one foot, eyes open, soft knee, and hold as still as you can. Keep a fingertip near a wall the first few times. Try looking around or tapping the free foot lightly to the floor and back to add challenge.'),
 ('foot-single-leg-balance-eyes-closed', 'Single-leg balance · eyes closed', 'None', 'balance', 'balance|proprioception|eyes closed balance', 'balance', 'isometric',
  'ankles|feet|hips', True, 'Advanced', 'Light', True, 20, 15, 1, 'balance-cai-2024',
  'Stand on one foot and close your eyes once you feel steady. Removing vision forces the small muscles of the foot and ankle to do the balancing. Open your eyes any time you feel unsteady, then reset.'),
 # Stretch / soft tissue
 ('foot-calf-stretch-straight-knee', 'Calf stretch · straight knee', 'Wall', 'stretch', 'gastrocnemius stretch|calf stretch', 'calf-stretch', 'static-stretch',
  'calves|ankles', True, 'Beginner', 'Light', True, 30, 10, 1, 'achilles-loading-2017',
  'Hands on a wall, back leg straight with the heel down, front knee bent. Lean the hips forward until you feel a stretch up the back of the straight leg\'s calf. Hold, then switch legs.'),
 ('foot-calf-stretch-bent-knee', 'Calf stretch · bent knee', 'Wall', 'stretch', 'soleus stretch|calf stretch', 'calf-stretch', 'static-stretch',
  'calves|ankles', True, 'Beginner', 'Light', True, 30, 10, 1, 'achilles-loading-2017',
  'Same wall lean, but bend both knees, keeping the back heel down. Bending the back knee shifts the stretch lower, into the soleus. Hold, then switch legs.'),
 ('foot-plantar-fascia-stretch', 'Plantar fascia stretch', 'None', 'stretch', 'plantar fascia stretch|toe extension stretch|arch stretch', 'toe-extension-stretch', 'static-stretch',
  'feet|arches|toes', True, 'Beginner', 'Light', True, 30, 10, 1, 'digiovanni-2006',
  'Sit and cross one foot over the opposite knee. Pull the toes back toward the shin with your hand until you feel a stretch along the arch, not just the calf. Hold, then switch feet.'),
]

GROUPS = ['mobility', 'intrinsic', 'strength', 'balance', 'stretch']

# researched id -> video exercise that replaces it (video clip + drawing win)
DUPLICATES = {
 'foot-ankle-circles': 'foot-banded-ankle-circles',
 'foot-short-foot-hold': 'foot-short-foot',
 'foot-toe-splay-lift': 'foot-toe-spread',
 'foot-toe-spread-squeeze': 'foot-toe-spread',
 'foot-heel-raise-toes-elevated': 'foot-block-heel-raise',
 'foot-ball-roll': 'foot-ball-roll',   # same id: the video entry is kept, researched text is carried over
}
# kept video id -> [(source id, how-to text carried over from the dropped researched exercise)]
CARRY = {
 'foot-ball-roll': [('digiovanni-2006', 'Researched how-to: stand or sit and roll the arch slowly over a lacrosse or tennis ball for about 45 s per foot, easing off any tender spot rather than grinding into it.')],
 'foot-short-foot': [('mckeon-2015', 'Researched how-to: without curling the toes, draw the ball of the foot toward the heel to dome the arch, hold about 10 s, then relax. This is the classic "foot core" exercise for the intrinsic foot muscles (McKeon 2015).')],
 'foot-toe-spread': [('mckeon-2015', 'Researched how-to: spread all ten toes as wide as you can and hold 2-3 s. To separate them further, lift just the big toe while the four small toes stay down, then reverse. A toe spacer or folded towel makes it easier to feel.')],
 'foot-banded-ankle-circles': [('knee-to-wall-2024', 'Researched how-to: go slowly and make the circle as big as you can without moving the shin, 30 s each direction, then switch feet. Tracing the alphabet with the big toe works the same way. Also works without a band.')],
 'foot-block-heel-raise': [('achilles-loading-2017', 'Researched how-to: with the forefoot raised on a block, rise and lower slowly over about 3 s. The extra toe extension adds plantar-fascia and arch loading to the calf work (Baxter 2017 heel-raise progression).')],
}

# Video set: id -> (group, trainingType, work, rest, reps, hold, name of a movement family alias)
VIDEO = {
 'foot-toe-tip-pivots': ('mobility', 'active-mobility', 30, 10, 1),
 'foot-heel-block-pumps': ('mobility', 'active-mobility', 30, 10, 1),
 'foot-banded-ankle-pumps': ('mobility', 'active-mobility', 30, 10, 1),
 'foot-banded-ankle-circles': ('mobility', 'active-mobility', 30, 10, 1),
 'foot-bent-knee-ankle-pulses': ('mobility', 'active-mobility', 30, 10, 1),
 'foot-weighted-ankle-rocks': ('mobility', 'active-mobility', 30, 10, 1),
 'foot-block-guided-roll': ('mobility', 'active-mobility', 30, 10, 1),
 'foot-block-tip': ('mobility', 'active-mobility', 30, 10, 1),
 'foot-outer-edge-rolls': ('mobility', 'active-mobility', 30, 10, 1),
 'foot-short-foot': ('intrinsic', 'control', 20, 10, 1),
 'foot-toe-spread': ('intrinsic', 'control', 20, 10, 1),
 'foot-toe-lifts': ('intrinsic', 'control', 30, 10, 1),
 'foot-ball-toe-curl': ('intrinsic', 'control', 30, 10, 1),
 'foot-block-toe-curls': ('intrinsic', 'control', 30, 10, 1),
 'foot-block-pickup': ('intrinsic', 'control', 30, 10, 1),
 'foot-block-tucked-toes': ('intrinsic', 'control', 30, 10, 1),
 'foot-block-heel-raise': ('strength', 'strength', 40, 20, 12),
 'foot-block-squeeze-heel-raise': ('strength', 'strength', 40, 20, 12),
 'foot-block-squeeze-toe-raise': ('strength', 'strength', 40, 20, 12),
 'foot-ball-roll': ('stretch', 'active-mobility', 45, 15, 1),
 'foot-calf-foam-roll': ('stretch', 'active-mobility', 45, 15, 1),
}
VIDEO_EQUIPMENT = {'foot-banded-ankle-pumps': ['band', 'foam roller'], 'foot-banded-ankle-circles': ['band', 'foam roller']}

def video_entry(e, ext):
    """Normalise a video-branch entry: playable video media, drawing as thumbnail, taxonomy for classify.py."""
    group, training, work, rest, reps = VIDEO[e['id']]
    x = ext[e['id']]
    e['variants'][0]['type'] = 'video'   # clip plays in the sheet/player; the drawing is the poster and (via cover-art.js) the cover
    for src, how in CARRY.get(e['id'], []):
        v = e['variants'][0]
        if src not in v['additionalSources']: v['additionalSources'].append(src)
        if how not in v['note']: v['note'] = (v['note'] + ' ' + how).strip()
    v = e['variants'][0]
    aliases = ['foot', 'feet', 'ankle', 'ankles', 'toes', 'arch', 'foot exercises', 'ankle mobility', e['name'].lower()]
    e['taxonomy'] = {'regions': ['feet', 'toes', 'ankles', 'calves'], 'pattern': 'foot control', 'trainingType': training,
        'unilateral': x['unilateral'], 'aliases': aliases, 'target': 'Legs', 'difficulty': 'Beginner', 'strain': 'Light',
        'hold': False, 'equipment': VIDEO_EQUIPMENT.get(e['id'], [x['equipment']] if x['equipment'] else []),
        'dose': {'work': work, 'rest': rest, 'reps': reps, 'cue': ' '.join([x['cue']] + [how for _, how in CARRY.get(e['id'], [])])}}
    return e

def entries():
    out = []
    for id, name, equipment, group, aliases, pattern, training, regions, uni, level, strain, hold, work, rest, reps, source, how in EXERCISES:
        out.append({'id': id, 'name': name, 'area': 'Feet & ankles', 'kind': 'Mobility', 'equipment': equipment, 'level': 'General',
            'taxonomy': {'regions': regions.split('|'), 'pattern': pattern, 'trainingType': training, 'unilateral': uni,
                'aliases': ['foot', 'feet', 'ankle', 'ankles', 'toes', 'arch'] + aliases.split('|'),
                'target': 'Legs', 'difficulty': level, 'strain': strain, 'hold': hold,
                'dose': {'work': work, 'rest': rest, 'reps': reps}},
            'variants': [{'source': source, 'type': 'instruction', 'thumbnail': ICON, 'label': name, 'named': True, 'prescription': '', 'note': how, 'credit': 'Instruction', 'start': 0, 'end': 0}]})
    return out

def pool():
    """(id, group) pairs, video set first within each group, for data/sessions.js's footPool."""
    both = [(id, v[0]) for id, v in VIDEO.items()] + [(id, g) for id, name, equipment, g, *_ in EXERCISES]
    return sorted(both, key=lambda p: GROUPS.index(p[1]))

def main():
    ext = {e['id']: e for e in json.loads((ROOT / 'data/foot-extraction.json').read_text())['exercises']}
    assert set(VIDEO) == set(ext), 'VIDEO table must cover every extracted exercise'
    assert not (set(DUPLICATES) - {'foot-ball-roll'}) & {id for id, *_ in EXERCISES}, 'dropped duplicates must not be recreated'
    assert all(v in VIDEO for v in DUPLICATES.values())
    # normalise the video entries in place, merge the sources, drop any previously created duplicates
    for path in ['data/extra-exercises.json', 'data/library.json']:
        data = json.loads((ROOT / path).read_text())
        by = {e['id']: e for e in data['exercises']}
        for id in VIDEO: video_entry(by[id], ext)
        data['exercises'] = [e for e in data['exercises'] if e['id'] not in DUPLICATES or e['id'] in VIDEO]
        (ROOT / path).write_text(json.dumps(data, ensure_ascii=False, indent=2))
        if path == 'data/library.json':
            (ROOT / 'data/library.js').write_text('window.LIBRARY = ' + json.dumps(data, ensure_ascii=False) + ';\n')
    merge(SOURCES, [e for e in entries()])
    print(f'{len(VIDEO)} video + {len(EXERCISES)} researched = {len(VIDEO) + len(EXERCISES)} foot exercises.')

if __name__ == '__main__':
    main()
    print('footPool:')
    print(',\n'.join(f" ['{id}','{g}']" for id, g in pool()))
