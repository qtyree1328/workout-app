# Exercises

A personal exercise library designed for iPad Safari. Four pages: **Groups**, **Exercises**, **Climbing**, and **Create Group**.

## Open on iPad

1. Start the server on the Mac from this folder:
   ```sh
   python3 scripts/serve.py --bind 0.0.0.0 --port 8766
   ```
2. Put the Mac and iPad on the same Wi-Fi.
3. In iPad Safari, open `http://192.168.1.163:8766` (the Mac's address when configured; it may change). To find the current Wi-Fi address on the Mac, run `ipconfig getifaddr en0`.
4. Optionally use Safari's **Share → Add to Home Screen**.

The Mac and server must remain running. This is a local-network app, not a public deployment or an offline iPad download. The server shares this workout folder with devices on your network. On the Mac, open http://localhost:8766. Opening `index.html` directly also works on desktop, but is not the iPad setup.

The server supports HTTP byte ranges so Safari can load and seek local video clips. No build, package installation, account, API key, or runtime network service is needed.

## Host it as a website

The repository root is a complete static site, so any static host can serve it without a build step. `.nojekyll` makes GitHub Pages serve every file as-is.

- **GitHub Pages:** Settings → Pages → Build and deployment → *Deploy from a branch* → choose the branch and `/ (root)` → Save. The site appears at `https://qtyree1328.github.io/workout-app/` within a minute or two. Pages for a **private** repository needs a paid GitHub plan (Pro, Team or Enterprise). A Pages site is public even when the repo is private.
- **Netlify or Cloudflare Pages** (free, works with private repos): import the repository, leave the build command empty, and set the publish directory to the repository root.

Off the local network the app shows a password screen (`site-gate.js`). It hides the app but does not encrypt the files, so anyone who knows a file's address can still download it. Change the password by replacing the hash in `site-gate.js`. Saved groups and favorites live in each browser and site address separately; use Settings → Export / Import to move them.

## Use

- **Groups:** 54 editable starter routines plus your own saved chains. Tap to choose rounds, timing/repetition mode, and breaks, then Start. Edit a starter group to save your own copy.
- **Exercises:** Filter all 105 entries by target, difficulty, and estimated strain. Tap to set up a single exercise. Favorite with the star. Change ratings or switch source demonstrations under the setup sheet.
- **Create Group:** Add exercises from the picker. Set time or reps and a break for each step. Drag using the dotted handle, or use the up/down controls. Duplicate a step and label Left / Right to give each side its own interval. Save or try the chain.
- Swipe horizontally across the main page to move between the three pages. Tab buttons work too. Scrolling, text fields, filter strips, and chain handles retain their normal touch behavior.
- The workout player has a 3-second lead-in, looping demonstration, timer, optional transition tones, pause, previous/next, and rep counting. Rep sets advance only when you tap the counter to the target or tap Done. Static holds stay timed. Breaks follow each movement and between rounds; no break is added after the final movement.
- Switching apps/backgrounding pauses the session. Resume explicitly when you return. Screen wake lock is requested where supported; on a local HTTP iPad address it may be unavailable, so keep the screen awake with iPad settings if needed.

## Climbing and the hip challenge

- **Climbing:** hangboard and pull-up bar protocols (max hangs, min-edge hangs, 7:3 repeaters, the Devise 80% / 60% intermittent hangs, low-intensity hangs, weighted, explosive and negative pull-ups, lock-offs, core and antagonist sessions). Each exercise and protocol is labelled by what it trains, such as *Max finger strength*, *Crimps*, *Strength-endurance* or *Endurance*. Filter by goal on the Climbing page, or use the **Climbing** chip on Groups and Exercises. Evidence and programming rules: [RESEARCH.md → Climbing training](RESEARCH.md#climbing-training).
- **21-Day Hip Opening Challenge:** 42 poses from the supplied YOGABODY chart as photo guides, with a ready-made group for each day. Set the Groups type filter to *21-day hip challenge*.

## Groups and classification

All exercises have separate Beginner / Intermediate / Advanced difficulty, Light / Moderate / High strain estimates, and Arms / Legs / Abs / Full body navigation categories. Arms includes shoulders/upper back; Legs includes hips. Original detail areas remain available. Group labels reflect the highest movement rating, not a measured workout intensity. These estimates can be changed in an exercise's details. Time, reps, pace, resistance, and rest change actual effort.

The 54 starter routines cover six mobility and six strength families, with 5–45-minute options and 11 choices lasting 27–30 minutes. They use separate warm-up, main-work, and ending phases; timed strength sets include rep targets and recovery. The grouping framework draws on ACE, CDC, and ACSM guidance; the particular assignments, chains, and timer defaults are editorial choices, not individualized prescriptions. See [RESEARCH.md](RESEARCH.md) for sources and limitations.

## Data and backups

The 11 supplied X source videos, 94 trimmed demonstrations, screenshots, source captions, and 91 original exercises are retained locally. Added 13 attributed NHS photo guides and one instruction-only walking interval, for 105 entries total. Some movement names are descriptive and clip boundaries approximate; original posts and full videos are accessible from exercise details. Clips can show only part of a repetition or multiple difficulty variants.

Your groups, draft, favorites, and rating overrides live in this browser's local storage (`range-v2`). Existing `range-v1` favorites and saved sequences migrate on first opening at the **same origin**; the old data is not deleted. Different browsers or addresses/ports have separate storage. On an old address you can open the updated app and export its migrated groups, then import on the new address/iPad.

Use **Settings → Export** to download a backup and **Import** on another device to merge it. Identical groups are not duplicated; existing groups are not overwritten. Backup exports contain groups/preferences, not the videos. Clearing browser storage removes customizations unless backed up. A new draft archives an unfinished chain as a saved group; editing another group replaces the current draft, so save a draft before switching edits.

## Development and verification

- `app.js`, `style.css`, `index.html`: dependency-free interface.
- `workout-core.js`: timer and repetition state machine.
- `data/library.json` / `.js`: source catalog, unchanged by the redesign.
- `scripts/build_library.py`: reviewed source timestamps; rebuild clips/catalog using ffmpeg.
- `scripts/classify.py`: rebuild `data/classification.json` and `.js` after catalog changes. `scripts/catalog_rules.py` defines anatomy, movement patterns, dose presets, and bounded routine generation.
- `scripts/import_sources.py`: download source metadata/media with network access.
- `scripts/serve.py`: local server with Safari video range support.
- `scripts/add_climbing.py`: climbing exercises, diagrams (`media/climbing/`) and study sources. `scripts/add_hip_poses.py`: pose-chart images (`media/poses/`). Run either, then `scripts/classify.py`.
- `scripts/build_preview.py`: builds a self-contained copy in `preview/` for hosting as a test page. Add `--password …` to put a password screen in front of it (only a hash is written; it hides the app but does not encrypt the files).

Run `node tests/core.cjs` for catalog/state-machine checks, `node tests/catalog.cjs` for taxonomy/search/budgets, and `node tests/climbing.cjs` for climbing protocol rules and the hip challenge. `tests/browser.cjs` uses Playwright (set `PLAYWRIGHT_MODULE` to your installed module and `PLAYWRIGHT_BROWSERS_PATH` if needed) against `APP_URL`, defaulting to http://127.0.0.1:8766. It covers Chrome and WebKit at iPad sizes, actual video playback, filtering, favorites, rep sets and rest, editing/reordering, persistence, export/import, hidden-page pause, and byte-range media requests. Physical iPad testing is still needed to confirm device-specific media, sound, screen-lock, and Home Screen behavior.

## Expanded search and time budgets

Groups now have a 5–60-minute time slider, common-time shortcuts, workout-type and equipment filters. Results are sorted globally, longest that fits first. “Any length” includes manual rep-based groups whose duration cannot be known. Planned times include countdown, walking warm-up/cool-down, work, and breaks. Your saved groups and metadata remain in the same `range-v2` storage; no reset is needed.

Anatomy search covers back, hips, shoulders, calves, glutes, abs/core, thoracic spine, and other regions. It also searches aliases, equipment, movement patterns, difficulty, strain, and type across both exercises and groups. The builder uses the same search. Common plural forms, multiword queries, and small typos are supported. Details show region labels and the dosing cue.

`data/extra-exercises.json` retains the additional sources and media entries. `scripts/build_library.py` merges these after rebuilding the original video catalog. `scripts/add_examples.py` retrieves the NHS image guides (requires the three source HTML pages in `/tmp/range-nhs-{strength,flex,sitting}.html`; see URLs in the script). Routine use/rebuilding classification does not require downloads.

Additional checks: `node tests/catalog.cjs` verifies taxonomy completeness, synonyms, budget ordering, exact time accounting, bilateral symmetry, phase preservation, and recovery/hold constraints. `tests/expansion.cjs` exercises new features in WebKit. New photo guides are explicitly labeled and rendered as photos during workouts; the existing videos continue to loop.
