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

Email and Google authentication use the real Saraya API endpoints. Google sign-in uses Android
Credential Manager and requires an Android development build; it does not run in Expo Go. The
Google Cloud project must contain an Android OAuth client for the final application ID and signing
certificate. The mobile app sends the returned Google ID token to `POST /auth/google`; the backend
must verify that token before creating a Saraya session.

Expo Go can still be used to review discovery, the signed-out profile, and email-form UI. It reports
Google sign-in as unavailable instead of simulating a successful login.

The application does not fall back to fabricated destination or itinerary data. Until the teammate-owned
RevenueCat integration is configured, premium itinerary access reports that the service is unavailable
instead of simulating a successful purchase.

Commands:

```text
npm run start --workspace=@saraya/mobile
npm run start:dev --workspace=@saraya/mobile
npm run lint --workspace=@saraya/mobile
npm run typecheck --workspace=@saraya/mobile
npm run test --workspace=@saraya/mobile
```

Use `start` with Expo Go for ordinary UI review. Use `start:dev` after installing the Android
development build when testing Google sign-in.

