import argparse
from datetime import timedelta, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.models import Account, Discussion, Lead, LeadStatus, utc_now


def bootstrap_account(session: Session, user_id: UUID, timezone_name: str = "UTC") -> bool:
    """Seed once per account; the account marker and all records commit atomically."""
    if session.get(Account, user_id):
        return False
    session.add(Account(id=user_id))
    try:
        # The primary key protects against two first-login requests seeding twice.
        session.flush()
        now = utc_now()
        local_now = now.astimezone(ZoneInfo(timezone_name))
        today = local_now.replace(hour=14, minute=0, second=0, microsecond=0)
        records = [
            (
                "Sarah Connor",
                "Acme Corp",
                "555-0199",
                LeadStatus.PROPOSAL_SENT,
                today,
                "Sent pricing tier PDF. She will review it with her team.",
                2,
            ),
            (
                "Hank Scorpio",
                "Globex",
                "555-0124",
                LeadStatus.NEW,
                None,
                "Inbound lead from the website contact form. Interested in a product demo.",
                0,
            ),
            (
                "Bill Lumbergh",
                "Initech",
                "555-0168",
                LeadStatus.CONTACTED,
                today - timedelta(days=1),
                "Left a voicemail with his assistant. Follow up on the proposal requirements.",
                7,
            ),
            (
                "Maya Patel",
                "Northstar Studio",
                "555-0182",
                LeadStatus.QUALIFIED,
                today + timedelta(days=1),
                "Discovery call complete. Looking for a CRM for a growing team of 12.",
                1,
            ),
            (
                "Bruce Wayne",
                "Wayne Enterprises",
                "555-0140",
                LeadStatus.WON,
                None,
                "Contract signed! Sending the welcome package and onboarding checklist.",
                21,
            ),
            (
                "Tony Stark",
                "Stark Industries",
                "555-0177",
                LeadStatus.LOST,
                None,
                "Chose an existing vendor for this quarter. Open to reconnecting next year.",
                10,
            ),
        ]
        for name, company, phone, status, reminder, note, days_ago in records:
            note_at = now - timedelta(days=days_ago, hours=2)
            created_at = note_at - timedelta(days=4)
            lead = Lead(
                owner_id=user_id,
                name=name,
                company=company,
                phone=phone,
                status=status,
                follow_up_at=reminder.astimezone(timezone.utc) if reminder else None,
                created_at=created_at,
                updated_at=note_at,
            )
            session.add(lead)
            session.flush()
            session.add(
                Discussion(
                    lead_id=lead.id,
                    content="Lead created.",
                    is_creation=True,
                    created_at=created_at,
                )
            )
            if name == "Sarah Connor":
                session.add(
                    Discussion(
                        lead_id=lead.id,
                        created_at=note_at - timedelta(days=3),
                        content="Initial discovery call. They need a CRM for 50 reps. "
                        "Pain points include dropped leads and missing follow-up tracking.",
                    )
                )
            session.add(
                Discussion(
                    lead_id=lead.id,
                    content=note,
                    created_at=note_at,
                    follow_up_at=lead.follow_up_at,
                )
            )
        session.commit()
        return True
    except IntegrityError:
        session.rollback()
        # A concurrent bootstrap is harmless; other integrity failures are not.
        if session.get(Account, user_id):
            return False
        raise


def main():
    from app.auth import DEMO_USER_ID
    from app.config import get_settings
    from app.db import engine

    parser = argparse.ArgumentParser(description="Create six sample leads for an account, once.")
    parser.add_argument("--user-id", type=UUID)
    parser.add_argument("--timezone", default="UTC")
    args = parser.parse_args()
    ZoneInfo(args.timezone)
    user_id = args.user_id
    if user_id is None:
        if not get_settings().local_demo_mode:
            parser.error("--user-id is required unless LOCAL_DEMO_MODE=true")
        user_id = DEMO_USER_ID
    with Session(engine) as session:
        created = bootstrap_account(session, user_id, args.timezone)
    print("Created six leads and their discussions." if created else "Account already initialized.")


if __name__ == "__main__":
    main()
