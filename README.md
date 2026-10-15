# LeadFlow

A single-screen CRM built for the PravarAI fullstack assessment. Keep leads,
discussion history, statuses, and follow-ups together in a private workspace.

**Stack:** Next.js / React / TypeScript, FastAPI / SQLModel, PostgreSQL,
Supabase Auth, and TanStack Query. SQLite supports an isolated local preview.

## Features

- Email/password and Google sign-in through Supabase.
- Six lead statuses, name search, and status filters.
- Today's follow-ups pinned once; overdue reminders highlighted.
- Lead timelines, notes, optional follow-ups, and reminder completion.
- Immediate cache updates after saves, protected against stale reads.
- Six sample leads and thirteen timeline entries initialized once per account.
- Responsive layouts, accessible dialogs, and drafts preserved after failed saves.

## Local preview

Use Node.js 22+, Python 3.12+, and uv. From the repository root:

```bash
npm ci
cd backend
uv sync --locked
uv run python scripts/serve_preview.py
```

In a second terminal, from the repository root:

```powershell
Copy-Item frontend/.env.example frontend/.env.local
npm run dev
```

On macOS/Linux, use `cp frontend/.env.example frontend/.env.local` instead.
Open **http://localhost:3000** and choose **Open local preview**.
The API runs on **http://localhost:8000**, with interactive documentation at **/docs**.
The preview database is `backend/.local/preview.db`; changes survive restarts.

## Documentation

[Project architecture and operating guide](docs/project-notion.md) covers diagrams,
the database schema, authentication, API flows, configuration, deployment, testing,
tradeoffs, and troubleshooting.

To use it in Notion, import `docs/project-notion.md` as Markdown. If diagram blocks
remain plain code after import, set their code-block language to Mermaid.

## Real authentication

Copy `backend/.env.example` to `backend/.env` and the frontend template to
`frontend/.env.local`. Set the Supabase URL in both files, the frontend publishable
key, and a PostgreSQL connection string in the backend. Set both local demo flags
to `false`. See the project guide for provider and redirect configuration.

```bash
cd backend
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Run `npm run dev` from the root in another terminal.

## Docker

Run the local preview with PostgreSQL:

```bash
docker compose --env-file .env.example up --build
```

For custom configuration, copy the root `.env.example` to `.env`, edit it, and
run `docker compose up --build`. Frontend public environment variables require
a rebuild. `docker compose down` preserves the database volume.

## Verification

From the repository root:

```bash
npm run typecheck
npm test
npm run build
cd frontend
npx playwright install chromium
cd ..
npm run test:e2e
```

From `backend/`:

```bash
uv run ruff check app migrations scripts tests
uv run pytest -q
uv run alembic upgrade head
uv run alembic check
```

Run migrations against a development database. Browser tests use isolated servers
on ports 3100/8100 and reset only `backend/.local/e2e.db`. Screenshots and failure
traces are generated under ignored `frontend/test-results/` and uploaded by CI.
Live OAuth requires manual verification with configured provider accounts.

## Deployment

`render.yaml` configures the Docker API; `frontend/vercel.json` configures the
frontend build. Use `frontend/` as the Vercel project root. Configure production
environment variables, apply migrations, allow the frontend origin in API CORS
and Supabase Auth, and verify both login methods and isolation between accounts.
Full details are in the project guide.

## AI use

An OpenAI coding assistant helped with implementation, debugging, tests,
optimization, and documentation. Automated checks and manual provider verification
are documented separately; the applicant remains responsible for reviewing and
explaining the submitted code.
