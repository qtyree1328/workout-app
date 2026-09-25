"""Add the walking instruction entry. NHS photo guides were removed; keep this
distinct from video demonstrations."""
import json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
sources=[]
exercises=[]
(ROOT/'media/examples').mkdir(exist_ok=True)
# Walking is an instruction-only warm-up/cool-down block, not a claimed video demo.
url='https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/warm-up-cool-down'
sources.append({'id':'aha-warm-up','author':'American Heart Association','url':url,'status':'referenced','text':'Warm-up and cool-down guidance.','media':[]})
exercises.append({'id':'easy-walking','name':'Easy walking','area':'Spine & full body','kind':'Warm-up','equipment':'None','level':'General','variants':[{'source':'aha-warm-up','type':'instruction','thumbnail':'media/examples/walking.svg','label':'Easy walking','named':True,'note':'Walk at an easy pace. For a warm-up, increase gradually; for a cool-down, slow down gradually.','start':0,'end':0}]})
from add_hip_poses import merge  # replaces these ids only; keeps climbing and pose-chart entries
merge(sources,exercises)
base=json.loads((ROOT/'data/library.json').read_text())
print(f'Added one walking instruction. Catalog: {len(base["exercises"])} entries.')
