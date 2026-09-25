"""Import the 21-Day Hip Opening Challenge pose chart (YOGABODY) as photo guides.

The supplied PDF is password protected. Pass the password with --password or the
HIP_PDF_PASSWORD environment variable; it is never stored in the repository.
Requires PyMuPDF (`pip install pymupdf`). Writes media/poses/, merges the entries
into data/extra-exercises.json and data/library.json/.js.
"""
import argparse, json, os, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
PDF = ROOT / 'Posechart_Hip-Challenge.pdf'
SOURCE = 'yogabody-hip-challenge'

# page, day, pose number, name, unilateral, regions, pattern, difficulty, props, cue
POSES = [
 (1, 1, 1, 'Pigeon', True, 'hips|glutes|outer hip', 'hip-rotation', 'Intermediate', 'block', 'Front shin angled, back leg long. Prop the hip with a block if it floats.'),
 (2, 1, 2, 'Butterfly', False, 'hips|adductors|groin', 'hip-abduction', 'Beginner', 'block', 'Soles together, knees wide. Fold forward only as far as feels easy.'),
 (3, 2, 1, 'Blaster', True, 'hip flexors|quads|hips', 'hip-extension', 'Intermediate', 'chair', 'Low lunge with hands on a chair; sink the hips forward and down.'),
 (4, 2, 2, 'Passive Squat', False, 'hips|ankles|adductors|lower back', 'squat', 'Beginner', 'chair', 'Deep squat, arms resting forward on a chair or block. Let the hips hang.'),
 (5, 3, 1, 'Happy Baby', False, 'hips|adductors|hamstrings|lower back', 'hip-flexion', 'Beginner', '', 'On your back, hold the feet and draw the knees toward the armpits.'),
 (6, 3, 2, 'Thread the Needle (supine)', True, 'hips|glutes|outer hip', 'hip-rotation', 'Beginner', '', 'Ankle over opposite knee; pull the lower thigh toward the chest.'),
 (7, 4, 1, 'Frog', True, 'hips|adductors|groin', 'hip-abduction', 'Intermediate', 'chair', 'Half frog: one knee out to the side at 90°, other leg long. Rest forward on a chair.'),
 (8, 4, 2, 'Jackknife Blaster', True, 'hip flexors|quads|hips', 'hip-extension', 'Intermediate', 'block', 'Kneeling lunge, back knee padded; reach back for the rear foot if available.'),
 (9, 5, 1, 'Scissors', True, 'hamstrings|calves|hips', 'hinge', 'Beginner', 'chair', 'Staggered stance, hands on a chair or wall; hinge over the straight front leg.'),
 (10, 5, 2, 'Lightning Bolt', False, 'quads|hip flexors|knees|ankles', 'knee-flexion', 'Intermediate', '', 'Kneel sitting back on the heels; lean back only as far as the knees allow.'),
 (11, 6, 1, 'Zorro', True, 'hips|glutes|adductors', 'hip-rotation', 'Intermediate', 'block', 'Seated, one shin forward and one leg bent back. Sit tall on a cushion.'),
 (12, 6, 2, 'Supine Butterfly', False, 'hips|adductors|groin', 'hip-abduction', 'Beginner', 'strap', 'Soles together, then recline. Use a strap or pillows under the knees.'),
 (13, 7, 1, 'Thread the Needle @ Wall', True, 'hips|glutes|outer hip', 'hip-rotation', 'Beginner', 'wall', 'Seated figure-four: ankle over the opposite knee, walk the hands back.'),
 (14, 7, 2, 'Prone Butterfly', True, 'hips|glutes|outer hip', 'hip-rotation', 'Intermediate', 'strap', 'One leg bent in front, the other out behind; lower toward the floor.'),
 (15, 8, 1, 'Ninja Squats', True, 'adductors|hips|hamstrings|ankles', 'lateral-squat', 'Intermediate', 'chair', 'Wide stance, shift into one bent knee with the other leg straight. Use a chair.'),
 (16, 8, 2, 'Lateral Chain Stretch', True, 'obliques|hips|outer hip|lats', 'lateral-flexion', 'Beginner', '', 'Side-lying on a forearm, legs stacked; lift the hip gently to lengthen the side.'),
 (17, 9, 1, 'Psoas Blaster (chair)', True, 'hip flexors|quads|hips', 'hip-extension', 'Intermediate', 'chair', 'Back knee on a padded chair, front foot forward; press the hips forward.'),
 (18, 9, 2, 'Reclined Scissors', True, 'hamstrings|hips|calves', 'hinge', 'Beginner', 'chair', 'On your back with one leg up on a chair or wall; keep the other leg long.'),
 (19, 10, 1, 'Blaster Twist', True, 'hip flexors|hips|thoracic spine', 'thoracic-rotation', 'Intermediate', 'chair', 'Low lunge, rotate the chest toward the front knee.'),
 (20, 10, 2, 'Squat Twist', True, 'hips|thoracic spine|adductors', 'thoracic-rotation', 'Intermediate', 'chair', 'Deep squat, elbow inside one knee, rotate open.'),
 (21, 11, 1, 'Double Pigeon', True, 'hips|glutes|outer hip', 'hip-rotation', 'Advanced', 'block', 'Stack the shins. Sit on a block or chair; fold forward gently.'),
 (22, 11, 2, 'Bound Butterfly', False, 'hips|adductors|lower back', 'hip-abduction', 'Beginner', 'chair', 'Butterfly with a forward fold; rest the arms on a chair or block.'),
 (23, 12, 1, 'Eagle Fold', True, 'hips|glutes|outer hip', 'hip-rotation', 'Intermediate', 'chair', 'Cross one thigh over the other, then fold forward over the legs.'),
 (24, 12, 2, 'Cross-Thread', True, 'hips|glutes|outer hip', 'hip-rotation', 'Beginner', '', 'On your back, cross the thighs and hug the legs toward the chest.'),
 (25, 13, 1, 'Swiss Army Knife', True, 'hip flexors|quads|hips', 'hip-extension', 'Advanced', 'strap', 'Kneeling lunge; loop a strap around the back foot and draw it up.'),
 (26, 13, 2, 'Saddle', False, 'quads|hip flexors|knees', 'knee-flexion', 'Advanced', 'block', 'From kneeling on the heels, lean back onto the hands or forearms.'),
 (27, 14, 1, 'Butterfly Squat', False, 'hips|adductors|ankles', 'squat', 'Intermediate', 'chair', 'Deep squat with knees wide; hold a chair or pole for balance.'),
 (28, 14, 2, 'Half Lightning Bolt', True, 'quads|hip flexors|knees', 'knee-flexion', 'Intermediate', 'block', 'One leg folded back, the other long. Lean back only as far as comfortable.'),
 (29, 15, 1, 'Fallen Blaster', True, 'hip flexors|quads|hips', 'hip-extension', 'Intermediate', 'chair', 'Long low lunge, back knee down; support the chest on a chair.'),
 (30, 15, 2, 'A-Baby', True, 'hamstrings|hips|calves', 'hinge', 'Beginner', '', 'On your back, hold one straight leg up; keep the other leg long.'),
 (31, 16, 1, 'Standing Psoas', True, 'hip flexors|quads|hips', 'hip-extension', 'Intermediate', 'table', 'Back shin on a table or bench, front leg standing; tuck the pelvis.'),
 (32, 16, 2, 'Standing Pigeon', True, 'hips|glutes|outer hip', 'hip-rotation', 'Beginner', 'table', 'Front shin across a table, hinge forward from the hips.'),
 (33, 17, 1, 'Sage Fold', True, 'hamstrings|hips|adductors', 'hinge', 'Intermediate', 'pole', 'Seated, one leg long and one bent; reach forward along the long leg.'),
 (34, 17, 2, 'Long Butterfly', False, 'hips|adductors|lower back', 'hip-abduction', 'Beginner', 'pole', 'Soles together with feet further away; fold forward and relax the back.'),
 (35, 18, 1, 'Eagle Legs', True, 'hips|glutes|outer hip', 'hip-rotation', 'Intermediate', '', 'Seated, cross one leg over the other and hug the shin toward you.'),
 (36, 18, 2, 'Chair Squat', True, 'hips|glutes|outer hip', 'hip-rotation', 'Intermediate', 'chair', 'Standing figure-four holding a chair: ankle on the opposite knee, sit back.'),
 (37, 19, 1, 'Twisted Pigeon', True, 'hips|glutes|thoracic spine', 'hip-rotation', 'Advanced', 'block', 'From pigeon, rotate the chest toward the back leg.'),
 (38, 19, 2, 'Bound Baby', False, 'hips|adductors|lower back', 'hip-flexion', 'Beginner', '', 'On your back, hold both feet with the knees wide and drawn down.'),
 (39, 20, 1, 'Seated Pigeon', True, 'hips|glutes|outer hip', 'hip-rotation', 'Beginner', 'chair', 'On a chair, ankle over the opposite knee; hinge forward with a long spine.'),
 (40, 20, 2, 'Railroad Squat', False, 'hips|ankles|adductors', 'squat', 'Intermediate', 'pole', 'Deep squat holding a pole or doorframe; keep the heels down if you can.'),
 (41, 21, 1, 'Thunderbolt', False, 'quads|knees|ankles', 'knee-flexion', 'Beginner', 'chair', 'Kneel sitting on the heels; add a cushion under the seat if needed.'),
 (42, 21, 2, 'Prayer Squat', False, 'hips|adductors|ankles', 'squat', 'Beginner', 'block', 'Deep squat, palms together, elbows gently pressing the knees wide.'),
]

