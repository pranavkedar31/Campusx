"""
Pydantic Schemas for Assignment Management and Student Submissions.
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.assignment import AssignmentStatus, SubmissionStatus


class AssignmentBase(BaseModel):
    subject_id: str
    department_id: str
    semester_number: int
    section: str = "A"
    title: str
    description: str
    instructions: Optional[str] = None
    attachment_url: Optional[str] = None
    max_marks: float = 100.0
    due_date: datetime
    allow_late_submission: bool = True


class AssignmentCreate(AssignmentBase):
    pass


class AssignmentSubmissionResponse(BaseModel):
    id: str
    assignment_id: str
    assignment_title: Optional[str] = None
    student_id: str
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    original_filename: str
    file_size: int
    submitted_at: datetime
    status: SubmissionStatus
    marks_awarded: Optional[float] = None
    max_marks: Optional[float] = 100.0
    feedback: Optional[str] = None
    graded_at: Optional[datetime] = None
    graded_by_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AssignmentResponse(AssignmentBase):
    id: str
    faculty_id: str
    faculty_name: Optional[str] = None
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    status: AssignmentStatus
    publish_date: datetime
    created_at: datetime
    submissions_count: int = 0
    pending_evaluation_count: int = 0
    my_submission: Optional[AssignmentSubmissionResponse] = None

    model_config = ConfigDict(from_attributes=True)


class GradeSubmissionCreate(BaseModel):
    marks_awarded: float
    feedback: Optional[str] = None


class FacultyAssignmentOverview(BaseModel):
    total_assignments: int
    published_assignments: int
    due_soon_count: int
    closed_assignments: int
    pending_evaluation_count: int
    recent_submissions: List[AssignmentSubmissionResponse] = []
