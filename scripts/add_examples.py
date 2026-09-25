"""Import public NHS photo guides. Keep these distinct from video demonstrations."""
import json,pathlib,re,subprocess,html
ROOT=pathlib.Path(__file__).resolve().parents[1]
rows=[
 ('strength','Sit-to-stand','chair-sit-to-stand','Chair sit-to-stand','Strength','Hips & legs','Chair','Lean forward; rise using your legs, then sit with control.'),
 ('strength','Mini-squats','supported-mini-squat','Supported mini squat','Strength','Hips & legs','Chair','Use the chair for balance; lower comfortably, then stand.'),
 ('strength','Calf raises','supported-calf-raise','Supported calf raise','Strength','Hips & legs','Chair','Lift your heels slowly while holding a stable support.'),
 ('strength','Sideways leg lift','supported-side-leg-lift','Supported side leg lift','Strength','Hips & legs','Chair','Move one leg sideways without leaning your trunk.'),
 ('strength','Leg extension','standing-hip-extension','Standing hip extension','Strength','Hips & legs','Chair','Move your leg behind you without arching your lower back.'),
 ('strength','Wall press-up','wall-push-up','Wall push-up','Strength','Shoulders & back','Wall','Bend your elbows toward the wall; press away with control.'),
 ('strength','Biceps curls','biceps-curl','Biceps curl','Strength','Shoulders & back','Light weights','Keep your elbows near your sides as you curl and lower.'),
 ('flex','Neck rotation','seated-neck-rotation','Seated neck rotation','Mobility','Shoulders & back','Chair','Turn comfortably, pause up to 5 seconds, then return.'),
 ('flex','Neck stretch','seated-neck-stretch','Seated neck stretch','Mobility','Shoulders & back','Chair','Tilt gently to one side; use brief 5-second holds.'),
 ('flex','Calf stretch','wall-calf-stretch','Wall calf stretch','Mobility','Hips & legs','Wall','Step one leg back; keep that heel down and knee straight.'),
 ('sitting','Chest stretch','seated-chest-stretch','Seated chest stretch','Mobility','Shoulders & back','Chair','Open your chest gently; hold 5–10 seconds, then relax.'),
 ('sitting','Ankle stretch','seated-ankle-pumps','Seated ankle pumps','Mobility','Hips & legs','Chair','Lift one foot and slowly alternate pointing and flexing it.'),
 ('sitting','Upper-body twist','seated-thoracic-rotation','Seated thoracic rotation','Mobility','Spine & full body','Chair','Keep your hips still while gently turning your upper body.')]
urls={key:f'https://www.nhs.uk/live-well/exercise/{slug}-exercises/' for key,slug in [('strength','strength'),('flex','flexibility'),('sitting','sitting')]}
sources=[{'id':'nhs-'+key,'author':'NHS','url':url,'status':'downloaded','text':'Public exercise photo guide. Source instructions linked in exercise details.','media':[]} for key,url in urls.items()]
exercises=[]
(ROOT/'media/examples').mkdir(exist_ok=True)
for page,heading,id,name,kind,area,equipment,cue in rows:
    text=pathlib.Path(f'/tmp/range-nhs-{page}.html').read_text()
    sections=re.split(r'<h2[^>]*>',text)
    section=next(s for s in sections if s.startswith(heading+'</h2>'))
    image=html.unescape(re.search(r'<img[^>]*src="([^"]+)"',section,re.S).group(1)).replace('width-320','width-1019')
    path=f'media/examples/{id}.jpg'
    subprocess.run(['curl','-fLsS','--max-time','30',image,'-o',str(ROOT/path)],check=True)
    exercises.append({'id':id,'name':name,'area':area,'kind':kind,'equipment':equipment,'level':'General','variants':[{'source':'nhs-'+page,'type':'image','thumbnail':path,'image':path,'label':name,'named':True,'prescription':'','note':cue,'credit':'NHS','originalMedia':image,'start':0,'end':0}]})
# Walking is an instruction-only warm-up/cool-down block, not a claimed video demo.
url='https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/warm-up-cool-down'
sources.append({'id':'aha-warm-up','author':'American Heart Association','url':url,'status':'referenced','text':'Warm-up and cool-down guidance.','media':[]})
exercises.append({'id':'easy-walking','name':'Easy walking','area':'Spine & full body','kind':'Warm-up','equipment':'None','level':'General','variants':[{'source':'aha-warm-up','type':'instruction','thumbnail':'media/examples/walking.svg','label':'Easy walking','named':True,'note':'Walk at an easy pace. For a warm-up, increase gradually; for a cool-down, slow down gradually.','start':0,'end':0}]})
out={'sources':sources,'exercises':exercises}
(ROOT/'data/extra-exercises.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
base=json.loads((ROOT/'data/library.json').read_text())
base['sources']=[s for s in base['sources'] if s['id'] not in {x['id'] for x in sources}]+sources
base['exercises']=[e for e in base['exercises'] if e['id'] not in {x['id'] for x in exercises}]+exercises
(ROOT/'data/library.json').write_text(json.dumps(base,ensure_ascii=False,indent=2))
(ROOT/'data/library.js').write_text('window.LIBRARY = '+json.dumps(base,ensure_ascii=False)+';\n')
print(f'Added {len(rows)} NHS photo examples and one walking instruction. Catalog: {len(base["exercises"])} entries.')