def slug(name):
    return 'hip-' + ''.join(c if c.isalnum() else '-' for c in name.lower()).replace('--', '-').strip('-').replace('--', '-')

def entries():
    out = []
    for page, day, pose, name, uni, regions, pattern, level, props, cue in POSES:
        id = slug(name)
        equipment = {'block': 'Yoga block', 'chair': 'Chair', 'wall': 'Wall', 'strap': 'Strap', 'table': 'Table', 'pole': 'Pole', '': 'None'}[props]
        out.append({'id': id, 'name': name, 'area': 'Hips & legs', 'kind': 'Mobility', 'equipment': equipment, 'level': 'General',
            'program': {'id': 'hip-challenge', 'day': day, 'pose': pose},
            'taxonomy': {'regions': regions.split('|'), 'pattern': pattern, 'trainingType': 'static-stretch', 'unilateral': uni,
                'aliases': ['yoga', 'hip opener', 'hip opening', 'pose chart', 'hip challenge', f'day {day}'],
                'target': 'Legs', 'difficulty': level, 'strain': 'Light', 'hold': True},
            'variants': [{'source': SOURCE, 'type': 'image', 'thumbnail': f'media/poses/thumbs/{id}.jpg', 'image': f'media/poses/{id}.jpg',
                'options': f'media/poses/{id}-options.jpg',
                'label': name, 'named': True, 'prescription': '', 'note': cue + ' Props shown are optional.', 'credit': 'YOGABODY pose chart',
                'page': page + 1, 'start': 0, 'end': 0}]})
    return out

