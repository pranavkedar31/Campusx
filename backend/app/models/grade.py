"""
Grade rules, institutional academic configurations, and extracurricular activity models.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class GradeRule(Base):
    __tablename__ = "grade_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    grade: Mapped[str] = mapped_column(String(10), unique=True, index=True, nullable=False)  # O, A+, A, B+, B, C, P, F
    grade_point: Mapped[float] = mapped_column(Float, nullable=False)                         # 10.0, 9.0, 8.0, 7.0, 6.0, 5.0, 4.0, 0.0
    min_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    max_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[str] = mapped_column(String(100), nullable=True)                      # Outstanding, Excellent, etc.
    is_passing: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class ExtracurricularActivity(Base):
    __tablename__ = "extracurricular_activities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)                        # Sports, Cultural, NSS, NCC, Technical Club
    academic_year: Mapped[str] = mapped_column(String(50), default="2025-2026", nullable=False)
    semester_number: Mapped[int] = mapped_column(Integer, nullable=True)
    credits: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    grade: Mapped[str] = mapped_column(String(10), default="A", nullable=False)
    grade_point: Mapped[float] = mapped_column(Float, default=8.0, nullable=False)
    certificate_url: Mapped[str] = mapped_column(String(500), nullable=True)
    remarks: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    student = relationship("Student")


class InstitutionAcademicConfig(Base):
    __tablename__ = "institution_academic_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    include_extracurricular_in_cgpa: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    minimum_attendance_pct_for_exam: Mapped[float] = mapped_column(Float, default=75.0, nullable=False)
    pass_percentage: Mapped[float] = mapped_column(Float, default=40.0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )
