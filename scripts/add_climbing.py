"""Climbing-specific hangboard and pull-up bar exercises.

Every entry lists what it trains (goals) and the study or established protocol it
comes from. Illustrations are simple diagrams, not recordings; loads are chosen by
the climber (added weight or assistance), which the app cannot measure.
See RESEARCH.md → Climbing training for the evidence summary.
"""
import pathlib
from add_hip_poses import merge
ROOT = pathlib.Path(__file__).resolve().parents[1]

SOURCES = [
 ('lopez-2019', 'López-Rivera & González-Badillo (2012; 2019)', 'https://www.researchgate.net/publication/324731332_Comparison_of_the_Effects_of_Three_Hangboard_Strength_and_Endurance_Training_Programs_on_Grip_Endurance_in_Sport_Climbers',
  'Sport Technology 2012 and J Hum Kinet 2019. 8-week programs: 10 s maximal added-weight hangs, then minimum-edge hangs (MaxHangs), vs intermittent minimum-edge hangs (IntHangs). Grip endurance improved 34% (MaxHangs) and 45% (IntHangs) in advanced climbers.'),
 ('devise-2022', 'Devise et al. (2022), Frontiers in Sports and Active Living', 'https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2022.862782/full',
  'RCT, 54 experienced climbers, 12 mm edge, 2×/week for 4 weeks. 100% max (6 s), 80% (10 s on / 6 s off, up to 12 reps, 3 sets, 8 min rest) and 60% (10 s on / 6 s off, 24 reps, 2 sets, 6 min rest). 100% and 80% raised max strength; 80% and 60% raised endurance.'),
 ('medernach-2015', 'Medernach, Kleinöder & Lötzerich (2015), J Strength Cond Res', 'https://pubmed.ncbi.nlm.nih.gov/26203738/',
  '4 weeks of fingerboard training in 23 advanced boulderers improved intermittent finger-hang endurance by about 26 s.'),
 ('levernier-2019', 'Levernier & Laffaye (2019), J Strength Cond Res', 'https://pubmed.ncbi.nlm.nih.gov/28945641/',
  '4 weeks of small-hold hangs, twice a week, raised maximal force and rate of force development in elite boulderers, measured in slope, half-crimp and full-crimp grips.'),
 ('mundry-2021', 'Mundry et al. (2021), Scientific Reports', 'https://www.nature.com/articles/s41598-021-92898-2',
  'RCT, 8 weeks: hangs with progressively added weight (+1.25 kg/week) improved grip strength vs climbing only; the shorter-hangs endurance group did not differ from control.'),
 ('gilmore-2024', 'Gilmore et al. (2024), Sports Medicine – Open', 'https://sportsmedicine-open.springeropen.com/articles/10.1186/s40798-024-00793-7',
  'Retrospective training-log analysis: frequent low-intensity 10-minute hang sessions (“Abrahangs”) improved finger strength about as much as max hangs; combining both was additive.'),
 ('stien-2023', 'Stien et al. (2023), Biology of Sport — systematic review & meta-analysis', 'https://pubmed.ncbi.nlm.nih.gov/36636194/',
  'Climbing-specific resistance training and interval bouldering can improve climbing performance; interventional evidence in climbers is still limited.'),
 ('pullup-regimens-2024', 'Pull-up contraction regimens RCT (2024), Bioengineering', 'https://www.mdpi.com/2306-5354/11/1/85',
  '30 advanced–elite climbers, 5 weeks, 2×/week on a hangboard: eccentric, isometric and plyometric pull-up training all increased max strength; eccentric and plyometric also increased velocity and power.'),
 ('testing-review-2023', 'Physical performance testing in climbing — systematic review (2023)', 'https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2023.1130812/full',
  'Finger strength and pulling capacity (pull-ups, power) discriminate climbing ability; pull-up count correlated strongly with grade in intermediate–advanced climbers.'),
 ('lattice-repeaters', 'Lattice Training (Climbing magazine)', 'https://www.climbing.com/skills/lattice-hangboarding-part-2/',
  'Coaching protocol: 7 s on / 3 s off × 6 = one repeater set, load set so the set is hard but completed; used for strength-endurance.'),
]
SOURCES = [{'id': id, 'author': author, 'url': url, 'status': 'referenced', 'text': text, 'media': []} for id, author, url, text in SOURCES]

