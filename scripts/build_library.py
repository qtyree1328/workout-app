"""Reviewed segment index. Times are approximate; names may be descriptive.
Rebuilds screenshots, standalone muted clips, and the browser's offline dataset.
"""
import json, pathlib, subprocess, concurrent.futures

ROOT = pathlib.Path(__file__).resolve().parents[1]
sources = json.loads((ROOT / 'data/sources.json').read_text())
exercises = {}

def add(source, rows, area, kind='Mobility', equipment='None', level='General', named=False):
    for row in rows:
        name, start, end = row[:3]
        options = row[3] if len(row) > 3 else {}
        key = options.get('key', name.lower().replace(' ', '-').replace('/', '-'))
        entry = exercises.setdefault(key, dict(id=key, name=name, area=area, kind=kind,
            equipment=equipment, level=level, variants=[]))
        entry.update({k:v for k,v in options.items() if k in ['area','kind','equipment','level']})
        entry['variants'].append(dict(source=sources[source]['id'], start=start, end=end,
            label=name, named=options.get('named', named), prescription=options.get('dose', ''),
            note=options.get('note', ''), video=sources[source]['media'][0]['path']))

add(0, [
 ('Hollow body hang',4.2,6.7),('Frog stand',7.1,9.7),
 ('Hollow body hold',10.1,12.7,{'area':'Core'}),
 ('Pseudo planche lean',13.1,15.5),('Pseudo planche push-up',16,18.6),
 ('Tuck front lever',19,21.8),('Elbow lever',22.2,24.7),
 ('German hang',25.2,28.5),('Butcher block stretch',29,31.7,{'equipment':'Bench','kind':'Mobility'}),
 ('Pistol squat',32.1,35.4,{'area':'Hips & legs'}),
 ('Tuck back lever',35.9,38.6),('Seated compression leg lift',39.1,41.4,{'area':'Core','named':False}),
 ('Pike push-up',41.9,44.6),('L-sit',45.1,48.5,{'area':'Core'}),('Archer push-up',49,53.5),
 ('Tuck planche',54,55.6),('Reverse Nordic',56.1,58.5,{'area':'Hips & legs'}),
 ('Straddle sit',59,61.6,{'area':'Core'}),('Shoulder stand',62.1,64.7),
 ('Muscle-up',65.1,66.7,{'equipment':'Pull-up bar'}),('Handstand',67.1,69.5),
 ('Handstand push-up',70,72.6)
], 'Shoulders & back', 'Strength', level='Advanced', named=True)
for name in ['hollow-body-hang','tuck-front-lever','german-hang','tuck-back-lever']:
    exercises[name]['equipment']='Pull-up bar'

add(1,[('Band-assisted thoracic extension',0,9,{'note':'The post calls this band-assisted thoracic extension. Bench-supported upper-back and shoulder movement; keep the ribs controlled.'})], 'Shoulders & back',equipment='Band + bench',named=True)
add(2,[('Prone band W raise',0,4.9),('Prone band lateral raise',5,9.7),
 ('Prone band row',10,12.7),('Prone band pulldown',13,17.3),('Prone band overhead-to-T sweep',17.7,23.8)],
 'Shoulders & back','Strength','Resistance band')
add(3,[('Standing band hip abduction',0,2.4,{'equipment':'Resistance band'}),
 ('Lateral weight shift',3,5.4,{'equipment':'Resistance band'}),
 ('Single-leg balance on block',5.8,8.8,{'equipment':'Band + block'}),
 ('Standing pelvic shift',9.3,11.5),('Bear hover with block squeeze',12,15.3,{'equipment':'Yoga block'}),
 ('Seated leg lift with overhead reach',15.8,18.3,{'equipment':'Yoga block'}),
 ('90/90 forward fold',18.8,22.2),('90/90 hip switches',22.5,25.9),
 ('Side plank with leg lift',26.2,28.8,{'kind':'Strength','area':'Core'}),
 ('90/90 hip lift with block support',29.1,32.5,{'equipment':'Yoga block'}),
 ('Half-kneeling hip shift',33,35.5)],'Hips & legs')
add(4,[('Prone dowel diagonal reach',0,2.8),('Prone dowel pulldown',3,5.6),
 ('Prone dowel side-to-side reach',6,8.9),('Prone dowel around-head sweep',9.3,12.7),
 ('Prone alternating W reach',13.1,16.5,{'equipment':'None'}),
 ('Prone T raise',17,20.5,{'equipment':'None'}),
 ('Prone single-arm block reach',21,24.5,{'equipment':'Yoga block'}),
 ('Prone block Y-to-W raise',25,28.6,{'equipment':'Yoga blocks'}),
 ('Prone alternating block reach',29,31.5,{'equipment':'Yoga block'}),
 ('Prone weighted dowel raise',32,35.1,{'equipment':'Weighted dowel'}),
 ('Prone behind-back dowel lift',35.5,40)],'Shoulders & back','Strength','Dowel')
for e in exercises.values():
    for v in e['variants']:
        if v['source']==sources[4]['id']:v['prescription']='Source suggests 20–30 sec, 2–3 sets; 2–3 times/week.'

