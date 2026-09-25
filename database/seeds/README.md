# Seed data

Keep reproducible demo datasets here for users, destinations, cultural guides, bucket-list items, check-ins, achievements, saved itineraries, festivals, and clearly labeled demonstration safety alerts.

`festivals.json` is the canonical hackathon festival dataset. Every record must pass the shared
festival contract, retain direct provenance URLs, distinguish recurring timing from verified annual
occurrences, and label Saraya-authored travel guidance separately. The mobile fixture parses this
seed directly; do not maintain a second festival record set in the app.

`festival-cultural-guides.json` is the canonical one-to-one cultural companion to `festivals.json`. Each
record joins through `festivalId`, contains six independently verified cultural categories, and
distinguishes externally supported facts from Saraya traveler guidance and insufficient evidence.
Run `npm run culture:audit` after changing either dataset; use `npm run culture:audit:full` for the
per-festival verification inventory.

`npm run db:seed` validates both files with the shared Zod contracts, verifies their one-to-one ID
mapping, and upserts them into `festivals` and `festival_cultural_guides`. The transformation to
query columns plus lossless JSONB documents is implemented in the API seed path; these two JSON
files remain the only manually maintained festival source.

The September 2026 catalog contains 151 festivals. It was expanded by reviewing all 177 entries in
the twelve month filters of the TPB calendar: 149 entries were accepted as distinct supported
festival identities, 18 were rejected as non-festivals, duplicates, or conflicting listings, and 10
were deferred because locality or identity evidence was insufficient. Pahiyas and
Pintados-Kasadyaan remain supported by their existing non-baseline sources.