# Figures: 640×640 diagrams in the style of media/examples/walking.svg.
BG, INK, ACCENT = '#edf3f2', '#568275', '#c9573b'
BOARD = '<rect x="150" y="70" width="340" height="56" rx="16" fill="#d9c6a5"/><rect x="190" y="92" width="80" height="14" rx="7" fill="#8a6f47"/><rect x="370" y="92" width="80" height="14" rx="7" fill="#8a6f47"/>'
BAR = '<path d="M130 110h380" stroke="#6d6d72" stroke-width="16" stroke-linecap="round"/>'
FIGURES = {
 'hang': BOARD + '<g fill="none" stroke="{ink}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"><path d="M230 112 272 232M410 112 368 232"/><circle cx="320" cy="200" r="28"/><path d="M272 236h96M320 236v150M320 386l-30 140M320 386l30 140"/></g>',
 'pull': BAR + '<g fill="none" stroke="{ink}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"><circle cx="320" cy="72" r="28"/><path d="M240 110 222 196 282 150M400 110 418 196 358 150M282 150h76M320 150v150M320 300l-28 140M320 300l28 140"/></g>',
 'lock': BAR + '<g fill="none" stroke="{ink}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"><circle cx="320" cy="168" r="28"/><path d="M240 110v96l44 12M400 110v96l-44 12M284 218h72M320 218v150M320 368l-28 140M320 368l28 140"/></g>',
 'knees': BAR + '<g fill="none" stroke="{ink}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"><path d="M250 110 282 226M390 110 358 226"/><circle cx="320" cy="196" r="28"/><path d="M282 230h76M320 230v140l100-10v96M320 370l96 10 4 96"/></g>',
 'push': '<g fill="none" stroke="{ink}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"><path d="M80 520h480" stroke="#b8c9c4"/><circle cx="150" cy="360" r="28"/><path d="M190 380 500 470M220 392v122M200 392l40 8"/></g>',
 'scap': BAR + '<g fill="none" stroke="{ink}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"><path d="M230 110 268 214M410 110 372 214"/><circle cx="320" cy="184" r="28"/><path d="M268 218h104M320 218v150M320 368l-30 140M320 368l30 140"/></g><path d="M200 250v-60m-16 18 16-18 16 18M440 250v-60m-16 18 16-18 16 18" fill="none" stroke="{accent}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>',
}

def svg(figure, label):
    text = f'<text x="320" y="600" text-anchor="middle" font-family="-apple-system,Helvetica,Arial,sans-serif" font-size="46" font-weight="700" fill="{ACCENT}">{label}</text>' if label else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><rect width="640" height="640" rx="30" fill="{BG}"/>{FIGURES[figure].format(ink=INK, accent=ACCENT)}{text}</svg>'

