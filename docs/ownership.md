# Saraya Development Workload and File Ownership

## GitHub Branching Guidelines

The team will use `main` for stable releases and `develop` for integrating completed features. Each member will create a temporary branch from `develop` for their assigned task.

Branch names must describe the work being performed:

- `feature/<feature-name>` for new features
- `fix/<issue-name>` for bug fixes
- `docs/<document-name>` for documentation
- `test/<feature-name>` for test-related work
- `chore/<task-name>` for configuration and maintenance

Examples include `feature/authentication`, `feature/bucket-list`, and `fix/check-in-distance`.

After completing a task, the member must open a pull request into `develop`. At least one other member should review the changes. Once the pull request is approved and merged, the temporary branch should be deleted. Direct pushes to `main` should not be allowed.

## 1. Purpose

This document divides the development of Saraya evenly among three team members based on the product requirements. Each member owns a complete group of features across the mobile application, backend API, database, and tests.

### Selected implementation baseline

The product documentation permits either React Native or Flutter for the mobile application and either Node.js or Django for the backend. To make file ownership implementable instead of purely conceptual, this assignment document selects the following baseline:

- Mobile: React Native with Expo and TypeScript
- Navigation: Expo Router
- Backend: Node.js, Express, and TypeScript
- Database: PostgreSQL with PostGIS
- Notifications: Firebase Cloud Messaging
- Subscriptions: RevenueCat
- Testing: Jest and React Native Testing Library
- Repository: npm workspaces with applications in `apps/` and shared packages in `packages/`

This baseline is now reflected in the initial repository scaffold. Dependency versions and the package lockfile will be established after the team installs and agrees on a supported Node.js LTS release. If the team later selects Flutter or Django, preserve the feature and reviewer assignments but translate the paths as follows:

| Selected baseline path              | Flutter or Django equivalent                                       |
| ----------------------------------- | ------------------------------------------------------------------ |
| React Native `app/**/*.tsx` screens | Flutter `lib/features/**/presentation/` pages and widgets          |
| React Native `src/features/`        | Flutter `lib/features/`                                            |
| Express `src/modules/`              | Django apps under `backend/apps/`                                  |
| Express routes and controllers      | Django URL configurations and views or viewsets                    |
| Express services and repositories   | Django services, managers, and model/query layers                  |
| `tsconfig*.json`                    | Dart analyzer configuration or Django Python tooling configuration |

The remainder of this document uses the selected React Native and Node.js baseline so that every concrete file has an accountable owner.

### Target GitHub Repository Structure

The directories containing `.gitkeep` are intentional module boundaries for work that has not started. Replace each `.gitkeep` when the first implementation file is added.

```
saraya/
├── README.md
├── CONTRIBUTING.md
├── LICENSE                         # Added after the team selects a license
├── .editorconfig
├── .gitignore
├── .env.example
├── .prettierrc
├── eslint.config.js
├── tsconfig.base.json
├── package.json
├── package-lock.json                # Generated after dependency bootstrap
├── docker-compose.yml
├── scripts/
│
├── apps/
│   ├── mobile/
│   │   ├── app/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx
│   │   │   │
│   │   │   ├── (auth)/
│   │   │   │   ├── login.tsx
│   │   │   │   ├── register.tsx
│   │   │   │   ├── forgot-password.tsx
│   │   │   │   └── onboarding.tsx
│   │   │   │
│   │   │   ├── (tabs)/
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── discover.tsx
│   │   │   │   ├── journey.tsx
│   │   │   │   ├── bucket-list.tsx
│   │   │   │   ├── events.tsx
│   │   │   │   └── profile.tsx
│   │   │   │
│   │   │   ├── destinations/
│   │   │   │   └── [id].tsx
│   │   │   ├── check-ins/
│   │   │   │   ├── create.tsx
│   │   │   │   └── [id].tsx
│   │   │   ├── achievements/
│   │   │   │   └── index.tsx
│   │   │   ├── festivals/
│   │   │   │   └── [id].tsx
│   │   │   ├── alerts/
│   │   │   │   ├── index.tsx
│   │   │   │   └── [id].tsx
│   │   │   └── premium/
│   │   │       ├── paywall.tsx
│   │   │       └── itinerary.tsx
│   │   │
│   │   ├── src/
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── profile/
│   │   │   │   ├── discovery/
│   │   │   │   ├── destinations/
│   │   │   │   ├── cultural-guides/
│   │   │   │   ├── bucket-list/
│   │   │   │   ├── check-ins/
│   │   │   │   ├── achievements/
│   │   │   │   ├── statistics/
│   │   │   │   ├── festivals/
│   │   │   │   ├── safety-alerts/
│   │   │   │   ├── notifications/
│   │   │   │   ├── subscriptions/
│   │   │   │   └── itineraries/
│   │   │   ├── core/
│   │   │   ├── ui/
│   │   │   └── test/
│   │   ├── assets/
│   │   │   ├── icons/
│   │   │   ├── images/
│   │   │   └── badges/
│   │   └── README.md
│   │
│   └── api/
│       ├── src/
│       │   ├── server.ts
│       │   ├── app.ts
│       │   ├── platform/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── destinations/
│       │   │   ├── cultural-guides/
│       │   │   ├── bucket-list/
│       │   │   ├── check-ins/
│       │   │   ├── achievements/
│       │   │   ├── statistics/
│       │   │   ├── festivals/
│       │   │   ├── safety-alerts/
│       │   │   ├── notifications/
│       │   │   ├── subscriptions/
│       │   │   └── itineraries/
│       │   ├── integrations/
│       │   │   ├── maps/
│       │   │   ├── pagasa/
│       │   │   ├── notifications/
│       │   │   ├── photo-storage/
│       │   │   ├── revenuecat/
│       │   │   ├── gemini/
│       │   │   └── openai/
│       │   ├── jobs/
│       │   │   ├── poll-weather.job.ts
│       │   │   └── send-reminders.job.ts
│       └── tests/
│
├── packages/
│   ├── contracts/
│   ├── api-client/
│   ├── eslint-config/
│   └── typescript-config/
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   │   ├── users.json
│   │   ├── destinations.json
│   │   ├── cultural-guides.json
│   │   ├── bucket-list-items.json
│   │   ├── check-ins.json
│   │   ├── achievements.json
│   │   ├── festivals.json
│   │   ├── safety-alerts.json
│   │   └── itineraries.json
│   ├── scripts/
│   ├── README.md
│   └── schema.sql
│
├── docs/
│   ├── README.md
│   ├── product-spec.md
│   ├── ownership.md
│   ├── architecture.md
│   ├── api.md
│   ├── database.md
│   ├── testing.md
│   ├── integrations.md
│   ├── security-and-privacy.md
│   └── demo-script.md
│
└── .github/
    ├── workflows/
    │   └── structure-check.yml
    ├── ISSUE_TEMPLATE/
    │   ├── bug-report.yml
    │   ├── feature-request.yml
    │   └── config.yml
    ├── CODEOWNERS
    └── pull_request_template.md
```

