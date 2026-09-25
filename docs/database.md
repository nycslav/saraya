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

## Festival normalization direction

The hackathon keeps stable identity and the represented annual occurrence together in the curated
festival seed. A separate `festival-cultural-guides.json` maintains exactly one guide per festival
ID. Its history, customs, payment, pasalubong, dining, and photography/social categories each carry
their own verification status and source references.

When the festival backend is implemented, normalize this into at least:

- `festivals`: stable identity, location, recurring timing, and editorial guidance;
- `festival_occurrences`: festival ID, year, status, confirmed dates, verification timestamp, and
  cancellation/rescheduling notes;
- `festival_sources`: publisher, direct URL, type, purpose, and access date;
- `festival_cultural_guides` and category records keyed to a festival;
- provenance-source records and relations for occurrence and cultural-category claims.

Only a `confirmed` occurrence may persist exact confirmed dates. Estimated or recurring records must
not be converted into calendar timestamps. Migration and indexes remain deferred until the team
selects the database migration tool and the API foundation is ready.
# Notification persistence

Migration `009_create_notification_devices_and_preferences.sql` adds `device_tokens` and
`notification_preferences`. Push tokens are globally unique, indexed by user, and can be marked
inactive without deletion. Registering a token seen for a different signed-in account deliberately
transfers it to the current authenticated account. Preferences default to disabled and are stored
per user. The current schema has no `users` table, so these tables use the repository's existing
`text` user-ID convention without inventing a foreign identity system.
