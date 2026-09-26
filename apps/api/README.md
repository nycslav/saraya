# API application

This directory contains the Express API and background jobs.

- `src/modules` contains business capabilities.
- `src/integrations` contains external provider adapters.
- `src/platform` contains database, cache, HTTP, logging, and configuration infrastructure.
- `src/jobs` contains schedulable job entry points.
- `tests` contains cross-module and end-to-end tests.

Each module should expose a narrow public interface and normally use route, controller, service, repository, schema, policy, and test files.

## Commands

Run these commands from the repository root:

```text
npm run dev:api
npm run test --workspace=@saraya/api
npm run typecheck --workspace=@saraya/api
npm run lint --workspace=@saraya/api
npm run build --workspace=@saraya/api
```

When `DATABASE_URL` is configured outside tests, the destination module reads from PostgreSQL.
Without database configuration, it falls back to the validated
records in `database/seeds/destinations.json` so API development can continue independently.

Initialize a configured database with `npm run db:migrate`, then load the catalog with
`npm run db:seed`.

Google authentication requires `GOOGLE_WEB_CLIENT_ID`, `JWT_ACCESS_SECRET`, and
`JWT_REFRESH_SECRET` in the API environment. Both JWT secrets must contain at least 32 characters.
The Google client ID is the same web OAuth client ID used by the mobile application, but the API
must receive it through its own deployment environment. `POST /auth/google` only signs in an
existing `users` row whose email matches Google's verified email; it never creates an account.
Raw Google ID tokens and Saraya refresh tokens must not be logged or stored in configuration files.

The itinerary module uses the official Google Gen AI SDK when `AI_PROVIDER=gemini` and
`GEMINI_API_KEY` is present. Set `GEMINI_MODEL` to override the default `gemini-3.6-flash`.
The OpenAI adapter remains available with `AI_PROVIDER=openai`. Missing credentials, provider
errors, or `ITINERARY_GENERATOR=deterministic` use the zero-network fallback. Every implementation
returns the same shared validated contract.

