"""
Digital Certificates and Document Verification models for CampusX.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import String, ForeignKey, DateTime, Enum as SQLEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class CertificateType(str, Enum):
    BONAFIDE = "BONAFIDE"
    LEAVE = "LEAVE"
    INTERNSHIP = "INTERNSHIP"
    COURSE_COMPLETION = "COURSE_COMPLETION"


class CertificateStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class Certificate(Base):
    __tablename__ = "certificates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    certificate_uuid: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    type: Mapped[CertificateType] = mapped_column(
        SQLEnum(CertificateType, name="certificate_type_enum"),
        default=CertificateType.BONAFIDE,
        nullable=False
    )
    status: Mapped[CertificateStatus] = mapped_column(
        SQLEnum(CertificateStatus, name="certificate_status_enum"),
        default=CertificateStatus.PENDING,
        nullable=False,
        index=True
    )
    purpose: Mapped[str] = mapped_column(String(255), nullable=False)
    issue_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    expiry_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    pdf_filename: Mapped[str] = mapped_column(String(255), nullable=True)
    qr_code_data: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    student = relationship("Student")
    approver = relationship("User")
