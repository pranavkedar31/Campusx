"""
Attendance and Assessment Marks models for CampusX.
"""

import uuid
from datetime import datetime, date, timezone
from enum import Enum
from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, Date, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class AttendanceStatus(str, Enum):
    PRESENT = "Present"
    ABSENT = "Absent"
    LATE = "Late"
    EXCUSED = "Excused"


class AssessmentType(str, Enum):
    INTERNAL = "INTERNAL"
    MIDTERM = "MIDTERM"
    FINAL = "FINAL"
    ASSIGNMENT = "ASSIGNMENT"
    PRACTICAL = "PRACTICAL"


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id: Mapped[str] = mapped_column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[AttendanceStatus] = mapped_column(
        SQLEnum(AttendanceStatus, name="attendance_status_enum"),
        default=AttendanceStatus.PRESENT,
        nullable=False
    )
    recorded_by_faculty_id: Mapped[str] = mapped_column(String(36), ForeignKey("faculty.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    student = relationship("Student")
    subject = relationship("Subject")
    faculty = relationship("Faculty")


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subject_id: Mapped[str] = mapped_column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[AssessmentType] = mapped_column(
        SQLEnum(AssessmentType, name="assessment_type_enum"),
        default=AssessmentType.INTERNAL,
        nullable=False
    )
    max_marks: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    weightage: Mapped[float] = mapped_column(Float, default=20.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    subject = relationship("Subject")
    marks = relationship("Mark", back_populates="assessment", cascade="all, delete-orphan")


class Mark(Base):
    __tablename__ = "marks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    assessment_id: Mapped[str] = mapped_column(String(36), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    feedback: Mapped[str] = mapped_column(String(500), nullable=True)
    graded_by_faculty_id: Mapped[str] = mapped_column(String(36), ForeignKey("faculty.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    assessment = relationship("Assessment", back_populates="marks")
    student = relationship("Student")
    faculty = relationship("Faculty")
