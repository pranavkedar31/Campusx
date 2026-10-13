"""
Pydantic schemas for Student Application / Request Center.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.application import ApplicationType, ApplicationStatus


class ApplicationCreate(BaseModel):
    application_type: ApplicationType
    reason: str
    supporting_document_url: Optional[str] = None
    academic_year: Optional[str] = "2025-2026"
    semester_number: Optional[int] = None


class ApplicationReview(BaseModel):
    status: ApplicationStatus
    remarks: Optional[str] = None


class ApplicationHistoryResponse(BaseModel):
    id: str
    application_id: str
    status: ApplicationStatus
    remarks: Optional[str] = None
    action_by_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StudentApplicationResponse(BaseModel):
    id: str
    application_number: str
    student_id: str
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    enrollment_number: Optional[str] = None
    department_name: Optional[str] = None
    course_name: Optional[str] = None
    application_type: ApplicationType
    reason: str
    status: ApplicationStatus
    supporting_document_url: Optional[str] = None
    generated_document_url: Optional[str] = None
    academic_year: str
    semester_number: Optional[int] = None
    admin_remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    history: List[ApplicationHistoryResponse] = []

    model_config = ConfigDict(from_attributes=True)
