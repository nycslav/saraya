# Push notification development and manual testing

Saraya uses Expo Push Service through a provider-neutral API boundary. The code supports safety-alert
and festival-reminder payloads only; scheduling and weather polling are intentionally separate work.

## External setup

1. In Firebase, create/use the Android app for `com.teamsaraya.saraya` and enable Cloud Messaging.
2. Configure the FCM V1 service-account credential for the existing EAS project by running
   `npm run credentials:android --workspace=@saraya/mobile`. Do not add the JSON file to Git.
3. Build a new native client with `npm run android:build:development` and install its APK on a
   physical Android device. Adding `expo-notifications` means restarting Metro alone is insufficient.
4. Apply migrations with `npm run db:migrate` and run the API with `npm run dev:api`.
5. Set the mobile API URL to an address the phone can reach, then run Metro with
   `npm run dev:mobile`.

## Manual verification

1. Sign in, open Profile → Notifications, and turn on Safety alerts or Festival reminders.
2. Accept the Android notification permission. Verify `device_tokens` contains an active row and
   `notification_preferences` contains the selected category; do not print the full token in logs.
3. There is deliberately no unauthenticated test-send HTTP route. For a development device only,
   read its token directly from the local `device_tokens` table and use Expo's notification tool at
   `https://expo.dev/notifications`. Send data `{ "type": "safety_alert", "alertId": "<seed-id>" }`
   or `{ "type": "festival_reminder", "festivalId": "sinulog" }`. Do not share or log the token.
   Backend integration tests instead call `NotificationService` with a mock provider.
4. For foreground behavior, keep Saraya open and send a push. A non-sounding banner/list entry should
   appear. Tap an alert payload and verify `/alerts/:id`; tap a festival payload and verify
   `/festivals/:id`.
5. For background behavior, leave Saraya running in the background, send and tap each payload.
6. For cold-start behavior, force-close Saraya, send a push, then tap it. The recovered response is
   validated, routed once, and cleared to prevent duplicate navigation.

Real delivery is not proven until this physical-device flow succeeds. An accepted Expo ticket is not
guaranteed delivery; push-receipt polling remains deferred to a background job.
