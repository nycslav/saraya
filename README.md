# Saraya

Saraya is a personalized mobile travel companion for discovering and exploring the Philippines.

## Shipaton 2026 Next Gen submission scope

The Next Gen MVP is delivered as a working demo video and a public open-source repository. It
uses RevenueCat Test Store to demonstrate the paywall, lifetime Premium purchase, consumable
generation top-up, cancellation/failure, restore, account switching, and server-authoritative
entitlement/quota flow. A paid Apple or Google developer account, Google Play Billing products,
store test track, production AAB submission, and app-store publication are not MVP requirements.

The submission repository must include reproducible setup instructions and a team-approved
open-source `LICENSE`. Android development or preview builds remain required to demonstrate native
RevenueCat, authentication, notification, calendar, secure-storage, and image-picker behavior.

## Repository layout

- `apps/mobile` — Expo and React Native mobile application
- `apps/api` — Express REST API and background jobs
- `packages/contracts` — shared request, response, and validation contracts
- `packages/api-client` — typed client used by the mobile application
- `packages/eslint-config` — shared lint configuration
- `packages/typescript-config` — shared TypeScript configuration
- `database` — PostGIS migrations, seed data, and database documentation
- `docs` — product, architecture, API, testing, and operational documentation

## Prerequisites

- Node.js LTS and npm
- Docker Desktop or compatible Docker/Compose installation

Use Node.js 20 or newer. The committed `package-lock.json` is the reproducible dependency source;
install it with `npm ci`.

## First-time setup

1. Run `npm ci` from the repository root.
2. Copy `.env.example` to `.env` for a local API, or use the team-hosted API documented in
   [cloud deployment](docs/cloud-deployment.md). Never commit populated environment files.
3. Copy `apps/mobile/.env.example` to `apps/mobile/.env.local` and configure the reachable API URL,
   Google web client ID, and RevenueCat Test Store public key.
4. For a local backend, start the documented PostgreSQL services and run the reviewed migrations
   and seeds. Shared database changes require team coordination.
5. Build/install the Android development client, then start Metro with `npm run dev:mobile`.
   Expo Go does not support Saraya's complete native demo flow.
6. Use short-lived branches created from `develop` and open pull requests back into `develop`.

## Project documents

- [Product specification](docs/product-spec.md)
- [Team ownership](docs/ownership.md)
- [Architecture](docs/architecture.md)
- [Android delivery](docs/android-delivery.md)
- [RevenueCat and other integrations](docs/integrations.md)
- [Testing strategy](docs/testing.md)
- [Demo script](docs/demo-script.md)
- [Contributing](CONTRIBUTING.md)

