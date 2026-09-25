# Saraya Cloud Deployment

This runbook hosts the shared API, PostgreSQL/PostGIS database, and Journey photos so mobile developers do not need Docker.

## 1. Create Supabase resources

1. Create a Supabase project in a nearby region.
2. In **Connect**, copy the **Session pooler** connection string and replace the password placeholder.
3. In Storage, create a private bucket named `journey-photos`.
4. Record the project URL and server-side service role key. Never place the service role key in the mobile app or commit it.

## 2. Initialize the hosted database

From the repository root in PowerShell:

```powershell
$env:DATABASE_URL="<Supabase session-pooler URL>"
$env:DATABASE_SSL="true"
npm.cmd run db:migrate
npm.cmd run db:seed
Remove-Item Env:DATABASE_URL
Remove-Item Env:DATABASE_SSL
```

Migrations are tracked in `schema_migrations`, and seeds use upserts, so these commands can be run again after database changes.

## 3. Deploy the API on Render

1. Push the deployment commit to GitHub.
2. In Render, create a Blueprint and select this repository. Render reads `render.yaml` from the repository root.
3. Enter every environment value marked `sync: false`.
4. Deploy and verify `https://<service-name>.onrender.com/health` returns `{ "status": "ok" }`.

The required Render secrets are:

```text
DATABASE_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
GEOAPIFY_API_KEY
```

Gemini and Geoapify remain optional for basic operation: Saraya uses deterministic itinerary and place fallbacks when their keys are unavailable.

## 4. Configure each mobile checkout

Copy the template once and replace the placeholder URL with the Render service URL:

```powershell
Copy-Item apps/mobile/.env.example apps/mobile/.env
npm.cmd run start --workspace=@saraya/mobile -- --lan
```

Normal teammate setup is then:

```powershell
git pull
npm.cmd install
npm.cmd run start --workspace=@saraya/mobile -- --lan
```

Docker remains an optional local-backend tool, not a mobile-development requirement.

## 5. Verify the shared environment

- Destinations load on two separate devices.
- Bucket-list changes persist after an API restart.
- Itineraries show their Gemini or deterministic source.
- Journey entries and achievements persist.
- Uploaded photos remain available after an API restart.
- No database or provider secret appears in the Expo configuration or Git history.