## 2. Ownership Rules

1. The **primary owner** implements and maintains the assigned file or folder.
2. The **reviewer** checks the pull request, tests the behavior, and confirms that shared contracts are followed.
3. A member may help another member, but changes must be coordinated with the primary owner.
4. Every feature owner is responsible for its mobile UI, API logic, database changes, validation, and automated tests.
5. Database migrations must be reviewed by another member before merging.
6. Shared files still have one primary owner to prevent conflicting edits.

## 3. Current Shipathon Team Roles

The following roles describe the work delivered by the three feature branches and focus the team on one complete demonstration without removing features from the long-term product plan.

| Member       | Current role                     | Main responsibilities                                                                                                             |
| ------------ | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Member 1** | Mobile Experience                | Navigation, visual design, destination discovery, destination details, the trip-preference form, and the itinerary-results screen |
| **Member 2** | Backend and AI                   | API foundation, destination data, Gemini itinerary generation, itinerary storage, and backend tests                               |
| **Member 3** | Events, RevenueCat, and Delivery | Festival discovery, paywall, purchases, premium access, Android builds, CI, documentation, testing, and demo preparation          |

All three members share responsibility for testing the complete Shipathon demonstration flow:

`Destination discovery -> trip preferences -> RevenueCat paywall -> test purchase -> AI itinerary`

These current Shipathon roles take priority when an assignment below overlaps with them. The detailed feature and file ownership in Sections 4 through 13 and Section 15 remains the long-term plan for building the complete application. The Git workflow in Section 14 applies during both the Shipathon and long-term development.

### 3.1 Continued Product Ownership

The original balanced feature assignment below remains the ownership plan for completing the full Saraya product after the focused Shipathon build.

| Member       | Primary feature area                    | Main responsibilities                                                                                                                                             |
| ------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Member 1** | Accounts, Discovery, and AI Itineraries | Authentication, onboarding, user profile, destinations, preference-based recommendations, search, maps, cultural guides, AI itinerary API, and Gemini integration |
| **Member 2** | Journey and Gamification                | Bucket list, manual check-ins, photo journal, journey timeline, achievements, statistics, and itinerary persistence                                               |
| **Member 3** | Events, Safety, and Platform Services   | Festivals, calendar reminders, user-requested weather and safety location, safety alerts, push notifications, subscriptions, background jobs, CI, and deployment  |

## 4. Root Repository Files

