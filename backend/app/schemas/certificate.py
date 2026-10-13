"""
Pydantic schemas for Certificates and Verification.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.certificate import CertificateType, CertificateStatus


class CertificateRequest(BaseModel):
    type: CertificateType = CertificateType.BONAFIDE
    purpose: str


class CertificateApproval(BaseModel):
    status: CertificateStatus  # APPROVED or REJECTED


class CertificateResponse(BaseModel):
    id: str
    certificate_uuid: str
    student_id: str
    type: CertificateType
    status: CertificateStatus
    purpose: str
    issue_date: Optional[datetime] = None
    pdf_filename: Optional[str] = None
    created_at: datetime
    student_name: Optional[str] = None
    roll_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CertificateVerificationResponse(BaseModel):
    is_valid: bool
    certificate_id: str
    status: str
    document_type: str
    student_name: str
    roll_number: str
    department: str
    course: str
    issue_date: Optional[datetime] = None
    message: str
