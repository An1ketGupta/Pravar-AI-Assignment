from datetime import datetime, timezone
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator

from app.models import LeadStatus


class InputModel(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class BootstrapInput(InputModel):
    timezone: str = "UTC"

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError) as error:
            raise ValueError("Choose a valid IANA timezone") from error
        return value


class LeadCreate(InputModel):
    name: str = Field(min_length=1, max_length=120)
    company: str | None = Field(default=None, max_length=160)
    phone: str | None = Field(default=None, max_length=40)

    @field_validator("company", "phone")
    @classmethod
    def blank_to_none(cls, value: str | None) -> str | None:
        return value or None


class LeadUpdate(InputModel):
    status: LeadStatus | None = None
    follow_up_at: AwareDatetime | None = None

    @field_validator("status")
    @classmethod
    def non_null_status(cls, value: LeadStatus | None) -> LeadStatus:
        if value is None:
            raise ValueError("Status cannot be null")
        return value


class DiscussionCreate(InputModel):
    content: str = Field(min_length=1, max_length=5000)
    follow_up_at: AwareDatetime | None = None

    @field_validator("follow_up_at")
    @classmethod
    def normalize_follow_up(cls, value: datetime | None) -> datetime | None:
        return value.astimezone(timezone.utc) if value else None


class DiscussionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    content: str
    created_at: datetime
    follow_up_at: datetime | None
    is_creation: bool


class LeadRead(BaseModel):
    id: UUID
    name: str
    company: str | None
    phone: str | None
    status: LeadStatus
    follow_up_at: datetime | None
    created_at: datetime
    updated_at: datetime
    last_note: str | None = None
    last_discussion_at: datetime | None = None


class LeadDetail(LeadRead):
    discussions: list[DiscussionRead]
