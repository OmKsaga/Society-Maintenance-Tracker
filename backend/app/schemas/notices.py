from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator


class NoticeCreate(BaseModel):
    title: str
    content: str
    is_important: bool = False

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Title cannot be empty")
        if len(v) > 512:
            raise ValueError("Title too long")
        return v

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Content cannot be empty")
        return v


class NoticeOut(BaseModel):
    id: int
    title: str
    content: str
    is_important: bool
    created_by: int
    creator_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SettingsOut(BaseModel):
    id: int
    overdue_days: int
    updated_at: datetime
    updated_by: Optional[int]

    model_config = {"from_attributes": True}


class SettingsUpdate(BaseModel):
    overdue_days: int

    @field_validator("overdue_days")
    @classmethod
    def overdue_days_valid(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Overdue days must be at least 1")
        if v > 365:
            raise ValueError("Overdue days cannot exceed 365")
        return v


class DashboardStats(BaseModel):
    total_complaints: int
    open_complaints: int
    in_progress_complaints: int
    resolved_complaints: int
    overdue_complaints: int
    by_category: dict
