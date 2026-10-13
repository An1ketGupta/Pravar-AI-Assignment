# Deploy LeadFlow for free

Deploy after the local commit history has been pushed to
`https://github.com/An1ketGupta/Pravar-AI-Assignment`.
Provider accounts being ready is separate from connecting this particular app.

## 1. Supabase

Use a dedicated project for the assessment.

- Copy its project URL and publishable key.
- Copy the **session pooler** PostgreSQL URL (port 5432) from Connect.
  Use `postgresql+psycopg://` and `sslmode=require`; encode special password characters.
- Enable email/password signup and disable Confirm email for this demo.
- Use an asymmetric **ES256/RS256** signing key. The API checks the project's JWKS.
- Enable Google Auth and enter the Google OAuth client ID and secret in Supabase.
- In Google Cloud, configure the consent screen and a Web OAuth client. Its
  redirect URI is `https://PROJECT_REF.supabase.co/auth/v1/callback`.
  Testing-mode consent screens restrict login to configured test users.

The migration enables RLS on the three CRM tables and removes Data API access for
the `anon` and `authenticated` roles. The backend connects using the trusted
PostgreSQL credentials, not a browser key.

References: [database connections](https://supabase.com/docs/guides/database/connecting-to-postgres),
[Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google),
[authentication configuration](https://supabase.com/docs/guides/auth/general-configuration),
[JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys).

## 2. Render backend

Create a Blueprint from the GitHub repository using the included `render.yaml`,
or create a free Docker Web Service with:

| Setting | Value |
| --- | --- |
| Dockerfile | `backend/Dockerfile` |
| Docker build context | `backend` |
| Health check | `/health` |
| Plan | Free |
| `APP_ENV` | `production` |
| `LOCAL_DEMO_MODE` | `false` |
| `DATABASE_URL` | Supabase session-pooler PostgreSQL URL |
| `SUPABASE_URL` | `https://PROJECT_REF.supabase.co` |
| `CORS_ORIGINS` | Exact Vercel frontend origin, without a trailing slash |

The Docker entry point migrates the database and listens on Render's `PORT`.
Use the resulting backend URL for the frontend API environment variable.
After deployment, open `/health` and `/docs` to verify startup.

Free web services sleep after 15 minutes of inactivity; the first request can take
about a minute. The frontend allows a longer connection timeout and offers retry.
See [Render's free service limits](https://render.com/docs/free).

## 3. Vercel frontend

Import the same GitHub repository into a Vercel Hobby project.

- Set **Root Directory** to `frontend` and framework to **Next.js**.
- Enable inclusion of source files outside the root directory when prompted;
  the shared lockfile and workspace manifest are in the repository root.
- `frontend/vercel.json` specifies install/build commands for the npm workspace.
- Use Node.js **22** or newer.
- Set these values **before** building:

```dotenv
NEXT_PUBLIC_API_URL=https://YOUR_BACKEND.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_LOCAL_DEMO_MODE=false
```

These are public client configuration. The database password and Google OAuth
secret belong only in the relevant server/provider settings.

Deploy, then copy the final Vercel URL to Render's `CORS_ORIGINS` and Supabase's
Site URL and allowed redirect URLs. Include `http://localhost:3000` as a redirect
for local development. Redeploy after changing frontend environment values.

References: [Vercel monorepos](https://vercel.com/docs/monorepos),
[Hobby plan](https://vercel.com/docs/plans/hobby).

## 4. Verify the live deployment

1. Register with email/password and check that the dashboard opens immediately.
2. Confirm six sample leads are created exactly once.
3. Create a lead, save a discussion with today's follow-up, and update its status.
4. Refresh and confirm all changes persist.
5. Sign out, then sign in with Google.
6. Use another account and confirm it has independent sample leads and no access
   to the first account's changes.
7. Verify redirects on the deployed domain and inspect the mobile layout.
8. Check that the local-preview button is absent on the public site.

Supabase free projects can pause after a week of inactivity. Check that the demo
is available before submitting or interviewing. [Supabase free plan](https://supabase.com/pricing).

## Common setup issues

| Symptom | Check |
| --- | --- |
| API cannot connect to PostgreSQL | Session-pooler hostname/5432, encoded password, SSL, project is active |
| Signup asks for email confirmation | Disable Confirm email in Supabase Auth |
| Google reports redirect mismatch | Google redirect must point to Supabase's callback; Supabase redirects must include the frontend origin |
| Google login works only for the owner | Google consent screen is in Testing mode; configure test users or public availability |
| API returns 401 after login | Supabase URL must match the frontend project, and signing key must be ES256/RS256 |
| Browser blocks API requests | Render CORS origin must exactly match the deployed frontend origin |
| Old API URL persists | Rebuild the frontend; NEXT_PUBLIC variables are build-time values |
| Initial request is slow | Wait for the free Render service to wake up, then retry |
