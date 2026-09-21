# Integrations

Provider configuration and local/mock behavior must be documented for:

- Maps and geocoding
- PAGASA weather and warnings
- Firebase Cloud Messaging
- Photo storage
- RevenueCat lifetime/consumable purchases and webhooks
- Google Gemini itinerary generation, with OpenAI and deterministic fallbacks
- Geoapify nearby-place discovery for grounded itinerary stops

Every provider should have an adapter interface so feature tests can use deterministic fakes.

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
