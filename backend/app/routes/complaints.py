from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import User, Complaint, ComplaintHistory, Setting, ComplaintStatus, ComplaintCategory, ComplaintPriority
from app.schemas.complaints import ComplaintOut, ComplaintHistoryOut, StatusUpdateRequest, PriorityUpdateRequest
from app.schemas.auth import UserOut
from app.dependencies import get_current_user, get_current_admin
from app.services.storage import upload_image, validate_image
from app.services.email import send_status_change_email
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Complaints"])

# Valid status transitions
VALID_TRANSITIONS = {
    ComplaintStatus.OPEN: [ComplaintStatus.IN_PROGRESS],
    ComplaintStatus.IN_PROGRESS: [ComplaintStatus.RESOLVED],
    ComplaintStatus.RESOLVED: [],
}


def get_overdue_days(db: Session) -> int:
    setting = db.query(Setting).filter(Setting.id == 1).first()
    return setting.overdue_days if setting else 3


def is_overdue(complaint: Complaint, overdue_days: int) -> bool:
    if complaint.status == ComplaintStatus.RESOLVED:
        return False
    threshold = complaint.created_at + timedelta(days=overdue_days)
    now = datetime.now(timezone.utc)
    # Handle both tz-aware (PostgreSQL) and tz-naive (SQLite in tests)
    if threshold.tzinfo is None:
        now = now.replace(tzinfo=None)
    return now > threshold


def enrich_complaint(complaint: Complaint, overdue_days: int) -> ComplaintOut:
    """Convert ORM object to Pydantic schema with computed is_overdue."""
    history_out = [
        ComplaintHistoryOut(
            id=h.id,
            old_status=h.old_status,
            new_status=h.new_status,
            note=h.note,
            created_at=h.created_at,
            actor=UserOut.model_validate(h.actor),
        )
        for h in complaint.history
    ]
    resident_out = UserOut.model_validate(complaint.resident)
    return ComplaintOut(
        id=complaint.id,
        resident_id=complaint.resident_id,
        category=complaint.category,
        description=complaint.description,
        photo_url=complaint.photo_url,
        priority=complaint.priority,
        status=complaint.status,
        created_at=complaint.created_at,
        updated_at=complaint.updated_at,
        resolved_at=complaint.resolved_at,
        is_overdue=is_overdue(complaint, overdue_days),
        resident=resident_out,
        history=history_out,
    )


def load_complaint_with_relations(db: Session, complaint_id: int) -> Optional[Complaint]:
    return (
        db.query(Complaint)
        .options(
            joinedload(Complaint.resident),
            joinedload(Complaint.history).joinedload(ComplaintHistory.actor),
        )
        .filter(Complaint.id == complaint_id)
        .first()
    )


# ---------------------------------------------------------------------------
# Resident endpoints
# ---------------------------------------------------------------------------

