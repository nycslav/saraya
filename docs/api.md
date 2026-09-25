# API conventions

The team must agree on these contracts before parallel feature development:

- API version prefix
- success and error envelope formats
- validation-error representation
- authentication and token-refresh behavior
- pagination format
- date/time and coordinate representation
- idempotency rules for check-ins, webhooks, and job processing

Use plural resource names consistently, such as `/check-ins`, `/destinations`, and `/festivals`.

## Planned monetization and quota contract

This contract cannot be implemented until authentication, account persistence, and the itinerary
generation service are available. The eventual API must expose an authenticated quota snapshot and
make itinerary generation the atomic quota boundary. A mobile request must never independently
decrement a server counter.

Required behavior:

- Resolve lifetime Premium from synchronized RevenueCat entitlement state.
- Store Free lifetime usage, the current UTC calendar-month Premium usage, and purchased credits.
- Generate first, then atomically record one consumption only when generation succeeds.
- Consume included quota before purchased credits.
- Enforce a unique RevenueCat/store transaction ID for every top-up credit.
- Treat webhook retries as idempotent and return the same balance across devices.
- Reject generation before calling OpenAI when no eligible credit exists.

The provider-neutral schemas are exported from `@saraya/contracts/monetization`. Exact endpoint
names and response envelopes should be finalized jointly with the authentication and itinerary API.

## Current destination API

The Member 2 Shipathon backend currently exposes the first discovery vertical slice. Successful
responses use the shared runtime schemas from `packages/contracts`; errors use an `error` object
with stable `code` and `message` fields.

### `GET /health`

Returns `{ "status": "ok" }` when the API process is ready.

### `GET /destinations`

Returns destination summaries. The endpoint accepts these optional query parameters:

- `search` matches destination names, provinces, regions, categories, and tags.
- `islandGroup` accepts `Luzon`, `Visayas`, or `Mindanao`.
- `interest` matches a destination tag.

The development dataset contains 100 curated destinations grouped by official Philippine region,
exceeding the product specification's requirement of at least 50 sample destinations.

### `GET /destinations/:id`

Returns complete destination details, including coordinates, highlights, best-for tags, and the
cultural guide. An unknown ID returns `404` with the `DESTINATION_NOT_FOUND` error code.

Invalid query parameters return `400` with the `VALIDATION_ERROR` error code. Unknown routes
return `404` with `ROUTE_NOT_FOUND`.

## Festival API

Festival responses use the shared runtime contracts and preserve the canonical catalog's schedule,
source, editorial, and cultural-guide verification metadata.

### `GET /festivals`

Returns festival summaries ordered alphabetically. Optional `search`, `region`, and `month`
parameters match the existing mobile filters. `search` covers festival names, location, category,
and tags; `month` is an integer from 1 through 12.

### `GET /festivals/upcoming`

Returns the same filtered summary shape ordered cyclically from the server's current month. A
festival's recurring `typicalMonth` drives this ordering; the endpoint does not fabricate a
current-year date from recurring timing.

### `GET /festivals/:id`

Returns a complete festival with its one-to-one cultural guide. Unknown IDs return
`404 FESTIVAL_NOT_FOUND`; malformed non-slug IDs and invalid filters return
`400 VALIDATION_ERROR`.

## Safety alerts and weather API

Safety and weather requests require exactly one location context: a `latitude` and `longitude`
pair, `region`, or `destinationId`. Mixing contexts, omitting one coordinate, or using coordinates
outside their valid ranges returns `400 VALIDATION_ERROR`. Coordinates are used only for the
request and are not persisted.

### `GET /safety-alerts`

Returns `{ location, alerts }` for active persisted alerts plus normalized provider warnings.
Optional `severity` (`green`, `yellow`, or `red`) and `alertType` filters are available. Results are
ordered by severity (red first), then most recently updated, then title. Provider failure does not
discard valid persisted alerts.

### `GET /safety-alerts/:id`

Returns one complete alert, including affected areas, timing, recommendations, alternatives, and
source metadata. Unknown IDs return `404 SAFETY_ALERT_NOT_FOUND`.

### `GET /alerts/:region`

Returns the same `{ location, alerts }` shape for a URL-encoded region. A region with no active
records returns an empty `alerts` array rather than an inferred safe status.

### `GET /weather`

Returns normalized traveler-facing weather for one location context. Open-Meteo responses include
temperature, relative humidity, apparent temperature, precipitation, WMO-derived condition, and
10-metre wind speed/direction. `observedAt` is the model-current timestamp and `fetchedAt` is the
Saraya retrieval time.