SOURCES = [{'id': SOURCE, 'author': 'YOGABODY', 'url': 'https://www.yogabody.com', 'status': 'supplied',
    'text': '21-Day Hip Opening Challenge pose chart (Posechart_Hip-Challenge.pdf). Two poses per day with regressions shown on each page.', 'media': []},
   {'id': 'acsm-flexibility', 'author': 'ACSM position stand (Garber et al., 2011)', 'url': 'https://pubmed.ncbi.nlm.nih.gov/21694556/', 'status': 'referenced',
    'text': 'Flexibility: hold stretches 10–30 s to mild tightness, accumulating about 60 s per exercise, on at least 2–3 days per week.', 'media': []}]


# Each page is a fixed template: a header bar, a "Pose N: Name" label top-left, the main
# pose photo large on the left, and 2-3 smaller "easier variation" photos stacked in a
# right column. These are whitespace-detection knobs (fractions of the detection raster),
# generous enough to clear the header/label/footer on every page while never reaching into
# the photos themselves (checked against a scan of all 42 pages).
DETECT_WIDTH = 1000        # detection raster width, in pixels
INK_THRESHOLD = 25         # a pixel counts as "ink" when it differs from white by more than this (0-255)
HEADER_FRAC = 0.08         # header bar always ends well before this
LABEL_SEARCH_FRAC = 0.20   # "Pose N: Name" label is always done well before this
FOOTER_FRAC = 0.925        # footer credit line / logo always starts well after this
MIN_GAP_FRAC = 0.01        # minimum whitespace column-run to count as a real gap between photos
PAD_FRAC = 0.035           # even whitespace padding kept around each crop, as a fraction of its own size