# id, name, equipment, figure, label, goals, training, pattern, regions, difficulty, strain, hold, work, rest, reps, source, how
HB, PB = 'Hangboard', 'Pull-up bar'
FINGERS = 'fingers|forearms|grip'
EXERCISES = [
 ('hb-warm-up-hangs', 'Hangboard warm-up hangs', HB, 'hang', 'WARM-UP', ['Warm-up'], 'isometric', 'hang', FINGERS + '|shoulders', 'Beginner', 'Light', True, 10, 20, 1, 'lopez-2019',
  'Large edge or jugs. Start with feet on a chair taking weight, then build to about 70% effort. Never start a session with max hangs.'),
 ('hb-max-hang-half-crimp', 'Max hang · half crimp', HB, 'hang', '10 s', ['Max finger strength', 'Crimps'], 'finger-strength', 'hang', FINGERS, 'Advanced', 'High', True, 10, 180, 1, 'lopez-2019',
  'About 20 mm edge, half crimp, arms straight but shoulders engaged. Add weight (or use a smaller edge) so you could hold ~3 s longer. Rest the full 3 min.'),
 ('hb-max-hang-open-hand', 'Max hang · open hand', HB, 'hang', 'OPEN', ['Max finger strength', 'Slopers & pockets'], 'finger-strength', 'hang', FINGERS, 'Advanced', 'High', True, 10, 180, 1, 'levernier-2019',
  'Open-hand or three-finger drag on a 20 mm edge. Load so ~3 s stays in reserve. Grip strength is grip-specific, so train the positions you climb in.'),
 ('hb-min-edge-hang', 'Min-edge hang', HB, 'hang', 'MIN EDGE', ['Crimps', 'Max finger strength'], 'finger-strength', 'hang', FINGERS, 'Advanced', 'High', True, 10, 180, 1, 'lopez-2019',
  'Bodyweight on the smallest edge you can hold for about 13 s, so 10 s leaves a small reserve. Half crimp. Move to a smaller edge only when it gets easy.'),
 ('hb-repeaters-7-3', 'Repeaters 7:3', HB, 'hang', '7 : 3', ['Strength-endurance', 'Power endurance'], 'finger-endurance', 'hang', FINGERS, 'Intermediate', 'High', True, 7, 3, 1, 'lattice-repeaters',
  '7 s hang, 3 s rest, 6 times = one set. Pick an edge or load where the last reps are hard but you still finish every hang with good form.'),
 ('hb-intermittent-80', 'Intermittent hangs 10:6 · hard', HB, 'hang', '10 : 6', ['Strength-endurance', 'Max finger strength'], 'finger-endurance', 'hang', FINGERS, 'Intermediate', 'High', True, 10, 6, 1, 'devise-2022',
  'Hard, about 80% effort (roughly a load you could hold 20–25 s). 10 s on, 6 s off. End the set early if you cannot finish a hang with good form.'),
 ('hb-endurance-60', 'Endurance hangs 10:6 · moderate', HB, 'hang', '10 : 6', ['Endurance', 'Stamina'], 'finger-endurance', 'hang', FINGERS, 'Intermediate', 'Moderate', True, 10, 6, 1, 'devise-2022',
  'Moderate, about 60% effort: remove weight with a chair or pulley so you can repeat 24 hangs. You should feel a steady pump, not failure.'),
 ('hb-low-intensity', 'Low-intensity hangs', HB, 'hang', 'EASY', ['Max finger strength', 'Tendon & pulley capacity'], 'finger-endurance', 'hang', FINGERS, 'Beginner', 'Light', True, 10, 20, 1, 'gilmore-2024',
  'Feet on the floor or a chair so the hang feels easy, well below your max. 10 s on, 20 s off. Gentle enough for most days; skip it if your fingers are sore.'),
 ('bar-scapular-pull-up', 'Scapular pull-ups', PB, 'scap', 'SCAP', ['Warm-up', 'Shoulder health'], 'control', 'scapular-control', 'shoulders|scapula|lats|upper back', 'Beginner', 'Light', False, 30, 30, 8, 'testing-review-2023',
  'From a dead hang with straight arms, pull the shoulder blades down and back to lift the body a few centimetres, then lower slowly.'),
 ('bar-pull-up', 'Pull-ups', PB, 'pull', '', ['Pulling strength'], 'strength', 'pull', 'lats|upper back|biceps|forearms|grip', 'Intermediate', 'Moderate', False, 40, 120, 6, 'testing-review-2023',
  'Full range, chin over the bar and fully straight arms at the bottom. Stop 1–2 reps before failure. Use a band or feet on a chair to assist if needed.'),
 ('bar-weighted-pull-up', 'Weighted pull-ups', PB, 'pull', '+ KG', ['Pulling strength', 'Max strength'], 'strength', 'pull', 'lats|upper back|biceps|forearms|grip', 'Advanced', 'High', False, 30, 180, 4, 'pullup-regimens-2024',
  'Add weight (backpack or belt) so 3–5 reps are hard but clean. Rest the full 3 minutes. Without weight, use slower tempo or the hangboard\'s biggest edge.'),
 ('bar-explosive-pull-up', 'Explosive pull-ups', PB, 'pull', 'FAST', ['Power', 'Contact strength'], 'power', 'pull', 'lats|upper back|biceps|grip', 'Advanced', 'High', False, 30, 150, 3, 'pullup-regimens-2024',
  'Pull as fast as possible, aiming the chest toward the bar; lower under control. Stop the set when speed drops. Trains dynamic moves and dynos.'),
 ('bar-slow-negative', 'Slow negative pull-ups', PB, 'pull', '5 s DOWN', ['Pulling strength'], 'strength', 'pull', 'lats|upper back|biceps|forearms', 'Intermediate', 'High', False, 40, 150, 4, 'pullup-regimens-2024',
  'Jump or step to the top, then lower for about 5 s to straight arms. Good for building to more pull-ups or adding eccentric strength.'),
 ('bar-lock-off', 'Lock-offs', PB, 'lock', '90°', ['Lock-off strength'], 'isometric', 'pull', 'lats|upper back|biceps|forearms', 'Intermediate', 'High', True, 20, 150, 1, 'pullup-regimens-2024',
  'Pull up, then hold about 5 s at the top, 5 s at 90° and 5 s at 120° elbow angle, lowering between positions. Assist with feet if you cannot hold the position.'),
 ('bar-hanging-knee-raise', 'Hanging knee raises', PB, 'knees', '', ['Core tension', 'Steep climbing'], 'strength', 'trunk-flexion', 'abs|hip flexors|grip|shoulders', 'Intermediate', 'Moderate', False, 40, 90, 8, 'stien-2023',
  'Hang with active shoulders and lift the knees toward the chest without swinging. Progress to straight legs or toes-to-bar.'),
 ('push-up', 'Push-up', 'None', 'push', '', ['Antagonists', 'Shoulder health'], 'strength', 'push', 'chest|shoulders|triceps|arms', 'Beginner', 'Moderate', False, 40, 90, 10, 'stien-2023',
  'Hands under shoulders, body in one line. Balances the pulling in climbing. Use knees or a wall to make it easier.'),
]

