# Exercise cover artwork

All 163 exercises in the source catalog have cover art, using 152 distinct illustrations and 11 shared-pose mappings. The figure follows the approved tall, lean, faceless male reference, with a charcoal tank and teal shorts.

Open `exercise-art.html` at the repository root to browse the complete collection. `manifest.json` maps every exercise to its image; `aliases.json` records reused poses. `records/` preserves generation prompts. Illustrations depict a representative pose or source-image setup, rather than every phase of a movement. The German hang cover depicts a foot-assisted shoulder-extension position. Hangboard images use the supplied CLEVO reference, without asserting unverified pocket depths.

This branch starts from main, whose live catalog contains 105 exercises. `exercise-source-catalog.json` preserves the full 163-exercise development catalog for artwork coverage without importing unrelated application changes. The cover adapter updates artwork for exercises present in the app; existing video clips, source links, exercise IDs, and workout logic remain intact.

Run `python tools/build-cover-art.py` from the repository root after changing mappings. The generated `data/cover-art.js` also supplies the standalone gallery. Images use WebP and contain sizing to avoid cropping limbs. Generation records retain draft status pending owner review; AI illustrations are visual interpretations, not exact anatomical diagrams.
