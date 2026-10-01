# Security and privacy

- Keep secrets in untracked environment files or deployment secret stores.
- Keep Gemini, OpenAI, Firebase service-account, RevenueCat webhook, and storage credentials on the API.
- Validate authorization and premium entitlements on the backend.
- Treat precise location, journal photos, and travel plans as sensitive user data.
- Document retention and deletion behavior before collecting production user data.
- Rate-limit authentication, uploads, invitations, and public search endpoints.

## Safety and weather location boundary

- Saraya requests foreground location only after the user presses **Use my current location** in
  the safety feature; application startup and onboarding do not request it.
- The native configuration contains only an in-use permission explanation. It adds no background
  permission, background task, continuous tracking, or hidden coordinate polling.
- A successful request acquires one current coordinate. The client and API use it ephemerally for
  safety/weather lookup and do not create location history.
- Permission denial, disabled location services, and acquisition failure all preserve manual region
  and destination selection.
- Demo alerts and weather carry `isDemo` metadata and prominent synthetic-data wording; they must
  not be treated as official PAGASA bulletins.
- Open-Meteo requests are made only by the backend; no provider endpoint or future commercial API
  key is embedded in the mobile app. Approved coordinates are forwarded for the requested lookup
  but are not written to location history.
- The weather-cache interface uses responsibly rounded coordinate keys and does not cache the
  response's location object. Runtime currently uses a no-op cache until the shared Redis platform
  and its retention policy are available.

# Push notification privacy and security

- Notification permission is optional and requested only after a user enables a category.
- Denial leaves the rest of Saraya functional and does not trigger repeated prompts when the OS no
  longer permits prompting.
- Push tokens are sensitive operational identifiers: they are validated, associated only with the
  authenticated server identity, omitted from public responses, and not logged in normal operation.
- Provider credentials remain in EAS/Firebase and must never use an `EXPO_PUBLIC_` variable.
- Notification data is a closed Zod union. Only safety alert IDs and festival IDs map to known Expo
  Router routes; arbitrary URLs and malformed payloads are ignored.
- Notification preferences are server-authoritative. No background location was introduced.
