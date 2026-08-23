from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Complaint, Setting, ComplaintStatus, ComplaintCategory
from app.schemas.notices import DashboardStats, SettingsOut, SettingsUpdate
from app.dependencies import get_current_admin

router = APIRouter(prefix="/api/admin", tags=["Admin"])


def get_or_create_settings(db: Session) -> Setting:
    setting = db.query(Setting).filter(Setting.id == 1).first()
    if not setting:
        setting = Setting(id=1, overdue_days=3)
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    setting = get_or_create_settings(db)
    overdue_days = setting.overdue_days
    threshold = datetime.now(timezone.utc) - timedelta(days=overdue_days)

    total = db.query(Complaint).count()
    open_count = db.query(Complaint).filter(Complaint.status == ComplaintStatus.OPEN).count()
    in_progress = db.query(Complaint).filter(Complaint.status == ComplaintStatus.IN_PROGRESS).count()
    resolved = db.query(Complaint).filter(Complaint.status == ComplaintStatus.RESOLVED).count()
    overdue = (
        db.query(Complaint)
        .filter(
            Complaint.status != ComplaintStatus.RESOLVED,
            Complaint.created_at < threshold,
        )
        .count()
    )

    # By category
    by_category = {}
    for cat in ComplaintCategory:
        count = db.query(Complaint).filter(Complaint.category == cat).count()
        by_category[cat.value] = count

    return DashboardStats(
        total_complaints=total,
        open_complaints=open_count,
        in_progress_complaints=in_progress,
        resolved_complaints=resolved,
        overdue_complaints=overdue,
        by_category=by_category,
    )


@router.get("/settings", response_model=SettingsOut)
def get_settings(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return get_or_create_settings(db)


@router.patch("/settings", response_model=SettingsOut)
def update_settings(
    payload: SettingsUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    setting = get_or_create_settings(db)
    setting.overdue_days = payload.overdue_days
    setting.updated_by = current_admin.id
    setting.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(setting)
    return setting
