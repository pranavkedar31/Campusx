"""
Academic organizational models: Departments, Courses, Subjects, Semesters, Enrollments.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, ForeignKey, DateTime, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    courses = relationship("Course", back_populates="department", cascade="all, delete-orphan")
    students = relationship("Student", back_populates="department")
    faculty_members = relationship("Faculty", back_populates="department")


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    credits: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    department_id: Mapped[str] = mapped_column(String(36), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    department = relationship("Department", back_populates="courses")
    subjects = relationship("Subject", back_populates="course", cascade="all, delete-orphan")
    students = relationship("Student", back_populates="course")


class AcademicYear(Base):
    __tablename__ = "academic_years"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    year_label: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # e.g., "2025-2026"
    is_current: Mapped[bool] = mapped_column(default=True, nullable=False)


class Semester(Base):
    __tablename__ = "semesters"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    number: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 to 8
    academic_year: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., "Semester 4 - Fall 2025"


from enum import Enum
from sqlalchemy import String, Integer, ForeignKey, DateTime, Float, Text, Date, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class SubjectType(str, Enum):
    THEORY = "THEORY"
    PRACTICAL = "PRACTICAL"
    LAB = "LAB"
    PROJECT = "PROJECT"
    TUTORIAL = "TUTORIAL"
    ELECTIVE = "ELECTIVE"
    OPEN_ELECTIVE = "OPEN_ELECTIVE"
    AUDIT = "AUDIT"
    EXTRA_CURRICULAR = "EXTRA_CURRICULAR"


class CalendarEventType(str, Enum):
    SEMESTER_START = "SEMESTER_START"
    SEMESTER_END = "SEMESTER_END"
    EXAM_PERIOD = "EXAM_PERIOD"
    HOLIDAY = "HOLIDAY"
    INTERNAL_EXAM = "INTERNAL_EXAM"
    END_SEM_EXAM = "END_SEM_EXAM"
    RESULT_DATE = "RESULT_DATE"
    ADMISSION_DATE = "ADMISSION_DATE"
    OTHER = "OTHER"


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    short_name: Mapped[str] = mapped_column(String(50), nullable=True)
    credits: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    subject_type: Mapped[SubjectType] = mapped_column(
        SQLEnum(SubjectType, name="subject_type_enum"),
        default=SubjectType.THEORY,
        nullable=False
    )
    lecture_hours: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    practical_hours: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tutorial_hours: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    semester_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    course = relationship("Course", back_populates="subjects")
    enrollments = relationship("Enrollment", back_populates="subject", cascade="all, delete-orphan")
    faculty_assignments = relationship("FacultySubjectAssignment", back_populates="subject", cascade="all, delete-orphan")
    syllabi = relationship("Syllabus", back_populates="subject", cascade="all, delete-orphan")


class Syllabus(Base):
    __tablename__ = "syllabi"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subject_id: Mapped[str] = mapped_column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    semester_number: Mapped[int] = mapped_column(Integer, nullable=False)
    academic_year: Mapped[str] = mapped_column(String(50), default="2025-2026", nullable=False)
    unit_1_title: Mapped[str] = mapped_column(String(255), nullable=False)
    unit_1_content: Mapped[str] = mapped_column(Text, nullable=False)
    unit_2_title: Mapped[str] = mapped_column(String(255), nullable=False)
    unit_2_content: Mapped[str] = mapped_column(Text, nullable=False)
    unit_3_title: Mapped[str] = mapped_column(String(255), nullable=False)
    unit_3_content: Mapped[str] = mapped_column(Text, nullable=False)
    unit_4_title: Mapped[str] = mapped_column(String(255), nullable=False)
    unit_4_content: Mapped[str] = mapped_column(Text, nullable=False)
    unit_5_title: Mapped[str] = mapped_column(String(255), nullable=False)
    unit_5_content: Mapped[str] = mapped_column(Text, nullable=False)
    learning_objectives: Mapped[str] = mapped_column(Text, nullable=True)
    course_outcomes: Mapped[str] = mapped_column(Text, nullable=True)
    recommended_books: Mapped[str] = mapped_column(Text, nullable=True)
    reference_materials: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    subject = relationship("Subject", back_populates="syllabi")


class AcademicCalendarEvent(Base):
    __tablename__ = "academic_calendar_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    event_type: Mapped[CalendarEventType] = mapped_column(
        SQLEnum(CalendarEventType, name="calendar_event_type_enum"),
        default=CalendarEventType.OTHER,
        nullable=False
    )
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    academic_year: Mapped[str] = mapped_column(String(50), default="2025-2026", nullable=False)
    semester_number: Mapped[int] = mapped_column(Integer, nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )


class Enrollment(Base):
    __tablename__ = "enrollments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id: Mapped[str] = mapped_column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year: Mapped[str] = mapped_column(String(50), nullable=False)
    semester_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Enrolled")  # Enrolled, Completed, Dropped
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    student = relationship("Student", back_populates="enrollments")
    subject = relationship("Subject", back_populates="enrollments")


class FacultySubjectAssignment(Base):
    __tablename__ = "faculty_subject_assignments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    faculty_id: Mapped[str] = mapped_column(String(36), ForeignKey("faculty.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id: Mapped[str] = mapped_column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year: Mapped[str] = mapped_column(String(50), nullable=False)
    section: Mapped[str] = mapped_column(String(10), default="A", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    faculty = relationship("Faculty", back_populates="subject_assignments")
    subject = relationship("Subject", back_populates="faculty_assignments")
