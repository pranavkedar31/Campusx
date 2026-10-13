"""
Pydantic schemas for Grade Rules, Extracurricular Activities, and Institutional Academic Configurations.
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class GradeRuleBase(BaseModel):
    grade: str
    grade_point: float
    min_percentage: float
    max_percentage: float
    description: Optional[str] = None
    is_passing: bool = True


class GradeRuleCreate(GradeRuleBase):
    pass


class GradeRuleUpdate(BaseModel):
    grade_point: Optional[float] = None
    min_percentage: Optional[float] = None
    max_percentage: Optional[float] = None
    description: Optional[str] = None
    is_passing: Optional[bool] = None


class GradeRuleResponse(GradeRuleBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


class ExtracurricularCreate(BaseModel):
    student_id: str
    activity_name: str
    category: str
    academic_year: str = "2025-2026"
    semester_number: Optional[int] = None
    credits: int = 1
    grade: str = "A"
    grade_point: float = 8.0
    certificate_url: Optional[str] = None
    remarks: Optional[str] = None


class ExtracurricularUpdate(BaseModel):
    activity_name: Optional[str] = None
    category: Optional[str] = None
    academic_year: Optional[str] = None
    semester_number: Optional[int] = None
    credits: Optional[int] = None
    grade: Optional[str] = None
    grade_point: Optional[float] = None
    certificate_url: Optional[str] = None
    remarks: Optional[str] = None


class ExtracurricularResponse(BaseModel):
    id: str
    student_id: str
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    department_name: Optional[str] = None
    activity_name: str
    category: str
    academic_year: str
    semester_number: Optional[int] = None
    credits: int
    grade: str
    grade_point: float
    certificate_url: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InstitutionAcademicConfigBase(BaseModel):
    include_extracurricular_in_cgpa: bool = False
    minimum_attendance_pct_for_exam: float = 75.0
    pass_percentage: float = 40.0


class InstitutionAcademicConfigUpdate(BaseModel):
    include_extracurricular_in_cgpa: Optional[bool] = None
    minimum_attendance_pct_for_exam: Optional[float] = None
    pass_percentage: Optional[float] = None


class InstitutionAcademicConfigResponse(InstitutionAcademicConfigBase):
    id: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
