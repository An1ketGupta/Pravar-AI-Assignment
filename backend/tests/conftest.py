import os
from uuid import UUID

os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["LOCAL_DEMO_MODE"] = "true"

import pytest  # noqa: E402
from fastapi import Header  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402
from sqlmodel import Session, SQLModel, create_engine  # noqa: E402

from app.auth import DEMO_USER_ID, current_user  # noqa: E402
from app.db import get_session  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)

    def session_override():
        with Session(engine) as session:
            yield session

    def user_override(x_test_user: str | None = Header(default=None)):
        return UUID(x_test_user) if x_test_user else DEMO_USER_ID

    app.dependency_overrides[get_session] = session_override
    app.dependency_overrides[current_user] = user_override
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    engine.dispose()