# Existing library movements that also belong in climbing training.
EXISTING = {
 'hollow-body-hang': ['Warm-up', 'Grip', 'Shoulder health'],
 'hollow-body-hold': ['Core tension', 'Steep climbing'],
 'tuck-front-lever': ['Core tension', 'Steep climbing'],
 'prone-band-w-raise': ['Antagonists', 'Shoulder health'],
 'prone-band-lateral-raise': ['Antagonists', 'Shoulder health'],
 'prone-band-row': ['Pulling strength', 'Shoulder health'],
 'arm-circles': ['Warm-up'],
}

def entries():
    out = []
    (ROOT / 'media/climbing').mkdir(exist_ok=True)
    for id, name, equipment, figure, label, goals, training, pattern, regions, level, strain, hold, work, rest, reps, source, how in EXERCISES:
        path = f'media/climbing/{id}.svg'
        (ROOT / path).write_text(svg(figure, label))
        out.append({'id': id, 'name': name, 'area': 'Shoulders & back', 'kind': 'Climbing', 'equipment': equipment, 'level': 'General',
            'climbing': {'goals': goals},
            'taxonomy': {'regions': regions.split('|'), 'pattern': pattern, 'trainingType': training, 'unilateral': False,
                'aliases': ['climbing', 'climber', 'bouldering'] + (['hangboard', 'fingerboard', 'fingers', 'grip'] if equipment == HB else []) + [g.lower() for g in goals],
                'target': 'Abs' if 'Core tension' in goals else 'Arms', 'difficulty': level, 'strain': strain, 'hold': hold,
                'dose': {'work': work, 'rest': rest, 'reps': reps}},
            'variants': [{'source': source, 'type': 'illustration', 'thumbnail': path, 'label': name, 'named': True, 'prescription': '', 'note': how, 'credit': 'Diagram', 'start': 0, 'end': 0}]})
    return out

if __name__ == '__main__':
    merge(SOURCES, entries())
    print(f'Added {len(EXERCISES)} climbing exercises; tagged {len(EXISTING)} existing movements.')
