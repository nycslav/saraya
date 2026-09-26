# Integrations

Provider configuration and local/mock behavior must be documented for:

- Maps and geocoding
- Weather conditions and safety warnings
- Firebase Cloud Messaging
- Photo storage
- RevenueCat lifetime/consumable purchases and webhooks
- Google Gemini itinerary generation, with OpenAI and deterministic fallbacks
- Geoapify nearby-place discovery for grounded itinerary stops

Every provider should have an adapter interface so feature tests can use deterministic fakes.

## Weather and warning boundaries

Current weather and safety warnings are deliberately separate:

- `WeatherProvider` supplies normalized Saraya weather data. `OpenMeteoWeatherProvider` is the
  normal development/runtime adapter; `MockWeatherProvider` remains available for deterministic
  tests and demos.
- `WarningProvider` supplies safety warnings. The MVP retains `MockWarningProvider` because no
  stable supported machine-readable PAGASA warning API has been identified.
- Future authoritative government-warning ingestion must be implemented as another warning
  adapter. Open-Meteo conditions must never be treated as official PAGASA warnings.

Set `WEATHER_PROVIDER=open_meteo` or `WEATHER_PROVIDER=mock`. Outside tests the default is
`open_meteo`; Jest defaults to `mock` so automated tests make no network calls. Unsupported values
fail configuration validation. `OPEN_METEO_BASE_URL` defaults to
`https://api.open-meteo.com/v1`; the adapter requests `/forecast` using the documented `current=`
variables for temperature, relative humidity, apparent temperature, precipitation, weather code,
and 10-metre wind speed/direction. It requests Celsius, millimetres, km/h, and UTC explicitly.

Open-Meteo's `current.time` is exposed as `observedAt` for API compatibility, but it represents the
time of model-derived current conditions rather than a physical PAGASA station observation.
`fetchedAt` records when Saraya retrieved it. Runtime data carries `source.name = "Open-Meteo"`, a
source URL, and `isDemo = false`. WMO codes are mapped only to weather conditions; none maps to a
typhoon or official-warning state.