add(5,[('Rocking 90/90',2.4,6.5,{'dose':'Source: 2 × 15'}),
 ('Supported single-leg RDL to hip gate',7,13.8,{'equipment':'Stable support','dose':'Source: 2 × 10'}),
 ('Rocking side lunge with hold',14.2,18.5,{'dose':'Source: 2 × 12'}),
 ('Supine wall squat / adductor opener',19,24.3,{'equipment':'Wall','dose':'Source: 2 × 1 min','note':'Video label: Olympic wall squat. Post caption: wall adductor opener.'}),
 ('Standing fire hydrant',24.8,29.7,{'dose':'Source: 2 × 15'})],'Hips & legs',named=True)
add(6,[('Wide-stance forward fold to squat',0,3.3),('Wide-stance thoracic rotation',3.6,7.8),
 ('Squat-to-forward-fold',8.1,11.6),('Deep squat thoracic rotation',12,16.3),
 ('Deep squat knee drops',16.8,20.8)],'Hips & legs')
add(7,[('Standing side bend',1.8,4.6),('Goddess squat',6.5,9.8),
 ('Triangle pose',10.5,13.5),('Wide-stance forward fold',14.2,18),
 ('Low lunge',19,21.8),('Low lunge overhead reach',22.2,25),
 ('Warrior II',25.5,28),('Cossack squat',28.5,31),
 ('Low lunge rotation',32,35.8),('Half split',36.5,39.7)],'Hips & legs')
exercises['standing-side-bend']['area']='Spine & full body'
add(8,[('Seated knee tuck',0,2.4),('Flutter kicks',2.8,5.6),
 ('Wide-leg sit-up',6.1,9.3),('Seated straight-leg lift',9.7,12.5),
 ('Russian twist',13,15.8),('Bicycle crunch',16.2,18),('Toe-reach crunch',18.4,20.4),
 ('Diamond push-up',20.8,23.5,{'area':'Shoulders & back'}),
 ('Mountain climber',24,27,{'area':'Spine & full body'}),
 ('Kneeling lean-back',27.7,32.6,{'area':'Hips & legs','key':'reverse-nordic'})],'Core','Strength')
add(9,[('Prone bent-knee hip rotations',0,5.3),('Prone alternating hip rotation',5.7,9.2),
 ('Prone frog leg slides',9.6,13.2),('Prone scorpion',13.6,18.3)],'Hips & legs')
add(10,[('Standing trunk twists',2.8,5.1),('Arm circles',5.5,8.4),
 ('Arm swings — “Aura farmers”',8.7,11.2),('Standing rotational arm swings',11.5,15),
 ('Relaxed arm swings — “McGregor’s”',15.4,18.8),('Body waves',19.2,23),
 ('Standing side bend',23.4,27),('Lunge reaches',27.4,30.8),
 ('Monk squat',31.2,33.2),('Cossack squat',33.6,38)],'Spine & full body',named=True)
for e in exercises.values():
    for v in e['variants']:
        if v['source']==sources[10]['id']:v['prescription']='Source: 30 seconds'
exercises['cossack-squat']['area']='Hips & legs'

# Account for contact-sheet sample-center offsets; clamp to source duration.
for exercise in exercises.values():
    for variant in exercise['variants']:
        source = next(s for s in sources if s['id'] == variant['source'])
        if source is not sources[0]:
            duration = source['media'][0]['duration']
            offset = max(duration / 20, 1) / 2
            variant['start'] = round(min(variant['start'] + offset, duration - 0.2), 3)
            variant['end'] = round(min(variant['end'] + offset, duration), 3)

def render_media(item):
    key,e=item
    for index,v in enumerate(e['variants']):
        stem=f'{key}-{index}'
        v['thumbnail']=f'media/thumbs/{stem}.jpg'
        v['clip']=f'media/clips/{stem}.mp4'
        middle=(v['start']+v['end'])/2
        subprocess.run(['ffmpeg','-loglevel','error','-y','-ss',str(middle),'-i',str(ROOT/v['video']),'-frames:v','1','-vf','scale=480:-2',str(ROOT/v['thumbnail'])],check=True)
        subprocess.run(['ffmpeg','-loglevel','error','-y','-ss',str(v['start']),'-i',str(ROOT/v['video']),'-t',str(v['end']-v['start']),'-an','-vf','scale=480:-2','-c:v','libx264','-preset','veryfast','-crf','25','-movflags','+faststart',str(ROOT/v['clip'])],check=True)

if __name__=='__main__':
    for folder in ['media/thumbs','media/clips']:(ROOT/folder).mkdir(exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(render_media,exercises.items()))
    data=dict(sources=sources,exercises=list(exercises.values()))
    extra_path=ROOT/'data/extra-exercises.json'
    if extra_path.exists():
        extra=json.loads(extra_path.read_text())
        data['sources']+=extra['sources']
        data['exercises']+=extra['exercises']
    (ROOT/'data/library.json').write_text(json.dumps(data,indent=2))
    (ROOT/'data/library.js').write_text('window.LIBRARY = '+json.dumps(data)+';\n')
    print(f"Built {len(exercises)} exercises, {sum(len(e['variants']) for e in exercises.values())} demonstrations.")
