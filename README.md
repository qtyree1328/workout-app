# Crux

A workout app for the iPad and Mac that works offline once it is on the Home Screen. Pick how much time you have (5–60 minutes or Any length) and what you want to train (Climbing, Strength, Mobility, Hip Opener, Recovery, plus optional focus chips), and Crux finds a curated workout that fits. Each session adapts to your time: more or fewer sets, repeat a flow section, or drop the warm-up and cool-down. Published climbing protocols are never modified except to drop the cool-down. Start the workout and follow along.

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

## Your own workouts, favorites and progress

- **Favorites.** Tap the star on any exercise, workout or saved workout. Filter with the Favorites chip in Exercises or the Favorites tile on the Workouts page.
- **My exercises.** Exercises → New exercise: name, notes, category, equipment, one-sided, timed or reps with work / sets / rest, and an optional photo (taken with the camera or chosen, downscaled to about 1000 px). They appear in the library with a "Mine" badge and work everywhere: Try it, the builder and the player.
- **Build.** Make a workout from any exercise: search, filter, reorder (drag the handle or use the arrows), set timed or reps, sets and rest per exercise, see the live total, then Save or Start. Saved workouts appear under "My workouts" on the Workouts page and take part in the time and intensity filters. "Customize" on any built-in workout opens a copy in the builder.
- **Timer.** A free interval timer: work, rest, sets, optional rounds with a longer rest between rounds, and a get-ready countdown. It runs in the normal player (beeps, voice, ring, pause). Save named presets.
- **Progress.** Finishing a workout saves it (title, date, time, steps, optional effort 1–5 and note). The Build tab lists your recent workouts with a Repeat button, and workout cards show a check when you did them in the last 7 days.

## Install and offline

Crux is a progressive web app. In Safari on the iPad open the site once, tap **Share → Add to Home Screen**, and it opens full screen like an app. A service worker keeps the app itself (pages, scripts, data) so it starts with no signal, and checks for a new version each time you open it; an "Update available – Reload" bar appears when one is ready.

Videos and pictures are saved as you use them. For the gym, open **Settings → Download all media for offline** while on Wi-Fi (about 35 MB, with a progress bar). Once it says "Downloaded ✓" every clip plays instantly without buffering. Remove downloads from the same place. The service worker answers video byte-range requests from that saved copy, which iOS Safari needs.

- iOS keeps site storage for apps on the Home Screen. A site you only visit in a Safari tab can have its data cleared after about a week without use, so install it to the Home Screen for your favorites, workouts and downloads to last. Crux asks the browser to keep its storage (`navigator.storage.persist()`) where that is supported.
- Photos and your data are stored in the browser's localStorage (roughly 5 MB on iOS). Photos are compressed to about 100–400 KB each, which is comfortably enough for dozens. Use **Settings → Your data → Export** for a backup file, and Import to merge it back in.
- **After changing code or data, edit `VERSION` at the top of `sw.js`** before you deploy so installed copies fetch the new files.
- Icons are generated from `icon.svg` with `node scripts/make_icons.cjs` (uses Playwright).

## Storage and hosting

Everything you create stays on this device unless you turn on cloud sync (below). Use GitHub Pages for public hosting or a local server for a private iPad setup.

**GitHub Pages:** Push to this branch. Settings → Pages → Build and deployment → Deploy from a branch. The site appears at `https://qtyree1328.github.io/workout-app/` in a minute or two.

**Local Mac/iPad server:** Run `python3 scripts/serve.py --bind 0.0.0.0 --port 8766` from this folder, then open the Mac's IP on the iPad (e.g., `http://192.168.1.163:8766` — find it with `ipconfig getifaddr en0`). Put the Mac and iPad on the same Wi-Fi. Service workers only run on `https` or `localhost`, so offline install needs GitHub Pages (https) or Firebase Hosting; plain LAN http works online only.

**Firebase Hosting (alternative):** `firebase.json` serves this folder with no-cache headers for `sw.js`, `index.html`, scripts and styles. Run `firebase deploy --only hosting,firestore` after `firebase login` and `firebase use <project>`.

## Cloud sync with Firebase (optional)