| File or folder       | Primary owner                   | Reviewer     | Responsibility                                                                          |
| -------------------- | ------------------------------- | ------------ | --------------------------------------------------------------------------------------- |
| `README.md`          | Member 3                        | Member 1     | Project overview, installation, commands, environment setup, and demo instructions      |
| `CONTRIBUTING.md`    | Member 3                        | Member 2     | Branching, commits, pull requests, reviews, and coding workflow                         |
| `LICENSE`            | Member 3                        | Member 1     | Project license selected by the team; pending team decision                             |
| `.gitignore`         | Member 3                        | Member 2     | Ignore rules for Node.js, Expo, IDEs, builds, and environment files                     |
| `.env.example`       | Member 3                        | Member 1     | Names of required environment variables without secret values                           |
| `.editorconfig`      | Member 1                        | Member 2     | Cross-editor encoding, indentation, and line-ending rules                               |
| `package.json`       | Member 3                        | Member 1     | Root workspace commands and dependencies                                                |
| `package-lock.json`  | Member 3                        | Member 1     | Generated during dependency bootstrap; changed only with intentional dependency updates |
| `tsconfig.base.json` | Member 1                        | Member 3     | Shared TypeScript compiler settings                                                     |
| `eslint.config.js`   | Member 1                        | Member 2     | Shared linting rules                                                                    |
| `.prettierrc`        | Member 1                        | Member 2     | Shared formatting rules                                                                 |
| `docker-compose.yml` | Member 3                        | Member 2     | Local PostgreSQL, PostGIS, Redis, and API services                                      |
| `apps/`              | Feature owners                  | Cross-review | Executable mobile and backend applications                                              |
| `packages/`          | Assigned by package below       | Cross-review | Code shared between the mobile app and API                                              |
| `database/`          | Assigned by database area below | Cross-review | Schema, migrations, and seed data                                                       |
| `docs/`              | Assigned by document below      | Cross-review | Technical and user-facing project documentation                                         |
| `scripts/`           | Member 3                        | Member 2     | Cross-platform repository and CI helper scripts                                         |
| `.github/`           | Member 3                        | Member 2     | Repository automation, issue templates, and pull-request template                       |

### 4.1 Local development environment

Yes. The team will use `docker-compose.yml` to start the shared local infrastructure so that all members use the same PostgreSQL/PostGIS and Redis versions.

| Local service           | Purpose                                                                                 | Owner    |
| ----------------------- | --------------------------------------------------------------------------------------- | -------- |
| PostgreSQL with PostGIS | Application data and geospatial queries                                                 | Member 2 |
| Redis                   | Caching, sessions where applicable, background-job coordination, and rate-limit storage | Member 3 |
| API container           | Optional consistent backend runtime; may run on the host during rapid development       | Member 3 |

Member 3 owns the Compose file, service health checks, named development volumes, port configuration, and `.env.example` integration. Member 2 owns database initialization, PostGIS enablement, migrations, and seed commands. Member 1 verifies that the mobile API base URL works for emulators and physical devices.

The Compose setup is for local development only. Secrets must remain in an untracked `.env` file, and development database or Redis ports must not be publicly exposed. Redis may be disabled for the earliest MVP build only when the relevant service has a documented in-memory fallback.

## 5. Mobile Application Ownership

### 5.1 Mobile configuration and navigation

| File or folder                       | Primary owner | Reviewer | Responsibility                                                         |
| ------------------------------------ | ------------- | -------- | ---------------------------------------------------------------------- |
| `apps/mobile/package.json`           | Member 1      | Member 3 | Mobile dependencies and scripts                                        |
| `apps/mobile/app.json`               | Member 3      | Member 1 | Expo app metadata, permissions, icons, and native configuration        |
| `apps/mobile/eas.json`               | Member 3      | Member 1 | Expo build and deployment profiles                                     |
| `apps/mobile/tsconfig.json`          | Member 1      | Member 3 | Mobile TypeScript configuration                                        |
| `apps/mobile/babel.config.js`        | Member 1      | Member 3 | Babel and Expo configuration                                           |
| `apps/mobile/app/_layout.tsx`        | Member 1      | Member 3 | Root navigation, providers, authentication guard, and startup behavior |
| `apps/mobile/app/index.tsx`          | Member 1      | Member 2 | Initial redirect based on authentication and onboarding status         |
| `apps/mobile/app/(tabs)/_layout.tsx` | Member 1      | Member 2 | Five-tab navigation shell                                              |
| `apps/mobile/assets/icons/`          | Member 1      | Member 3 | Common interface and navigation icons                                  |
| `apps/mobile/assets/images/`         | Member 1      | Member 2 | Logos, placeholders, and general application images                    |
| `apps/mobile/assets/badges/`         | Member 2      | Member 1 | Achievement badge artwork                                              |

### 5.2 Member 1 mobile modules: Accounts, Discovery, and AI Itineraries

