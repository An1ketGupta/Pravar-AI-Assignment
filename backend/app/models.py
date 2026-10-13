from datetime import datetime, timezone
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, Index
from sqlalchemy import Enum as SAEnum
from sqlalchemy.types import TypeDecorator
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UTCDateTime(TypeDecorator):
    """Keep SQLite (local/tests) and PostgreSQL (hosted) equally timezone aware."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("A timezone-aware datetime is required")
        return value.astimezone(timezone.utc)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL_SENT = "proposal_sent"
    WON = "won"
    LOST = "lost"


class Account(SQLModel, table=True):
    __tablename__ = "accounts"

    id: UUID = Field(primary_key=True)
    created_at: datetime = Field(
        default_factory=utc_now, sa_column=Column(UTCDateTime, nullable=False)
    )


class Lead(SQLModel, table=True):
    __tablename__ = "leads"
    __table_args__ = (Index("ix_leads_owner_updated", "owner_id", "updated_at"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="accounts.id", index=True)
    name: str = Field(max_length=120)
    company: str | None = Field(default=None, max_length=160)
    phone: str | None = Field(default=None, max_length=40)
    status: LeadStatus = Field(
        default=LeadStatus.NEW,
        sa_column=Column(
            SAEnum(
                LeadStatus,
                values_callable=lambda statuses: [status.value for status in statuses],
                native_enum=False,
                length=20,
            ),
            nullable=False,
        ),
    )
    follow_up_at: datetime | None = Field(
        default=None, sa_column=Column(UTCDateTime, nullable=True)
    )
    created_at: datetime = Field(
        default_factory=utc_now, sa_column=Column(UTCDateTime, nullable=False)
    )
    updated_at: datetime = Field(
        default_factory=utc_now, sa_column=Column(UTCDateTime, nullable=False)
    )


class Discussion(SQLModel, table=True):
    __tablename__ = "discussions"
    __table_args__ = (Index("ix_discussions_lead_created", "lead_id", "created_at"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    lead_id: UUID = Field(foreign_key="leads.id", index=True)
    content: str = Field(max_length=5000)
    is_creation: bool = Field(default=False)
    follow_up_at: datetime | None = Field(
        default=None, sa_column=Column(UTCDateTime, nullable=True)
    )
    created_at: datetime = Field(
        default_factory=utc_now, sa_column=Column(UTCDateTime, nullable=False)
    )
