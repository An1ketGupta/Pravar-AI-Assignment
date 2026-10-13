# Local verification

Checked on October 13, 2026. These results describe the local checkout and its
Docker preview, not a hosted deployment.

| Check | Result |
| --- | --- |
| FastAPI tests | 14 passed |
| Ruff | Passed for app, migrations, scripts, and tests |
| Frontend TypeScript | Passed, with Next.js route generation first |
| Frontend date/grouping tests | 4 passed |
| Browser tests with isolated development servers | 2 passed |
| Browser tests against production Docker frontend and PostgreSQL API | 2 passed |
| Production Next.js build in Docker | Passed |
| Docker Compose startup | Frontend available; API and PostgreSQL healthy |
| PostgreSQL integration check | Migrations, persistence, owner isolation, and RLS passed |
| Alembic schema comparison | No new upgrade operations detected |

The browser tests cover the login/signup interface, six initial sample leads,
search and all-status filtering, today's pinned follow-ups, overdue indicators,
lead creation, timeline ordering, status changes, notes with and without new
reminders, immediate list updates, refresh persistence, reminder completion,
mobile layout, keyboard focus, and draft preservation after a simulated 503.

API tests also verify signed JWT validation, cross-account read/write denial,
idempotent seeding, input validation, UTC conversion, literal search wildcards,
and transaction rollback after changes have been flushed. A regression test
checks browser timezone aliases with the system timezone database disabled.
This caught and fixed missing aliases in the slim Docker image; the API now
explicitly depends on the complete `tzdata` package.

Screenshots in `docs/screenshots/` were captured from the running local
preview. The preview uses a clearly labeled local identity; development browser
tests use isolated SQLite, while the Docker flow was checked against PostgreSQL.
The sign-in screenshot demonstrates the interface, not successful provider login.

## Remaining provider checks

The applicant chose to configure and deploy the app later. Supabase and Google
credentials were not supplied. Therefore real email/password signup, Google
OAuth, Supabase-hosted PostgreSQL connectivity, Vercel/Render deployment, and
GitHub Actions execution have not been verified in the provider accounts.

Follow `docs/deployment.md`, run the two-account live checklist, then include
the resulting live URL in the submission. All Git commits remain local for the
applicant to push.

The temporary verification containers are stopped after QA. Start a fresh local
preview from the repository root with:

```bash
docker compose --env-file .env.example up --build
```

Open `http://localhost:3000` and select **Open local preview**. This setup needs
no Supabase credentials. Stop it with `docker compose down`; the database volume
is retained.
