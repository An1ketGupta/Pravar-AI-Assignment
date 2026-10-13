# LeadFlow implementation plan

Build a single-screen CRM with Next.js/TypeScript and FastAPI. Supabase provides
email/password and Google authentication plus hosted PostgreSQL. Every API query
is scoped to the verified user's ID. New users receive their own sample records.

## Milestones

1. Establish frontend/backend structure and reproducible dependencies.
2. Implement migrations, verified authentication, user-scoped API, and atomic seeding.
3. Build the responsive lead dashboard, search, filters, and follow-up grouping.
4. Connect authentication, lead creation, timeline discussions, and status changes.
5. Verify API isolation, persistence, timezone behavior, and complete browser flows.
6. Add Docker/deployment configuration, setup documentation, and submission evidence.

Commits reflect completed milestones and fixes. No credentials, user records,
or generated dependency directories belong in Git.

The final handoff is local, as requested: retain the commit history for the
applicant to push. Provider configuration and live deployment are left to the
applicant using the deployment guide; they are not reported as verified.

## Behavioral decisions

- Persist timestamps in UTC; interpret today's follow-ups in the browser timezone.
- Show a lead only once: matching today's follow-ups are removed from the other list.
- Search and status filters apply to both sections.
- Saving a discussion without a new reminder preserves the existing reminder.
- Reminder completion explicitly clears the current follow-up; history is preserved.
- Won/Lost leads retain history but are excluded from active reminder sections.
- A local-only preview identity is opt-in and rejected in production.
- Database writes are confirmed before success messages; list and timeline update together.
