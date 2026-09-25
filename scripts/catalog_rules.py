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

# All plans have their own explicit steps; repeats are sets of the main block, not
# repeats of the warm-up/cool-down. Left/right pairs are adjacent and balanced.
def build_groups(meta,data=None):
    groups=[]
    def step(id,phase='main',side='Both',work=None,rest=None,setno=1,cue=None):
        m=meta[id]
        return dict(exercise=id,mode='time',work=m['work'] if work is None else work,reps=m['reps'],rest=m['rest'] if rest is None else rest,side=side,variant=0,phase=phase,set=setno,cue=cue or m['dose']['cue'],repTarget=m['reps'] if m['trainingType'] in ['strength','power'] or (m['trainingType']=='control' and m.get('climbing')) else None)
    def pair(id,phase='main',**kwargs):return [step(id,phase,s,**kwargs) for s in (['Left','Right'] if meta[id]['unilateral'] else ['Both'])]
    def seconds(steps):return 3+sum(s['work']+s['rest'] for s in steps)-(steps[-1]['rest'] if steps else 0)
    def emit(id,title,focus,steps,kind,rationale,nominal,**extra):
        steps[-1]['rest']=0
        total=seconds(steps)
        if nominal is None:nominal=-(-total//300)*5
        assert total<=nominal*60,(id,total,nominal)
        active=[s for s in steps if s['exercise']!='easy-walking']
        tags=sorted(set([title,kind,*focus]+[t for s in active for t in meta[s['exercise']]['tags']]))
        equipment=sorted(set(x for s in steps for x in meta[s['exercise']]['equipment']))
        groups.append(dict(id=id,name=title,description=f'{kind} · {nominal}-minute option',steps=steps,builtin=True,kind=kind,focus=focus,tags=tags,equipment=equipment,durationSeconds=total,budgetMinutes=nominal,rationale=rationale,coverExercises=list(dict.fromkeys(s['exercise'] for s in active if s['phase']=='main'))[:3],**extra))
    mobility={
      'hips':('Hip mobility',['hips','glutes','hamstrings'],['prone-bent-knee-hip-rotations','90-90-hip-switches','half-kneeling-hip-shift','standing-fire-hydrant','supported-single-leg-rdl-to-hip-gate'],['half-split','90-90-forward-fold','supine-wall-squat---adductor-opener']),
      'back':('Back & shoulders',['upper back','shoulders','thoracic spine'],['arm-circles','standing-trunk-twists','prone-t-raise','prone-alternating-w-reach','prone-dowel-pulldown','prone-dowel-diagonal-reach','seated-thoracic-rotation'],['seated-chest-stretch','standing-side-bend']),
      'full':('Full-body mobility',['full body','hips','back','shoulders','ankles'],['arm-circles','standing-trunk-twists','seated-ankle-pumps','90-90-hip-switches','half-kneeling-hip-shift','low-lunge-rotation','prone-t-raise','standing-fire-hydrant'],['half-split','wall-calf-stretch','90-90-forward-fold']),
      'desk':('Desk movement',['neck','shoulders','upper back','hips'],['seated-neck-rotation','seated-thoracic-rotation','seated-chest-stretch','seated-ankle-pumps','standing-pelvic-shift','arm-circles'],['seated-neck-stretch','standing-side-bend']),
      'ankles':('Ankles & lower legs',['ankles','calves','feet','legs'],['seated-ankle-pumps','lateral-weight-shift','supported-calf-raise','supported-mini-squat'],['wall-calf-stretch','half-split']),
      'bar':('Shoulders · mobility bar',['shoulders','upper back','scapula'],['arm-circles','prone-dowel-pulldown','prone-dowel-diagonal-reach','prone-dowel-side-to-side-reach','prone-dowel-around-head-sweep','prone-behind-back-dowel-lift'],['seated-chest-stretch'])
    }
    for key,(title,focus,drills,finish) in mobility.items():
      for budget in [5,10,15,20,30]:
        # Quick breaks: 1-minute easy movement. Longer mobility: 3–5-minute warm-up.
        warm=60 if budget==5 else 180 if budget==10 else 300
        cool=0 if budget<=10 else 60 if budget==15 else 120
        steps=[step('easy-walking','warm-up',work=warm,rest=10)]
        tail_blocks=[pair(id,'cool-down',work=30,rest=10) for id in finish]
        if cool:tail_blocks.append([step('easy-walking','cool-down',work=cool,rest=0)])
        tail=[s for b in tail_blocks for s in b]
        # Short options use a shorter, relevant ending, not a full-length plan squeezed faster.
        while seconds(steps+tail)>budget*60-50 and len(tail_blocks)>1:
            tail_blocks.pop()
            tail=[s for b in tail_blocks for s in b]
        work=30 if budget<=10 else 40
        choices=[]
        for setno in range(1,4):
            for id in drills:
                m=meta[id];w=work if m['trainingType']!='strength' else 30
                block=pair(id,work=w,rest=60 if m['trainingType']=='strength' else 15,setno=setno)
                choices.append(block)
        used=0
        for block in choices:
            if seconds(steps+block+tail)<=budget*60:
                steps+=block;used+=1
        if used==0:
            steps+=pair(drills[0],work=30,rest=10)
            while seconds(steps+tail)>budget*60 and tail_blocks:
                tail_blocks.pop()
                tail=[s for b in tail_blocks for s in b]
        steps+=tail
        emit(f'mobility-{key}-{budget}',title,focus,steps,'Mobility',
          'Easy walking → controlled mobility → brief comfortable stretches. Both sides receive matching time. Dynamic drills use 30–40-second practice windows; holds use 30 seconds. Exact drill order and windows are editorial, not a proven joint-by-joint prescription.',budget)
    strength={
      'chair':('Supported full-body strength',['legs','chest','shoulders','glutes'],['chair-sit-to-stand','wall-push-up','standing-hip-extension','supported-calf-raise'],['arm-circles','lateral-weight-shift']),
      'band':('Band & bodyweight strength',['upper back','legs','shoulders','hips'],['chair-sit-to-stand','prone-band-row','wall-push-up','standing-band-hip-abduction','prone-band-pulldown'],['arm-circles','standing-pelvic-shift']),
      'upper':('Upper-body strength',['upper back','chest','shoulders','arms'],['wall-push-up','prone-band-row','prone-band-pulldown','prone-band-w-raise','prone-band-lateral-raise'],['arm-circles','standing-trunk-twists']),
      'legs':('Leg strength & balance',['hips','legs','glutes','calves'],['chair-sit-to-stand','standing-hip-extension','standing-band-hip-abduction','supported-calf-raise','supported-mini-squat'],['lateral-weight-shift','seated-ankle-pumps']),
      'core':('Core & hip control',['abs','core','hips','glutes'],['hollow-body-hold','seated-knee-tuck','standing-hip-extension','bicycle-crunch','bear-hover-with-block-squeeze'],['standing-pelvic-shift','standing-trunk-twists']),
      'pull':('Pulling & grip',['upper back','lats','grip','forearms'],['hollow-body-hang','prone-band-row','prone-band-pulldown','prone-band-w-raise','prone-t-raise'],['arm-circles','prone-alternating-w-reach'])
    }
    for key,(title,focus,moves,prep) in strength.items():
      for budget in [15,20,30,45]:
        steps=[step('easy-walking','warm-up',work=300,rest=10)]
        for id in prep:steps+=pair(id,'warm-up',work=30,rest=10)
        tail=[step('easy-walking','cool-down',work=300,rest=0)]
        # Each work window is a set, not continuous maximum-effort exercise.
        # Alternate patterns, preserve >=60 seconds after strength/isometric work.
        choices=[]
        for setno in range(1,4):
          for id in moves:
            m=meta[id];work=20 if m['trainingType']=='isometric' else 40
            block=pair(id,work=work,rest=90 if budget==45 else 60,setno=setno)
            choices.append(block)
        for block in choices:
          if seconds(steps+block+tail)<=budget*60:steps+=block
        # Length comes from useful sets/recovery, never one very long hold.
        steps+=tail
        emit(f'strength-{key}-{budget}',title,focus,steps,'Strength',
          '5-minute walking warm-up → targeted preparation → 1–3 sets of controlled work → 5-minute walking cool-down. Use the rep target inside each work window and rest for any remaining time. Work sets retain 60–90-second breaks; extend recovery when needed. This is general strength practice, not maximal-strength testing.',budget)
    if data:
        climbing_groups(meta,step,pair,emit)
        hip_challenge(meta,data,step,pair,emit)
    return groups

# ---- Climbing: hangboard + pull-up bar protocols (see RESEARCH.md → Climbing training) ----
def climbing_groups(meta,step,pair,emit):
    def warm(fingers=True,hangs=4):
        steps=[step('easy-walking','warm-up',work=180,rest=10,cue='Easy walking, jogging on the spot, or skipping. Get warm before loading the fingers.')]
        steps+=[step('arm-circles','warm-up',work=30,rest=10),step('bar-scapular-pull-up','warm-up',rest=30)]
        if fingers:
            for n,effort in enumerate(['Feet on a chair, about 40% effort.','About 50% effort.','About 60% effort.','About 70–80% effort on the training edge.'][-hangs:]):
                steps.append(step('hb-warm-up-hangs','warm-up',rest=20 if n<hangs-1 else 90,cue=f'Warm-up hang {n+1} of {hangs}. {effort}'))
        else:
            steps+=[step('bar-pull-up','warm-up',work=30,rest=60,cue='Easy set: 3–4 relaxed pull-ups, well short of failure.')]
        return steps
    def sets(id,count,rest,setno_start=1,cue=None,work=None):
        return [step(id,work=work,rest=rest,setno=setno_start+i,cue=(cue(i) if callable(cue) else cue)) for i in range(count)]
    def intermittent(id,reps,count,set_rest,on_cue):
        out=[]
        for k in range(count):
            for r in range(reps):
                out.append(step(id,rest=set_rest if r==reps-1 else None,setno=k+1,cue=f'Set {k+1} of {count} · hang {r+1} of {reps}. {on_cue}'))
        return out
    common='Twice a week with at least 48 hours between hard finger sessions is typical in the studies. Fingers first, while fresh. Stop for any sharp finger pain. Loads are yours to set; the app times the protocol.'
    plans=[
      ('climb-max-hangs','Max hangs · half crimp',['Max finger strength','Crimps'],warm()+sets('hb-max-hang-half-crimp',5,180,cue=lambda i:f'Max hang {i+1} of 5. Half crimp, ~20 mm edge, load you could hold ~13 s.'),
        'MaxHangs (López-Rivera): 10-second hangs with added weight so a few seconds stay in reserve, 3-minute rests. In the 2012/2019 studies 8 weeks of MaxHangs improved grip endurance by ~34%; progressively added weight improved grip strength in Mundry 2021. '+common,['lopez-2019','mundry-2021']),
      ('climb-grip-rotation','Max hangs · grip rotation',['Max finger strength','Crimps','Slopers & pockets'],warm()+[s for i in range(3) for s in [step('hb-max-hang-half-crimp',setno=i+1,cue=f'Round {i+1} of 3 · half crimp.'),step('hb-max-hang-open-hand',setno=i+1,cue=f'Round {i+1} of 3 · open hand / three-finger drag.')]],
        'Alternates half crimp and open hand at max-hang intensity. Finger strength is grip-specific (Levernier & Laffaye 2019 measured gains separately in slope, half-crimp and full-crimp grips), so train the positions you climb in. '+common,['levernier-2019','lopez-2019']),
      ('climb-min-edge','Min-edge hangs',['Crimps','Max finger strength'],warm()+sets('hb-min-edge-hang',5,180,cue=lambda i:f'Min-edge hang {i+1} of 5. Bodyweight, smallest edge you can hold ~13 s.'),
        'The second phase of López-Rivera’s MaxHangs program: bodyweight hangs on the smallest edge you can hold for 10 s with a small reserve. Builds strength on small crimps. '+common,['lopez-2019']),
      ('climb-repeaters','Repeaters 7:3',['Strength-endurance','Power endurance'],warm()+intermittent('hb-repeaters-7-3',6,4,180,'7 s on, 3 s off.'),
        '4 sets of 6 × (7 s on / 3 s off), 3-minute rest between sets. The standard Lattice / Anderson repeater format for strength-endurance (sustained, pumpy climbing). Intermittent fingerboard training improved finger-hang endurance by ~26 s in 4 weeks (Medernach 2015). '+common,['lattice-repeaters','medernach-2015']),
      ('climb-repeaters-short','Repeaters 7:3 · short',['Strength-endurance','Power endurance'],warm(hangs=3)+intermittent('hb-repeaters-7-3',6,3,180,'7 s on, 3 s off.'),
        '3 sets of 7:3 repeaters: a shorter strength-endurance session. '+common,['lattice-repeaters','medernach-2015']),
      ('climb-intermittent-80','Intermittent hangs · hard (80%)',['Strength-endurance','Max finger strength'],warm()+intermittent('hb-intermittent-80',12,3,480,'10 s on, 6 s off at ~80% effort. End the set if form fails.'),
        'Devise et al. 2022 (RCT): 10 s on / 6 s off at 80% of max, up to 12 hangs, 3 sets, 8-minute rests, 2×/week for 4 weeks. Improved both maximal strength and endurance. '+common,['devise-2022']),
      ('climb-endurance-60','Endurance hangs · moderate (60%)',['Endurance','Stamina'],warm(hangs=3)+intermittent('hb-endurance-60',24,2,360,'10 s on, 6 s off at ~60% effort.'),
        'Devise et al. 2022 (RCT): 10 s on / 6 s off at 60% of max, 24 hangs, 2 sets, 6-minute rest. Mainly improved finger endurance (stamina for long routes). Take weight off with a chair or pulley to hit 60%. '+common,['devise-2022']),
      ('climb-low-intensity','Low-intensity hangs',['Max finger strength','Tendon & pulley capacity'],[step('easy-walking','warm-up',work=120,rest=10,cue='Easy movement to warm up.'),step('arm-circles','warm-up',work=30,rest=10)]+[step('hb-low-intensity',rest=20,setno=1,cue=f'Hang {i+1} of 20. Feet assisted; easy effort.') for i in range(20)],
        '10 minutes of 10 s on / 20 s off with the feet taking weight (“Abrahangs”). In a 2024 training-log study, frequent low-intensity hanging improved finger strength about as much as max hangs, and combining both was additive. Evidence is observational, not a randomized trial. Light enough for most days; skip it when fingers are sore.',['gilmore-2024']),
      ('climb-pull-strength','Pulling strength',['Pulling strength'],warm(fingers=False)+sets('bar-weighted-pull-up',4,180,cue=lambda i:f'Set {i+1} of 4: 3–5 hard, clean reps.')+sets('bar-slow-negative',3,150,5,cue=lambda i:f'Set {i+1} of 3: 3–4 negatives, ~5 s down.'),
        'Heavy pull-ups plus eccentric (negative) pull-ups. Pull-up capacity is one of the tests that best separates climbing grades (2023 testing review); eccentric pull-up training raised strength, velocity and range in advanced climbers (2024 RCT). Rest fully between sets.',['testing-review-2023','pullup-regimens-2024']),
      ('climb-power','Pulling power',['Power','Contact strength'],warm(fingers=False)+sets('bar-explosive-pull-up',6,150,cue=lambda i:f'Set {i+1} of 6: 3 fast pull-ups. Stop when speed drops.'),
        'Explosive (plyometric) pull-ups: in the 2024 RCT, plyometric training increased pull-up velocity, power and work capacity in advanced climbers. Useful for dynamic moves and dynos. Full rest keeps every rep fast.',['pullup-regimens-2024']),
      ('climb-lock-offs','Lock-off strength',['Lock-off strength'],warm(fingers=False)+sets('bar-lock-off',5,150,cue=lambda i:f'Set {i+1} of 5: 5 s top · 5 s at 90° · 5 s at 120°.')+sets('bar-slow-negative',2,120,6,cue='3 slow negatives.'),
        'Isometric holds at three elbow angles, then slow negatives. Isometric pull-up training increased maximal pulling strength in the 2024 RCT. Lock-offs let you hold a position while reaching for the next hold.',['pullup-regimens-2024']),
      ('climb-core','Core tension for steep climbing',['Core tension','Steep climbing'],[step('easy-walking','warm-up',work=180,rest=10),step('arm-circles','warm-up',work=30,rest=10),step('bar-scapular-pull-up','warm-up',rest=30)]+[s for i in range(3) for s in [step('bar-hanging-knee-raise',setno=i+1),step('hollow-body-hold',setno=i+1,rest=60)]],
        'Hanging knee raises and hollow holds to keep the feet on steep terrain. General strength practice: there is no climbing-specific trial for core exercises, so this is an editorial pairing.',['stien-2023']),
      ('climb-antagonist','Antagonists & shoulder health',['Antagonists','Shoulder health'],[step('easy-walking','warm-up',work=180,rest=10),step('arm-circles','warm-up',work=30,rest=10)]+[s for i in range(3) for s in [step('push-up',setno=i+1),step('prone-band-w-raise',setno=i+1,work=40),step('prone-band-lateral-raise',setno=i+1,work=40)]],
        'Pushing and rotator-cuff / shoulder-blade work to balance the pulling in climbing. Common coaching practice rather than a climbing-specific trial; the pushing and band sets follow general strength guidance.',['stien-2023']),
      ('climb-strength-session','Climbing strength session',['Max finger strength','Pulling strength','Antagonists'],warm()+sets('hb-max-hang-half-crimp',4,180,cue=lambda i:f'Max hang {i+1} of 4.')+sets('bar-weighted-pull-up',3,180,5,cue=lambda i:f'Set {i+1} of 3: 3–5 hard reps.')+sets('push-up',2,90,8),
        'A combined session: fingers first while fresh, then heavy pulling, then antagonist pushing. Specific resistance training can improve climbing performance (Stien 2023 meta-analysis). '+common,['stien-2023','lopez-2019']),
    ]
    for id,title,goals,steps,rationale,sources in plans:
        # Explicit sets are already in the steps; the Rounds control stays at 1 by default.
        emit(id,title,[g.lower() for g in goals]+['climbing'],steps,'Climbing',rationale,None,goals=goals,sources=sources)

# ---- 21-Day Hip Opening Challenge (YOGABODY pose chart) ----
def hip_challenge(meta,data,step,pair,emit):
    days={}
    for e in data['exercises']:
        if e.get('program',{}).get('id')=='hip-challenge':days.setdefault(e['program']['day'],[]).append((e['program']['pose'],e['id']))
    for day in sorted(days):
        steps=[step('easy-walking','warm-up',work=120,rest=10,cue='Walk or move easily for two minutes. Warm muscles stretch more comfortably.'),
               step('90-90-hip-switches','warm-up',work=40,rest=10),*pair('half-kneeling-hip-shift','warm-up',work=30,rest=10)]
        for _,id in sorted(days[day]):
            # ACSM: 10–30 s holds, ~60 s accumulated per stretch → two 30-s holds per side.
            for rep in (1,2):steps+=pair(id,'main',work=30,rest=10,setno=rep)
        emit(f'hip-challenge-day-{day:02d}',f'Hip Challenge · Day {day}',['hips','glutes','adductors','hip flexors'],steps,'Mobility',
          'From the 21-Day Hip Opening Challenge pose chart: two poses per day. Each pose is held twice for 30 seconds (each side for one-sided poses), which accumulates the ~60 seconds per stretch suggested by ACSM, after a short warm-up. Use the easier variations and props shown on each photo. Ease off any pinching or knee pain.',None,program='hip-challenge',day=day)

