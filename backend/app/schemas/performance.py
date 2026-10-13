"""
Pydantic schemas for Attendance, Assessments, and Performance Analytics.
"""

from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from app.models.performance import AttendanceStatus, AssessmentType
from app.schemas.academic import SubjectResponse


class AttendanceCreate(BaseModel):
    student_id: str
    subject_id: str
    date: date
    status: AttendanceStatus = AttendanceStatus.PRESENT


class AttendanceBulkItem(BaseModel):
    student_id: str
    status: AttendanceStatus = AttendanceStatus.PRESENT


class AttendanceBulkCreate(BaseModel):
    subject_id: str
    date: date
    records: List[AttendanceBulkItem]


class AttendanceResponse(BaseModel):
    id: str
    student_id: str
    subject_id: str
    date: date
    status: AttendanceStatus
    created_at: datetime
    subject: Optional[SubjectResponse] = None

    model_config = ConfigDict(from_attributes=True)


class SubjectAttendanceSummary(BaseModel):
    subject_id: str
    subject_name: str
    subject_code: str
    total_classes: int
    attended_classes: int
    attendance_pct: float
    status: str  # Normal, Warning (<75%), Critical (<65%)


class OverallAttendanceSummary(BaseModel):
    student_id: str
    total_classes: int
    attended_classes: int
    overall_percentage: float
    status: str
    subject_breakdown: List[SubjectAttendanceSummary]


# --- Assessments & Marks ---
class AssessmentCreate(BaseModel):
    subject_id: str
    title: str
    type: AssessmentType = AssessmentType.INTERNAL
    max_marks: float = 100.0
    weightage: float = 20.0


class AssessmentResponse(BaseModel):
    id: str
    subject_id: str
    title: str
    type: AssessmentType
    max_marks: float
    weightage: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MarkCreate(BaseModel):
    assessment_id: str
    student_id: str
    score: float
    feedback: Optional[str] = None


class MarkBulkItem(BaseModel):
    student_id: str
    score: float
    feedback: Optional[str] = None


class MarkBulkCreate(BaseModel):
    assessment_id: str
    marks: List[MarkBulkItem]


class MarkResponse(BaseModel):
    id: str
    assessment_id: str
    student_id: str
    score: float
    feedback: Optional[str] = None
    created_at: datetime
    assessment: Optional[AssessmentResponse] = None

    model_config = ConfigDict(from_attributes=True)


class SubjectPerformanceSummary(BaseModel):
    subject_id: str
    subject_name: str
    subject_code: str
    score_percentage: float
    is_weak_subject: bool


class StudentPerformanceAnalytics(BaseModel):
    student_id: str
    cgpa: float
    attendance_percentage: float
    strengths: List[str]
    weak_subjects: List[str]
    subject_summaries: List[SubjectPerformanceSummary]
    needs_attention: bool
    recent_trend: str  # "Improving", "Stable", "Declining"
