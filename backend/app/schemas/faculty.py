"""
Pydantic schemas for Faculty entity.
"""

from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserResponse
from app.schemas.academic import DepartmentResponse, SubjectResponse


class FacultyBase(BaseModel):
    employee_id: str
    department_id: str
    designation: str = "Assistant Professor"
    specialization: Optional[str] = None


class FacultyCreate(FacultyBase):
    user_id: str


class FacultyRegistration(BaseModel):
    email: str
    password: str
    full_name: str
    phone: Optional[str] = None
    employee_id: str
    department_id: str
    designation: str = "Assistant Professor"
    specialization: Optional[str] = None


class FacultyUpdate(BaseModel):
    designation: Optional[str] = None
    specialization: Optional[str] = None
    department_id: Optional[str] = None


class FacultySubjectAssignmentCreate(BaseModel):
    faculty_id: str
    subject_id: str
    academic_year: str
    section: str = "A"


class FacultySubjectAssignmentResponse(BaseModel):
    id: str
    faculty_id: str
    subject_id: str
    academic_year: str
    section: str
    subject: Optional[SubjectResponse] = None

    model_config = ConfigDict(from_attributes=True)


class FacultyResponse(FacultyBase):
    id: str
    user_id: str
    user: Optional[UserResponse] = None
    department: Optional[DepartmentResponse] = None
    subject_assignments: List[FacultySubjectAssignmentResponse] = []

    model_config = ConfigDict(from_attributes=True)
