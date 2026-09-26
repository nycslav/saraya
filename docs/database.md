# Database design

The first migration enables PostGIS and creates the `destinations` table. It stores API-facing
content, arrays for tags and cultural guidance, editorial ratings, premium visibility metadata,
and a canonical `geography(Point, 4326)` location.

Coordinates use `{ latitude, longitude }` at API boundaries. SQL creates points in longitude,
latitude order. They are retained for maps, directions, requested local weather, safety context,
and itinerary planning, not GPS-driven discovery or check-in verification.

Indexes include GiST for destination location, GIN for tags, and B-tree indexes for region and
island group. The JSON catalog remains the reproducible source for development seeding and the
automated-test fallback.

The second migration creates `itineraries`, `itinerary_days`, and `itinerary_stops`. Core itinerary
metadata and validated preferences live on the parent record, while ordered days and typed stops
are relational rows with cascading deletion. A future authentication migration can populate the
nullable `user_id` without changing the current Shipathon API contract.

The fourth migration records whether Gemini, OpenAI, or the deterministic fallback generated an
itinerary. The fifth migration adds an optional normalized Geoapify place reference to each stop,
including the provider ID, verified display data, and coordinates. A database constraint requires
all place fields to be present together, while generic transport or rest stops keep them null.

The third migration creates `bucket_list_items`. The sixth migration creates manual `check_ins`
with journal metadata and no captured device location. The seventh migration creates achievement
definitions and uniquely unlocked `user_achievements`; badge progress is derived from check-in
history and destination catalog metadata.

The eighth migration creates `safety_alerts`. Alert coverage uses nullable
`geography(MultiPolygon, 4326)` rather than reducing an affected area to one point; manual lookup
also uses the `affected_regions` array. The API query checks active time, optional severity/type,
and either `ST_Covers` for an approved coordinate or region membership. No user coordinate is
written to this table.

Safety indexes correspond to current queries: a B-tree index on the active time window, a GIN index
on affected regions, a severity/type B-tree index for filters, and a GiST index for geographic
coverage. Migration `008_create_safety_alerts.sql` requires the normal cross-member migration
review before shared deployment.

## Festival persistence

Migration `010_create_festivals.sql` adds `festivals` and `festival_cultural_guides`. Stable IDs,
names, locality, region, island group, typical month, and schedule status are promoted to typed,
queryable columns, with indexes on region, typical month, and schedule status. The complete
shared-contract documents are also stored as
JSONB so occurrence events, provenance sources, verification notes, editorial guidance, and all
other canonical fields remain lossless rather than being flattened or fabricated.

Each cultural guide is a separate row keyed by and cascading from its festival. Its JSONB document
retains the six category-specific verification states and source relations, while
`last_reviewed_at` is promoted for review operations. Runtime Zod validation occurs when seeds are
loaded and when database rows are mapped to API responses.

The database seed command imports the existing `festivals.json` and
`festival-cultural-guides.json`; no second festival dataset exists. Upserts preserve IDs and make
repeated seeding deterministic, while stale festival rows are removed. Recurring timing remains a
month and description. Only source data already marked `confirmed` retains exact occurrence dates.
# Notification persistence

Migration `009_create_notification_devices_and_preferences.sql` adds `device_tokens` and
`notification_preferences`. Push tokens are globally unique, indexed by user, and can be marked
inactive without deletion. Registering a token seen for a different signed-in account deliberately
transfers it to the current authenticated account. Preferences default to disabled and are stored
per user. The current schema has no `users` table, so these tables use the repository's existing
`text` user-ID convention without inventing a foreign identity system.

## Festival reminder persistence

Migration `011_create_festival_reminders.sql` adds `festival_reminders`. Each row owns a stable
Festival foreign key, opaque authenticated `text` user ID, supported lead time, exact delivery
timestamp, delivery state, optional sent timestamp, and audit timestamps. There is no users table
on this branch, so the migration follows notification ownership and does not invent a user foreign
key.

A partial unique index permits at most one active reminder per user and Festival. Additional indexes
support authenticated user lists and ordered due-reminder claiming. Dispatch atomically changes due
rows from `active` to `dispatching` with `FOR UPDATE SKIP LOCKED`, then records `sent` only when an
existing eligible device accepts delivery; disabled preferences or no eligible device result in
`skipped`. Migration deployment is manual and must not target shared Supabase without review.
