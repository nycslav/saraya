# Database

Saraya uses PostgreSQL with PostGIS.

- `migrations/` contains immutable, ordered migrations.
- `seeds/` contains reproducible development and demo data.
- `scripts/` contains database maintenance and seed entry points.
- `schema.sql` is a generated or deliberately maintained schema snapshot, not a substitute for migrations.

The project uses ordered SQL migrations executed through the API's TypeScript migration runner.
Every migration requires review by another member.

## Local setup

1. Install Docker Desktop and start PostgreSQL with `docker compose up -d postgres`.
2. Create `.env` from `.env.example`, or set `DATABASE_URL` in the current shell.
3. Run `npm run db:migrate` from the repository root.
4. Run `npm run db:seed` to upsert the development destinations, achievements, and synthetic safety alerts.

The seed command is repeatable. Stable IDs are used as conflict keys, so rerunning it updates
catalog and demo content without creating duplicates. Safety records are visibly synthetic and are
not current government warnings.

