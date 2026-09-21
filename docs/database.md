# Database design

Document tables, relationships, constraints, indexes, migration order, and PostGIS query conventions here as they are implemented.

Coordinates should use one canonical representation at API boundaries, while geographic containment and distance validation should be enforced by the backend and database where appropriate.

## Festival normalization direction

The hackathon keeps stable identity and the represented annual occurrence together in the curated
festival seed. The contract nevertheless separates `typicalMonth` and `recurrenceDescription` from
the nested occurrence status, year, verified dates, events, source references, and verification time.

When the festival backend is implemented, normalize this into at least:

- `festivals`: stable identity, location, recurring timing, cultural copy, and editorial guidance;
- `festival_occurrences`: festival ID, year, status, confirmed dates, verification timestamp, and
  cancellation/rescheduling notes;
- `festival_sources`: publisher, direct URL, type, purpose, and access date;
- an occurrence-to-source relation so schedule claims retain their supporting evidence.

Only a `confirmed` occurrence may persist exact confirmed dates. Estimated or recurring records must
not be converted into calendar timestamps. Migration and indexes remain deferred until the team
selects the database migration tool and the API foundation is ready.
