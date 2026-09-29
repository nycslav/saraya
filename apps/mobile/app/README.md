# Routes

Expo Router route files live here. Route files should import screens from `src/features` and contain as little feature logic as possible.

Route groups:

- `(auth)` — Google login; legacy registration and onboarding URLs redirect to the active flow
- `(tabs)` — discover, journey, bucket list, events, profile
- `destinations`, `check-ins`, `achievements`, `festivals`, `alerts`
- `premium` — paywall and itineraries
