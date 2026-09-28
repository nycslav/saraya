# Architecture

Saraya is a TypeScript monorepo with an Expo mobile client and an Express API. PostgreSQL/PostGIS stores application and geospatial data; Redis supports caching, rate limiting, and background work.

```text
Expo mobile -> typed API client -> Express modules -> PostgreSQL/PostGIS
                                       |           -> Redis (optional)
                                       +-> provider adapters
                                       |
                          background jobs -> feature services
```

External providers are accessed through backend adapters. Provider secrets and privileged calls must never be bundled into the mobile application.

Background jobs (festival reminders, weather polling) are thin entry points in `src/jobs/` that delegate to existing feature services. A provider-neutral `JobScheduler` abstraction decouples job registration from the coordination backend: `NoopJobScheduler` runs in-process; `RedisJobScheduler` delegates to a Redis worker when `SCHEDULER_BACKEND=redis` is configured. Redis is an optional infrastructure dependency — when unavailable, the noop scheduler keeps jobs running in-process.

The required MVP is implemented before offline mode, AI itineraries, hidden gems, or WebSocket live alerts.

## Festival data flow

Festival facts are curated outside the presentation layer. The mobile app never scrapes or fetches
government websites directly.

```text
TPB / DOT / NCCA + LGU / official organizer
                    +
            Saraya editorial guidance
                    |
          human review and normalization
                    |
 canonical festival + cultural-guide JSON
           /                         \
 FixtureFestivalGateway       validated seed import
           |                         |
           |                    PostgreSQL
           |                         |
           |               repository -> service
           |                         |
           |                    Saraya API
           |                         |
           |                typed API client
           |                         |
           +------ FestivalGateway --+
                         |
             Events and Festival Detail UI
```

`database/seeds/festivals.json` owns stable festival and occurrence data.
`database/seeds/festival-cultural-guides.json` owns one cultural guide per festival ID, with six
independently classified categories and category-level source references. The fixture adapter parses
and joins both files through shared Zod contracts, so the mobile demo has no independent data copy.
The API adapter uses the typed API client to reach the Express festival module and PostgreSQL while
the fixture adapter remains available for deterministic tests and demos. `EXPO_PUBLIC_DATA_MODE`
selects the adapter without changing either festival screen.

Future production ingestion replaces the seed-import boundary, not the screens or shared response
contract. Researched changes still require human approval; scraped changes must never publish
automatically.

Festival planning has two separate provider-neutral paths. Authenticated Saraya reminders persist
server-side and dispatch through the existing notification service. Device calendar events stay on
the device through the Expo Calendar adapter. Neither path invents dates from recurring timing.

```text
Festival Detail -> FestivalReminderGateway -> typed client -> authenticated API
               -> CalendarGateway -> Expo Calendar -> device calendar
```