| File or folder                                   | Owner    | Responsibility                                                                                                      |
| ------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `apps/mobile/app/(auth)/login.tsx`               | Member 1 | Email and social login interface                                                                                    |
| `apps/mobile/app/(auth)/register.tsx`            | Member 1 | Account-registration interface                                                                                      |
| `apps/mobile/app/(auth)/forgot-password.tsx`     | Member 1 | Password-reset request interface                                                                                    |
| `apps/mobile/app/(auth)/onboarding.tsx`          | Member 1 | Profile photo, travel style, budget, interests, and regions; location permission is not requested during onboarding |
| `apps/mobile/app/(tabs)/discover.tsx`            | Member 1 | Recommendation feed, search, filters, map mode, and weather widget                                                  |
| `apps/mobile/app/(tabs)/profile.tsx`             | Member 1 | Profile, preferences, trip summary, settings, and logout                                                            |
| `apps/mobile/app/destinations/[id].tsx`          | Member 1 | Destination information, map, cultural guide, and actions                                                           |
| `apps/mobile/src/features/auth/`                 | Member 1 | Authentication forms, hooks, state, API calls, and validation                                                       |
| `apps/mobile/src/features/profile/`              | Member 1 | Profile and preference components, state, and API calls                                                             |
| `apps/mobile/src/features/discovery/`            | Member 1 | Recommendation feed, cards, search, map, filter, and sort logic                                                     |
| `apps/mobile/src/features/destinations/`         | Member 1 | Destination details and location presentation                                                                       |
| `apps/mobile/src/features/cultural-guides/`      | Member 1 | Historical context and etiquette components                                                                         |
| `apps/mobile/app/premium/itinerary.tsx`          | Member 1 | Premium itinerary input, generation status, daily plan, and regeneration interface                                  |
| `apps/mobile/src/features/itineraries/`          | Member 1 | AI itinerary request, response parsing, display, and error handling                                                 |
| `apps/mobile/src/features/discovery/components/` | Member 1 | Destination cards, filters, map markers, and recommendation sections                                                |

### 5.3 Member 2 mobile modules: Journey and Gamification

| File or folder                                   | Owner    | Responsibility                                                                               |
| ------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------- |
| `apps/mobile/app/(tabs)/journey.tsx`             | Member 2 | Journey timeline, visited map, progress, and statistics                                      |
| `apps/mobile/app/(tabs)/bucket-list.tsx`         | Member 2 | Saved destinations with sorting, filtering, notes, and status changes                        |
| `apps/mobile/app/check-ins/create.tsx`           | Member 2 | Manual destination/date selection, photo selection, journal text, mood, companions, and tags |
| `apps/mobile/app/check-ins/[id].tsx`             | Member 2 | Saved journal-entry details                                                                  |
| `apps/mobile/app/achievements/index.tsx`         | Member 2 | Locked and unlocked achievement list                                                         |
| `apps/mobile/src/features/bucket-list/`          | Member 2 | Bucket-list state, components, validation, and API calls                                     |
| `apps/mobile/src/features/journey/`              | Member 2 | Manual check-in, journal, photo, timeline, visited-map, achievement, and statistics logic    |
| `apps/mobile/src/features/achievements/`         | Member 2 | Achievement display, unlock messages, and progress logic                                     |
| `apps/mobile/src/features/statistics/`           | Member 2 | Islands, destinations, check-ins, and achievement summaries                                  |
| `apps/mobile/src/features/check-ins/components/` | Member 2 | Timeline entries, journal cards, visited-map elements, and check-in controls                 |

### 5.4 Member 3 mobile modules: Events, Safety, and Services

| File or folder                                       | Owner    | Responsibility                                                                          |
| ---------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `apps/mobile/app/(tabs)/events.tsx`                  | Member 3 | Festival calendar, regional filters, and upcoming events                                |
| `apps/mobile/app/festivals/[id].tsx`                 | Member 3 | Festival history, schedule, travel information, and survival guide                      |
| `apps/mobile/app/alerts/index.tsx`                   | Member 3 | Active safety-alert list                                                                |
| `apps/mobile/app/alerts/[id].tsx`                    | Member 3 | Alert severity, affected areas, advice, and alternatives                                |
| `apps/mobile/app/premium/paywall.tsx`                | Member 3 | Lifetime Premium, generation top-up, localized pricing, purchase, and restore controls  |
| `apps/mobile/src/features/festivals/`                | Member 3 | Festival calendar, details, filters, and reminders                                      |
| `apps/mobile/src/features/safety-alerts/`            | Member 3 | Weather and safety alert components, state, and API calls                               |
| `apps/mobile/src/features/notifications/`            | Member 3 | Device registration, notification preferences, and deep-link handling                   |
| `apps/mobile/src/features/subscriptions/`            | Member 3 | RevenueCat lifetime entitlement, generation quota boundary, purchase, and paywall logic |
| `apps/mobile/src/features/festivals/components/`     | Member 3 | Festival cards, calendar, filters, and survival-guide sections                          |
| `apps/mobile/src/features/safety-alerts/components/` | Member 3 | Alert cards, severity indicators, maps, and advice panels                               |

### 5.5 Shared mobile infrastructure with accountable owners

| File or folder                                                 | Primary owner | Reviewer          | Responsibility                                                                                                            |
| -------------------------------------------------------------- | ------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `apps/mobile/src/ui/`                                          | Member 1      | Member 2          | Generic buttons, fields, cards, dialogs, loading states, theme tokens, and reusable styles                                |
| `apps/mobile/src/core/api/`                                    | Member 1      | Member 3          | Base URL, transport configuration, JWT attachment, refresh, and API error conversion                                      |
| `apps/mobile/src/core/location/`                               | Member 3      | Member 1          | Foreground location permission and one-time coordinates for weather and safety only; no continuous or background tracking |
| `apps/mobile/src/core/camera/`                                 | Member 2      | Member 3          | Camera and photo-library permissions                                                                                      |
| `apps/mobile/src/core/storage/`                                | Member 2      | Member 1          | Secure token storage and local application storage                                                                        |
| `apps/mobile/src/core/notifications/`                          | Member 3      | Member 1          | Push-token registration and notification interaction                                                                      |
| `apps/mobile/src/core/store/`                                  | Member 1      | Member 2          | Global authentication, user, and application state configuration                                                          |
| `apps/mobile/src/test/`                                        | Member 2      | Member 3          | Shared Jest setup, render helpers, mocks, fixtures, and factories                                                         |
| Feature-local `hooks/`, `schemas/`, `types/`, and `__tests__/` | Feature owner | Assigned reviewer | Logic and tests used by only one feature remain colocated with that feature                                               |

