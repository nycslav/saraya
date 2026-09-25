# Architecture

Saraya is a TypeScript monorepo with an Expo mobile client and an Express API. PostgreSQL/PostGIS stores application and geospatial data; Redis supports caching, rate limiting, and background work.

```text
Expo mobile -> typed API client -> Express modules -> PostgreSQL/PostGIS
                                      |           -> Redis
                                      +-> provider adapters
```

External providers are accessed through backend adapters. Provider secrets and privileged calls must never be bundled into the mobile application.

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
