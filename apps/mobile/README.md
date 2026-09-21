# Mobile application

This directory hosts the Expo Router application. Its implementation preserves the monorepo layout:

- `app/` contains route and layout files only.
- `src/features/` contains feature-owned UI and behavior.
- `src/core/` contains device and application infrastructure.
- `src/ui/` contains generic design-system components.
- `src/test/` contains shared test setup and helpers.

Do not commit provider secrets to the mobile bundle. All OpenAI and privileged integration calls must go through the API.

## Current mobile integration

The mobile application uses the Saraya API for destination discovery, destination details, itinerary
generation, and itinerary persistence. It follows the existing route, feature, gateway, and shared UI
boundaries while leaving teammate-owned features in their assigned modules.

Set the reachable API URL before starting the mobile application:

```text
EXPO_PUBLIC_API_BASE_URL=http://<reachable-host>:3000
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<google-web-oauth-client-id>
```

The current demo uses RevenueCat for purchase state and a provider-neutral local quota adapter.
Free users can successfully generate 3 itineraries before seeing the paywall; lifetime Premium has
10 included generations per UTC calendar month. Local quota state is not secure account-level
enforcement and must be replaced by the authenticated API adapter when the backend is available.

## RevenueCat and Android delivery

RevenueCat is initialized once by the root layout and accessed through the Premium gateway.
For local and EAS builds, configure `EXPO_PUBLIC_REVENUECAT_API_KEY` and
`EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`. The legacy
`EXPO_PUBLIC_REVENUECAT_TEST_API_KEY` remains accepted for existing local environments, but new
configuration should use the environment-neutral name. Production requires the RevenueCat Android
public SDK key and rejects a Test Store key.

The configured identifiers are `saraya_premium`, `saraya_premium_lifetime`,
`saraya_generations_10`, and offering `default`. See `docs/integrations.md` for package mapping and
quota behavior.

Android delivery profiles, EAS environment setup, APK/AAB commands, signing, and the Google Play
internal-testing checklist are documented in [`docs/android-delivery.md`](../../docs/android-delivery.md).

Email and Google authentication use the real Saraya API endpoints. Google sign-in uses Android
Credential Manager and requires an Android development build; it does not run in Expo Go. The
Google Cloud project must contain an Android OAuth client for the final application ID and signing
certificate. The mobile app sends the returned Google ID token to `POST /auth/google`; the backend
must verify that token before creating a Saraya session.

Expo Go can still be used to review discovery, the signed-out profile, and email-form UI. It reports
Google sign-in as unavailable instead of simulating a successful login.

The application does not fall back to fabricated destination or itinerary data. Premium access uses
the RevenueCat gateway, while generation and persistence use the Saraya API. If either provider is
unavailable, the app reports the failure instead of simulating success.

Commands:

```text
npm run start --workspace=@saraya/mobile
npm run start:dev --workspace=@saraya/mobile
npm run lint --workspace=@saraya/mobile
npm run typecheck --workspace=@saraya/mobile
npm run test --workspace=@saraya/mobile
npm run android:check
npm run android:build:preview
```

Use `start` with Expo Go for ordinary UI review. Use `start:dev` after installing the Android
development build when testing Google sign-in.
