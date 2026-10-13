"""
Notices and Institutional Bulletins API endpoints.
"""

from typing import List, Optional
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.db.session import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user, require_roles
from app.core.rbac import UserRole
from app.models.user import User
from app.models.communication import Notice, NoticeCategory, NoticePriority, NoticeRead
from app.schemas.communication import NoticeCreate, NoticeUpdate, NoticeResponse

router = APIRouter()

NOTICES_UPLOAD_DIR = Path(settings.UPLOAD_DIR) / "notices"
NOTICES_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/", response_model=List[NoticeResponse], summary="List Notices")
def list_notices(
    category: Optional[NoticeCategory] = None,
    department_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List active campus notices.
    Filters by audience: ALL or the user's specific role.
    Sorts pinned notices to the top.
    """
    now = datetime.now(timezone.utc)
    query = db.query(Notice).filter(
        (Notice.target_role == "ALL") | (Notice.target_role == current_user.role.value),
        (Notice.expiry_date.is_(None)) | (Notice.expiry_date > now)
    )

    if category:
        query = query.filter(Notice.category == category)
    if department_id:
        query = query.filter(Notice.department_id == department_id)

    notices = query.order_by(desc(Notice.is_pinned), desc(Notice.publish_date)).all()
    results = []
    for n in notices:
        results.append(_build_notice_response(n, current_user.id, db))
    return results


@router.post("/", response_model=NoticeResponse, status_code=status.HTTP_201_CREATED, summary="Publish Notice")
def create_notice(
    notice_in: NoticeCreate,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Publish a new notice to the campus bulletin board."""
    notice = Notice(
        **notice_in.model_dump(),
        created_by_user_id=current_user.id
    )
    db.add(notice)
    db.commit()
    db.refresh(notice)
    return _build_notice_response(notice, current_user.id, db)


@router.get("/{notice_id}", response_model=NoticeResponse, summary="Get Notice Details")
def get_notice_by_id(
    notice_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve full notice bulletin by ID and increment view count."""
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found.")

    notice.views_count += 1
    db.commit()
    db.refresh(notice)
    return _build_notice_response(notice, current_user.id, db)


@router.put("/{notice_id}", response_model=NoticeResponse, summary="Update Notice")
def update_notice(
    notice_id: str,
    notice_in: NoticeUpdate,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Update notice details."""
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found.")

    for field, val in notice_in.model_dump(exclude_unset=True).items():
        setattr(notice, field, val)

    notice.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(notice)
    return _build_notice_response(notice, current_user.id, db)


@router.post("/{notice_id}/read", summary="Mark Notice as Read")
def mark_notice_as_read(
    notice_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record that the current user has read this notice."""
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found.")

    existing = db.query(NoticeRead).filter(
        NoticeRead.notice_id == notice_id,
        NoticeRead.user_id == current_user.id
    ).first()

    if not existing:
        read_rec = NoticeRead(notice_id=notice_id, user_id=current_user.id)
        db.add(read_rec)
        db.commit()

    return {"status": "success", "message": "Notice marked as read."}


@router.get("/{notice_id}/attachment", summary="Download Notice Attachment")
def download_notice_attachment(
    notice_id: str,
    db: Session = Depends(get_db)
):
    """Download notice attachment file."""
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found.")

    if not notice.attachment_path or not Path(notice.attachment_path).exists():
        raise HTTPException(status_code=404, detail="No attachment found for this notice.")

    filename = notice.attachment_name or Path(notice.attachment_path).name
    return FileResponse(notice.attachment_path, filename=filename)


@router.delete("/{notice_id}", summary="Delete Notice")
def delete_notice(
    notice_id: str,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Delete a notice bulletin (Admin only)."""
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found.")
    db.delete(notice)
    db.commit()
    return {"status": "success", "message": "Notice deleted."}


def _build_notice_response(n: Notice, user_id: str, db: Session) -> NoticeResponse:
    read_count = db.query(NoticeRead).filter(NoticeRead.notice_id == n.id).count()
    is_read = db.query(NoticeRead).filter(
        NoticeRead.notice_id == n.id,
        NoticeRead.user_id == user_id
    ).first() is not None

    return NoticeResponse(
        id=n.id,
        title=n.title,
        content=n.content,
        category=n.category,
        priority=n.priority,
        target_role=n.target_role,
        is_pinned=n.is_pinned,
        publish_date=n.publish_date,
        expiry_date=n.expiry_date,
        department_id=n.department_id,
        course_id=n.course_id,
        semester_number=n.semester_number,
        attachment_path=n.attachment_path,
        attachment_name=n.attachment_name,
        status=n.status,
        views_count=n.views_count,
        read_count=read_count,
        is_read=is_read,
        creator_name=n.creator.full_name if n.creator else None,
        department_name=n.department.name if n.department else None,
        course_name=n.course.name if n.course else None,
        created_at=n.created_at,
        updated_at=n.updated_at
    )