@router.post("/api/complaints", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
async def create_complaint(
    category: str = Form(...),
    description: str = Form(...),
    photo: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Validate category
    try:
        cat = ComplaintCategory(category.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid category: {category}")

    # Validate description
    description = description.strip()
    if len(description) < 10:
        raise HTTPException(status_code=400, detail="Description must be at least 10 characters")
    if len(description) > 2000:
        raise HTTPException(status_code=400, detail="Description cannot exceed 2000 characters")

    photo_url: Optional[str] = None
    photo_public_id: Optional[str] = None

    if photo and photo.filename:
        validate_image(photo)
        photo_url, photo_public_id = await upload_image(photo)

    complaint = Complaint(
        resident_id=current_user.id,
        category=cat,
        description=description,
        photo_url=photo_url,
        photo_public_id=photo_public_id,
    )
    db.add(complaint)
    db.flush()

    # Create initial history record
    history = ComplaintHistory(
        complaint_id=complaint.id,
        actor_id=current_user.id,
        old_status=None,
        new_status=ComplaintStatus.OPEN,
        note="Complaint submitted",
    )
    db.add(history)
    db.commit()
    db.refresh(complaint)

    full = load_complaint_with_relations(db, complaint.id)
    overdue_days = get_overdue_days(db)
    return enrich_complaint(full, overdue_days)


@router.get("/api/complaints/my", response_model=list[ComplaintOut])
def get_my_complaints(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    complaints = (
        db.query(Complaint)
        .options(
            joinedload(Complaint.resident),
            joinedload(Complaint.history).joinedload(ComplaintHistory.actor),
        )
        .filter(Complaint.resident_id == current_user.id)
        .order_by(Complaint.created_at.desc())
        .all()
    )
    overdue_days = get_overdue_days(db)
    return [enrich_complaint(c, overdue_days) for c in complaints]


@router.get("/api/complaints/{complaint_id}", response_model=ComplaintOut)
def get_complaint(
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    complaint = load_complaint_with_relations(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Residents can only see their own; admins can see all
    from app.models import UserRole
    if current_user.role == UserRole.RESIDENT and complaint.resident_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    overdue_days = get_overdue_days(db)
    return enrich_complaint(complaint, overdue_days)


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------

@router.get("/api/admin/complaints", response_model=list[ComplaintOut])
def admin_list_complaints(
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    date_filter: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    overdue_days = get_overdue_days(db)
    query = db.query(Complaint).options(
        joinedload(Complaint.resident),
        joinedload(Complaint.history).joinedload(ComplaintHistory.actor),
    )

    # Category filter
    if category:
        try:
            cat = ComplaintCategory(category.upper())
            query = query.filter(Complaint.category == cat)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid category: {category}")

    # Status filter
    if status_filter:
        try:
            st = ComplaintStatus(status_filter.upper())
            query = query.filter(Complaint.status == st)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status_filter}")

    # Date filter
    now = datetime.now(timezone.utc)
    if date_filter == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(Complaint.created_at >= start)
    elif date_filter == "7d":
        query = query.filter(Complaint.created_at >= now - timedelta(days=7))
    elif date_filter == "30d":
        query = query.filter(Complaint.created_at >= now - timedelta(days=30))
    elif date_filter == "custom":
        if date_from:
            query = query.filter(Complaint.created_at >= datetime.fromisoformat(date_from))
        if date_to:
            query = query.filter(Complaint.created_at <= datetime.fromisoformat(date_to))

    all_complaints = query.order_by(Complaint.created_at.desc()).all()

    # Sort: overdue first, then by created_at desc
    def sort_key(c: Complaint):
        return (0 if is_overdue(c, overdue_days) else 1, -c.created_at.timestamp())

    all_complaints.sort(key=sort_key)
    return [enrich_complaint(c, overdue_days) for c in all_complaints]


@router.patch("/api/admin/complaints/{complaint_id}/status", response_model=ComplaintOut)
def update_complaint_status(
    complaint_id: int,
    payload: StatusUpdateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    complaint = load_complaint_with_relations(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    old_status = complaint.status
    new_status = payload.status

    # Validate transition
    if new_status not in VALID_TRANSITIONS.get(old_status, []):
        raise HTTPException(
            status_code=409,
            detail=f"Invalid status transition: {old_status.value} → {new_status.value}",
        )

    # Update complaint
    complaint.status = new_status
    if new_status == ComplaintStatus.RESOLVED:
        complaint.resolved_at = datetime.now(timezone.utc)

    # Create immutable history record
    history = ComplaintHistory(
        complaint_id=complaint.id,
        actor_id=current_admin.id,
        old_status=old_status,
        new_status=new_status,
        note=payload.note,
    )
    db.add(history)
    db.commit()

    # Reload with relations
    full = load_complaint_with_relations(db, complaint_id)
    overdue_days = get_overdue_days(db)

    # Send email (non-blocking, failure is logged)
    try:
        send_status_change_email(
            resident_email=full.resident.email,
            resident_name=full.resident.name,
            complaint_id=complaint_id,
            category=full.category.value,
            old_status=old_status.value,
            new_status=new_status.value,
            note=payload.note,
        )
    except Exception as e:
        logger.error(f"Email notification failed for complaint #{complaint_id}: {e}")

    return enrich_complaint(full, overdue_days)


@router.patch("/api/admin/complaints/{complaint_id}/priority", response_model=ComplaintOut)
def update_complaint_priority(
    complaint_id: int,
    payload: PriorityUpdateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    complaint.priority = payload.priority
    db.commit()

    full = load_complaint_with_relations(db, complaint_id)
    overdue_days = get_overdue_days(db)
    return enrich_complaint(full, overdue_days)


@router.get("/api/admin/complaints/overdue", response_model=list[ComplaintOut])
def get_overdue_complaints(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    overdue_days = get_overdue_days(db)
    threshold = datetime.now(timezone.utc) - timedelta(days=overdue_days)

    complaints = (
        db.query(Complaint)
        .options(
            joinedload(Complaint.resident),
            joinedload(Complaint.history).joinedload(ComplaintHistory.actor),
        )
        .filter(
            Complaint.status != ComplaintStatus.RESOLVED,
            Complaint.created_at < threshold,
        )
        .order_by(Complaint.created_at.asc())
        .all()
    )
    return [enrich_complaint(c, overdue_days) for c in complaints]
