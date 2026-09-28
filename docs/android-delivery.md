# Android delivery

Saraya has three EAS Build profiles. Development and preview produce installable APKs; production
produces an Android App Bundle (AAB) for Google Play. Production submission is deliberately limited
to the internal-testing track with draft release status.

## One-time setup

From the repository root, install dependencies and authenticate the Expo account that owns EAS
project `0bf3f413-d9a9-4f61-962c-b6621a51e5eb`:

```powershell
npm.cmd install
npx.cmd eas-cli@24.7.0 login
npx.cmd eas-cli@24.7.0 whoami
```

Configure the Android signing credential when making the first build. EAS can generate and securely
store the keystore:

```powershell
npm.cmd run credentials:android --workspace=@saraya/mobile
```

Do not commit a keystore, Google service-account JSON file, `.env.local`, or credentials downloaded
from Expo or Google.

## EAS environments

Each build profile reads the EAS environment with the same name: `development`, `preview`, or
`production`. Configure these client-visible variables in the Expo dashboard or with `eas env:set`:

| Variable                                     | Development               | Preview                   | Production                          |
| -------------------------------------------- | ------------------------- | ------------------------- | ----------------------------------- |
| `EXPO_PUBLIC_APP_ENV`                        | `development`             | `preview`                 | `production`                        |
| `EXPO_PUBLIC_DATA_MODE`                      | `mock` or `api`           | `mock` or `api`           | `api`                               |
| `EXPO_PUBLIC_API_BASE_URL`                   | Reachable development API | Staging/demo API          | Production HTTPS API                |
| `EXPO_PUBLIC_REVENUECAT_API_KEY`             | RevenueCat Test Store key | RevenueCat Test Store key | Android public SDK key (`goog_...`) |
| `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`      | `saraya_premium`          | `saraya_premium`          | `saraya_premium`                    |
| `EXPO_PUBLIC_REVENUECAT_OFFERING_ID`         | `default`                 | `default`                 | `default`                           |
| `EXPO_PUBLIC_REVENUECAT_LIFETIME_PACKAGE_ID` | Lifetime package ID       | Lifetime package ID       | Matching Play package ID            |
| `EXPO_PUBLIC_REVENUECAT_TOP_UP_PACKAGE_ID`   | Top-up package ID         | Top-up package ID         | Matching Play package ID            |

Example for a non-secret, client-visible value:

```powershell
npx.cmd eas-cli@24.7.0 env:set --environment preview --name EXPO_PUBLIC_APP_ENV --value preview --visibility plaintext
npx.cmd eas-cli@24.7.0 env:list --environment preview
```

`EXPO_PUBLIC_` values are embedded in the application. They are not suitable for webhook secrets,
Google service-account keys, OpenAI keys, or other privileged credentials. A production build also
refuses to initialize RevenueCat if its embedded key begins with `test_`.

## Validate and build

Run the local quality and delivery checks:

```powershell
npm.cmd run lint --workspace=@saraya/mobile
npm.cmd run typecheck --workspace=@saraya/mobile
npm.cmd run test --workspace=@saraya/mobile
npm.cmd run android:check
```

Choose the artifact that matches the purpose:

```powershell
# APK with Expo developer tools; requires Metro while the app runs
npm.cmd run android:build:development

# Standalone APK for teammates and demonstration devices
npm.cmd run android:build:preview

# Signed AAB for Google Play
npm.cmd run android:build:production
```

Install the downloaded development or preview APK on a device. A development build connects to
Metro with `npm.cmd run dev:mobile:client`; a preview build contains its JavaScript bundle and does
not require Metro.

Create and reinstall a new development APK after adding or changing a native dependency or Expo
config plugin. Metro updates JavaScript only; it cannot add modules such as `ExpoSecureStore` or
`ExponentImagePicker` to a previously built APK. The Expo Router "missing default export" warnings
that follow one of these native-module errors are cascading import failures, not missing route
exports.

Festival calendar integration adds `expo-calendar` and its config plugin. Existing installed Saraya
development APKs do not contain that native module; create and reinstall a new development build
before testing **Add to calendar**. Do not request calendar permission during startup—the permission
prompt should appear only after that explicit action.

Before sharing a preview APK, exercise lifetime and consumable purchase success, cancellation,
failure, lifetime restore, application restart, quota exhaustion, UTC month rollover, and duplicate
top-up handling. Confirm lifetime entitlement state and both product transactions in RevenueCat.

## Google Play internal testing

1. Create the application in Google Play Console with package name `com.teamsaraya.saraya`.
2. Complete the store listing, app-content declarations, privacy policy, data-safety form, content
   rating, target audience, and country availability.
3. Create the lifetime non-consumable and 10-generation consumable in Google Play, then connect
   them to the RevenueCat Android app and `default` offering. Only lifetime Premium grants the
   `saraya_premium` entitlement.
4. Create a Google service account for Play submissions and upload its JSON key through EAS
   credentials. Never add that file to this repository.
5. Produce the production AAB and submit it:

```powershell
npm.cmd run android:build:production
npm.cmd run android:submit:production
```

The configured submit profile uploads to internal testing as a draft. Review the release in Play
Console, add testers, and explicitly roll it out there. Test billing with a licensed tester account
and an installation obtained through Google Play; a directly installed APK does not validate the
real Google Play purchase path.

## Release checklist

- Mobile lint, type-check, and tests pass.
- `npm.cmd run android:check` passes.
- Production uses an HTTPS API endpoint and the RevenueCat Android public SDK key.
- The RevenueCat entitlement identifier and Google Play product mappings are exact.
- The package name remains `com.teamsaraya.saraya`; changing it creates a different Play app.
- EAS owns a recoverable Android keystore and production version codes auto-increment.
- The AAB is tested on the Google Play internal track before any wider rollout.
- Lifetime purchase/restore, consumable top-up, cancellation, quota rollover, offline recovery, and itinerary continuation pass.
- The Play data-safety answers and privacy policy match the SDKs and data actually shipped.
