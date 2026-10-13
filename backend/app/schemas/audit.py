"""
Pydantic schemas for Security & Compliance Audit Logging.
"""

from typing import Optional, Dict
from datetime import datetime
from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class AuditSummaryResponse(BaseModel):
    total_logs: int
    failed_logins_count: int
    successful_logins_count: int
    security_alerts_count: int
    action_breakdown: Dict[str, int]
