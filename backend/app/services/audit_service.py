"""
Audit Logging Service for CampusX Security & Compliance.
"""

from typing import Optional, Any, Dict
import json
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.audit import AuditLog


def log_audit(
    db: Session,
    action: str,
    entity_type: str,
    user: Optional[User] = None,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    entity_id: Optional[str] = None,
    details: Optional[Any] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    """
    Persist an immutable audit log record to the database.
    """
    final_user_id = user.id if user else user_id
    final_user_email = user.email if user else user_email

    details_str = None
    if isinstance(details, (dict, list)):
        details_str = json.dumps(details)
    elif details is not None:
        details_str = str(details)

    log_entry = AuditLog(
        user_id=final_user_id,
        user_email=final_user_email,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details_str,
        ip_address=ip_address
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
