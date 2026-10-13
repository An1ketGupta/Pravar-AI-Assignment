from sqlalchemy import event
from sqlmodel import Session, create_engine

from app.config import get_settings

settings = get_settings()
is_sqlite = settings.sqlalchemy_url.startswith("sqlite")
engine = create_engine(
    settings.sqlalchemy_url,
    connect_args={"check_same_thread": False} if is_sqlite else {},
    pool_pre_ping=True,
    hide_parameters=True,
)

if is_sqlite:

    @event.listens_for(engine, "connect")
    def sqlite_foreign_keys(connection, record):
        connection.execute("PRAGMA foreign_keys=ON")


def get_session():
    with Session(engine) as session:
        yield session
