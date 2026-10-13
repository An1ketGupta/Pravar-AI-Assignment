"""Create accounts, leads, and discussions."""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "accounts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "leads",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("company", sa.String(160)),
        sa.Column("phone", sa.String(40)),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("follow_up_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status IN ('new','contacted','qualified','proposal_sent','won','lost')",
            name="ck_leads_status",
        ),
    )
    op.create_index("ix_leads_owner_id", "leads", ["owner_id"])
    op.create_index("ix_leads_owner_updated", "leads", ["owner_id", "updated_at"])
    op.create_table(
        "discussions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("lead_id", sa.Uuid(), sa.ForeignKey("leads.id"), nullable=False),
        sa.Column("content", sa.String(5000), nullable=False),
        sa.Column("is_creation", sa.Boolean(), nullable=False),
        sa.Column("follow_up_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_discussions_lead_id", "discussions", ["lead_id"])
    op.create_index("ix_discussions_lead_created", "discussions", ["lead_id", "created_at"])


def downgrade():
    op.drop_table("discussions")
    op.drop_table("leads")
    op.drop_table("accounts")
