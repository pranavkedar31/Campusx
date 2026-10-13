"""
Pydantic Schemas for ERP Institutional Reports and Data Exports.
"""

from typing import List, Optional, Any, Dict
from enum import Enum
from pydantic import BaseModel


class ReportType(str, Enum):
    STUDENTS = "STUDENTS"
    ATTENDANCE = "ATTENDANCE"
    SUBJECT_ATTENDANCE = "SUBJECT_ATTENDANCE"
    MARKS = "MARKS"
    RESULTS = "RESULTS"
    ASSIGNMENT_SUBMISSIONS = "ASSIGNMENT_SUBMISSIONS"
    FEE_LEDGER = "FEE_LEDGER"
    FEE_OUTSTANDING = "FEE_OUTSTANDING"
    EXAMS = "EXAMS"
    PLACEMENTS = "PLACEMENTS"
    CERTIFICATES = "CERTIFICATES"


class ReportFilter(BaseModel):
    report_type: ReportType = ReportType.STUDENTS
    department_id: Optional[str] = None
    course_id: Optional[str] = None
    semester_number: Optional[int] = None
    subject_id: Optional[str] = None
    search: Optional[str] = None


class ReportDataResponse(BaseModel):
    report_type: str
    title: str
    total_records: int
    headers: List[str]
    rows: List[Dict[str, Any]]
