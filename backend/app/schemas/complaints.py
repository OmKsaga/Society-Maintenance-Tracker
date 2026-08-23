from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, field_validator
from app.models import ComplaintCategory, ComplaintPriority, ComplaintStatus
from app.schemas.auth import UserOut


class ComplaintCreate(BaseModel):
    category: ComplaintCategory
    description: str

    @field_validator("description")
    @classmethod
    def description_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Description cannot be empty")
        if len(v) < 10:
            raise ValueError("Description must be at least 10 characters")
        if len(v) > 2000:
            raise ValueError("Description cannot exceed 2000 characters")
        return v


class ComplaintHistoryOut(BaseModel):
    id: int
    old_status: Optional[ComplaintStatus]
    new_status: ComplaintStatus
    note: Optional[str]
    created_at: datetime
    actor: UserOut

    model_config = {"from_attributes": True}


class ComplaintOut(BaseModel):
    id: int
    resident_id: int
    category: ComplaintCategory
    description: str
    photo_url: Optional[str]
    priority: ComplaintPriority
    status: ComplaintStatus
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]
    is_overdue: bool = False
    resident: Optional[UserOut] = None
    history: List[ComplaintHistoryOut] = []

    model_config = {"from_attributes": True}


class StatusUpdateRequest(BaseModel):
    status: ComplaintStatus
    note: Optional[str] = None

    @field_validator("note")
    @classmethod
    def note_length(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) > 1000:
            raise ValueError("Note cannot exceed 1000 characters")
        return v


class PriorityUpdateRequest(BaseModel):
    priority: ComplaintPriority


class ComplaintFilter(BaseModel):
    category: Optional[ComplaintCategory] = None
    status: Optional[ComplaintStatus] = None
    date_filter: Optional[str] = None  # today|7d|30d|custom
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
