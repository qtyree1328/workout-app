"""Build a self-contained copy of the app in preview/ for hosting as a test page.

Small thumbnails and diagrams are inlined into data/library.js so the hosted copy
stays under typical file-count limits. Full source videos are left out (the
trimmed demonstration clips are included). Output is not committed.
"""
import argparse, base64, hashlib, json, pathlib, shutil
parser = argparse.ArgumentParser()
parser.add_argument('--password', help='Show a password screen on the hosted page (only a SHA-256 hash is written)')
args = parser.parse_args()
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'preview'
if OUT.exists(): shutil.rmtree(OUT)
OUT.mkdir()
for name in ['index.html', 'style.css', 'app.js', 'catalog-core.js', 'workout-core.js', 'icon.svg', 'RESEARCH.md', 'data/classification.js']:
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
    # A light lock for the hosted copy: it hides the app, but the files themselves are not encrypted.
    digest = hashlib.sha256(args.password.encode()).hexdigest()
    gate = ('<style>#gate{position:fixed;inset:0;z-index:100;background:#f5f5f7;display:grid;place-items:center;padding:16px}'
      '#gate form{background:#fff;border-radius:20px;padding:28px;width:min(360px,100%);display:grid;gap:14px;box-shadow:0 10px 40px #0000000f}'
      '#gate h1{margin:0;font-size:24px;letter-spacing:-.5px}#gate p{margin:0;color:#727278;font-size:13px}'
      '#gate input{height:46px;border:0;border-radius:12px;background:#eaeaef;padding:0 14px;font-size:16px}'
      '#gate-error{color:#d5433f!important;min-height:18px}</style>'
      '<div id="gate"><form id="gate-form"><h1>Exercises</h1><p>Enter the password to open the app.</p>'
      '<input id="gate-password" type="password" autocomplete="current-password" aria-label="Password" autofocus>'
      '<button class="primary" type="submit">Open</button><p id="gate-error" role="alert"></p></form></div>'
      '<script>(function(){const H="' + digest + '",g=document.getElementById("gate");'
      'try{if(localStorage.getItem("gate-ok")===H){g.remove();return;}}catch{}'
      'async function sha(t){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");}'
      'document.getElementById("gate-form").addEventListener("submit",async e=>{e.preventDefault();const v=document.getElementById("gate-password").value;'
      'if(await sha(v)===H){try{localStorage.setItem("gate-ok",H);}catch{}g.remove();}'
      'else{document.getElementById("gate-error").textContent="That password is not right. Try again.";}});})();</script>')
    html = html.replace('<div class="app-shell">', gate + '<div class="app-shell">', 1)
(OUT / 'index.html').write_text(html)
files = sorted(str(p.relative_to(OUT)) for p in OUT.rglob('*') if p.is_file())
(OUT / 'files.json').write_text(json.dumps({p: p for p in files if p not in ('index.html', 'files.json')}, indent=1))
print(f'{len(files)} files, {sum((OUT / p).stat().st_size for p in files) / 1e6:.1f} MB in preview/')
