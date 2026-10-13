"""
Pydantic schemas for Institutional Analytics & Management Intelligence.
"""

from typing import List, Dict
from datetime import datetime
from pydantic import BaseModel


class InstitutionalKPIs(BaseModel):
    total_students: int
    total_faculty: int
    total_departments: int
    total_courses: int
    average_attendance: float
    average_cgpa: float
    total_placement_offers: int
    placement_rate: float
    highest_ctc: float
    average_ctc: float
    student_faculty_ratio: str


class DepartmentPerformance(BaseModel):
    department_id: str
    code: str
    name: str
    student_count: int
    faculty_count: int
    avg_attendance: float
    avg_cgpa: float
    at_risk_count: int
    placement_rate: float


class InstitutionalSummaryResponse(BaseModel):
    kpis: InstitutionalKPIs
    department_matrix: List[DepartmentPerformance]
    risk_distribution: Dict[str, int]
    generated_at: datetime