# Manual overrides for pages the automatic whitespace detection gets wrong, keyed by pose id.
# Each value is {'main': (x0,y0,x1,y1)} and/or {'options': (x0,y0,x1,y1)} as fractions of the
# full page (0-1, left-to-right / top-to-bottom); an override replaces the auto-detected box
# before padding is added.
PAGE_OVERRIDES = {}

def _ink_probe(pix):
    samples, n, stride = pix.samples, pix.n, pix.stride
    def is_ink(x, y):
        off = y * stride + x * n
        c = samples[off:off + 3]
        return max(255 - c[0], 255 - c[1], 255 - c[2]) > INK_THRESHOLD
    def row_has_ink(y, x0, x1):
        return any(is_ink(x, y) for x in range(x0, x1))
    def col_has_ink(x, y0, y1):
        return any(is_ink(x, y) for y in range(y0, y1))
    return row_has_ink, col_has_ink

def _tight_bbox(row_has_ink, col_has_ink, x0, x1, y0, y1):
    """Tight ink bounding box within a search window, or None if the window is blank."""
    rows = [y for y in range(y0, y1) if row_has_ink(y, x0, x1)]
    if not rows:
        return None
    cols = [x for x in range(x0, x1) if col_has_ink(x, y0, y1)]
    return (min(cols), min(rows), max(cols) + 1, max(rows) + 1)

def find_photo_boxes(page):
    """Whitespace-detect the main-pose photo and the right-column variation photos on one
    pose-chart page. Returns (main_bbox, options_bbox, main_safe, options_safe) in
    detection-pixel space; options_bbox is None if no separate column of photos is found.
    Works by: finding where the top-left label's text ends (bounding the main photo's search
    window from above), then splitting the remaining width into runs of ink separated by
    whitespace gaps - the leftmost run is the main photo, every run after it is unioned into
    the options photos. The *_safe boxes are the windows actually searched (label/header to
    footer, split at the main/options boundary); padding is clamped to stay inside them so it
    can never grow back into the header, label or the other column."""
    import pymupdf
    r = page.rect
    zoom = DETECT_WIDTH / r.width
    pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom))
    width, height = pix.width, pix.height
    row_has_ink, col_has_ink = _ink_probe(pix)

    header_end = int(HEADER_FRAC * height)
    footer_start = int(FOOTER_FRAC * height)
    label_x1 = int(0.55 * width)
    label_search_bottom = int(LABEL_SEARCH_FRAC * height)
    label_end = header_end
    for y in range(header_end, label_search_bottom):
        if row_has_ink(y, 0, label_x1):
            label_end = y + 1

    ink_col = [col_has_ink(x, label_end, footer_start) for x in range(width)]
    min_gap = max(8, int(MIN_GAP_FRAC * width))
    runs, x = [], 0
    while x < width:
        if ink_col[x]:
            start = x
            while x < width and ink_col[x]:
                x += 1
            runs.append([start, x])
        else:
            x += 1
    merged = []
    for run in runs:
        if merged and run[0] - merged[-1][1] < min_gap:
            merged[-1][1] = run[1]
        else:
            merged.append(run)
    runs = merged
    if not runs:
        return None, None, (0, label_end, width, footer_start), (0, header_end, width, footer_start)

    main_run, rest = runs[0], runs[1:]
    boundary = (main_run[1] + rest[0][0]) // 2 if rest else main_run[1]
    main_bbox = _tight_bbox(row_has_ink, col_has_ink, 0, boundary, label_end, footer_start)
    opt_bbox = _tight_bbox(row_has_ink, col_has_ink, boundary, width, header_end, footer_start) if rest else None
    main_safe = (0, label_end, boundary, footer_start)
    opt_safe = (boundary, header_end, width, footer_start)
    return main_bbox, opt_bbox, main_safe, opt_safe

