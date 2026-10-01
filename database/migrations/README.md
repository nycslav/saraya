# Migrations

Ordered SQL migrations in this directory are applied by `npm run db:migrate`. Applied filenames are
recorded in the `schema_migrations` table, and an advisory lock prevents two migration processes
from running simultaneously.

Never rewrite a migration another team member has already applied. Add a new numbered migration
and have it reviewed by another member.

