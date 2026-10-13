from alembic import context
from sqlmodel import SQLModel

from app import models  # noqa: F401 -- register tables for migration comparisons
from app.db import engine


def run_migrations():
    if context.is_offline_mode():
        context.configure(
            url=str(engine.url), target_metadata=SQLModel.metadata, literal_binds=True
        )
        with context.begin_transaction():
            context.run_migrations()
    else:
        with engine.connect() as connection:
            context.configure(connection=connection, target_metadata=SQLModel.metadata)
            with context.begin_transaction():
                context.run_migrations()


run_migrations()
