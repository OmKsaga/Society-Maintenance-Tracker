from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Notice, UserRole
from app.schemas.notices import NoticeCreate, NoticeOut
from app.dependencies import get_current_user, get_current_admin
from app.services.email import send_important_notice_email
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Notices"])


def notice_to_out(n: Notice) -> NoticeOut:
    return NoticeOut(
        id=n.id,
        title=n.title,
        content=n.content,
        is_important=n.is_important,
        created_by=n.created_by,
        creator_name=n.creator.name if n.creator else None,
        created_at=n.created_at,
        updated_at=n.updated_at,
    )


@router.get("/api/notices", response_model=list[NoticeOut])
def get_notices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all notices. Important ones are sorted to top."""
    from sqlalchemy.orm import joinedload
    notices = (
        db.query(Notice)
        .options(joinedload(Notice.creator))
        .order_by(Notice.is_important.desc(), Notice.created_at.desc())
        .all()
    )
    return [notice_to_out(n) for n in notices]


@router.post("/api/admin/notices", response_model=NoticeOut, status_code=status.HTTP_201_CREATED)
def create_notice(
    payload: NoticeCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    notice = Notice(
        title=payload.title,
        content=payload.content,
        is_important=payload.is_important,
        created_by=current_admin.id,
    )
    db.add(notice)
    db.commit()
    db.refresh(notice)

    # Reload with creator
    from sqlalchemy.orm import joinedload
    full = db.query(Notice).options(joinedload(Notice.creator)).filter(Notice.id == notice.id).first()

    # Send email to all residents if important
    if payload.is_important:
        try:
            residents = db.query(User).filter(User.role == UserRole.RESIDENT).all()
            emails = [r.email for r in residents]
            send_important_notice_email(emails, payload.title, payload.content)
        except Exception as e:
            logger.error(f"Failed to send important notice emails: {e}")

    return notice_to_out(full)


@router.delete("/api/admin/notices/{notice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notice(
    notice_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    db.delete(notice)
    db.commit()
