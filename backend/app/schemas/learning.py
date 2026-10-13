"""
Pydantic Schemas for Study Materials and LMS Resources.
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.learning import MaterialType


class StudyMaterialBase(BaseModel):
    subject_id: str
    department_id: str
    semester_number: int
    title: str
    description: Optional[str] = None
    file_type: MaterialType = MaterialType.PDF
    file_path: Optional[str] = None
    external_url: Optional[str] = None


class StudyMaterialCreate(StudyMaterialBase):
    pass


class StudyMaterialResponse(StudyMaterialBase):
    id: str
    faculty_id: str
    faculty_name: Optional[str] = None
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