The free Open-Meteo endpoint is for non-commercial use and evaluation, requires attribution, and is
currently limited to 600 calls per minute, 5,000 per hour, 10,000 per day, and 300,000 per month.
Because Saraya contains paid Premium functionality, a commercial deployment must use an appropriate
commercial Open-Meteo plan/customer endpoint or another properly licensed provider. Open-Meteo's
published [terms](https://open-meteo.com/en/terms) and
[pricing/licensing guidance](https://open-meteo.com/en/pricing) must be reviewed before production.
The provider accepts an optional backend-only API key for a future customer endpoint; no provider
key is exposed through `EXPO_PUBLIC_*` configuration.

An injectable weather-cache boundary rounds coordinate keys to two decimal places and omits the
request location from cached values. Freshness is 30 minutes; a cache entry up to two hours old can
be returned as `stale` after provider failure. The repository currently has no operational shared
Redis cache, so runtime composition uses a no-op implementation. Redis integration remains deferred
platform work rather than introducing a competing cache system.

There is no job-runner abstraction in the current API, so background polling remains deferred.
Persisted and mock safety warnings continue to work independently of weather-provider availability.
Weather API/client support remains ready for Member 1's Discover integration.

For mobile, `EXPO_PUBLIC_DATA_MODE=fixture` uses the clearly labeled offline dataset and
`EXPO_PUBLIC_DATA_MODE=api` uses the Saraya API. This choice is explicit; there is no silent
API-to-fixture fallback.

The mobile app uses Expo's supported `expo-location` package for a one-time foreground lookup.
Because this adds a native module and app permission text, rebuild and reinstall the development
client before testing it; restarting Metro alone does not update an already-installed native app.

## Festival research and provenance

Festival research follows this source order:

1. Tourism Promotions Board, Department of Tourism, and NCCA for stable identity, cultural context,
   history, location, and recurring timing.
2. Official LGU or festival-organizer announcements for current-year schedules, changes, and
   cancellations.
3. Official regional tourism or other official government information sources when the organizer
   does not publish enough detail.
4. Reputable secondary references only as supporting fallback evidence; they cannot independently
   upgrade an occurrence to `confirmed`.

Each source stores its publisher, title, direct URL, source type, purpose, and access date. Search
result and redirect URLs are invalid. Annual status is one of `recurring`, `confirmed`, `estimated`,
`cancelled`, or `unknown`, and `lastVerifiedAt` records the review time. A recurring rule such as
“third Sunday of January” is not a confirmed date.

Travel advice, survival guidance, and accommodation and dining warnings are stored under a
`Saraya-curated` attribution. They are editorial planning guidance and are never attributed to a
government or organizer source.

### Cultural-guide verification

The canonical `festival-cultural-guides.json` file contains one record for every canonical festival
ID. Each guide separates history, customs, payment, pasalubong, dining, and photography/social
content. Each category is classified as `verified`, `partially-verified`, `general-guidance`, or
`insufficient-evidence`; a source may support only the categories named in its `supports` list.

Cultural research prioritizes DOT, TPB, NCCA, NHCP, official LGUs and organizers, and official
cultural institutions. Academic or reputable secondary material is used only where stronger sources
are unavailable. Researchers must inspect the direct page, record its access date, paraphrase rather
than copy, and remove unsupported absolutes, percentages, origin stories, restrictions, and opaque
citation markers. Festival existence alone is not evidence for a cultural claim.

Generic payment, dining, and respectful-photography recommendations are labeled as Saraya traveler
guidance and carry no external source IDs. Categories without adequate evidence remain visible as
`insufficient-evidence`; they are never filled with generated claims. Their reader-facing copy names
the festival, explains what has not yet been verified, and suggests a safe next step such as checking
the organizer or local tourism office. Run `npm run culture:audit`
after editing either canonical dataset, or `npm run culture:audit:full` for the per-festival research
inventory. Re-review sources periodically, when a source disappears, and before strengthening any
category's verification status.

The September 22 research pass added direct government support for MassKara, Higantes, Kaamulan,
Lanzones, Kadaugan sa Mactan, Sandugo, Zamboanga Hermosa, Paraw Regatta, the International Bamboo
Organ Festival, Pulilan Carabao Festival, Pista’y Dayat, and Ibalong. Copy derived from these sources
is written for visitors and keeps event-specific cautions separate from general Saraya guidance. A
second pass added Parada ng Lechon, Magayon, Naliyagan, and Tinagba from DOT, TPB, and Iriga City
sources.

For the hackathon, updates are manual and reviewed. A production process should verify general facts
periodically, review next-year schedules in Q4, recheck near major dates, and accept urgent
cancellation/rescheduling updates. External ingestion may assist research, but a person must validate
changes before publication.

### September 2026 TPB catalog expansion

All twelve TPB month filters were reviewed as one candidate inventory. Of 177 baseline entries, 149
were accepted, 18 were rejected, and 10 were deferred. Rejections were principally nationwide
observances rather than distinct festivals, duplicate names for the same festival, event/trade-show
listings, or a conflicting locality. Deferrals covered missing or garbled venues, an ambiguous
generic festival identity, stale cancellation-only information, or insufficient evidence to resolve
a sensitive/outdated catalog description responsibly.

Together with the already sourced Pahiyas and Pintados-Kasadyaan records not present in the extracted
TPB baseline, the canonical seed now contains 151 festivals across all 12 typical months and all 18
current Philippine regions. TPB-heavy coverage reflects the source catalog rather than an attempt to
equalize regions. Newly accepted records remain `recurring`: TPB establishes their catalog identity
and general timing, but no exact 2026 occurrence is inferred. The original eight officially verified
2026 occurrences retain `confirmed` status, and Sandugo retains `estimated` status.

The expansion intentionally uses concise, conservative detail text and Saraya-attributed generic
planning guidance. Richer cultural copy and current organizer programs are future manual enrichment
work, not facts inferred from a catalog listing.

## RevenueCat monetization

The mobile application owns a custom Saraya paywall behind the provider-neutral `PremiumGateway`.
RevenueCat types remain inside the RevenueCat adapter. The application displays localized prices
from RevenueCat and never embeds a price as the store source of truth.

### Existing Test Store configuration

| Purpose             | Identifier                | RevenueCat setup                             |
| ------------------- | ------------------------- | -------------------------------------------- |
| Premium entitlement | `saraya_premium`          | Granted only by the lifetime product         |
| Lifetime product    | `saraya_premium_lifetime` | Non-consumable, attached to `saraya_premium` |
| Generation pack     | `saraya_generations_10`   | Consumable, not attached to an entitlement   |
| Offering            | `default`                 | Current offering containing both packages    |
| Lifetime package    | `saraya_premium_lifetime` | Exposes the lifetime product                 |
| Top-up package      | `saraya_generations_10`   | Exposes the consumable product               |

These identifiers are defaults in `revenuecat.config.ts` and must exactly match RevenueCat. They can
be overridden with `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`,
`EXPO_PUBLIC_REVENUECAT_OFFERING_ID`, `EXPO_PUBLIC_REVENUECAT_LIFETIME_PACKAGE_ID`, and
`EXPO_PUBLIC_REVENUECAT_TOP_UP_PACKAGE_ID`.

The intended generation-pack configuration is USD $5.00. Configure that price in each store; the
app uses RevenueCat's localized `priceString` at runtime. Test Store keys are for development and
preview only. Production must use the Android public SDK key and matching Google Play products.

### Quota behavior

- Free: 3 included generations for the lifetime of the account; no regeneration.
- Lifetime Premium: 10 included generations per UTC calendar month and Premium feature access.
- Purchased generation credits do not reset.
- Included quota is consumed before purchased quota.
- A generation is consumed only after itinerary generation succeeds.
- Top-ups are deduplicated by the store/RevenueCat transaction identifier.

The current mobile `LocalGenerationQuotaGateway` persists demo state in AsyncStorage. It is not
secure, is not synchronized across devices, and is not account-authoritative. Once authentication
and Member 2's itinerary backend are available, the API must own quota rows, calendar rollover,
transaction-id uniqueness, and an atomic generate-then-consume operation. RevenueCat webhooks must
idempotently record top-ups. The app should then replace the local gateway with an API adapter.

## Gemini itinerary generation

Create a Gemini API key in Google AI Studio, then place it only in the repository-root `.env`:

```text
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.6-flash
ITINERARY_GENERATOR=
```

Never use an `EXPO_PUBLIC_` name for this key and never commit `.env`. With no key, with
`ITINERARY_GENERATOR=deterministic`, or when Gemini returns an error, the backend produces the same
validated itinerary contract through its deterministic generator.

## Geoapify place discovery

Create a Geoapify project and keep its API key only in the repository-root `.env`:

```text
GEOAPIFY_API_KEY=your_key_here
GEOAPIFY_RADIUS_METERS=15000
GEOAPIFY_PLACE_LIMIT=60
```

The API requests nearby dining, attraction, accommodation, and museum candidates around the
selected destination. Results are normalized and cached in memory for 15 minutes. Gemini receives
the candidate list and may reference only its IDs; the backend resolves those IDs to trusted names,
addresses, and coordinates before returning or saving the itinerary. Missing credentials, provider
errors, empty results, invalid candidate IDs, or AI errors preserve the deterministic fallback.

Never place this key in an `EXPO_PUBLIC_` variable. Verify Geoapify attribution and storage terms
before changing the current short-lived cache into durable place storage.
# Push notifications

Saraya's MVP push path is mobile Expo push token → Saraya API → Expo Push Service → FCM/APNs.
It does not call Firebase Admin directly. Backend domain code depends on `NotificationProvider`; the
current `ExpoPushNotificationProvider` batches at most 100 messages, applies a timeout, normalizes
partial failures, and marks `DeviceNotRegistered` tokens inactive. Tests inject a mock provider and
make no network calls.

An accepted Expo push ticket means Expo accepted the request, not that the device displayed it.
Ticket IDs are preserved in delivery results. Fetching Expo push receipts belongs in a future
background job; it must deactivate tokens when receipts report `DeviceNotRegistered`.

Android delivery requires FCM V1 credentials configured for the existing EAS project with
`eas credentials --platform android`. Never commit the downloaded service-account JSON. Pushes need
a supported device and a newly built development client; Saraya's release validation uses a physical
Android device, and Expo Go is not the validation target.

Festival reminder dispatch reuses `NotificationService.sendFestivalReminderNotification`; Festival
code never reads push tokens or contacts Expo directly. `festivalRemindersEnabled` remains the
server-authoritative delivery gate. `FestivalReminderService.dispatchDueReminders` is the narrow
testable dispatch boundary. A production scheduler, retry policy, receipt polling, and distributed
job locking remain deferred.

## Device calendar

The mobile Festival feature uses the SDK-compatible `expo-calendar` package through a provider-neutral
calendar gateway. Permission is requested only after the user presses **Add to calendar**. Calendar
access is independent of account identity, push permission, and Saraya server reminders.

Only future occurrences with confirmed start and end dates become all-day events. The end is mapped
to the next date because system calendars use an exclusive all-day end. Saraya stores the returned
native event ID in local AsyncStorage to avoid creating the same confirmed occurrence twice. It does
not synchronize calendar IDs with the backend.
