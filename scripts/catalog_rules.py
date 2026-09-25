"""Search anatomy, movement taxonomy, dosing presets, and deterministic session rules.
Evidence supports broad principles; exact combinations/time slots are editorial.
"""
import re
from add_climbing import EXISTING as CLIMBING_EXISTING

def members(s):return s.split('|')
def enrich(data,metadata):
    table={}
    def put(ids,regions,pattern,training=None,unilateral=False,aliases=''):
        for id in members(ids):table[id]=dict(regions=regions.split('|'),pattern=pattern,trainingType=training,unilateral=unilateral,aliases=aliases.split('|') if aliases else [])
    put('hollow-body-hang','shoulders|upper back|forearms|grip|abs','hang','isometric',aliases='dead hang|hanging|climbing preparation')
    put('frog-stand|elbow-lever|tuck-planche','wrists|shoulders|arms|abs','balance','skill')
    put('hollow-body-hold','abs|core','anti-extension','isometric',aliases='hollow hold|bracing')
    put('pseudo-planche-lean','shoulders|wrists|arms|abs','push','isometric')
    put('pseudo-planche-push-up|pike-push-up|archer-push-up|diamond-push-up|handstand-push-up|wall-push-up','chest|shoulders|triceps|arms','push','strength',aliases='press up|pressing|pushup')
    put('tuck-front-lever|tuck-back-lever','upper back|lats|shoulders|abs|grip','lever','skill')
    put('german-hang','shoulders|chest|biceps|grip','shoulder-extension','skill')
    put('butcher-block-stretch','lats|shoulders|upper back|triceps','shoulder-flexion','static-stretch',aliases='prayer stretch|bench stretch')
    put('pistol-squat','quads|glutes|hips|ankles|legs','squat','strength',True,aliases='single leg squat')
    put('seated-compression-leg-lift|seated-straight-leg-lift','abs|hip flexors|hips','compression','strength',aliases='leg raise|compression lift')
    put('l-sit|straddle-sit','abs|hip flexors|shoulders|wrists','compression','isometric')
    put('reverse-nordic','quads|knees|hips|legs','knee-extension','strength',aliases='kneeling lean back')
    put('shoulder-stand|handstand','shoulders|arms|wrists|abs','inversion','skill')
    put('muscle-up','upper back|lats|biceps|chest|triceps|grip','pull-push','skill')
    put('band-assisted-thoracic-extension','upper back|thoracic spine|shoulders','thoracic-extension','active-mobility')
    put('prone-band-w-raise|prone-band-lateral-raise|prone-band-overhead-to-t-sweep','shoulders|upper back|scapula|rotator cuff','scapular-control','strength',aliases='band shoulder|shoulder blades|rear delts')
    put('prone-band-row','upper back|lats|biceps|shoulders','pull','strength',aliases='rowing|scapular retraction')
    put('prone-band-pulldown','lats|upper back|shoulders|biceps','pull','strength',aliases='lat pull down')
    put('standing-band-hip-abduction|supported-side-leg-lift','hips|glutes|outer hip|legs','hip-abduction','strength',True)
    put('lateral-weight-shift','hips|adductors|glutes|legs','lateral-shift','active-mobility')
    put('single-leg-balance-on-block','hips|glutes|ankles|legs','balance','control',True)
    put('standing-pelvic-shift','hips|pelvis|lower back','pelvic-control','active-mobility')
    put('bear-hover-with-block-squeeze','abs|core|shoulders|hips','anti-extension','isometric')
    put('seated-leg-lift-with-overhead-reach','abs|hip flexors|hips|shoulders','compression','control')
    put('90-90-forward-fold','hips|glutes|outer hip','hip-rotation','static-stretch',True,aliases='ninety ninety|shin box')
    put('90-90-hip-switches|rocking-90-90','hips|glutes|adductors','hip-rotation','active-mobility',aliases='shin box|windshield wipers|ninety ninety')
    put('side-plank-with-leg-lift','abs|obliques|hips|glutes|shoulders','anti-lateral-flexion','strength',True)
    put('90-90-hip-lift-with-block-support','hips|glutes|legs','hip-rotation','control',True)
    put('half-kneeling-hip-shift','hips|hip flexors|adductors','hip-extension','active-mobility',True)
    put('prone-dowel-diagonal-reach|prone-dowel-pulldown|prone-dowel-side-to-side-reach|prone-dowel-around-head-sweep|prone-alternating-w-reach|prone-t-raise|prone-single-arm-block-reach|prone-block-y-to-w-raise|prone-alternating-block-reach|prone-weighted-dowel-raise|prone-behind-back-dowel-lift','shoulders|upper back|scapula|rotator cuff','scapular-control','control',aliases='shoulder blades|rear delts')
    put('supported-single-leg-rdl-to-hip-gate','hips|hamstrings|glutes|legs','hinge','control',True,aliases='romanian deadlift|hip airplane')
    put('rocking-side-lunge-with-hold|cossack-squat','hips|adductors|glutes|quads|ankles|legs','lateral-squat','control',aliases='side lunge|groin')
    put('supine-wall-squat---adductor-opener','hips|adductors|groin','hip-abduction','static-stretch',aliases='olympic wall squat')
    put('standing-fire-hydrant','hips|glutes|outer hip','hip-rotation','control',True)
    put('wide-stance-forward-fold-to-squat|squat-to-forward-fold','hips|hamstrings|adductors|ankles','squat-hinge','active-mobility')
    put('wide-stance-thoracic-rotation|deep-squat-thoracic-rotation|low-lunge-rotation|lunge-reaches','hips|upper back|thoracic spine|shoulders','thoracic-rotation','active-mobility',True)
    put('deep-squat-knee-drops','hips|ankles|quads','hip-rotation','control')
    put('standing-side-bend','obliques|abs|lats|spine','lateral-flexion','active-mobility')
    put('goddess-squat|monk-squat|chair-sit-to-stand|supported-mini-squat','quads|glutes|hips|legs','squat','strength')
    put('triangle-pose','hamstrings|adductors|hips|spine','lateral-flexion','static-stretch',True)
    put('wide-stance-forward-fold','hamstrings|adductors|hips','hinge','static-stretch')
    put('low-lunge|low-lunge-overhead-reach','hip flexors|quads|hips','hip-extension','static-stretch',True)
    put('warrior-ii','hips|quads|adductors|shoulders','lunge','isometric',True)
    put('half-split','hamstrings|hips|calves','hinge','static-stretch',True)
    put('seated-knee-tuck|wide-leg-sit-up|toe-reach-crunch','abs|hip flexors','trunk-flexion','strength',aliases='abdominals|crunch')
    put('flutter-kicks','abs|hip flexors','anti-extension','strength')
    put('russian-twist|bicycle-crunch','abs|obliques','trunk-rotation','strength')
    put('mountain-climber','abs|shoulders|hip flexors|legs','anti-extension','strength')
    put('prone-bent-knee-hip-rotations|prone-alternating-hip-rotation','hips|glutes|pelvis','hip-rotation','active-mobility')
    put('prone-frog-leg-slides','hips|adductors|groin','hip-abduction','active-mobility')
    put('prone-scorpion','hips|spine|lower back|chest','trunk-rotation','active-mobility')
    put('standing-trunk-twists|standing-rotational-arm-swings|seated-thoracic-rotation','upper back|thoracic spine|spine','trunk-rotation','active-mobility')
    put('arm-circles|arm-swings-—-“aura-farmers”|relaxed-arm-swings-—-“mcgregor’s”','shoulders|arms|chest','shoulder-circles','active-mobility')
    put('body-waves','spine|hips|shoulders|full body','spinal-control','active-mobility')
    put('supported-calf-raise','calves|ankles|feet|legs','plantar-flexion','strength',aliases='heel raise')
    put('standing-hip-extension','hips|glutes|hamstrings|legs','hip-extension','strength',True)
    put('biceps-curl','biceps|arms|elbows','elbow-flexion','strength')
    put('seated-neck-rotation','neck|cervical spine','neck-rotation','active-mobility')
    put('seated-neck-stretch','neck|upper traps','lateral-flexion','active-mobility',True)
    put('wall-calf-stretch','calves|ankles|legs','dorsiflexion','static-stretch',True)
    put('seated-chest-stretch','chest|shoulders','shoulder-extension','active-mobility')
    put('seated-ankle-pumps','ankles|calves|feet','ankle-flexion','active-mobility',True,aliases='ankle stretch|dorsiflexion|plantar flexion')
    put('easy-walking','full body|legs','gait','locomotion',aliases='warm up|cool down|walk|march|walking')
    # Newer entries (climbing, hip pose chart) carry their taxonomy in the catalog itself.
    for e in data['exercises']:
        if 'taxonomy' in e:
            x=e['taxonomy'];table[e['id']]=dict(regions=x['regions'],pattern=x['pattern'],trainingType=x['trainingType'],unilateral=x['unilateral'],aliases=x['aliases'])
    assert set(table)==set(metadata),f'Missing taxonomy: {set(metadata)-set(table)}'
    for e in data['exercises']:
        id=e['id'];m=metadata[id];t=table[id];m.update(t)
        if e['variants'][0].get('type') in ['image','instruction']:
            m.update(difficulty='Beginner',strain='Light' if t['trainingType'] in ['active-mobility','static-stretch','locomotion'] else 'Moderate',target='Full body' if id=='easy-walking' else 'Arms' if e['area']=='Shoulders & back' else 'Legs' if e['area']=='Hips & legs' else 'Full body')
        training=t['trainingType'];m['hold']=training in ['static-stretch','isometric','skill'] and (m['hold'] or id=='wall-calf-stretch')
        x=e.get('taxonomy')
        if x:m.update(target=x['target'],difficulty=x['difficulty'],strain=x['strain'],hold=x['hold'])
        if training=='static-stretch':work,rest,reps=30,10,1
        elif training=='skill':work,rest,reps=15,150,3
        elif training=='isometric':work,rest,reps=20,60,1
        elif training=='strength':work,rest,reps=40,90 if m['strain']=='High' else 60,5 if m['difficulty']=='Beginner' else 8
        elif training=='control':work,rest,reps=30,20,6
        elif training=='locomotion':work,rest,reps=300,0,0
        else:work,rest,reps=30,10,6
        if x and 'dose' in x:work,rest,reps=x['dose']['work'],x['dose']['rest'],x['dose']['reps']
        m.update(work=work,rest=rest,reps=max(1,reps),phase=['warm-up','main'] if training=='active-mobility' else ['cool-down'] if training=='static-stretch' else ['warm-up','cool-down'] if training=='locomotion' else ['main'])
        m['dose']={'workSeconds':work,'restSeconds':rest,'sets':2,'reps':reps,'basis':'AHA stretch range' if training=='static-stretch' else 'Strength recovery review + editorial work window' if training in ['strength','isometric'] else 'Editorial controlled-movement preset','cue':'Move slowly within a comfortable range.'}
        if training=='strength':m['dose']['cue']=f'Aim for {reps} controlled reps; rest for the rest of the work window. Keep a few reps in reserve.'
        if training=='static-stretch':m['dose']['cue']='Hold gently without bouncing; ease off if uncomfortable.'
        if training=='isometric':m['dose']['cue']='Use a controllable variation; finish early if position deteriorates.'
        if training=='skill':m['dose']['cue']='Practice only a familiar progression. Stop before technique deteriorates.'
        if training in ['finger-strength','finger-endurance','power']:m['dose']['basis']='Published climbing protocol; see source'
        if e['variants'][0].get('type') in ['image','instruction','illustration']:m['dose']['cue']=e['variants'][0]['note']
        goals=e.get('climbing',{}).get('goals') or CLIMBING_EXISTING.get(id)
        if goals:m['climbing']=goals
        if 'Warm-up' in (goals or []):m['phase']=['warm-up','main']
        if e.get('program'):m['program']=e['program']
        aliases=t['aliases']+[v['label'] for v in e['variants']]
        equipmentAliases={'None':['bodyweight','no equipment'],'Dowel':['bar','5 ft bar','stick','mobility bar'],'Resistance band':['bands','elastic','resistance'],'Yoga block':['block'],'Yoga blocks':['block'],'Band + block':['bands','block'],'Pull-up bar':['pullup','hanging','climbing','grip'],'Chair':['chair','supported'],'Stable support':['chair','supported'],'Wall':['wall'],'Light weights':['dumbbell','bottle'],'Hangboard':['fingerboard','climbing','grip'],'Strap':['strap','belt'],'Table':['table','bench'],'Pole':['pole','doorframe']}
        m['tags']=sorted(set(t['regions']+[t['pattern'],training,e['kind'].lower(),e['equipment'].lower(),m['target'].lower(),m['difficulty'].lower(),m['strain'].lower()]+aliases+equipmentAliases.get(e['equipment'],[])+(['climbing']+[g.lower() for g in goals] if goals else [])))
        if 'upper back' in t['regions'] or 'lower back' in t['regions']:m['tags'].append('back')
        m['equipment']=[x for x in {'None':[],'Dowel':['bar'],'Resistance band':['band'],'Yoga block':['block'],'Yoga blocks':['block'],'Band + block':['band','block'],'Pull-up bar':['pull-up bar'],'Chair':['chair'],'Stable support':['chair'],'Wall':['wall'],'Light weights':['weights'],'Bench':['bench'],'Band + bench':['band','bench'],'Weighted dowel':['weighted bar'],'Hangboard':['hangboard'],'Strap':['strap'],'Table':['table'],'Pole':['pole']}.get(e['equipment'],[e['equipment'].lower()])]
        if e.get('program'):m['equipment']=[]  # pose-chart props are optional
    return metadata