## 6. Backend API Ownership

### 6.1 Backend foundation

| File or folder                                        | Primary owner | Reviewer | Responsibility                                           |
| ----------------------------------------------------- | ------------- | -------- | -------------------------------------------------------- |
| `apps/api/package.json`                               | Member 3      | Member 1 | API dependencies and commands                            |
| `apps/api/tsconfig.json`                              | Member 1      | Member 3 | API TypeScript settings                                  |
| `apps/api/src/server.ts`                              | Member 3      | Member 1 | HTTP and WebSocket server startup and graceful shutdown  |
| `apps/api/src/app.ts`                                 | Member 3      | Member 1 | Express application, middleware, and route registration  |
| `apps/api/src/platform/config/`                       | Member 3      | Member 1 | Validated environment and integration configuration      |
| `apps/api/src/platform/database/`                     | Member 2      | Member 3 | PostgreSQL/PostGIS connection and migration integration  |
| `apps/api/src/platform/cache/`                        | Member 3      | Member 2 | Redis connection, cache primitives, and job coordination |
| `apps/api/src/platform/http/auth.middleware.ts`       | Member 1      | Member 3 | JWT verification and current-user attachment             |
| `apps/api/src/platform/http/error.middleware.ts`      | Member 3      | Member 1 | Central error conversion and response handling           |
| `apps/api/src/platform/http/rate-limit.middleware.ts` | Member 3      | Member 2 | API rate limiting                                        |
| `apps/api/src/platform/http/validate.middleware.ts`   | Member 1      | Member 2 | Shared-contract request validation integration           |
| `apps/api/src/platform/logging/`                      | Member 3      | Member 2 | Structured application and job logging                   |

### 6.2 Member 1 backend modules: Accounts, Discovery, and AI Itineraries

Each backend module should contain `*.route.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.schema.ts`, and `*.test.ts` files as applicable.

| Module or folder                        | Owner    | Responsibility                                                                                               |
| --------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `apps/api/src/modules/auth/`            | Member 1 | Register, login, logout, token refresh, password reset, and password hashing                                 |
| `apps/api/src/modules/users/`           | Member 1 | Profile retrieval, update, preferences, and premium-status response                                          |
| `apps/api/src/modules/destinations/`    | Member 1 | Preference-based recommendations, search, filtering, sorting, and destination details                        |
| `apps/api/src/modules/cultural-guides/` | Member 1 | Historical and cultural content retrieval                                                                    |
| `apps/api/src/modules/itineraries/`     | Member 1 | Validate trip constraints, request AI generation, validate structured output, and expose itinerary endpoints |
| `apps/api/src/integrations/maps/`       | Member 1 | Maps, directions, place information, and geocoding adapter                                                   |
| `apps/api/src/integrations/gemini/`     | Member 1 | Gemini client, prompt construction, structured-output schema, timeouts, fallback, and safe error mapping     |
| `apps/api/tests/auth/`                  | Member 1 | Authentication integration tests                                                                             |
| `apps/api/tests/discovery/`             | Member 1 | Destination, hidden-gem authorization, and cultural-guide integration tests                                  |
| `apps/api/tests/itineraries/`           | Member 1 | Itinerary endpoints and mocked AI-provider-response tests                                                    |

### 6.3 Member 2 backend modules: Journey and Gamification

| Module or folder                           | Owner    | Responsibility                                                                                   |
| ------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------ |
| `apps/api/src/modules/bucket-list/`        | Member 2 | Read, add, update, and delete bucket-list items                                                  |
| `apps/api/src/modules/check-ins/`          | Member 2 | Manual check-in creation, journal history, timeline, catalog-coordinate map data, and statistics |
| `apps/api/src/modules/achievements/`       | Member 2 | Achievement rules, evaluation, unlocking, and user achievements                                  |
| `apps/api/src/modules/statistics/`         | Member 2 | Travel totals, progress, regions, islands, and other user statistics                             |
| `apps/api/src/integrations/photo-storage/` | Member 2 | Journal-photo upload, deletion, validation, and storage adapter                                  |
| `apps/api/tests/journey/`                  | Member 2 | Bucket-list, check-in, achievement, photo, and statistics integration tests                      |

### 6.4 Member 3 backend modules: Events, Safety, and Services

