"""
Notices, Campus Events, and System Notifications models for CampusX.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import String, Integer, Boolean, ForeignKey, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class NoticeCategory(str, Enum):
    ACADEMIC = "ACADEMIC"
    EXAMINATION = "EXAMINATION"
    GENERAL = "GENERAL"
    PLACEMENT = "PLACEMENT"
    HOLIDAY = "HOLIDAY"


class NoticePriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class EventCategory(str, Enum):
    WORKSHOP = "WORKSHOP"
    SEMINAR = "SEMINAR"
    HACKATHON = "HACKATHON"
    CULTURAL = "CULTURAL"
    SPORTS = "SPORTS"
    PLACEMENT_DRIVE = "PLACEMENT_DRIVE"


class NotificationType(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ALERT = "ALERT"
    SUCCESS = "SUCCESS"


class Notice(Base):
    __tablename__ = "notices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[NoticeCategory] = mapped_column(
        SQLEnum(NoticeCategory, name="notice_category_enum"),
        default=NoticeCategory.GENERAL,
        nullable=False
    )
    priority: Mapped[NoticePriority] = mapped_column(
        SQLEnum(NoticePriority, name="notice_priority_enum"),
        default=NoticePriority.MEDIUM,
        nullable=False
    )
    target_role: Mapped[str] = mapped_column(String(50), default="ALL", nullable=False)  # ALL, STUDENT, FACULTY
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    publish_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    expiry_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    department_id: Mapped[str] = mapped_column(String(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    semester_number: Mapped[int] = mapped_column(Integer, nullable=True)
    attachment_path: Mapped[str] = mapped_column(String(500), nullable=True)
    attachment_name: Mapped[str] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="PUBLISHED", nullable=False)  # DRAFT, PUBLISHED, ARCHIVED
    views_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    creator = relationship("User")
    department = relationship("Department")
    course = relationship("Course")
    reads = relationship("NoticeRead", back_populates="notice", cascade="all, delete-orphan")


class NoticeRead(Base):
    __tablename__ = "notice_reads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    notice_id: Mapped[str] = mapped_column(String(36), ForeignKey("notices.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    read_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    notice = relationship("Notice", back_populates="reads")
    user = relationship("User")


class CampusEvent(Base):
    __tablename__ = "campus_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[EventCategory] = mapped_column(
        SQLEnum(EventCategory, name="event_category_enum"),
        default=EventCategory.WORKSHOP,
        nullable=False
    )
    venue: Mapped[str] = mapped_column(String(255), nullable=False)
    event_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    start_time: Mapped[str] = mapped_column(String(20), nullable=True)
    end_time: Mapped[str] = mapped_column(String(20), nullable=True)
    registration_deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    attachment_url: Mapped[str] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="UPCOMING", nullable=False)
    organizer: Mapped[str] = mapped_column(String(255), nullable=True)
    max_participants: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    created_by_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    registrations = relationship("EventRegistration", back_populates="event", cascade="all, delete-orphan")


class EventRegistration(Base):
    __tablename__ = "event_registrations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("campus_events.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    status: Mapped[str] = mapped_column(String(50), default="Confirmed")

    event = relationship("CampusEvent", back_populates="registrations")
    student = relationship("Student")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[NotificationType] = mapped_column(
        SQLEnum(NotificationType, name="notification_type_enum"),
        default=NotificationType.INFO,
        nullable=False
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    user = relationship("User")
