# Architecture

Saraya is a TypeScript monorepo with an Expo mobile client and an Express API. PostgreSQL/PostGIS stores application and geospatial data; Redis supports caching, rate limiting, and background work.

```text
Expo mobile -> typed API client -> Express modules -> PostgreSQL/PostGIS
                                      |           -> Redis
                                      +-> provider adapters
```

External providers are accessed through backend adapters. Provider secrets and privileged calls must never be bundled into the mobile application.

The required MVP is implemented before offline mode, AI itineraries, hidden gems, collaborative trips, expenses, or WebSocket live alerts.

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
       database/seeds/festivals.json
                    |
        FixtureFestivalGateway (demo)
                    |
          Events and Festival Detail UI
```

`database/seeds/festivals.json` is the canonical hackathon dataset. The fixture adapter parses that
file through the shared Zod contract, so the mobile demo has no independent festival-data copy. The
backend is still scaffolding; an `ApiFestivalGateway` is deferred until the shared Express, database,
and typed-client foundations exist.

Production ingestion will replace the fixture boundary, not the screens: researched source records
are normalized, provenance is stored, a human approves schedule changes, PostgreSQL is updated, and
the festival API serves the same contract. Scraped changes must never publish automatically.
