"""
Pydantic schemas for Student entity.
"""

from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserResponse
from app.schemas.academic import DepartmentResponse, CourseResponse


class StudentBase(BaseModel):
    roll_number: str
    enrollment_number: str
    prn: Optional[str] = None
    registration_number: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    department_id: str
    course_id: str
    current_semester: int = 1
    section: str = "A"
    admission_year: int
    cgpa: float = 0.0
    attendance_pct: float = 100.0


class StudentCreate(StudentBase):
    user_id: str


class StudentRegistration(BaseModel):
    email: str
    password: str
    full_name: str
    phone: Optional[str] = None
    roll_number: str
    enrollment_number: str
    prn: Optional[str] = None
    registration_number: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    department_id: str
    course_id: str
    current_semester: int = 1
    section: str = "A"
    admission_year: int


class StudentUpdate(BaseModel):
    prn: Optional[str] = None
    registration_number: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    current_semester: Optional[int] = None
    section: Optional[str] = None
    cgpa: Optional[float] = None
    attendance_pct: Optional[float] = None
    department_id: Optional[str] = None
    course_id: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    new_password: str


class StudentResponse(StudentBase):
    id: str
    user_id: str
    user: Optional[UserResponse] = None
    department: Optional[DepartmentResponse] = None
    course: Optional[CourseResponse] = None

    model_config = ConfigDict(from_attributes=True)
