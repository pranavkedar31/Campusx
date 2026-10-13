"""
Pydantic schemas for ML Risk Prediction and Early Warning.
"""

from typing import List, Dict, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class PredictionInput(BaseModel):
    attendance_pct: float = Field(..., ge=0.0, le=100.0)
    cgpa: float = Field(..., ge=0.0, le=10.0)
    failed_assessments_count: int = Field(default=0, ge=0)
    assignment_submission_rate: float = Field(default=85.0, ge=0.0, le=100.0)
    marks_drop: float = Field(default=0.0)


class PredictionResult(BaseModel):
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    department: Optional[str] = None
    course: Optional[str] = None
    attendance_pct: float
    cgpa: float
    failed_assessments_count: int
    risk_level: str  # LOW, MODERATE, HIGH
    risk_score: float
    probabilities: Dict[str, float]
    contributing_factors: List[str]
    recommended_interventions: List[str]
    evaluated_at: datetime


class AtRiskSummary(BaseModel):
    total_students: int
    high_risk_count: int
    moderate_risk_count: int
    low_risk_count: int
    risk_distribution: Dict[str, int]
    at_risk_students: List[PredictionResult]
