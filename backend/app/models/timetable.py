"""
Timetable, Class Section, and Campus Room Models for CampusX College ERP.
Provides daily and weekly lecture scheduling for students and faculty.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import String, Integer, ForeignKey, DateTime, Enum as SQLEnum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class DayOfWeek(str, Enum):
    MONDAY = "MONDAY"
    TUESDAY = "TUESDAY"
    WEDNESDAY = "WEDNESDAY"
    THURSDAY = "THURSDAY"
    FRIDAY = "FRIDAY"
    SATURDAY = "SATURDAY"


class RoomType(str, Enum):
    LECTURE_HALL = "LECTURE_HALL"
    LAB = "LAB"
    SEMINAR_HALL = "SEMINAR_HALL"
    AUDITORIUM = "AUDITORIUM"


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    room_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)  # e.g., "LH-201", "CS-LAB-1"
    building: Mapped[str] = mapped_column(String(100), default="Main Academic Block", nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    type: Mapped[RoomType] = mapped_column(
        SQLEnum(RoomType, name="room_type_enum"),
        default=RoomType.LECTURE_HALL,
        nullable=False
    )


class ClassSection(Base):
    __tablename__ = "class_sections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    department_id: Mapped[str] = mapped_column(String(36), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    semester_number: Mapped[int] = mapped_column(Integer, nullable=False)
    section_name: Mapped[str] = mapped_column(String(10), default="A", nullable=False)  # 'A', 'B'
    academic_year: Mapped[str] = mapped_column(String(50), nullable=False)

    department = relationship("Department")
    course = relationship("Course")


class Timetable(Base):
    __tablename__ = "timetables"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    class_section_id: Mapped[str] = mapped_column(String(36), ForeignKey("class_sections.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year: Mapped[str] = mapped_column(String(50), nullable=False)
    semester_number: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    class_section = relationship("ClassSection")
    slots = relationship("TimetableSlot", back_populates="timetable", cascade="all, delete-orphan")


class TimetableSlot(Base):
    __tablename__ = "timetable_slots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timetable_id: Mapped[str] = mapped_column(String(36), ForeignKey("timetables.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week: Mapped[DayOfWeek] = mapped_column(
        SQLEnum(DayOfWeek, name="day_of_week_enum"),
        nullable=False,
        index=True
    )
    start_time: Mapped[str] = mapped_column(String(10), nullable=False)  # "09:00"
    end_time: Mapped[str] = mapped_column(String(10), nullable=False)    # "10:00"
    subject_id: Mapped[str] = mapped_column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_id: Mapped[str] = mapped_column(String(36), ForeignKey("faculty.id", ondelete="CASCADE"), nullable=False, index=True)
    room_id: Mapped[str] = mapped_column(String(36), ForeignKey("rooms.id"), nullable=True)

    timetable = relationship("Timetable", back_populates="slots")
    subject = relationship("Subject")
    faculty = relationship("Faculty")
    room = relationship("Room")
