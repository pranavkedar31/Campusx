"""
Student Application and Request Center Models for CampusX.
Enables students to apply for certificates, concessions, duplicate hall tickets, and corrections.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import String, Integer, ForeignKey, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class ApplicationType(str, Enum):
    BONAFIDE_CERTIFICATE = "BONAFIDE_CERTIFICATE"
    LEAVING_CERTIFICATE = "LEAVING_CERTIFICATE"
    TRANSCRIPT_REQUEST = "TRANSCRIPT_REQUEST"
    CHARACTER_CERTIFICATE = "CHARACTER_CERTIFICATE"
    RAILWAY_CONCESSION = "RAILWAY_CONCESSION"
    BUS_CONCESSION = "BUS_CONCESSION"
    SCHOLARSHIP_NOC = "SCHOLARSHIP_NOC"
    EXAM_HALL_TICKET_DUPLICATE = "EXAM_HALL_TICKET_DUPLICATE"
    GRADE_CARD_DUPLICATE = "GRADE_CARD_DUPLICATE"
    COURSE_COMPLETION = "COURSE_COMPLETION"
    INTERNSHIP_NOC = "INTERNSHIP_NOC"
    FEE_CONCESSION_REQUEST = "FEE_CONCESSION_REQUEST"
    NAME_CORRECTION = "NAME_CORRECTION"
    OTHER = "OTHER"


class ApplicationStatus(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    READY_FOR_COLLECTION = "READY_FOR_COLLECTION"
    DISPATCHED = "DISPATCHED"
    CORRECTION_REQUESTED = "CORRECTION_REQUESTED"


class StudentApplication(Base):
    __tablename__ = "student_applications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    application_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    application_type: Mapped[ApplicationType] = mapped_column(
        SQLEnum(ApplicationType, name="application_type_enum"),
        nullable=False
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ApplicationStatus] = mapped_column(
        SQLEnum(ApplicationStatus, name="application_status_enum"),
        default=ApplicationStatus.SUBMITTED,
        nullable=False,
        index=True
    )
    supporting_document_url: Mapped[str] = mapped_column(String(500), nullable=True)
    generated_document_url: Mapped[str] = mapped_column(String(500), nullable=True)
    academic_year: Mapped[str] = mapped_column(String(50), default="2025-2026", nullable=False)
    semester_number: Mapped[int] = mapped_column(Integer, nullable=True)
    admin_remarks: Mapped[str] = mapped_column(Text, nullable=True)
    reviewed_by_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    student = relationship("Student")
    reviewer = relationship("User", foreign_keys=[reviewed_by_user_id])
    history = relationship("ApplicationHistory", back_populates="application", cascade="all, delete-orphan", order_by="ApplicationHistory.created_at.desc()")


class ApplicationHistory(Base):
    __tablename__ = "application_histories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    application_id: Mapped[str] = mapped_column(String(36), ForeignKey("student_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[ApplicationStatus] = mapped_column(
        SQLEnum(ApplicationStatus, name="application_status_enum"),
        nullable=False
    )
    action_by_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    remarks: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    application = relationship("StudentApplication", back_populates="history")
    action_by = relationship("User")
