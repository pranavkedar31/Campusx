"""
Learning Management and Study Material Models for CampusX College ERP.
Allows faculty to distribute notes, presentations, documents, and reference links.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import String, Integer, ForeignKey, DateTime, Enum as SQLEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class MaterialType(str, Enum):
    PDF = "PDF"
    PPT = "PPT"
    NOTES = "NOTES"
    LINK = "LINK"


class StudyMaterial(Base):
    __tablename__ = "study_materials"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subject_id: Mapped[str] = mapped_column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_id: Mapped[str] = mapped_column(String(36), ForeignKey("faculty.id", ondelete="CASCADE"), nullable=False, index=True)
    department_id: Mapped[str] = mapped_column(String(36), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True)
    semester_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    file_type: Mapped[MaterialType] = mapped_column(
        SQLEnum(MaterialType, name="material_type_enum"),
        default=MaterialType.PDF,
        nullable=False
    )
    file_path: Mapped[str] = mapped_column(String(255), nullable=True)
    external_url: Mapped[str] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    subject = relationship("Subject")
    faculty = relationship("Faculty")
    department = relationship("Department")
