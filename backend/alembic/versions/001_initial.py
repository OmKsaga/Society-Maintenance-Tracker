"""Initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-08-23

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enums
    user_role = sa.Enum("RESIDENT", "ADMIN", name="user_role")
    complaint_category = sa.Enum(
        "PLUMBING", "ELECTRICAL", "CLEANING", "SECURITY",
        "LIFT_ELEVATOR", "WATER_SUPPLY", "PARKING", "COMMON_AREA", "OTHER",
        name="complaint_category",
    )
    complaint_priority = sa.Enum("LOW", "MEDIUM", "HIGH", name="complaint_priority")
    complaint_status = sa.Enum("OPEN", "IN_PROGRESS", "RESOLVED", name="complaint_status")

    # users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", user_role, nullable=False, server_default="RESIDENT"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # complaints
    op.create_table(
        "complaints",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("resident_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("category", complaint_category, nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("photo_url", sa.String(1024), nullable=True),
        sa.Column("photo_public_id", sa.String(512), nullable=True),
        sa.Column("priority", complaint_priority, nullable=False, server_default="MEDIUM"),
        sa.Column("status", complaint_status, nullable=False, server_default="OPEN"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_complaints_resident_id", "complaints", ["resident_id"])
    op.create_index("ix_complaints_created_at", "complaints", ["created_at"])

    # complaint_history
    op.create_table(
        "complaint_history",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("complaint_id", sa.Integer, sa.ForeignKey("complaints.id"), nullable=False),
        sa.Column("actor_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("old_status", complaint_status, nullable=True),
        sa.Column("new_status", complaint_status, nullable=False),
        sa.Column("note", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_complaint_history_complaint_id", "complaint_history", ["complaint_id"])
    op.create_index("ix_complaint_history_created_at", "complaint_history", ["created_at"])

    # notices
    op.create_table(
        "notices",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("is_important", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_by", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index("ix_notices_created_at", "notices", ["created_at"])

    # settings
    op.create_table(
        "settings",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("overdue_days", sa.Integer, nullable=False, server_default="3"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column("updated_by", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
    )

    # Insert default settings row
    op.execute("INSERT INTO settings (id, overdue_days) VALUES (1, 3)")


def downgrade() -> None:
    op.drop_table("settings")
    op.drop_table("notices")
    op.drop_index("ix_complaint_history_created_at", "complaint_history")
    op.drop_index("ix_complaint_history_complaint_id", "complaint_history")
    op.drop_table("complaint_history")
    op.drop_index("ix_complaints_created_at", "complaints")
    op.drop_index("ix_complaints_resident_id", "complaints")
    op.drop_table("complaints")
    op.drop_index("ix_users_email", "users")
    op.drop_table("users")

    # Drop enums
    for enum_name in ["complaint_status", "complaint_priority", "complaint_category", "user_role"]:
        sa.Enum(name=enum_name).drop(op.get_bind(), checkfirst=True)