def _pad_and_clamp(bbox, safe, pad_frac=PAD_FRAC):
    x0, y0, x1, y1 = bbox
    sx0, sy0, sx1, sy1 = safe
    pad = pad_frac * max(x1 - x0, y1 - y0)
    return (max(sx0, x0 - pad), max(sy0, y0 - pad), min(sx1, x1 + pad), min(sy1, y1 + pad))

def render(password):
    import pymupdf
    doc = pymupdf.open(PDF)
    if doc.needs_pass and not doc.authenticate(password):
        raise SystemExit('Wrong PDF password')
    (ROOT / 'media/poses/thumbs').mkdir(parents=True, exist_ok=True)
    for e in entries():
        v = e['variants'][0]
        page = doc[v['page'] - 1]
        r = page.rect
        main_bbox, opt_bbox, main_safe, opt_safe = find_photo_boxes(page)
        dw, dh = DETECT_WIDTH, round(DETECT_WIDTH * r.height / r.width)
        zoom = dw / r.width
        override = PAGE_OVERRIDES.get(e['id'], {})

        def to_px_bbox(frac_bbox):
            x0, y0, x1, y1 = frac_bbox
            return (x0 * dw, y0 * dh, x1 * dw, y1 * dh)

        if 'main' in override:
            main_bbox = to_px_bbox(override['main'])
        if main_bbox is None:
            raise SystemExit(f'{e["id"]}: could not find the main pose photo on page {v["page"]}')
        main_rect_px = _pad_and_clamp(main_bbox, main_safe)
        main_rect = pymupdf.Rect(*(c / zoom for c in main_rect_px))
        page.get_pixmap(matrix=pymupdf.Matrix(1000 / main_rect.width, 1000 / main_rect.width), clip=main_rect).save(ROOT / v['image'], jpg_quality=80)
        page.get_pixmap(matrix=pymupdf.Matrix(480 / main_rect.width, 480 / main_rect.width), clip=main_rect).save(ROOT / v['thumbnail'], jpg_quality=80)

        if 'options' in override:
            opt_bbox = to_px_bbox(override['options'])
        if opt_bbox is not None:
            opt_rect_px = _pad_and_clamp(opt_bbox, opt_safe)
            opt_rect = pymupdf.Rect(*(c / zoom for c in opt_rect_px))
            page.get_pixmap(matrix=pymupdf.Matrix(600 / opt_rect.width, 600 / opt_rect.width), clip=opt_rect).save(ROOT / v['options'], jpg_quality=80)
        elif (ROOT / v['options']).exists():
            (ROOT / v['options']).unlink()

def merge(new_sources, new_exercises):
    """Replace entries with the same ids; keep everything else."""
    for path in ['data/extra-exercises.json', 'data/library.json']:
        data = json.loads((ROOT / path).read_text())
        ids = {s['id'] for s in new_sources}
        data['sources'] = [s for s in data['sources'] if s['id'] not in ids] + new_sources
        ids = {e['id'] for e in new_exercises}
        data['exercises'] = [e for e in data['exercises'] if e['id'] not in ids] + new_exercises
        (ROOT / path).write_text(json.dumps(data, ensure_ascii=False, indent=2))
        if path == 'data/library.json':
            (ROOT / 'data/library.js').write_text('window.LIBRARY = ' + json.dumps(data, ensure_ascii=False) + ';\n')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--password', default=os.environ.get('HIP_PDF_PASSWORD', ''))
    parser.add_argument('--skip-render', action='store_true', help='Only update catalog entries')
    args = parser.parse_args()
    if not args.skip_render:
        render(args.password)
    merge(SOURCES, entries())
    print(f'Added {len(POSES)} hip poses across 21 days.')
