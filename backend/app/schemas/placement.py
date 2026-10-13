"""
Pydantic schemas for Placement and Career Intelligence.
"""

from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.placement import JobStatus, ApplicationStatus, OfferStatus


class CompanyCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    website: Optional[str] = None
    industry: Optional[str] = None
    contact_email: Optional[str] = None
    location: Optional[str] = None
    headquarters: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    description: Optional[str] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    contact_email: Optional[str] = None
    location: Optional[str] = None
    headquarters: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    description: Optional[str] = None


class CompanyResponse(BaseModel):
    id: str
    name: str
    website: Optional[str] = None
    industry: Optional[str] = None
    contact_email: Optional[str] = None
    location: Optional[str] = None
    headquarters: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class JobRoleCreate(BaseModel):
    company_id: str
    title: str = Field(..., min_length=2, max_length=255)
    description: str = Field(..., min_length=10)
    package_ctc: float = Field(..., gt=0)
    min_cgpa: float = Field(default=6.0, ge=0.0, le=10.0)
    eligible_departments: str = Field(default="ALL")
    application_deadline: Optional[datetime] = None
    drive_date: Optional[datetime] = None


class JobRoleResponse(BaseModel):
    id: str
    company_id: str
    company_name: str
    title: str
    description: str
    package_ctc: float
    min_cgpa: float
    eligible_departments: str
    application_deadline: Optional[datetime] = None
    drive_date: Optional[datetime] = None
    status: JobStatus
    is_eligible: Optional[bool] = None
    eligibility_reason: Optional[str] = None
    has_applied: Optional[bool] = None
    application_status: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PlacementApplicationCreate(BaseModel):
    job_role_id: str
    resume_url: Optional[str] = None
    notes: Optional[str] = None


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus
    notes: Optional[str] = None
    ctc_offered: Optional[float] = None  # if status == OFFERED


class PlacementOfferResponse(BaseModel):
    id: str
    application_id: str
    ctc_offered: float
    status: OfferStatus
    offer_date: datetime

    class Config:
        from_attributes = True


class PlacementApplicationResponse(BaseModel):
    id: str
    job_role_id: str
    job_title: str
    company_name: str
    student_id: str
    student_name: str
    roll_number: str
    department_name: str
    cgpa: float
    status: ApplicationStatus
    resume_url: Optional[str] = None
    notes: Optional[str] = None
    applied_at: datetime
    updated_at: datetime
    offer: Optional[PlacementOfferResponse] = None

    class Config:
        from_attributes = True


class PlacementStatsResponse(BaseModel):
    total_companies: int
    active_drives: int
    total_applications: int
    total_offers: int
    highest_ctc: float
    average_ctc: float
    placement_rate: float
    funnel: Dict[str, int]
    department_breakdown: List[Dict[str, object]]
