"""Exercise the real PostgreSQL migration and API in a disposable CI database."""

import sys
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlmodel import Session, select  # noqa: E402

from app.auth import current_user  # noqa: E402
from app.db import engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Account, Discussion, Lead  # noqa: E402

assert engine.dialect.name == "postgresql", "Use a disposable PostgreSQL database."
user_id = uuid4()
other_id = uuid4()
active_user = user_id
app.dependency_overrides[current_user] = lambda: active_user

try:
    with TestClient(app) as client:
        assert (
            client.post("/api/account/bootstrap", json={"timezone": "Asia/Kolkata"}).status_code
            == 200
        )
        assert len(client.get("/api/leads").json()) == 6
        response = client.post("/api/leads", json={"name": "PostgreSQL verification"})
        assert response.status_code == 201
        lead_id = response.json()["id"]
        response = client.post(
            f"/api/leads/{lead_id}/discussions",
            json={
                "content": "Verified an atomic note and reminder write on PostgreSQL.",
                "follow_up_at": "2030-05-07T14:00:00+05:30",
            },
        )
        assert response.status_code == 201
        assert response.json()["follow_up_at"] == "2030-05-07T08:30:00Z"
        assert (
            client.patch(f"/api/leads/{lead_id}", json={"status": "qualified"}).status_code == 200
        )
        assert client.get(f"/api/leads/{lead_id}").json()["status"] == "qualified"
        active_user = other_id
        assert client.get(f"/api/leads/{lead_id}").status_code == 404
        assert client.get("/api/leads").json() == []
    with engine.connect() as connection:
        protected = connection.execute(
            text(
                "SELECT count(*) FROM pg_class WHERE relname IN "
                "('accounts','leads','discussions') AND relrowsecurity"
            )
        ).scalar_one()
        assert protected == 3
    print("PostgreSQL migrations, persistence, isolation, and RLS checks passed.")
finally:
    app.dependency_overrides.clear()
    # Only remove this check's randomly named account; preserve all other records.
    with Session(engine) as session:
        for lead in session.exec(select(Lead).where(Lead.owner_id == user_id)).all():
            for note in session.exec(select(Discussion).where(Discussion.lead_id == lead.id)).all():
                session.delete(note)
            session.delete(lead)
        session.flush()
        account = session.get(Account, user_id)
        if account:
            session.delete(account)
        session.commit()