| Module or folder                           | Owner    | Responsibility                                                           |
| ------------------------------------------ | -------- | ------------------------------------------------------------------------ |
| `apps/api/src/modules/festivals/`          | Member 3 | Festival list, filters, details, upcoming events, and calendar reminders |
| `apps/api/src/modules/safety-alerts/`      | Member 3 | Active alerts, regional alerts, weather, and affected-area matching      |
| `apps/api/src/modules/notifications/`      | Member 3 | Device tokens, notification preferences, and message dispatch            |
| `apps/api/src/modules/subscriptions/`      | Member 3 | RevenueCat webhook and premium-entitlement synchronization               |
| `apps/api/src/integrations/pagasa/`        | Member 3 | PAGASA provider or mock-provider adapter and response normalization      |
| `apps/api/src/integrations/notifications/` | Member 3 | Firebase Cloud Messaging adapter                                         |
| `apps/api/src/integrations/revenuecat/`    | Member 3 | RevenueCat webhook verification and customer lookup                      |
| `apps/api/src/jobs/poll-weather.job.ts`    | Member 3 | Scheduled weather and warning retrieval                                  |
| `apps/api/src/jobs/send-reminders.job.ts`  | Member 3 | Festival and safety-notification scheduling                              |
| `apps/api/tests/events/`                   | Member 3 | Festival tests                                                           |
| `apps/api/tests/safety/`                   | Member 3 | Weather, alert, notification, and subscription integration tests         |

### 6.5 Premium authorization contract

Hidden gems must be protected by backend authorization, not merely hidden in the mobile interface.

| Part                                              | Primary owner | Required coordination                                                                                                      |
| ------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `subscriptions` entitlement service or middleware | Member 3      | Exposes one reusable server-side function that determines whether the authenticated user has an active premium entitlement |
| `destinations` query and response shaping         | Member 1      | Calls Member 3's entitlement function before including destinations where `is_hidden_gem = true`                           |
| Hidden-gem endpoint tests                         | Member 1      | Member 3 reviews free, lifetime-Premium, and webhook-update cases                                                          |
| RevenueCat webhook tests                          | Member 3      | Member 1 reviews whether destination visibility changes after entitlement synchronization                                  |

The `destinations` module must depend on a narrow entitlement interface rather than importing RevenueCat-specific code directly. This keeps destination rules testable and prevents the external subscription provider from leaking into discovery logic.

### 6.6 AI itinerary and persistence boundary

| Part                                                    | Primary owner | Required coordination                                                                   |
| ------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------- |
| `POST /itineraries/generate` route and AI orchestration | Member 1      | Confirms premium access, calls the Gemini adapter, and validates the returned JSON      |
| `itineraries` repository and persistence contract       | Member 2      | Provides transactional replacement or versioning of day-by-day itinerary rows           |
| Saved-itinerary ownership and authorization             | Member 2      | Ensures users can read and update only their own saved itineraries                      |
| Gemini credentials and requests                         | Member 1      | Runs only on the backend; the API key must never be bundled into the mobile application |

Member 1 owns itinerary generation behavior, while Member 2 owns user-scoped persistence. Their runtime schema and inferred TypeScript contract must be defined in `packages/contracts/` before implementation.

## 7. Shared Package Ownership

| File or folder                | Primary owner | Reviewer        | Responsibility                                                                                   |
| ----------------------------- | ------------- | --------------- | ------------------------------------------------------------------------------------------------ |
| `packages/contracts/`         | Member 1      | Members 2 and 3 | Runtime validation schemas, inferred request and response types, enums, and pagination contracts |
| `packages/api-client/`        | Member 1      | Member 3        | Typed client functions used by the mobile application                                            |
| `packages/eslint-config/`     | Member 3      | Member 1        | Shared lint configuration package                                                                |
| `packages/typescript-config/` | Member 1      | Member 3        | Shared TypeScript presets for applications and packages                                          |

Feature-specific files inside shared packages remain assigned as follows:

| Shared package file group                                                         | Owner    |
| --------------------------------------------------------------------------------- | -------- |
| Authentication, user, destination, cultural-guide, and AI-itinerary contracts     | Member 1 |
| Bucket-list, check-in, achievement, statistics, and persisted-itinerary contracts | Member 2 |
| Festival, safety-alert, notification, and subscription contracts                  | Member 3 |

Define each runtime schema once in `packages/contracts/` and infer its TypeScript type from that schema where possible. Do not maintain a separate hand-written type for the same payload.

## 8. Database Ownership

### 8.1 Core database files

| File or folder         | Primary owner    | Reviewer         | Responsibility                                                      |
| ---------------------- | ---------------- | ---------------- | ------------------------------------------------------------------- |
| `database/schema.sql`  | Member 2         | Members 1 and 3  | Consolidated schema snapshot after migrations                       |
| `database/README.md`   | Member 2         | Member 3         | Database setup, PostGIS setup, migrations, and seeding instructions |
| `database/migrations/` | Migration author | One other member | Ordered migration files; ownership follows the affected feature     |
| `database/seeds/`      | Assigned below   | One other member | Reproducible demonstration data                                     |

### 8.2 Tables and migrations by member

