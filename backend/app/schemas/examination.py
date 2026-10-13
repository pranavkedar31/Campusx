"""
Pydantic Schemas for Examination Schedules, Exam Forms, Results, Hall Tickets, and Marksheets.
"""

from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict
from app.models.examination import ExamType, ExamStatus, ExamFormStatus, ResultStatus


class ExamScheduleBase(BaseModel):
    subject_id: str
    exam_date: date
    start_time: str
    end_time: str
    room_no: str
    max_marks: float = 100.0


class ExamScheduleCreate(ExamScheduleBase):
    pass


class ExamScheduleResponse(ExamScheduleBase):
    id: str
    examination_id: str
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ExaminationBase(BaseModel):
    name: str
    exam_type: ExamType = ExamType.END_SEMESTER
    academic_year: str
    semester_number: int
    start_date: date
    end_date: date
    exam_fee: float = 1500.0
    form_opening_date: Optional[date] = None
    form_closing_date: Optional[date] = None
    eligible_courses: str = "ALL"
    eligible_semesters: str = "ALL"
    instructions: Optional[str] = None


class ExaminationCreate(ExaminationBase):
    schedules: List[ExamScheduleCreate] = []


class ExaminationResponse(ExaminationBase):
    id: str
    status: ExamStatus
    schedules: List[ExamScheduleResponse] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExamFormSubjectBase(BaseModel):
    subject_id: str
    is_backlog: bool = False


class ExamFormSubjectResponse(ExamFormSubjectBase):
    id: str
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    credits: Optional[int] = 3

    model_config = ConfigDict(from_attributes=True)


class ExamFormCreate(BaseModel):
    examination_id: str
    semester_number: Optional[int] = None
    academic_year: Optional[str] = "2025-2026"
    subjects: List[ExamFormSubjectBase] = []


class ExamFormReview(BaseModel):
    status: ExamFormStatus  # APPROVED or REJECTED
    verification_notes: Optional[str] = None


class ExamFormPaymentRequest(BaseModel):
    payment_reference: Optional[str] = None


class ExamFormResponse(BaseModel):
    id: str
    examination_id: str
    examination_name: Optional[str] = None
    student_id: str
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    prn: Optional[str] = None
    department_name: Optional[str] = None
    course_name: Optional[str] = None
    semester_number: int = 1
    academic_year: str = "2025-2026"
    status: ExamFormStatus
    payment_status: str = "PENDING"
    payment_reference: Optional[str] = None
    transaction_id: Optional[str] = None
    amount_paid: float = 0.0
    paid_at: Optional[datetime] = None
    submission_date: datetime
    verification_notes: Optional[str] = None
    has_hall_ticket: bool = False
    hall_ticket_number: Optional[str] = None
    subjects: List[ExamFormSubjectResponse] = []

    model_config = ConfigDict(from_attributes=True)


class HallTicketResponse(BaseModel):
    id: str
    exam_form_id: str
    student_id: str
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    prn: Optional[str] = None
    course_name: Optional[str] = None
    department_name: Optional[str] = None
    examination_id: str
    examination_name: Optional[str] = None
    hall_ticket_number: str
    pdf_filename: Optional[str] = None
    is_blocked: bool = False
    generated_at: datetime
    schedules: List[ExamScheduleResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ConflictCheckRequest(BaseModel):
    examination_id: str
    exam_date: date
    start_time: str
    end_time: str
    room_no: str
    subject_id: str
    exclude_schedule_id: Optional[str] = None


class ConflictCheckResponse(BaseModel):
    has_conflict: bool
    conflicts: List[str] = []


class ExamResultSubjectResponse(BaseModel):
    id: str
    subject_id: str
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    credits: Optional[int] = 3
    internal_marks: float
    external_marks: float
    practical_marks: float
    total_marks: float
    max_marks: float
    grade: str
    grade_point: float
    status: str

    model_config = ConfigDict(from_attributes=True)


class ExamResultResponse(BaseModel):
    id: str
    examination_id: str
    examination_name: Optional[str] = None
    student_id: str
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    prn: Optional[str] = None
    department_name: Optional[str] = None
    course_name: Optional[str] = None
    semester_number: int
    academic_year: str
    sgpa: float
    cgpa: float
    total_marks_obtained: float
    total_max_marks: float
    percentage: float
    result_status: ResultStatus
    published_at: datetime
    subjects: List[ExamResultSubjectResponse] = []

    model_config = ConfigDict(from_attributes=True)
