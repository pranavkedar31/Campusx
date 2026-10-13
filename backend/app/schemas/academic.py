"""
Pydantic schemas for Academic Entities: Departments, Courses, Subjects, Semesters, Enrollments, Syllabi, and Academic Calendar.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.academic import SubjectType, CalendarEventType


# --- Department Schemas ---
class DepartmentBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class DepartmentResponse(DepartmentBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


# --- Course Schemas ---
class CourseBase(BaseModel):
    code: str
    name: str
    credits: int = 4
    department_id: str


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    name: Optional[str] = None
    credits: Optional[int] = None
    department_id: Optional[str] = None


class CourseResponse(CourseBase):
    id: str
    department: Optional[DepartmentResponse] = None

    model_config = ConfigDict(from_attributes=True)


# --- Subject Schemas ---
class SubjectBase(BaseModel):
    code: str
    name: str
    short_name: Optional[str] = None
    credits: int = 3
    subject_type: SubjectType = SubjectType.THEORY
    lecture_hours: int = 3
    practical_hours: int = 0
    tutorial_hours: int = 0
    course_id: str
    semester_number: int = 1


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    short_name: Optional[str] = None
    credits: Optional[int] = None
    subject_type: Optional[SubjectType] = None
    lecture_hours: Optional[int] = None
    practical_hours: Optional[int] = None
    tutorial_hours: Optional[int] = None
    semester_number: Optional[int] = None


class SubjectResponse(SubjectBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


# --- Syllabus Schemas ---
class SyllabusBase(BaseModel):
    subject_id: str
    semester_number: int
    academic_year: str = "2025-2026"
    unit_1_title: str
    unit_1_content: str
    unit_2_title: str
    unit_2_content: str
    unit_3_title: str
    unit_3_content: str
    unit_4_title: str
    unit_4_content: str
    unit_5_title: str
    unit_5_content: str
    learning_objectives: Optional[str] = None
    course_outcomes: Optional[str] = None
    recommended_books: Optional[str] = None
    reference_materials: Optional[str] = None


class SyllabusCreate(SyllabusBase):
    pass


class SyllabusUpdate(BaseModel):
    unit_1_title: Optional[str] = None
    unit_1_content: Optional[str] = None
    unit_2_title: Optional[str] = None
    unit_2_content: Optional[str] = None
    unit_3_title: Optional[str] = None
    unit_3_content: Optional[str] = None
    unit_4_title: Optional[str] = None
    unit_4_content: Optional[str] = None
    unit_5_title: Optional[str] = None
    unit_5_content: Optional[str] = None
    learning_objectives: Optional[str] = None
    course_outcomes: Optional[str] = None
    recommended_books: Optional[str] = None
    reference_materials: Optional[str] = None


class SyllabusResponse(SyllabusBase):
    id: str
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Academic Calendar Event Schemas ---
class AcademicCalendarEventBase(BaseModel):
    title: str
    event_type: CalendarEventType = CalendarEventType.OTHER
    start_date: datetime
    end_date: datetime
    academic_year: str = "2025-2026"
    semester_number: Optional[int] = None
    description: Optional[str] = None


class AcademicCalendarEventCreate(AcademicCalendarEventBase):
    pass


class AcademicCalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    event_type: Optional[CalendarEventType] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    academic_year: Optional[str] = None
    semester_number: Optional[int] = None
    description: Optional[str] = None


class AcademicCalendarEventResponse(AcademicCalendarEventBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Academic Year & Semester Schemas ---
class AcademicYearBase(BaseModel):
    year_label: str
    is_current: bool = True


class AcademicYearResponse(AcademicYearBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


class SemesterBase(BaseModel):
    number: int
    academic_year: str
    name: str


class SemesterResponse(SemesterBase):
    id: str

    model_config = ConfigDict(from_attributes=True)
