"""Build the shared cover map and standalone review gallery from saved artwork."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COVERS = ROOT / 'media/covers'
catalog = json.loads((COVERS / 'exercise-source-catalog.json').read_text())['exercises']
aliases = json.loads((COVERS / 'aliases.json').read_text())
records = {p.stem: json.loads(p.read_text()) for p in (COVERS / 'records').glob('*.json')}
mapping = {}
for exercise in catalog:
    key = exercise['id']
    source = aliases.get(key, key)
    if source in records and (ROOT / records[source]['src']).is_file():
        mapping[key] = {'src': records[source]['src'], 'name': exercise['name']}
        if source != key:
            mapping[key]['sharedWith'] = source

(COVERS / 'manifest.json').write_text(json.dumps(mapping, indent=2) + '\n')
js = 'window.EXERCISE_COVERS = ' + json.dumps(mapping, indent=2) + ';\n'
js += '''// Keep catalog IDs, workout state, source links and video clips intact.
for (const exercise of window.LIBRARY?.exercises || []) {
  const cover = window.EXERCISE_COVERS[exercise.id];
  if (!cover) continue;
  for (const variant of exercise.variants) {
    variant.originalThumbnail = variant.thumbnail;
    variant.thumbnail = cover.src;
    variant.coverArt = true;
    if (variant.type === 'image') {
      variant.originalImage = variant.image;
      variant.image = cover.src;
    }
  }
}
'''
(ROOT / 'data/cover-art.js').write_text(js)
print(f'{len(mapping)}/{len(catalog)} exercises mapped; {len({v["src"] for v in mapping.values()})} unique covers')
missing = [e['id'] for e in catalog if e['id'] not in mapping]
if missing:
    print('Pending: ' + ', '.join(missing))
