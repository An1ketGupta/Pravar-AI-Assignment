"""Keep Supabase's public Data API from bypassing FastAPI's account isolation."""

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    if op.get_bind().dialect.name != "postgresql":
        return
    for table in ("accounts", "leads", "discussions"):
        # No browser Data API access is needed: all CRM operations go through FastAPI.
        # The server's trusted database connection can still access these tables.
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        for role in ("anon", "authenticated"):
            op.execute(
                f"DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{role}') "
                f"THEN REVOKE ALL ON TABLE {table} FROM {role}; END IF; END $$;"
            )


def downgrade():
    if op.get_bind().dialect.name == "postgresql":
        for table in ("accounts", "leads", "discussions"):
            op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
    # Do not silently re-grant public permissions during a rollback.