Off by default: nothing leaves the device. Turn it on to keep favorites, custom exercises (with photos), workouts, timer presets and history in step between your iPad, phone and Mac. It uses your own free Firebase project, email and password sign-in (no pop-ups, so it works in the Home Screen app), and Firestore. Data is merged item by item (the newest edit of each item wins, deletions are remembered), so devices never overwrite each other wholesale, and it keeps working offline and catches up later.

1. Go to <https://console.firebase.google.com> and choose **Add project**. Name it (for example `crux-workouts`). Google Analytics is not needed.
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save.**
3. **Build → Firestore Database → Create database.** Pick a location near you and choose **Start in production mode**.
4. In Firestore open the **Rules** tab, replace everything with the contents of `firestore.rules` from this repo, and click **Publish**. (Each signed-in person can only read and write `users/<their uid>/…`.)
5. **Project settings (gear icon) → General → Your apps → Add app → Web (`</>`).** Give it a nickname, skip Firebase Hosting, and click **Register app**. Copy the `firebaseConfig` object it shows.
6. In this repo open `firebase-config.js`, replace `window.CRUX_FIREBASE = null;` with `window.CRUX_FIREBASE = { apiKey: "...", authDomain: "...", projectId: "...", storageBucket: "...", messagingSenderId: "...", appId: "..." };` using your values, then commit and push. (These values are not secrets; the rules protect the data.)
7. **Authentication → Settings → Authorized domains → Add domain →** `qtyree1328.github.io`. (`localhost` is already listed; add any other host you use, such as your `*.web.app` address.)
8. Open the app, go to **Settings → Cloud sync**, type an email and a password (6+ characters) and tap **Create account**. On your other devices tap **Sign in** with the same details. The status line shows Syncing… and Synced.

Notes: sync needs a connection the first time so the Firebase library can load; after that it is remembered for offline use. Photos sync as long as each one is under about 900 KB (Crux compresses them well below that); a larger one would stay on the device where it was taken. History is capped when the synced document approaches Firestore's 1 MB document limit. Signing out stops syncing but keeps the data on the device.

## Files

- **index.html** — App shell. **manifest.webmanifest**, **icons/** — install metadata. **sw.js** — offline service worker.
- **css/base.css** — Design tokens. **css/app.css** — Pages. **css/features.css** — Favorites, Timer, Build, navigation, settings. **css/player.css** — Workout player.
- **js/lib.js** — Shared helpers, icons, preferences and exercise/media lookup (`Crux.exercise()` is the single place to plug in exercise cover images). **js/app.js** — Pages and routing. **js/player.js** — Timer and UI. **js/audio.js** — Cues. **js/store.js** — Local data (favorites, custom items, history, presets) with merge logic. **js/custom.js** — Steppers and the New exercise form. **js/timer.js** — Timer tab. **js/builder.js** — Build tab and history. **js/pwa.js** — Service worker registration and media downloads. **js/sync.js** + **firebase-config.js** — Optional Firebase sync. **firestore.rules**, **firebase.json** — Firebase setup.
- **js/figures.js** — Animated climbing diagrams. **js/art.js** — Card artwork.
- **js/core/plan.js** — Compile sessions into steps and fit to time. **js/core/engine.js** — Timer state machine (ready, work, rest, reps, resume snapshots). **js/core/search.js** — Keyword search with synonyms and typo tolerance. **js/core/hip.js** — Hip Opener generation.
- **data/sessions.js** — Curated sessions and Hip Opener pose pool (42 poses from the YOGABODY chart).
- **data/library.js** and **data/classification.js** — Exercise catalog and metadata.
- **scripts/serve.py** — Local server with video byte-range support. **build_library.py** — Rebuild clips. **classify.py** — Rebuild metadata. **catalog_rules.py** — Anatomy, patterns, and dosing. **add_climbing.py** — Add climbing exercises and diagrams. **add_hip_poses.py** — Add pose photos from the YOGABODY PDF. **add_examples.py**, **import_sources.py** — Utilities.

## Tests

Run `node tests/core.cjs && node tests/catalog.cjs && node tests/sessions.cjs && node tests/store.cjs && node tests/sync.cjs` to verify session compilation, catalog structure, Hip Opener logic, the store merge rules and sync convergence. The browser test `node tests/e2e.cjs` (needs `python3 scripts/serve.py --port 8803` running and Playwright) covers favorites, custom exercises, the builder, the timer, saved progress, the service worker, media downloads and range requests.
