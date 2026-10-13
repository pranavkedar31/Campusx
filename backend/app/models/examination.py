"""
Examination Management Models for CampusX College ERP.
Handles exam schedules, student exam registration forms, verification, results, and grade sheets.
"""

import uuid
from datetime import datetime, date, time, timezone
from enum import Enum
from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, Date, Time, Enum as SQLEnum, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class ExamType(str, Enum):
    INTERNAL = "INTERNAL"
    MIDTERM = "MIDTERM"
    END_SEMESTER = "END_SEMESTER"
    PRACTICAL = "PRACTICAL"
    VIVA = "VIVA"
    UNIVERSITY = "UNIVERSITY"


class ExamStatus(str, Enum):
    UPCOMING = "UPCOMING"
    ONGOING = "ONGOING"
    COMPLETED = "COMPLETED"
    RESULTS_PUBLISHED = "RESULTS_PUBLISHED"


class ExamFormStatus(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    VERIFIED = "VERIFIED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ResultStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    PROMOTED = "PROMOTED"
    WITHHELD = "WITHHELD"


class Examination(Base):
    __tablename__ = "examinations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # e.g., "Spring 2026 Regular End-Sem"
    exam_type: Mapped[ExamType] = mapped_column(
        SQLEnum(ExamType, name="exam_type_enum"),
        default=ExamType.END_SEMESTER,
        nullable=False
    )
    academic_year: Mapped[str] = mapped_column(String(50), nullable=False)
    semester_number: Mapped[int] = mapped_column(Integer, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[ExamStatus] = mapped_column(
        SQLEnum(ExamStatus, name="exam_status_enum"),
        default=ExamStatus.UPCOMING,
        nullable=False,
        index=True
    )
    exam_fee: Mapped[float] = mapped_column(Float, default=1500.0, nullable=False)
    form_opening_date: Mapped[date] = mapped_column(Date, nullable=True)
    form_closing_date: Mapped[date] = mapped_column(Date, nullable=True)
    eligible_courses: Mapped[str] = mapped_column(String(255), default="ALL", nullable=False)
    eligible_semesters: Mapped[str] = mapped_column(String(255), default="ALL", nullable=False)
    instructions: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    schedules = relationship("ExamSchedule", back_populates="examination", cascade="all, delete-orphan")
    exam_forms = relationship("ExamForm", back_populates="examination", cascade="all, delete-orphan")
    results = relationship("ExamResult", back_populates="examination", cascade="all, delete-orphan")


class ExamSchedule(Base):
    __tablename__ = "exam_schedules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    examination_id: Mapped[str] = mapped_column(String(36), ForeignKey("examinations.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id: Mapped[str] = mapped_column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    exam_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[str] = mapped_column(String(20), nullable=False)  # e.g., "10:00 AM"
    end_time: Mapped[str] = mapped_column(String(20), nullable=False)    # e.g., "01:00 PM"
    room_no: Mapped[str] = mapped_column(String(50), default="Exam Hall 1", nullable=False)
    max_marks: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)

    examination = relationship("Examination", back_populates="schedules")
    subject = relationship("Subject")


class ExamForm(Base):
    __tablename__ = "exam_forms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    examination_id: Mapped[str] = mapped_column(String(36), ForeignKey("examinations.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    semester_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    academic_year: Mapped[str] = mapped_column(String(50), default="2025-2026", nullable=False)
    status: Mapped[ExamFormStatus] = mapped_column(
        SQLEnum(ExamFormStatus, name="exam_form_status_enum"),
        default=ExamFormStatus.SUBMITTED,
        nullable=False,
        index=True
    )
    payment_status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False)  # PENDING, SUCCESS, FAILED
    payment_reference: Mapped[str] = mapped_column(String(100), nullable=True)
    transaction_id: Mapped[str] = mapped_column(String(100), nullable=True)
    amount_paid: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    paid_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    submission_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    verification_notes: Mapped[str] = mapped_column(String(255), nullable=True)
    verified_by_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)

    examination = relationship("Examination", back_populates="exam_forms")
    student = relationship("Student")
    subjects = relationship("ExamFormSubject", back_populates="exam_form", cascade="all, delete-orphan")
    hall_ticket = relationship("HallTicket", back_populates="exam_form", uselist=False, cascade="all, delete-orphan")


class ExamFormSubject(Base):
    __tablename__ = "exam_form_subjects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_form_id: Mapped[str] = mapped_column(String(36), ForeignKey("exam_forms.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id: Mapped[str] = mapped_column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    is_backlog: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    exam_form = relationship("ExamForm", back_populates="subjects")
    subject = relationship("Subject")


class HallTicket(Base):
    __tablename__ = "hall_tickets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_form_id: Mapped[str] = mapped_column(String(36), ForeignKey("exam_forms.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    examination_id: Mapped[str] = mapped_column(String(36), ForeignKey("examinations.id", ondelete="CASCADE"), nullable=False, index=True)
    hall_ticket_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    pdf_filename: Mapped[str] = mapped_column(String(255), nullable=True)
    qr_data: Mapped[str] = mapped_column(Text, nullable=True)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    exam_form = relationship("ExamForm", back_populates="hall_ticket")
    student = relationship("Student")
    examination = relationship("Examination")


class ExamResult(Base):
    __tablename__ = "exam_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    examination_id: Mapped[str] = mapped_column(String(36), ForeignKey("examinations.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    semester_number: Mapped[int] = mapped_column(Integer, nullable=False)
    academic_year: Mapped[str] = mapped_column(String(50), nullable=False)
    sgpa: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    cgpa: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_marks_obtained: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_max_marks: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    percentage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    result_status: Mapped[ResultStatus] = mapped_column(
        SQLEnum(ResultStatus, name="result_status_enum"),
        default=ResultStatus.PASS,
        nullable=False
    )
    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    examination = relationship("Examination", back_populates="results")
    student = relationship("Student")
    subjects = relationship("ExamResultSubject", back_populates="result", cascade="all, delete-orphan")


class ExamResultSubject(Base):
    __tablename__ = "exam_result_subjects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_result_id: Mapped[str] = mapped_column(String(36), ForeignKey("exam_results.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id: Mapped[str] = mapped_column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    internal_marks: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    external_marks: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    practical_marks: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_marks: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    max_marks: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    grade: Mapped[str] = mapped_column(String(5), default="A", nullable=False)       # O, A+, A, B+, B, C, F
    grade_point: Mapped[float] = mapped_column(Float, default=8.0, nullable=False)  # 0 to 10
    status: Mapped[str] = mapped_column(String(20), default="PASS", nullable=False)

    result = relationship("ExamResult", back_populates="subjects")
    subject = relationship("Subject")
