"""Foot & ankle strengthening and mobility exercises for the Foot Training generator.

Illustrations are not ready yet, so every entry is an 'instruction' variant using a single
shared neutral foot icon (media/examples/foot.svg), the same way 'easy-walking' works.
See RESEARCH.md -> Foot training for the evidence summary.
"""
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
 ('foot-ankle-circles', 'Ankle circles', 'None', 'mobility', 'ankle circles|alphabet|warm up', 'ankle-circles', 'active-mobility',
  'ankles|calves|feet', True, 'Beginner', 'Light', False, 30, 10, 1, 'knee-to-wall-2024',
  'Lift one foot and slowly circle the ankle, 30 s each direction, then switch feet. Go slowly and make the circle as big as you can without moving the shin. Tracing the alphabet with your big toe works the same way.'),
 ('foot-knee-to-wall-mobilization', 'Knee-to-wall ankle mobilization', 'Wall', 'mobility', 'dorsiflexion|ankle mobility|lunge stretch', 'dorsiflexion', 'active-mobility',
  'ankles|calves', True, 'Beginner', 'Light', False, 40, 15, 10, 'knee-to-wall-2024',
  'Half-kneel facing a wall, front foot a few inches back. Keeping the heel down, drive the knee forward over the toes toward the wall and back, 10 slow reps, then switch feet. Move the foot back as it gets easy.'),
 # Intrinsic foot muscles
 ('foot-short-foot-hold', 'Short foot hold', 'None', 'intrinsic', 'foot doming|arch lift|foot core', 'arch-doming', 'isometric',
  'feet|arches', True, 'Intermediate', 'Light', True, 10, 20, 1, 'mckeon-2015',
  'Barefoot, stand or sit with toes flat and relaxed. Without curling the toes, draw the ball of the foot toward the heel to gently dome the arch. Hold 10 s, relax, repeat. This is the classic "foot core" exercise for the intrinsic foot muscles.'),
 ('foot-toe-splay-lift', 'Toe splay & lift', 'None', 'intrinsic', 'toe yoga|toe splay|big toe lift', 'toe-splay', 'control',
  'feet|toes', False, 'Beginner', 'Light', False, 30, 15, 10, 'mckeon-2015',
  'Spread the toes apart as wide as you can, then lift just the big toe while the other four stay down, then reverse: lift the four small toes while the big toe stays down. Slow and controlled — the separation is the hard part.'),
 ('foot-toe-spread-squeeze', 'Toe spread & squeeze', 'None', 'intrinsic', 'toe spacer|toe splay|toe abduction', 'toe-splay', 'control',
  'feet|toes', False, 'Beginner', 'Light', False, 30, 15, 10, 'mckeon-2015',
  'Spread all ten toes as wide apart as possible and hold for 2–3 s, then relax and let them come back together. A folded towel or toe spacer between the toes makes this easier to feel at first.'),
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
 ('foot-heel-raise-toes-elevated', 'Heel raises · toes elevated', 'Towel', 'strength', 'calf raise|toe extension raise', 'plantarflexion', 'strength',
  'calves|ankles|arches', False, 'Intermediate', 'Moderate', False, 40, 30, 12, 'achilles-loading-2017',
  'Rest the balls of your feet on a rolled towel or a low step so the toes sit higher than the heels, then raise and lower. The extra toe extension adds plantar-fascia and arch loading to the calf work.'),
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
 ('foot-ball-roll', 'Foot rolling on a ball', 'Ball', 'stretch', 'plantar rolling|self massage|arch roll', 'soft-tissue', 'active-mobility',
  'feet|arches', True, 'Beginner', 'Light', False, 45, 15, 1, 'digiovanni-2006',
  'Stand or sit and roll the arch of one foot slowly over a ball (a lacrosse or tennis ball works) for 45 s, easing off any tender spot rather than grinding into it, then switch feet.'),
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

def entries():
    out = []
    for id, name, equipment, group, aliases, pattern, training, regions, uni, level, strain, hold, work, rest, reps, source, how in EXERCISES:
        out.append({'id': id, 'name': name, 'area': 'Hips & legs', 'kind': 'Foot', 'equipment': equipment, 'level': 'General',
            'taxonomy': {'regions': regions.split('|'), 'pattern': pattern, 'trainingType': training, 'unilateral': uni,
                'aliases': ['foot', 'feet', 'ankle', 'ankles', 'toes', 'arch'] + aliases.split('|'),
                'target': 'Legs', 'difficulty': level, 'strain': strain, 'hold': hold,
                'dose': {'work': work, 'rest': rest, 'reps': reps}},
            'variants': [{'source': source, 'type': 'instruction', 'thumbnail': ICON, 'label': name, 'named': True, 'prescription': '', 'note': how, 'credit': 'Instruction', 'start': 0, 'end': 0}]})
    return out

def pool():
    """(id, group) pairs in evidence order, for data/sessions.js's footPool."""
    return [(id, group) for id, name, equipment, group, *_ in EXERCISES]

if __name__ == '__main__':
    ex = entries()
    groups = {id: g for id, g in pool()}
    assert set(GROUPS) == set(groups.values())
    merge(SOURCES, ex)
    print(f'Added {len(EXERCISES)} foot & ankle exercises across {len(GROUPS)} groups.')
    print('footPool:')
    print(',\n'.join(f" ['{id}','{g}']" for id, g in pool()))
