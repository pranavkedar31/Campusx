"""
Security & Compliance Audit Logging Endpoints.
Restricted exclusively to Super Administrators and Campus Administrators.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.db.session import get_db
from app.core.dependencies import require_roles
from app.core.rbac import UserRole
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogResponse, AuditSummaryResponse

router = APIRouter()


@router.get("/logs", response_model=List[AuditLogResponse], summary="Query Security Audit Trail")
def get_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action name"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    user_email: Optional[str] = Query(None, description="Filter by user email"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Search and retrieve security and compliance audit event logs.
    Strictly restricted to authorized administrative personnel.
    """
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if user_email:
        query = query.filter(AuditLog.user_email.ilike(f"%{user_email}%"))

    return query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(limit).all()


@router.get("/summary", response_model=AuditSummaryResponse, summary="Get Security Audit Summary")
def get_audit_summary(
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Produces security overview metrics including authentication attempts and security anomalies.
    """
    total = db.query(AuditLog).count()
    failed_logins = db.query(AuditLog).filter(AuditLog.action == "AUTH_LOGIN_FAILURE").count()
    successful_logins = db.query(AuditLog).filter(AuditLog.action == "AUTH_LOGIN_SUCCESS").count()
    security_alerts = db.query(AuditLog).filter(AuditLog.action.in_(["AUTH_LOGIN_BLOCKED", "AUTH_LOGIN_FAILURE"])).count()

    # Breakdown by action
    action_counts = (
        db.query(AuditLog.action, func.count(AuditLog.id))
        .group_by(AuditLog.action)
        .all()
    )
    breakdown = {act: count for act, count in action_counts}

    return AuditSummaryResponse(
        total_logs=total,
        failed_logins_count=failed_logins,
        successful_logins_count=successful_logins,
        security_alerts_count=security_alerts,
        action_breakdown=breakdown
    )
