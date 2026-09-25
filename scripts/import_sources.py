import concurrent.futures, json, pathlib, urllib.request, subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
def fetch(source):
    try:
        url = f"https://api.fxtwitter.com/{source['author']}/status/{source['id']}"
        with urllib.request.urlopen(url, timeout=40) as response:
            raw = json.load(response)
        (ROOT / 'data/raw' / (source['id'] + '.json')).write_text(json.dumps(raw, indent=2))
        tweet = raw['tweet']
        source['text'] = tweet['text']
        source['media'] = []
        for index, media in enumerate(tweet.get('media', {}).get('all', [])):
            extension = 'mp4' if media['type'] == 'video' else 'jpg'
            path = f"media/{source['id']}-{index}.{extension}"
            subprocess.run(['curl', '-fLsS', '--max-time', '90', '-A', 'Mozilla/5.0', '-e', 'https://x.com/', '-o', str(ROOT / path), media['url']], check=True)
            source['media'].append({'path': path, 'type': media['type'], 'duration': media.get('duration', 0)})
        source['status'] = 'downloaded'
        source.pop('error', None)
    except Exception as error:
        source['status'] = 'unavailable'
        source['error'] = str(error)
    print(source['id'], source['status'], source.get('text', ''), flush=True)
    return source

if __name__ == '__main__':
    sources = json.loads((ROOT / 'data/sources.json').read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        sources = list(pool.map(fetch, sources))
    (ROOT / 'data/sources.json').write_text(json.dumps(sources, indent=2))