| Table or database object                           | Owner    |
| -------------------------------------------------- | -------- |
| `users`                                            | Member 1 |
| `refresh_tokens`                                   | Member 1 |
| `destinations`                                     | Member 1 |
| `cultural_guides`                                  | Member 1 |
| Destination coordinates and map indexes            | Member 1 |
| `bucket_list_items`                                | Member 2 |
| `check_ins`                                        | Member 2 |
| `achievements`                                     | Member 2 |
| `user_achievements`                                | Member 2 |
| `itineraries`                                      | Member 2 |
| Itinerary ownership, order, and date indexes       | Member 2 |
| Check-in user, destination, and visit-date indexes | Member 2 |
| `festivals`                                        | Member 3 |
| `festival_reminders`                               | Member 3 |
| `safety_alerts`                                    | Member 3 |
| `device_tokens`                                    | Member 3 |
| `subscriptions`                                    | Member 3 |
| Alert location indexes and affected-area queries   | Member 3 |

### 8.3 Seed files

| File                                    | Owner    | Minimum content                                                         |
| --------------------------------------- | -------- | ----------------------------------------------------------------------- |
| `database/seeds/users.json`             | Member 1 | Free and premium demo accounts                                          |
| `database/seeds/destinations.json`      | Member 1 | At least 50 sample Philippine destinations                              |
| `database/seeds/cultural-guides.json`   | Member 1 | Cultural content for featured destinations                              |
| `database/seeds/bucket-list-items.json` | Member 2 | Sample planned and visited entries                                      |
| `database/seeds/check-ins.json`         | Member 2 | Sample check-ins and journal entries                                    |
| `database/seeds/achievements.json`      | Member 2 | Five to ten achievements with explicit criteria                         |
| `database/seeds/itineraries.json`       | Member 2 | Structured sample day-by-day itinerary linked to a user and destination |
| `database/seeds/festivals.json`         | Member 3 | Major festivals from multiple regions and months                        |
| `database/seeds/safety-alerts.json`     | Member 3 | Clearly labeled demonstration alerts of different severity levels       |

## 9. Documentation Ownership

| File                           | Primary owner | Reviewer        | Responsibility                                                                                            |
| ------------------------------ | ------------- | --------------- | --------------------------------------------------------------------------------------------------------- |
| `docs/product-spec.md`         | Member 1      | Members 2 and 3 | Product scope, roles, screens, workflows, technical requirements, and MVP boundary                        |
| `docs/ownership.md`            | Member 3      | Members 1 and 2 | Repository layout, ownership, review assignments, and development order                                   |
| `docs/architecture.md`         | Member 3      | Member 1        | System components, deployment, integrations, and data flow                                                |
| `docs/api.md`                  | Member 1      | Members 2 and 3 | API conventions and endpoint reference; each member documents their endpoints                             |
| `docs/database.md`             | Member 2      | Members 1 and 3 | Tables, relationships, constraints, indexes, and PostGIS usage                                            |
| `docs/testing.md`              | Member 2      | Member 3        | Test strategy, test accounts, cases, and results                                                          |
| `docs/integrations.md`         | Member 3      | Member 1        | Maps, PAGASA, Firebase, storage, RevenueCat, and Gemini configuration; Member 1 authors the AI subsection |
| `docs/security-and-privacy.md` | Member 3      | Member 1        | Authentication, secrets, permissions, privacy, rate limits, and secure storage                            |
| `docs/demo-script.md`          | Member 1      | Members 2 and 3 | Ordered demo flow with speaking parts for all members                                                     |

## 10. GitHub Configuration Ownership

| File or folder                               | Primary owner | Reviewer        | Responsibility                                                                               |
| -------------------------------------------- | ------------- | --------------- | -------------------------------------------------------------------------------------------- |
| `.github/workflows/structure-check.yml`      | Member 3      | Member 2        | Verify the required initial repository structure before dependency bootstrap                 |
| `.github/workflows/mobile-ci.yml`            | Member 3      | Member 1        | Add after dependency bootstrap to install, lint, type-check, and test the mobile application |
| `.github/workflows/api-ci.yml`               | Member 3      | Member 2        | Add after dependency bootstrap to install, lint, type-check, test, and validate the API      |
| `.github/ISSUE_TEMPLATE/bug-report.yml`      | Member 3      | Member 2        | Structured bug reports                                                                       |
| `.github/ISSUE_TEMPLATE/feature-request.yml` | Member 1      | Member 3        | Structured feature requests                                                                  |
| `.github/ISSUE_TEMPLATE/config.yml`          | Member 3      | Member 2        | Disable unstructured blank issues                                                            |
| `.github/pull_request_template.md`           | Member 2      | Member 3        | Change description, screenshots, tests, migration notes, and checklist                       |
| `.github/CODEOWNERS`                         | Member 3      | Members 1 and 2 | Automatic review requests; placeholder examples must be replaced with real GitHub usernames  |

## 11. Testing and Cross-Review Assignment

