import os
import subprocess
import sys
from uuid import uuid4

from sqlalchemy.exc import OperationalError
from sqlmodel import Session


def bootstrap(client, headers=None):
    response = client.post(
        "/api/account/bootstrap", json={"timezone": "Asia/Kolkata"}, headers=headers
    )
    assert response.status_code == 200
    return response.json()


def test_seed_is_idempotent_and_covers_every_status(client):
    assert bootstrap(client) == {"created": True}
    assert bootstrap(client) == {"created": False}
    leads = client.get("/api/leads").json()
    assert len(leads) == 6
    assert {lead["status"] for lead in leads} == {
        "new",
        "contacted",
        "qualified",
        "proposal_sent",
        "won",
        "lost",
    }
    assert all(lead["last_note"] and lead["last_discussion_at"] for lead in leads)


def test_create_note_follow_up_and_status_persist(client):
    bootstrap(client)
    response = client.post(
        "/api/leads", json={"name": "  Ada Lovelace  ", "company": "", "phone": ""}
    )
    assert response.status_code == 201
    lead = response.json()
    assert lead["name"] == "Ada Lovelace"
    assert lead["company"] is None
    assert lead["status"] == "new"
    lead_id = lead["id"]
    reminder = "2027-01-10T14:30:00+05:30"
    note = client.post(
        f"/api/leads/{lead_id}/discussions",
        json={
            "content": "Agreed to a demo next week.",
            "follow_up_at": reminder,
        },
    )
    assert note.status_code == 201
    assert note.json()["follow_up_at"] == "2027-01-10T09:00:00Z"
    client.post(f"/api/leads/{lead_id}/discussions", json={"content": "Sent the agenda."})
    detail = client.get(f"/api/leads/{lead_id}").json()
    assert detail["follow_up_at"] == "2027-01-10T09:00:00Z"
    assert [note["content"] for note in detail["discussions"]] == [
        "Sent the agenda.",
        "Agreed to a demo next week.",
        "Lead created.",
    ]
    updated = client.patch(f"/api/leads/{lead_id}", json={"status": "qualified"})
    assert updated.status_code == 200
    matching = client.get("/api/leads", params={"q": "ada", "status": "qualified"}).json()
    assert len(matching) == 1
    assert matching[0]["last_note"] == "Sent the agenda."
    assert matching[0]["follow_up_at"] == "2027-01-10T09:00:00Z"
    assert client.patch(f"/api/leads/{lead_id}", json={"follow_up_at": None}).status_code == 200
    detail = client.get(f"/api/leads/{lead_id}").json()
    assert detail["follow_up_at"] is None
    assert detail["discussions"][1]["follow_up_at"] == "2027-01-10T09:00:00Z"


def test_users_cannot_read_or_modify_each_others_leads(client):
    bootstrap(client)
    lead_id = client.get("/api/leads").json()[0]["id"]
    other_user = {"X-Test-User": str(uuid4())}
    assert client.get("/api/leads", headers=other_user).json() == []
    assert client.get(f"/api/leads/{lead_id}", headers=other_user).status_code == 404
    assert (
        client.patch(
            f"/api/leads/{lead_id}", json={"status": "won"}, headers=other_user
        ).status_code
        == 404
    )
    assert (
        client.post(
            f"/api/leads/{lead_id}/discussions",
            json={
                "content": "Attempted cross-account note",
            },
            headers=other_user,
        ).status_code
        == 404
    )
    bootstrap(client, other_user)
    other_leads = client.get("/api/leads", headers=other_user).json()
    assert len(other_leads) == 6
    assert lead_id not in {lead["id"] for lead in other_leads}


def test_validation_and_not_found_responses(client):
    bootstrap(client)
    assert client.post("/api/leads", json={"name": "   "}).status_code == 422
    assert client.post("/api/leads", json={"name": "a" * 121}).status_code == 422
    assert (
        client.post("/api/leads", json={"name": "Test", "owner_id": str(uuid4())}).status_code
        == 422
    )
    assert client.get(f"/api/leads/{uuid4()}").status_code == 404
    lead_id = client.get("/api/leads").json()[0]["id"]
    assert client.patch(f"/api/leads/{lead_id}", json={"status": "invalid"}).status_code == 422
    assert client.patch(f"/api/leads/{lead_id}", json={"status": None}).status_code == 422
    assert client.patch(f"/api/leads/{lead_id}", json={}).status_code == 422
    assert (
        client.post(f"/api/leads/{lead_id}/discussions", json={"content": " "}).status_code == 422
    )
    assert (
        client.post(
            f"/api/leads/{lead_id}/discussions",
            json={
                "content": "No timezone",
                "follow_up_at": "2027-01-10T14:30:00",
            },
        ).status_code
        == 422
    )
    assert (
        client.post("/api/account/bootstrap", json={"timezone": "Invalid/Zone"}).status_code == 422
    )


def test_search_treats_wildcards_as_literal_characters(client):
    bootstrap(client)
    client.post("/api/leads", json={"name": "100% Growth"})
    results = client.get("/api/leads", params={"q": "%"}).json()
    assert [lead["name"] for lead in results] == ["100% Growth"]


def test_failed_commit_rolls_back_both_note_and_follow_up(client, monkeypatch):
    bootstrap(client)
    lead_id = client.get("/api/leads").json()[0]["id"]
    before = client.get(f"/api/leads/{lead_id}").json()

    def fail_after_flush(session):
        session.flush()
        raise OperationalError("COMMIT", {}, Exception("Database unavailable"))

    # Fail after the changes reach the transaction, rather than before any writes.
    with monkeypatch.context() as patch:
        patch.setattr(Session, "commit", fail_after_flush)
        response = client.post(
            f"/api/leads/{lead_id}/discussions",
            json={
                "content": "This write must be rolled back.",
                "follow_up_at": "2027-01-10T14:30:00+05:30",
            },
        )
        assert response.status_code == 503
        assert "Please try again" in response.json()["detail"]

    after = client.get(f"/api/leads/{lead_id}").json()
    assert after["follow_up_at"] == before["follow_up_at"]
    assert after["discussions"] == before["discussions"]


def test_browser_timezone_aliases_work_without_system_timezone_files():
    # Slim containers may omit backward-compatible aliases emitted by browsers.
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            "from zoneinfo import ZoneInfo; "
            "from app.schemas import BootstrapInput; "
            "BootstrapInput(timezone='Asia/Calcutta'); "
            "ZoneInfo('US/Eastern'); ZoneInfo('Europe/Kiev')",
        ],
        env={**os.environ, "PYTHONTZPATH": ""},
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
