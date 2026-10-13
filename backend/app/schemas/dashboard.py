"""
Pydantic Schemas for Role-Specific Aggregated ERP Dashboards.
"""

from typing import List, Optional, Any, Dict
from datetime import date
from pydantic import BaseModel


class AcademicSummary(BaseModel):
    student_id: str
    roll_number: str
    enrollment_number: str
    full_name: str
    department_code: str
    department_name: str
    course_code: str
    course_name: str
    current_semester: int
    academic_year: str
    section: str
    admission_year: int
    cgpa: float
    sgpa: float
    percentage: float


class AttendanceSubjectCard(BaseModel):
    subject_id: str
    subject_code: str
    subject_name: str
    total_classes: int
    attended_classes: int
    absent_classes: int
    attendance_pct: float
    status: str  # GOOD, WARNING, CRITICAL


class AttendanceERPSummary(BaseModel):
    overall_percentage: float
    present_count: int
    absent_count: int
    total_lectures: int
    status: str  # GOOD, WARNING, CRITICAL
    subject_cards: List[AttendanceSubjectCard] = []
    monthly_trend: List[Dict[str, Any]] = []
    alerts: List[str] = []


class FeesERPSummary(BaseModel):
    total_fees: float
    paid_amount: float
    pending_amount: float
    status: str
    next_due_date: Optional[date] = None


class StudentERPDashboardResponse(BaseModel):
    academic_summary: AcademicSummary
    attendance_summary: AttendanceERPSummary
    fees_summary: FeesERPSummary
    today_classes: List[Dict[str, Any]] = []
    upcoming_exams: List[Dict[str, Any]] = []
    pending_assignments: List[Dict[str, Any]] = []
    recent_results: List[Dict[str, Any]] = []
    recent_notices: List[Dict[str, Any]] = []
    upcoming_events: List[Dict[str, Any]] = []


class FacultyERPDashboardResponse(BaseModel):
    faculty_id: str
    faculty_name: str
    employee_id: str
    department_code: str
    today_classes: List[Dict[str, Any]] = []
    assigned_subjects: List[Dict[str, Any]] = []
    total_students: int
    attendance_pending_count: int
    assignments_pending_evaluation: int
    at_risk_students_count: int
    recent_submissions: List[Dict[str, Any]] = []
    upcoming_exams: List[Dict[str, Any]] = []


class AdminERPDashboardResponse(BaseModel):
    total_students: int
    total_faculty: int
    department_distribution: Dict[str, int]
    fees_collected: float
    fees_pending: float
    fees_overdue: float
    collection_rate_pct: float
    average_attendance_pct: float
    low_attendance_students_count: int
    upcoming_exams_count: int
    pending_exam_forms_count: int
    total_assignments_count: int
    pending_evaluations_count: int
    pending_certificates_count: int
    active_placement_drives_count: int
