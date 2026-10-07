# Saraya product specification

Saraya is a polished mobile travel companion for discovering Philippine destinations, planning
meaningful trips, recording travel memories, learning about festivals and culture, and checking
local safety conditions. The product brings discovery, cultural context, trip planning,
gamification, and traveler protection into one focused experience.

## Product surface

The Expo Router client has five primary tabs:

- **Discover** — browse the seeded destination catalog by Luzon, Visayas, or Mindanao, with search,
  interest, and island-group filtering. Destination details show highlights, tags, coordinates,
  and a cultural guide.
- **Journey** — view recorded visits, statistics, and achievement progress. A check-in records a
  selected destination, visit date, mood, journal text, companions, tags, and an optional photo.
- **Bucket** — save destinations, edit priority/notes/status, mark places visited, and open or
  remove saved generated trip plans. Statuses are `planned`, `visited`, or `skipped`; priorities
  are `low`, `medium`, or `high`.
- **Events** — browse Philippine festivals in list or calendar-style month views, with search,
  region, and month filters. Details include schedule status, typical-day flow, history, six
  cultural-guide categories, travel advice, survival guidance, and source links.
- **Profile** — view Journey/Bucket/badge counts, edit display name and profile photo, manage
  notification preferences, open Premium, manage privacy/account actions, and log out.

Additional routes provide safety alerts, destination conditions, itinerary planning and saved
itineraries, notification preferences, achievements, check-in creation, and account management.

## Authentication and account behavior

The implemented mobile sign-in flow is Google sign-in through Android Credential Manager and the
Saraya API. The API verifies the Google ID token, issues access and refresh tokens, and restores a
session from secure storage. Cross-device Journey and Bucket persistence is gated behind sign-in.

Authenticated users can update their profile, upload a profile photo, manage notification
preferences, reauthenticate before exporting or deleting account data, and log out. Sign-in keeps
Journey and Bucket data connected across devices.

## Discovery and destination data

Destinations are served through the typed API client in API mode, with deterministic fixture data
available for development and tests. The development seed contains 100 curated destinations.
Records include region/island group, category, tags, coordinates, highlights, rating, and a
cultural guide. The visual island-group navigator and destination cards turn the catalog into an
approachable starting point for trip planning.

## Journey and achievements

Check-ins are explicit manual records. Foreground location is not silently collected and is not
used to verify a visit. JPEG, PNG, and WebP photos up to 5 MB are supported. The backend returns
newly unlocked achievements after a successful check-in; progress is derived from check-in history
and destination metadata.

## Festivals, culture, and reminders

Festival content is normalized into a canonical catalog and joined to one cultural guide per
festival. Guide categories are history/significance, customs/traditions, payment/tipping,
pasalubong, dining/kamayan etiquette, and photography/social interaction. Schedule status,
occurrences, verification metadata, and source links are retained. Recurring timing is shown as
typical timing; an exact date is not invented for an unconfirmed occurrence.

Confirmed future occurrences can be written to the device calendar through Expo Calendar after an
explicit permission request. Authenticated server reminders support a one- or seven-day lead time
and are delivered through the notification service when the reminder job is running.

## Safety, weather, and location privacy

The Safety Alerts screen lets users choose a region or destination, or explicitly request current
foreground location. GPS permission is requested only after that action; manual selection remains
available after denial or failure.

The API provides persisted safety alerts with green/yellow/red severity, affected areas, timing,
recommendations, alternatives, and source metadata. It provides normalized Open-Meteo weather with
temperature, apparent temperature, humidity, precipitation, condition, and wind, plus destination
conditions and warning-provider status. Configured scheduled jobs ingest authoritative PAGASA CAP
warnings. Users can follow destinations for safety notifications and receive timely updates.

## Itinerary planning and Premium

The planner accepts a destination, starting point, 1–30 day duration, budget (`Budget`, `Comfort`,
or `Premium`), interests, travel pace, and accessibility needs. It returns a validated day-by-day
plan with typed transport, activity, meal, or stay stops. Plans can be saved and reopened from
Bucket.

Generation runs on the API. The backend use Gemini, optionally enrich plans with
verified Geoapify place candidates, and falls back to deterministic generation when credentials are
absent or a provider fails. Responses identify `gemini` or `deterministic` generation.

RevenueCat provides the current Premium flow:

- Free accounts receive three successful generations over the account lifetime.
- Lifetime Premium is the non-consumable `saraya_premium_lifetime` product and `saraya_premium`
  entitlement, with ten included generations per UTC calendar month.
- `saraya_generations_10` is a consumable pack adding ten generations without granting Premium.

The server owns entitlements and quota. Successful generation is the consumption boundary; failed
or cancelled requests release their reservation. The current demonstration uses RevenueCat Test
Store, allowing judges to experience the full Premium and generation-pack purchase journey in a
controlled environment.

## Technical boundaries

The npm-workspace monorepo is divided into `apps/mobile` (Expo client), `apps/api` (Express API,
services, adapters, and jobs), `packages/contracts` (shared Zod schemas), `packages/api-client`
(typed HTTP gateways), and `database` (PostgreSQL/PostGIS schema, migrations, and seeds).

PostgreSQL is the durable store and Redis is optional scheduling infrastructure. Provider secrets
and privileged AI, RevenueCat, warning, weather, places, and photo-storage calls remain on the API.

## Implemented API areas

The API exposes health, Google authentication/session management, account export/deletion,
destinations, bucket list, check-ins/photos, achievements, festivals/reminders, safety alerts,
weather and destination conditions, safety subscriptions, itinerary generation/save/read/delete,
notifications/devices/preferences, and RevenueCat synchronization/webhooks. See [`api.md`](api.md).

## Related documentation

- [`architecture.md`](architecture.md) — runtime boundaries and data flow
- [`api.md`](api.md) — HTTP routes and provider behavior
- [`database.md`](database.md) — tables, migrations, and persistence
- [`integrations.md`](integrations.md) — external services and configuration
- [`testing.md`](testing.md) — automated coverage and delivery checks
- [`android-delivery.md`](android-delivery.md) — Android/EAS delivery
