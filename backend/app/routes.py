from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlmodel import Session, select

from app.auth import current_user
from app.db import get_session
from app.models import Account, Discussion, Lead, LeadStatus, utc_now
from app.schemas import (
    BootstrapInput,
    DiscussionCreate,
    DiscussionRead,
    LeadCreate,
    LeadDetail,
    LeadRead,
    LeadUpdate,
)
from app.seed import bootstrap_account

router = APIRouter(prefix="/api", tags=["leads"])


def owned_lead(session: Session, user_id: UUID, lead_id: UUID) -> Lead:
    lead = session.exec(select(Lead).where(Lead.id == lead_id, Lead.owner_id == user_id)).first()
    if lead is None:
        # A nonexistent ID and another user's ID have the same response.
        raise HTTPException(status_code=404, detail="Lead not found.")
    return lead


def lead_detail(session: Session, lead: Lead) -> LeadDetail:
    discussions = session.exec(
        select(Discussion)
        .where(Discussion.lead_id == lead.id)
        .order_by(Discussion.created_at.desc(), Discussion.id.desc())
    ).all()
    latest = discussions[0] if discussions else None
    return LeadDetail(
        **lead.model_dump(),
        last_note=latest.content if latest else None,
        last_discussion_at=latest.created_at if latest else None,
        discussions=[DiscussionRead.model_validate(discussion) for discussion in discussions],
    )


@router.post("/account/bootstrap")
def bootstrap(
    payload: BootstrapInput,
    user_id: UUID = Depends(current_user),
    session: Session = Depends(get_session),
):
    return {"created": bootstrap_account(session, user_id, payload.timezone)}


@router.get("/leads", response_model=list[LeadRead])
def list_leads(
    status: LeadStatus | None = None,
    q: str = Query(default="", max_length=120),
    user_id: UUID = Depends(current_user),
    session: Session = Depends(get_session),
):
    filters = [Lead.owner_id == user_id]
    if status is not None:
        filters.append(Lead.status == status)
    if q.strip():
        filters.append(Lead.name.icontains(q.strip(), autoescape=True))

    # Rank discussions only for matching owned leads, without a query per lead.
    latest = (
        select(
            Discussion.lead_id,
            Discussion.content,
            Discussion.created_at,
            func.row_number()
            .over(
                partition_by=Discussion.lead_id,
                order_by=(Discussion.created_at.desc(), Discussion.id.desc()),
            )
            .label("position"),
        )
        .join(Lead, Lead.id == Discussion.lead_id)
        .where(*filters)
        .subquery()
    )
    statement = (
        select(Lead, latest.c.content, latest.c.created_at)
        .outerjoin(
            latest,
            (latest.c.lead_id == Lead.id) & (latest.c.position == 1),
        )
        .where(*filters)
    )
    rows = session.exec(statement.order_by(Lead.updated_at.desc(), Lead.id.desc())).all()
    return [
        LeadRead(**lead.model_dump(), last_note=content, last_discussion_at=timestamp)
        for lead, content, timestamp in rows
    ]


@router.post("/leads", response_model=LeadDetail, status_code=201)
def create_lead(
    payload: LeadCreate,
    user_id: UUID = Depends(current_user),
    session: Session = Depends(get_session),
):
    if not session.get(Account, user_id):
        raise HTTPException(status_code=409, detail="Initialize your account before adding leads.")
    lead = Lead(owner_id=user_id, **payload.model_dump())
    session.add(lead)
    session.flush()
    session.add(Discussion(lead_id=lead.id, content="Lead created.", is_creation=True))
    session.commit()
    session.refresh(lead)
    return lead_detail(session, lead)


@router.get("/leads/{lead_id}", response_model=LeadDetail)
def get_lead(
    lead_id: UUID,
    user_id: UUID = Depends(current_user),
    session: Session = Depends(get_session),
):
    return lead_detail(session, owned_lead(session, user_id, lead_id))


@router.patch("/leads/{lead_id}", response_model=LeadDetail)
def update_lead(
    lead_id: UUID,
    payload: LeadUpdate,
    user_id: UUID = Depends(current_user),
    session: Session = Depends(get_session),
):
    lead = owned_lead(session, user_id, lead_id)
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="Provide a status or follow-up change.")
    for field, value in changes.items():
        setattr(lead, field, value)
    lead.updated_at = utc_now()
    session.add(lead)
    session.commit()
    session.refresh(lead)
    return lead_detail(session, lead)


@router.post("/leads/{lead_id}/discussions", response_model=LeadDetail, status_code=201)
def add_discussion(
    lead_id: UUID,
    payload: DiscussionCreate,
    user_id: UUID = Depends(current_user),
    session: Session = Depends(get_session),
):
    lead = owned_lead(session, user_id, lead_id)
    note = Discussion(lead_id=lead.id, **payload.model_dump())
    session.add(note)
    if payload.follow_up_at is not None:
        lead.follow_up_at = payload.follow_up_at
    lead.updated_at = note.created_at
    session.add(lead)
    # Commit the note and reminder together; omitted reminders preserve the current one.
    session.commit()
    session.refresh(lead)
    return lead_detail(session, lead)
