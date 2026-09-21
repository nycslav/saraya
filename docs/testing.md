# Testing strategy

Tests should cover module business rules, API/database integration, provider-adapter behavior with fakes, and principal mobile user flows.

Required cross-feature flows:

1. Onboarding to discovery
2. Destination to bucket list to check-in
3. Festival reminder and safety alert
4. Free quota, lifetime Premium, monthly included quota, and purchased generation credits

## Monetization acceptance coverage

Automated mobile tests use provider fakes and cover Free's 3 lifetime generations, success-only
consumption, exhaustion gating, lifetime Premium activation/restoration, the 10-credit monthly UTC
calendar reset, top-up persistence, included-before-top-up consumption, transaction deduplication,
purchase cancellation/failure, preference preservation, and prevention of generation calls when no
credit remains.

The mobile quota implementation is demo-only. Full integration testing remains blocked on stable
account identity and server quota persistence. When those land, API tests must prove concurrent
requests cannot overspend quota, generation failures roll back consumption, webhook redelivery does
not duplicate top-ups, and the same account observes one balance across devices.

## Mobile continuous integration

`.github/workflows/mobile-ci.yml` runs for relevant pull requests, pushes to `main` or `develop`,
and manual dispatches. It installs the exact dependency graph from `package-lock.json`, checks Expo
SDK compatibility and Android delivery configuration, then runs the mobile linter, TypeScript
compiler, and Jest suite with coverage.

The workflow intentionally does not receive RevenueCat, Expo, or EAS credentials. Purchase
tests use mocked gateways, and Android cloud builds remain an explicitly invoked delivery step.

## Festival data acceptance coverage

Festival tests are fully offline. They parse the canonical seed through the shared contract and cover
list rendering, search, region and typical-month filters, deterministic recurring ordering,
list/calendar modes, detail content, loading/empty/error states, and source provenance.

Contract tests reject malformed, Google, or Bing search-result source URLs, invalid verification timestamps, confirmed
dates on non-confirmed records, and confirmed records without an appropriate official schedule
source. Presentation tests distinguish recurring, confirmed, estimated, and cancelled occurrences.
The calendar eligibility helper returns true only when an occurrence is confirmed and has an exact
start and end date. Tests must never call a live government or organizer website.

Expanded-catalog integrity checks also enforce unique IDs, unique normalized name/locality pairs,
valid occurrence-to-source references, at least one source per record, absence of exact dates on
non-confirmed records, search against newly added records, and filtering across the larger regional
and monthly result sets.

Run the same required checks locally before opening a pull request:

```powershell
npm.cmd ci
npm.cmd run doctor --workspace=@saraya/mobile
npm.cmd run android:check
npm.cmd run lint --workspace=@saraya/mobile
npm.cmd run typecheck --workspace=@saraya/mobile
npm.cmd run test --workspace=@saraya/mobile -- --ci --coverage
```
