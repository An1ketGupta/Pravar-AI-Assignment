# LeadFlow

A single-screen CRM for keeping leads, conversations, and follow-ups together.
Built for the PravarAI fullstack assessment with Next.js, TypeScript, FastAPI,
and PostgreSQL. Supabase provides email/password and Google authentication.

![LeadFlow dashboard](docs/screenshots/02-dashboard.png)

## Features

- Lead cards show name, company, status, last note, and time since the latest discussion.
- Search by name and filter by all six statuses: New, Contacted, Qualified,
  Proposal Sent, Won, and Lost.
- Today's follow-ups are pinned once at the top; overdue reminders are red.
- Click a lead to open its reverse-chronological discussion timeline.
- Add notes, set an optional follow-up date/time, change status, or mark a reminder complete.
- Successful saves update the list and open dialog immediately.
- Add leads with a required name and optional company/phone; status defaults to New.
- Signup/login with email/password or Google. Every account has its own leads.
- New accounts get six sample leads and thirteen timeline entries, with reminders
  relative to the signup date and the user's timezone.
- Responsive layouts, keyboard-accessible dialogs, loading/error states, and save feedback.
- Docker Compose, database migrations, API tests, browser tests, and GitHub Actions.

## Quick start: local preview

Requirements: Node.js **22+**, Python **3.12+**, and [uv](https://docs.astral.sh/uv/getting-started/installation/).
The dependency lockfiles are committed. Docker is optional for native development.

From the repository root:

```bash
npm ci
cd backend
uv sync --locked
uv run python scripts/serve_preview.py
```

In a second terminal, from the repository root, copy the frontend environment template:

```powershell
# PowerShell
Copy-Item frontend/.env.example frontend/.env.local
npm run dev
```

```bash
# macOS / Linux
cp frontend/.env.example frontend/.env.local
npm run dev
```

Open **http://localhost:3000** and choose **Open local preview**.
The API runs at **http://localhost:8000**; interactive API docs are at **/docs**.
The preview script migrates an isolated SQLite database at
`backend/.local/preview.db`, without changing your Supabase configuration.
Changes persist across refreshes and server restarts. This explicit preview mode
has no fake signup/login and must not be enabled on a public deployment.

`uv run` activates the correct Python environment automatically. If you prefer
manual activation in PowerShell: `./backend/.venv/Scripts/Activate.ps1`.

## Real authentication and Supabase PostgreSQL

1. Create a Supabase project and copy `backend/.env.example` to `backend/.env`
   and `frontend/.env.example` to `frontend/.env.local`.
2. Fill the project URL in **both** files. Copy the **publishable key** into
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. A legacy `anon` key also works.
   Never put a secret/service-role key in a `NEXT_PUBLIC_*` variable.
3. Copy the PostgreSQL **session pooler** connection string from Supabase's
   **Connect** dialog. Session mode uses port **5432** and works over IPv4.
   Use the `postgresql+psycopg://` driver prefix and `?sslmode=require`.
   URL-encode special characters in the database password.
4. Set `LOCAL_DEMO_MODE=false` in the backend and
   `NEXT_PUBLIC_LOCAL_DEMO_MODE=false` in the frontend.
5. Enable email/password signup in Supabase Auth and disable **Confirm email**,
   as agreed for this assessment. Set a password minimum of at least eight characters.
6. Enable Google in Supabase Auth. In Google Cloud, create a **Web application**
   OAuth client and add `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   as its authorized redirect URI. Put the Google client ID/secret in the
   **Supabase dashboard**, not in the frontend or this repository.
7. Configure the Google consent screen. If it is in Testing mode, add intended
   reviewers as test users, or move it to Production for public sign-in.
8. In Supabase Auth URL configuration, allow `http://localhost:3000` and your
   final Vercel URL. Set the Site URL to your live frontend URL for deployment.
9. Ensure Supabase uses an **ES256 or RS256 signing key**. The backend verifies
   signatures using the project's JWKS endpoint; legacy HS256 tokens are not accepted.

Example backend configuration (placeholders only):

```dotenv
APP_ENV=development
LOCAL_DEMO_MODE=false
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
DATABASE_URL=postgresql+psycopg://postgres.YOUR_PROJECT_REF:ENCODED_PASSWORD@YOUR_POOLER_HOST:5432/postgres?sslmode=require
CORS_ORIGINS=http://localhost:3000
```

Then run the real API:

```bash
cd backend
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Restart the frontend after editing its environment file. Google OAuth uses PKCE
and returns to the main screen. The Supabase client exchanges the auth code
and refreshes the session. CRM requests carry the access token to FastAPI.

## Docker Compose

Copy the **root** `.env.example` to `.env`, then:

```bash
docker compose up --build
```

To try the preview directly without copying configuration files:

```bash
docker compose --env-file .env.example up --build
```

Open **http://localhost:3000**. The default template enables the local preview
with a real PostgreSQL database in Docker. PostgreSQL uses a named volume and
has no exposed host port. The API applies migrations before starting.

For real authentication in Docker, fill the Supabase variables in the root
`.env` and set both demo flags to false. You can keep the Docker PostgreSQL
connection string; Supabase Auth does not require CRM data to live in Supabase.

The frontend's `NEXT_PUBLIC_*` values are embedded **at build time**. Rebuild the
web image after changing them. Stop services with `docker compose down`; this
preserves the database volume.

## Seed script

```bash
cd backend
# Local demo identity (LOCAL_DEMO_MODE must be true):
uv run python -m app.seed --timezone Asia/Kolkata
# An actual Supabase user's UUID:
uv run python -m app.seed --user-id USER_UUID --timezone Asia/Kolkata
```

Apply migrations first. The seed is idempotent: it initializes an account once
and never overwrites its existing records. The UI runs the same initialization
on the first authenticated visit.

## Verification

From the root:

```bash
npm run typecheck
npm test
npm run build
cd frontend
npx playwright install chromium
cd ..
npm run test:e2e
```

For the API:

```bash
cd backend
uv run ruff check app migrations scripts tests
uv run pytest -q
uv run alembic upgrade head
uv run alembic check
```

Browser tests start isolated servers on ports **3100** and **8100**, reset only
`backend/.local/e2e.db`, and exercise the complete CRM flow, immediate list updates,
search/filter behavior, reload persistence, reminder completion, and mobile layouts.
They also generate screenshots in `docs/screenshots/`. API tests cover ownership
isolation, JWT validation, seed idempotency, UTC normalization, validation errors,
and rollback after a failed transaction. Browser checks also cover keyboard focus
and preserving a draft when a save fails.

To exercise a freshly initialized Docker preview instead of starting test servers:

```powershell
$env:LEADFLOW_E2E_BASE_URL = "http://localhost:3000"
npm run test:e2e
Remove-Item Env:LEADFLOW_E2E_BASE_URL
```

The complete-flow test expects the six initial sample leads and changes its test
workspace. Use the isolated default test servers for repeatable checks.

GitHub Actions also runs the migrations and an integration check against real
PostgreSQL. To run that check manually on a **disposable** PostgreSQL database,
set `DATABASE_URL`, migrate it, then run `uv run python scripts/check_postgres.py`.

The automated browser flow uses the explicit local preview identity. Live Google
OAuth and email/password signup require your configured Supabase/Google projects
and should be checked with two separate user accounts before submission.

## API

All `/api/*` endpoints require `Authorization: Bearer <Supabase access token>`.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| POST | `/api/account/bootstrap` | Initialize an account and sample data once |
| GET | `/api/leads?q=&status=` | List owned leads with latest discussion summaries |
| POST | `/api/leads` | Add a lead and initial timeline entry (**201**) |
| GET | `/api/leads/{id}` | Lead details and newest-first discussions |
| PATCH | `/api/leads/{id}` | Update status or current follow-up |
| POST | `/api/leads/{id}/discussions` | Save a note and optional follow-up atomically (**201**) |
| GET | `/health` | Database readiness check |

Missing/invalid credentials return **401**, inaccessible/missing leads **404**,
invalid input **422**, and unavailable database/auth services **503**. Creating
a lead before initializing the account returns **409**. Errors include readable
messages; each response includes a request ID for troubleshooting.

## Architecture and decisions

```text
frontend/src/
  app/           Single-screen entry point, layout, global styles
  components/    Auth, dashboard, cards, dialogs, reusable UI primitives
  hooks/         Server queries and mutations
  lib/           Typed API client, Supabase client, statuses, date/grouping logic
backend/
  app/           Configuration, auth, models, schemas, routes, seed logic
  migrations/    Versioned Alembic migrations
  tests/         API and auth verification
  scripts/       Isolated preview and PostgreSQL integration check
docs/            Deployment guide, walkthrough, screenshots
```

- **Ownership:** JWTs are verified for signature, expiry, issuer, and audience.
  Every lead read/write includes the verified owner ID. Foreign IDs return the
  same 404 as missing IDs. Supabase's Data API is blocked for the CRM tables by
  RLS and revoked browser-role permissions; only the trusted backend connects directly.
- **Persistence:** Lead creation, discussion/reminder saves, and account seeding
  use database transactions. Seed initialization also handles concurrent first visits.
- **Immediate updates:** TanStack Query receives the committed server response,
  updating list and detail caches together. Account-specific cache keys and cache
  clearing on sign-out prevent showing another account's cached data.
- **Dates:** Store UTC; display and group by the user's browser timezone.
  Today's reminders stay pinned even after their scheduled time; overdue ones
  also turn red. Closed Won/Lost leads retain history but do not raise reminders.
- **Follow-ups:** A note without a new date preserves the current reminder.
  Marking complete clears only the lead's current follow-up, preserving historical notes.
- **Database access:** A window query retrieves the latest discussion for all
  owned leads without an extra query for each lead.
- **Scope:** No external reminder emails, team sharing, or AI product features.
  Search/filtering occurs locally for this small assessment dataset; the API also
  supports search/status parameters. Pagination is a future extension for larger pipelines.

## Deployment and submission

Follow [the deployment guide](docs/deployment.md) for Supabase, Render, and Vercel.
`render.yaml` declares the free Docker backend. The frontend Vercel project root
is `frontend/`; its configuration builds from the workspace root.

Screenshots are in [docs/screenshots](docs/screenshots). A short recording script
is in [docs/walkthrough.md](docs/walkthrough.md). Completed local checks and their
limits are recorded in [docs/verification.md](docs/verification.md).

This checkout uses meaningful local commits. Push the completed history when ready:

```bash
git push -u origin main
```

Then deploy, verify both login methods, confirm user isolation with a second account,
and include the live URL in your submission. Do not claim deployment or OAuth
verification before performing those checks.

## AI use

An OpenAI coding assistant helped plan the architecture, generate implementation
and tests, debug issues, and prepare documentation. The stack and scope were agreed
with the applicant. Automated verification is recorded separately from provider setup
and manual checks. The applicant should review the code and be able to explain it;
this disclosure does not claim that manual review has already happened.
