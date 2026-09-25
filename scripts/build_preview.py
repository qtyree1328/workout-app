"""Build a self-contained copy of the app in preview/ for hosting as a test page.

Small thumbnails and diagrams are inlined into data/library.js so the hosted copy
stays under typical file-count limits. Full source videos are left out (the
trimmed demonstration clips are included). Output is not committed.
"""
import argparse, base64, hashlib, json, pathlib, re, shutil
parser = argparse.ArgumentParser()
parser.add_argument('--password', help='Password for the hosted page (default: the one in site-gate.js; only a SHA-256 hash is written)')
args = parser.parse_args()
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'preview'
if OUT.exists(): shutil.rmtree(OUT)
OUT.mkdir()
for name in ['index.html', 'style.css', 'app.js', 'catalog-core.js', 'workout-core.js', 'icon.svg', 'site-gate.js', 'RESEARCH.md', 'data/classification.js']:
    (OUT / name).parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(ROOT / name, OUT / name)
data = json.loads((ROOT / 'data/library.json').read_text())
def inline(path):
    kind = 'image/svg+xml' if path.endswith('.svg') else 'image/jpeg'
    return f'data:{kind};base64,' + base64.b64encode((ROOT / path).read_bytes()).decode()
copied = set()
for e in data['exercises']:
    for v in e['variants']:
        v.pop('video', None)  # full source videos are not part of the preview
        for key in ['clip', 'image']:
            if v.get(key):copied.add(v[key])
        if v.get('thumbnail') and v.get('thumbnail') != v.get('image'):
            v['thumbnail'] = inline(v['thumbnail'])
for path in sorted(copied):
    (OUT / path).parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(ROOT / path, OUT / path)
(OUT / 'data/library.js').write_text('window.LIBRARY = ' + json.dumps(data, ensure_ascii=False) + ';\n')
# Hosted page: the host supplies the html/head/body skeleton, so keep only the page content.
html = (OUT / 'index.html').read_text()
for tag in ['<!doctype html>\n', '<html lang="en">', '<head>', '</head>', '<body>', '</body>', '</html>']:
    html = html.replace(tag, '')
html = html.replace('<title>Exercises</title>', '<title>Exercises Workout App</title>').replace('<link rel="stylesheet" href="style.css">', '<link rel="stylesheet" href="style.css"><style>body{background:#f5f5f7}.toolbar{top:env(safe-area-inset-top,0px)}</style>')
if args.password:
    # site-gate.js shows the password screen off the local network; set its hash.
    digest = hashlib.sha256(args.password.encode()).hexdigest()
    gate = (OUT / 'site-gate.js').read_text()
    (OUT / 'site-gate.js').write_text(re.sub(r"HASH='[0-9a-f]+'", f"HASH='{digest}'", gate))
(OUT / 'index.html').write_text(html)
files = sorted(str(p.relative_to(OUT)) for p in OUT.rglob('*') if p.is_file())
(OUT / 'files.json').write_text(json.dumps({p: p for p in files if p not in ('index.html', 'files.json')}, indent=1))
print(f'{len(files)} files, {sum((OUT / p).stat().st_size for p in files) / 1e6:.1f} MB in preview/')
