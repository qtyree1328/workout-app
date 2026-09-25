"""Editorial classifications, separate from source claims. See RESEARCH.md."""
import json, pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'data/library.json').read_text())

def names(s): return set(s.split('|'))
advanced=names('pseudo-planche-push-up|tuck-front-lever|elbow-lever|german-hang|pistol-squat|tuck-back-lever|l-sit|archer-push-up|tuck-planche|straddle-sit|shoulder-stand|muscle-up|handstand|handstand-push-up|side-plank-with-leg-lift')
beginner=names('butcher-block-stretch|prone-band-row|prone-band-pulldown|standing-band-hip-abduction|lateral-weight-shift|standing-pelvic-shift|half-kneeling-hip-shift|prone-alternating-w-reach|prone-t-raise|standing-side-bend|wide-stance-forward-fold|low-lunge|half-split|prone-bent-knee-hip-rotations|prone-alternating-hip-rotation|prone-frog-leg-slides|standing-trunk-twists|arm-circles|arm-swings-—-“aura-farmers”|standing-rotational-arm-swings|relaxed-arm-swings-—-“mcgregor’s”')
high=advanced | names('pseudo-planche-lean|pike-push-up|reverse-nordic|diamond-push-up|mountain-climber')
moderate_mobility=names('standing-band-hip-abduction|single-leg-balance-on-block|bear-hover-with-block-squeeze|seated-leg-lift-with-overhead-reach|90-90-hip-lift-with-block-support|supported-single-leg-rdl-to-hip-gate|rocking-side-lunge-with-hold|wide-stance-forward-fold-to-squat|squat-to-forward-fold|deep-squat-thoracic-rotation|deep-squat-knee-drops|goddess-squat|warrior-ii|cossack-squat|lunge-reaches|monk-squat')
holds=names('hollow-body-hang|frog-stand|hollow-body-hold|pseudo-planche-lean|tuck-front-lever|elbow-lever|german-hang|butcher-block-stretch|tuck-back-lever|l-sit|tuck-planche|straddle-sit|shoulder-stand|handstand|single-leg-balance-on-block|bear-hover-with-block-squeeze|90-90-forward-fold|supine-wall-squat---adductor-opener|triangle-pose|wide-stance-forward-fold|low-lunge|low-lunge-overhead-reach|warrior-ii|half-split')
full=names('mountain-climber|body-waves|standing-trunk-twists|standing-rotational-arm-swings|wide-stance-thoracic-rotation|deep-squat-thoracic-rotation|low-lunge-rotation|lunge-reaches|prone-scorpion')
core=names('hollow-body-hold|seated-compression-leg-lift|l-sit|straddle-sit|bear-hover-with-block-squeeze|seated-leg-lift-with-overhead-reach|side-plank-with-leg-lift|seated-knee-tuck|flutter-kicks|wide-leg-sit-up|seated-straight-leg-lift|russian-twist|bicycle-crunch|toe-reach-crunch|standing-side-bend')
upper=names('arm-circles|arm-swings-—-“aura-farmers”|relaxed-arm-swings-—-“mcgregor’s”')
metadata={}
for e in data['exercises']:
    id=e['id']
    target='Full body' if id in full else 'Abs' if id in core else 'Arms' if e['area']=='Shoulders & back' or id in upper else 'Legs'
    difficulty='Advanced' if id in advanced else 'Beginner' if id in beginner else 'Intermediate'
    strain='High' if id in high else 'Moderate' if e['kind']=='Strength' or id in moderate_mobility else 'Light'
    # Unloaded shoulder control is generally lighter than loaded band work.
    if id.startswith('prone-') and e['equipment'] in ['None','Dowel','Yoga block','Yoga blocks'] and target=='Arms': strain='Light'
    metadata[id]={'target':target,'difficulty':difficulty,'strain':strain,'hold':id in holds,'detail':e['area'],
       'work':15 if id in high else 30,'rest':90 if id in high else 30 if strain=='Moderate' else 10,'reps':5 if id in high else 8}

from catalog_rules import enrich, build_groups
metadata=enrich(data,metadata)
groups=build_groups(metadata,data)
out={'exercises':metadata,'groups':groups}
(ROOT/'data/classification.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
(ROOT/'data/classification.js').write_text('window.CLASSIFICATION = '+json.dumps(out,ensure_ascii=False)+';\n')
print(f'Classified {len(metadata)} movements; created {len(groups)} groups.')
