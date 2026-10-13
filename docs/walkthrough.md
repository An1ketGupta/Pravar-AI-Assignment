# Submission walkthrough

The screenshots in `docs/screenshots/` are captured from the running local preview
by the browser test. They show actual application state, not design mockups.
Real authentication screenshots can be added after Supabase/Google setup is verified.

## Suggested 2–3 minute recording

1. Start at the login screen. Show email/password signup or Google sign-in once
   the real provider is configured. Explain that each account owns its leads.
2. Show the dashboard: name, company, status, last note, relative time, today's
   pinned lead, and an overdue reminder in red.
3. Search for Sarah. Switch statuses, show the no-results state, and clear filters.
4. Open Sarah's timeline. Point out newest-first history and the existing reminder.
5. Change the status. Add a discussion with a follow-up set to today. Close the
   dialog to show the updated last note and pinned follow-up immediately.
6. Add a lead with a name and optional company/phone. Show its default New status.
7. Refresh the page to demonstrate persistence. Open the lead again to show its history.
8. Briefly show mobile layout, then the README's setup instructions and API docs.

Use fictional sample data. If showing provider dashboards, keep connection strings,
keys, passwords, and personal account information outside the recording frame.

## Screenshot index

| File | Screen |
| --- | --- |
| `01-sign-in.png` | Email/password and Google sign-in interface |
| `02-dashboard.png` | Lead list, filters, pinned and overdue follow-ups |
| `03-add-lead.png` | Add-lead dialog |
| `04-timeline.png` | Discussion history and status selector |
| `05-mobile.png` | Responsive dashboard |
| `06-mobile-timeline.png` | Mobile discussion dialog and reminder form |

## Submission checklist

- Public repository with the real commit history pushed.
- Working README and `.env.example` templates, with no real credentials committed.
- Passing verification and screenshots/video demonstrating the required flows.
- Live URL after deployment and both sign-in methods have been checked.
- An accurate description of AI assistance and your own review.