| Work being tested                                                                      | Implementer     | Independent tester/reviewer |
| -------------------------------------------------------------------------------------- | --------------- | --------------------------- |
| Authentication, onboarding, profile, and discovery                                     | Member 1        | Member 3                    |
| AI itinerary generation and validated structured output                                | Member 1        | Member 2                    |
| Bucket list, manual check-in, journal, achievements, statistics, and saved itineraries | Member 2        | Member 1                    |
| Festivals, alerts, notifications, subscriptions, and deployment                        | Member 3        | Member 2                    |
| Hidden-gem premium authorization                                                       | Members 1 and 3 | Member 2                    |
| Complete onboarding-to-discovery workflow                                              | Member 1        | Member 2                    |
| Destination-to-bucket-list-to-check-in workflow                                        | Member 2        | Member 3                    |
| Festival reminder and safety-alert workflow                                            | Member 3        | Member 1                    |

## 12. Recommended Development Order

### Phase 1: Joint setup

- Member 1 initializes the mobile project, navigation shell, TypeScript settings, and design system.
- Member 2 initializes PostgreSQL/PostGIS, the migration system, and the initial schema.
- Member 3 initializes the Express API, environment configuration, Docker services, GitHub workflows, and deployment setup.
- All members agree on API response formats, naming rules, and Git workflow before feature development begins.

### Phase 2: Parallel vertical-slice development

Each member completes features in this order:

1. Database migration and seed data
2. Backend repository and service
3. API controller and route
4. Backend tests
5. Shared types and typed API-client functions
6. Mobile screens and components
7. Mobile tests

### Phase 3: Integration

- Member 1 connects authentication to all protected tabs and requests.
- Member 2 connects destination details to bucket-list and check-in actions.
- Member 3 connects user-requested foreground location to weather and safety alerts, with manual region or destination selection as the fallback.
- Members 1 and 3 jointly integrate destination visibility with the server-side premium-entitlement check.
- Members 1 and 2 connect generated itineraries to Member 2's user-owned persisted `itineraries` schema.
- All members resolve contract mismatches and perform cross-feature testing.

### Phase 4: Testing and presentation

- Each member performs the assigned independent tests.
- Feature owners fix failures in their own modules.
- Member 3 creates the release build.
- Member 1 coordinates the demonstration flow.
- Member 2 consolidates testing evidence and results.
- All members present the feature area they implemented.

## 13. Full Product MVP and Stretch-Goal Boundary

This section describes the MVP for the complete Saraya product, not only the focused Shipathon demonstration. During the Shipathon, the current roles and shared demonstration flow in Section 3 take priority. All features below remain part of the continued product plan.

### Required MVP

- Email authentication and onboarding — Member 1
- Destination discovery and search — Member 1
- Destination and cultural-guide details — Member 1
- Bucket-list CRUD — Member 2
- Manual check-in and travel journal — Member 2
- Achievements and statistics — Member 2
- Festival list and details — Member 3
- Weather and location-based safety alerts — Member 3
- Basic push-notification handling — Member 3
- RevenueCat sandbox entitlement and paywall — Member 3

### Stretch goals after MVP completion

| Stretch feature                                 | Owner    | Supporting member |
| ----------------------------------------------- | -------- | ----------------- |
| Offline destination guides and saved lists      | Member 1 | Member 3          |
| Offline journal queue and later synchronization | Member 2 | Member 1          |
| AI itinerary generator                          | Member 1 | Member 2          |
| Hidden-gem premium access                       | Member 1 | Member 3          |
| Offline maps                                    | Member 3 | Member 1          |
| WebSocket live alerts                           | Member 3 | Member 2          |

Stretch features must not delay the required MVP.

## 14. Git Workflow

- Use `main` for tested releases and `develop` for integrated work.
- Create short-lived branches such as `feature/auth-login`, `feature/check-in`, or `feature/safety-alerts`.
- Do not create permanent branches named after team members.
- Open pull requests into `develop`.
- Require at least one review from the assigned reviewer.
- Include tests, screenshots, and database migration notes when applicable.
- Merge `develop` into `main` only after the primary user workflows pass.
- Do not rewrite a migration that another member has already used; create a new migration instead.

## 15. Final Workload Check

| Member   | Mobile scope                                  | Backend scope                                                       | Database scope                                                | Additional ownership                                                      |
| -------- | --------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Member 1 | Accounts, discovery, and AI-itinerary screens | 5 feature modules plus maps and Gemini                              | 4 core tables plus destination geospatial work                | Navigation, design system, shared types, API documentation, demo flow     |
| Member 2 | Journey and gamification screens              | Bucket list, check-ins, achievements, statistics, and photo storage | Bucket-list, check-in, achievement, and itinerary persistence | Validation, database documentation, testing plan, test evidence           |
| Member 3 | 5 major screens and events/safety modules     | 4 feature modules, 3 integrations, and 2 jobs                       | 5 core tables plus alert geospatial work                      | Deployment, CI, environment configuration, README, security documentation |

The counts are not identical because task difficulty differs. Member 3 has fewer ordinary content screens but owns more external integrations, premium entitlement infrastructure, and deployment work. Member 2 owns the most stateful workflows and their normalized persistence. Member 1 owns authentication, the broadest browsing workflow, and the Gemini integration. This keeps the expected development effort approximately balanced.
