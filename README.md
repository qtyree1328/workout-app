# Crux

A workout app for the iPad and Mac. Pick how much time you have (5–60 minutes or Any length) and what you want to train (Climbing, Strength, Mobility, Hip Opener, Recovery, plus optional focus chips), and Crux finds a curated workout that fits. Each session adapts to your time: more or fewer sets, repeat a flow section, or drop the warm-up and cool-down. Published climbing protocols are never modified except to drop the cool-down. Start the workout and follow along.

## Session types

- **Climbing.** Hangboard and pull-up bar protocols for max finger strength, crimps, strength-endurance, power, lock-offs, and antagonist work. Every exercise is labeled with what it trains. You choose the load (weight, edge size, or assistance); the app times the protocol.
- **Strength.** Upper and lower body, core, and full-body circuits with timed sets and rep targets.
- **Mobility.** Hip, shoulder, hamstring, and full-body flows.
- **Recovery.** Post-climb cool-downs, evening unwinds, and desk resets.

## Hip Opener

Pick a time budget and how many poses you want. Crux randomly draws poses from the 42-pose YOGABODY chart, orders them from standing down to lying (so you only go to the floor once), and runs through them. Each pose is held for 6 minutes (one-sided poses: 3 minutes per side, with a 10-second switch). One minute of rest separates poses. That's a yin-style hold: 6 minutes is well beyond the ~60-second stretch minimum. Ease in, use props, pick the easier variation on the photo guide, and back off any pinching or joint pain. Shuffle or swap individual poses before starting.

## Workout player

The player has a ring timer showing work and rest, sound cues, and voice cues (including "Halfway" and "One minute left" on long holds). Swipe or use keyboard arrows to move between steps. Rep sets (like pull-ups) have no countdown: count reps with +/− and tap Done when the set is finished. Timed holds stay on the clock. During a rest you can add 15 seconds or skip it. The app pauses when it goes to the background, and after a reload it offers to resume where you left off.

## Exercise library

Search all exercises by body area, movement, difficulty, equipment, or training type, or filter by group (Climbing, Upper body, Lower body, Core, Hip poses, Mobility, Strength). Tap Try It for a quick timer on any exercise. Climbing exercises have animated diagrams. Hip poses and other stretches show photo guides with easier variations and prop options.

## Storage and hosting

Nothing is tracked. Only display preferences are stored in the browser. Use GitHub Pages for public hosting or a local server for a private iPad setup.

**GitHub Pages:** Push to this branch. Settings → Pages → Build and deployment → Deploy from a branch. The site appears at `https://qtyree1328.github.io/workout-app/` in a minute or two.

**Local Mac/iPad server:** Run `python3 scripts/serve.py --bind 0.0.0.0 --port 8766` from this folder, then open the Mac's IP on the iPad (e.g., `http://192.168.1.163:8766` — find it with `ipconfig getifaddr en0`). Put the Mac and iPad on the same Wi-Fi. Optionally use Safari's **Share → Add to Home Screen**.

**Password:** The hosted site shows a password screen (site-gate.js). It hides the app but does not encrypt files. Change the password by replacing the hash in `site-gate.js`.

## Files

- **index.html** — App shell.
- **css/base.css** — Design tokens. **css/app.css** — Pages. **css/player.css** — Workout player.
- **js/lib.js** — Shared helpers, icons, preferences and exercise/media lookup (`Crux.exercise()` is the single place to plug in exercise cover images). **js/app.js** — Pages and routing. **js/player.js** — Timer and UI. **js/audio.js** — Cues.
- **js/figures.js** — Animated climbing diagrams. **js/art.js** — Card artwork.
- **js/core/plan.js** — Compile sessions into steps and fit to time. **js/core/engine.js** — Timer state machine (ready, work, rest, reps, resume snapshots). **js/core/search.js** — Keyword search with synonyms and typo tolerance. **js/core/hip.js** — Hip Opener generation.
- **data/sessions.js** — Curated sessions and Hip Opener pose pool (42 poses from the YOGABODY chart).
- **data/library.js** and **data/classification.js** — Exercise catalog and metadata.
- **scripts/serve.py** — Local server with video byte-range support. **build_library.py** — Rebuild clips. **classify.py** — Rebuild metadata. **catalog_rules.py** — Anatomy, patterns, and dosing. **add_climbing.py** — Add climbing exercises and diagrams. **add_hip_poses.py** — Add pose photos from the YOGABODY PDF. **add_examples.py**, **import_sources.py** — Utilities.

## Tests

Run `node tests/core.cjs && node tests/catalog.cjs && node tests/sessions.cjs` to verify session compilation, catalog structure, and Hip Opener logic.
