"""
Pydantic schemas for Notices, Events, and Notifications.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.communication import NoticeCategory, NoticePriority, EventCategory, NotificationType


# --- Notices ---
class NoticeCreate(BaseModel):
    title: str
    content: str
    category: NoticeCategory = NoticeCategory.GENERAL
    priority: NoticePriority = NoticePriority.MEDIUM
    target_role: str = "ALL"
    is_pinned: bool = False
    expiry_date: Optional[datetime] = None
    department_id: Optional[str] = None
    course_id: Optional[str] = None
    semester_number: Optional[int] = None
    attachment_path: Optional[str] = None
    attachment_name: Optional[str] = None
    status: str = "PUBLISHED"


class NoticeUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[NoticeCategory] = None
    priority: Optional[NoticePriority] = None
    target_role: Optional[str] = None
    is_pinned: Optional[bool] = None
    expiry_date: Optional[datetime] = None
    department_id: Optional[str] = None
    course_id: Optional[str] = None
    semester_number: Optional[int] = None
    attachment_path: Optional[str] = None
    attachment_name: Optional[str] = None
    status: Optional[str] = None


class NoticeResponse(NoticeCreate):
    id: str
    publish_date: datetime
    views_count: int = 0
    read_count: int = 0
    is_read: bool = False
    creator_name: Optional[str] = None
    department_name: Optional[str] = None
    course_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# --- Events ---
class EventCreate(BaseModel):
    title: str
    description: str
    category: EventCategory = EventCategory.WORKSHOP
    venue: str
    event_date: datetime
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    registration_deadline: Optional[datetime] = None
    attachment_url: Optional[str] = None
    status: str = "UPCOMING"
    organizer: Optional[str] = None
    max_participants: int = 100


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[EventCategory] = None
    venue: Optional[str] = None
    event_date: Optional[datetime] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    registration_deadline: Optional[datetime] = None
    attachment_url: Optional[str] = None
    status: Optional[str] = None
    organizer: Optional[str] = None
    max_participants: Optional[int] = None


class EventRegistrationResponse(BaseModel):
    id: str
    event_id: str
    student_id: str
    registered_at: datetime
    status: str

    model_config = ConfigDict(from_attributes=True)


class EventRegistrationDetailResponse(EventRegistrationResponse):
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    enrollment_number: Optional[str] = None
    department_name: Optional[str] = None


class EventResponse(EventCreate):
    id: str
    created_at: datetime
    registration_count: int = 0
    is_registered: bool = False

    model_config = ConfigDict(from_attributes=True)


# --- Notifications ---
class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    type: NotificationType = NotificationType.INFO


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: NotificationType
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UnreadCountResponse(BaseModel):
    unread_count: int