`providerStatus` is `fresh`, `stale`, or `unavailable`. Stale data is possible only when an injected
cache contains a sufficiently recent prior response; no-cache provider failure returns explicit
unavailable values and never fabricates clear or safe conditions. `source` supplies truthful
provider attribution: live current conditions are labeled Open-Meteo, while deterministic mock
weather has `source.isDemo = true`. `warningState` remains `unavailable` for Open-Meteo because
weather-model conditions are not official government safety warnings.

## Itinerary API

### `POST /itineraries/generate`

Accepts the shared trip-preference contract: destination, starting point, 1-30 day duration,
budget, interests, pace, and accessibility needs. It returns a validated day-by-day itinerary.
When `AI_PROVIDER=gemini` and `GEMINI_API_KEY` are configured, the API uses Gemini structured
output. Missing credentials or provider failures use the deterministic generator for local
development and reliable demonstrations. The `generationSource` response field is `gemini`,
`openai`, or `deterministic`, allowing clients to identify fallback output without inspecting its
wording. The provider runs only on the backend.

When `GEOAPIFY_API_KEY` is configured, generation first retrieves nearby establishment candidates.
The AI selects candidate IDs rather than inventing business names, and the API resolves each valid
selection into an optional stop `place` object containing its provider ID, verified name, category,
address, and coordinates. Place or AI failures continue through the deterministic fallback.

The mobile client calls this endpoint only after the RevenueCat premium handoff. Server-side
RevenueCat entitlement verification remains Member 3's integration boundary.

### `POST /itineraries`

Validates and saves a generated itinerary. Destination IDs must agree, days must match the requested
duration in sequence, and stop IDs must be unique. It returns the saved itinerary with status `201`.

### `GET /itineraries/:id`

Returns a saved itinerary with its ordered days and stops. Unknown IDs return `404` with the
`ITINERARY_NOT_FOUND` error code.

## Bucket List API

Bucket-list routes currently use the backend-controlled `demo-user` identity until the shared JWT
middleware is available. Clients cannot provide or override the user ID.

### `GET /bucket-list`

Returns the current user's saved destinations, ordered by `high`, `medium`, then `low` priority and
newest first within each priority.

### `POST /bucket-list`

Accepts `destinationId` plus optional `priority`, `personalNotes`, and `status`. Priority defaults to
`medium`, status defaults to `planned`, and notes are limited to 500 characters. Unknown
destinations return `404`; saving the same destination twice returns `409`.

### `PATCH /bucket-list/:id`

Updates one or more of `priority`, `personalNotes`, and `status`. Status values are `planned`,
`visited`, and `skipped`.

### `DELETE /bucket-list/:id`

Deletes the current user's item and returns `204`. Unknown items return `404`.

## Journey and Achievement API

Journey routes use the backend-controlled `demo-user` identity until shared JWT middleware is
available. Check-ins are manual travel records and do not accept or validate device GPS data.

### `POST /check-ins`

Records a selected destination, visit date, journal entry, mood, companions, tags, and optional
photo URL. It returns the check-in and any achievements unlocked by the new travel history.
Future dates return `400`, unknown destinations return `404`, and repeated submissions for the
same destination within five minutes return `409`.

### `GET /check-ins`, `/check-ins/timeline`, `/check-ins/map`, `/check-ins/statistics`

Returns raw history, destination-enriched chronological entries, catalog-coordinate map markers,
and aggregate visit/badge statistics respectively.

### `POST /check-ins/photos`

Accepts one `photo` multipart field. JPEG, PNG, and WebP images up to 5 MB are stored with a
server-generated filename. The storage adapter currently uses local development storage.

### `PATCH /check-ins/:id` and `DELETE /check-ins/:id`

Updates editable journal fields or removes a check-in. Unknown records return `404`.

### `GET /achievements` and `GET /user/achievements`

Returns all badge definitions with progress or only the current user's unlocked badges.

## Local development

Start the API from the repository root:

```text
npm run dev:api
```

The default address is `http://localhost:3000`. Set `API_PORT` to use another port.

To make the Expo application use the API instead of its deterministic fixtures, provide these
public mobile environment variables before starting Expo:

```text
EXPO_PUBLIC_API_BASE_URL=http://<reachable-host>:3000
EXPO_PUBLIC_DATA_MODE=api
```

Use the computer's LAN address instead of `localhost` when testing on a physical phone.
# Notification endpoints

All notification endpoints require authenticated server identity. Request bodies never accept a
user ID. Until the shared JWT middleware populates `res.locals.authenticatedUserId`, these routes
fail closed with `401 AUTHENTICATION_REQUIRED`.

- `POST /notifications/devices` registers or reactivates `{ pushToken, platform }`.
- `DELETE /notifications/devices` deactivates the authenticated user's `{ pushToken }`.
- `GET /notifications/preferences` returns safety-alert and festival-reminder preferences.
- `PATCH /notifications/preferences` updates one or both supported preferences.
