"""
Notification Center API endpoints.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.communication import Notification, NotificationType
from app.schemas.communication import NotificationCreate, NotificationResponse, UnreadCountResponse

router = APIRouter()


@router.get("/", response_model=List[NotificationResponse], summary="List Notifications")
def list_my_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve notifications for the authenticated user, ordered by newest first."""
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(desc(Notification.created_at)).all()
    return notifications


@router.get("/unread-count", response_model=UnreadCountResponse, summary="Get Unread Notification Count")
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve number of unread alerts for the header counter badge."""
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    return UnreadCountResponse(unread_count=count)


@router.put("/{notification_id}/read", summary="Mark Notification as Read")
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a single notification as read."""
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")

    notif.is_read = True
    db.commit()
    return {"status": "success", "message": "Marked as read."}


@router.put("/read-all", summary="Mark All Notifications as Read")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for current user."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"status": "success", "message": "All notifications marked as read."}


@router.post("/", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED, summary="Create Notification")
def send_notification(
    notif_in: NotificationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Dispatch a new notification to a target user."""
    notif = Notification(**notif_in.model_dump())
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif
