import enum
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import (
    String, Text, Boolean, DateTime, Enum as SAEnum,
    ForeignKey, Integer
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class UserRole(str, enum.Enum):
    RESIDENT = "RESIDENT"
    ADMIN = "ADMIN"


class ComplaintCategory(str, enum.Enum):
    PLUMBING = "PLUMBING"
    ELECTRICAL = "ELECTRICAL"
    CLEANING = "CLEANING"
    SECURITY = "SECURITY"
    LIFT_ELEVATOR = "LIFT_ELEVATOR"
    WATER_SUPPLY = "WATER_SUPPLY"
    PARKING = "PARKING"
    COMMON_AREA = "COMMON_AREA"
    OTHER = "OTHER"


class ComplaintPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class ComplaintStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"


# SQLAlchemy enum type constructors — native_enum=False for SQLite test compat
def _enum(*args, **kwargs):
    """Create an SQLAlchemy Enum that works with both PostgreSQL and SQLite."""
    kwargs.setdefault("native_enum", False)
    return SAEnum(*args, **kwargs)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        _enum(UserRole, name="user_role"), nullable=False, default=UserRole.RESIDENT
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationships
    complaints: Mapped[List["Complaint"]] = relationship(back_populates="resident", foreign_keys="Complaint.resident_id")
    history_actions: Mapped[List["ComplaintHistory"]] = relationship(back_populates="actor", foreign_keys="ComplaintHistory.actor_id")
    notices: Mapped[List["Notice"]] = relationship(back_populates="creator")


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    resident_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category: Mapped[ComplaintCategory] = mapped_column(
        _enum(ComplaintCategory, name="complaint_category"), nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    photo_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    photo_public_id: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    priority: Mapped[ComplaintPriority] = mapped_column(
        _enum(ComplaintPriority, name="complaint_priority"),
        nullable=False, default=ComplaintPriority.MEDIUM
    )
    status: Mapped[ComplaintStatus] = mapped_column(
        _enum(ComplaintStatus, name="complaint_status"),
        nullable=False, default=ComplaintStatus.OPEN
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    resident: Mapped["User"] = relationship(back_populates="complaints", foreign_keys=[resident_id])
    history: Mapped[List["ComplaintHistory"]] = relationship(
        back_populates="complaint", order_by="ComplaintHistory.created_at"
    )


class ComplaintHistory(Base):
    __tablename__ = "complaint_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    complaint_id: Mapped[int] = mapped_column(Integer, ForeignKey("complaints.id"), nullable=False, index=True)
    actor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    old_status: Mapped[Optional[ComplaintStatus]] = mapped_column(
        _enum(ComplaintStatus, name="complaint_status"), nullable=True
    )
    new_status: Mapped[ComplaintStatus] = mapped_column(
        _enum(ComplaintStatus, name="complaint_status"), nullable=False
    )
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    # Relationships
    complaint: Mapped["Complaint"] = relationship(back_populates="history")
    actor: Mapped["User"] = relationship(back_populates="history_actions", foreign_keys=[actor_id])


class Notice(Base):
    __tablename__ = "notices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_important: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationships
    creator: Mapped["User"] = relationship(back_populates="notices")


class Setting(Base):
    """
    Single-row settings table. Always has exactly one row (id=1).
    """
    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    overdue_days: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    updated_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
