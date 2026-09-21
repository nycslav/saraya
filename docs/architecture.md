# Architecture

Saraya is a TypeScript monorepo with an Expo mobile client and an Express API. PostgreSQL/PostGIS stores application and geospatial data; Redis supports caching, rate limiting, and background work.

```text
Expo mobile -> typed API client -> Express modules -> PostgreSQL/PostGIS
                                      |           -> Redis
                                      +-> provider adapters
```

External providers are accessed through backend adapters. Provider secrets and privileged calls must never be bundled into the mobile application.

The required MVP is implemented before offline mode, AI itineraries, hidden gems, or WebSocket live alerts.

