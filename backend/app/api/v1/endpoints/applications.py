"""
Student Application and Request Center API Endpoints.
Allows students to request certificates, concessions, duplicate hall tickets, and corrections.
Enforces Anti-IDOR, maintains audit history, and issues verifiable documents.
"""

from typing import List, Optional
import uuid
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user, require_roles
from app.core.rbac import UserRole
from app.models.user import User
from app.models.student import Student
from app.models.application import (
    StudentApplication, ApplicationHistory, ApplicationType, ApplicationStatus
)
from app.models.audit import AuditLog
from app.schemas.application import (
    ApplicationCreate, ApplicationReview,
    StudentApplicationResponse, ApplicationHistoryResponse
)
from app.services.pdf_service import generate_application_document_pdf, APPLICATIONS_DIR

router = APIRouter()

UPLOAD_APP_DOCS_DIR = Path(settings.UPLOAD_DIR) / "application_attachments"
UPLOAD_APP_DOCS_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/", response_model=StudentApplicationResponse, status_code=status.HTTP_201_CREATED, summary="Submit Student Application")
def submit_application(
    app_in: ApplicationCreate,
    current_user: User = Depends(require_roles([UserRole.STUDENT])),
    db: Session = Depends(get_db)
):
    """Student submits a formal request or application."""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    year = datetime.now().year
    count = db.query(StudentApplication).count() + 1
    app_number = f"APP-{year}-{count:04d}"

    new_app = StudentApplication(
        application_number=app_number,
        student_id=student.id,
        application_type=app_in.application_type,
        reason=app_in.reason,
        status=ApplicationStatus.SUBMITTED,
        supporting_document_url=app_in.supporting_document_url,
        academic_year=app_in.academic_year or "2025-2026",
        semester_number=app_in.semester_number or student.current_semester,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(new_app)
    db.flush()

    # Initial history entry
    hist = ApplicationHistory(
        application_id=new_app.id,
        status=ApplicationStatus.SUBMITTED,
        action_by_user_id=current_user.id,
        remarks="Application submitted by student.",
        created_at=datetime.now(timezone.utc)
    )
    db.add(hist)

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="APPLICATION_SUBMITTED",
        entity_type="StudentApplication",
        entity_id=new_app.id,
        details=f"Submitted application {app_number} for {app_in.application_type.value}.",
    )
    db.add(audit)

    db.commit()
    db.refresh(new_app)
    return _build_app_response(new_app)


@router.get("/my", response_model=List[StudentApplicationResponse], summary="Get Current Student Applications")
def get_my_applications(
    current_user: User = Depends(require_roles([UserRole.STUDENT])),
    db: Session = Depends(get_db)
):
    """Retrieve all applications filed by the authenticated student."""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    apps = db.query(StudentApplication).filter(StudentApplication.student_id == student.id).order_by(desc(StudentApplication.created_at)).all()
    return [_build_app_response(a) for a in apps]


@router.get("/", response_model=List[StudentApplicationResponse], summary="List All Applications")
def list_applications(
    status_filter: Optional[ApplicationStatus] = None,
    app_type: Optional[ApplicationType] = None,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Admin / Staff views student application queues."""
    query = db.query(StudentApplication)
    if status_filter:
        query = query.filter(StudentApplication.status == status_filter)
    if app_type:
        query = query.filter(StudentApplication.application_type == app_type)

    apps = query.order_by(desc(StudentApplication.created_at)).all()
    return [_build_app_response(a) for a in apps]


@router.get("/{app_id}", response_model=StudentApplicationResponse, summary="Get Application Details")
def get_application_details(
    app_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve application details with timeline history. Strictly Anti-IDOR."""
    app_record = db.query(StudentApplication).filter(StudentApplication.id == app_id).first()
    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found.")

    student = app_record.student
    if current_user.role == UserRole.STUDENT and student and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Anti-IDOR: Unauthorized to view another student's application.")

    return _build_app_response(app_record)


@router.put("/{app_id}/review", response_model=StudentApplicationResponse, summary="Review Student Application")
def review_application(
    app_id: str,
    review_in: ApplicationReview,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Administrator reviews, approves, rejects, or flags student application."""
    app_record = db.query(StudentApplication).filter(StudentApplication.id == app_id).first()
    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found.")

    app_record.status = review_in.status
    app_record.admin_remarks = review_in.remarks
    app_record.reviewed_by_user_id = current_user.id
    app_record.updated_at = datetime.now(timezone.utc)

    # History record
    hist = ApplicationHistory(
        application_id=app_record.id,
        status=review_in.status,
        action_by_user_id=current_user.id,
        remarks=review_in.remarks,
        created_at=datetime.now(timezone.utc)
    )
    db.add(hist)

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action=f"APPLICATION_{review_in.status.value}",
        entity_type="StudentApplication",
        entity_id=app_record.id,
        details=f"Application {app_record.application_number} updated to {review_in.status.value}. Remarks: {review_in.remarks}",
    )
    db.add(audit)

    db.commit()
    db.refresh(app_record)
    return _build_app_response(app_record)


@router.get("/{app_id}/document", summary="Download Official Dispatched Document PDF")
def download_application_document(
    app_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download official authenticated PDF document for approved applications.
    Anti-IDOR protected: only student owner or administrator.
    """
    app_record = db.query(StudentApplication).filter(StudentApplication.id == app_id).first()
    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found.")

    student = app_record.student
    if current_user.role == UserRole.STUDENT and student and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Anti-IDOR: Unauthorized to access another student's document.")

    if app_record.status not in [ApplicationStatus.APPROVED, ApplicationStatus.READY_FOR_COLLECTION, ApplicationStatus.DISPATCHED]:
        raise HTTPException(
            status_code=400,
            detail=f"Document cannot be generated while application is {app_record.status.value}. Must be APPROVED."
        )

    pdf_path_str = generate_application_document_pdf(
        application_number=app_record.application_number,
        application_type=app_record.application_type.value,
        student_name=student.user.full_name if student and student.user else "Student",
        roll_number=student.roll_number if student else "N/A",
        enrollment_number=student.enrollment_number if student else "N/A",
        department_name=student.department.name if student and student.department else "Academic Department",
        course_name=student.course.name if student and student.course else "Academic Program",
        reason=app_record.reason,
        academic_year=app_record.academic_year,
        approved_date=app_record.updated_at,
        admin_remarks=app_record.admin_remarks
    )

    app_record.generated_document_url = f"/api/v1/applications/{app_record.id}/document"
    db.commit()

    return FileResponse(
        pdf_path_str,
        media_type="application/pdf",
        filename=f"CampusX_Document_{app_record.application_number}.pdf"
    )


def _build_app_response(a: StudentApplication) -> StudentApplicationResponse:
    student = a.student
    history_items = [
        ApplicationHistoryResponse(
            id=h.id,
            application_id=h.application_id,
            status=h.status,
            remarks=h.remarks,
            action_by_name=h.action_by.full_name if h.action_by else "System",
            created_at=h.created_at
        )
        for h in a.history
    ]

    return StudentApplicationResponse(
        id=a.id,
        application_number=a.application_number,
        student_id=a.student_id,
        student_name=student.user.full_name if student and student.user else "Student",
        roll_number=student.roll_number if student else "N/A",
        enrollment_number=student.enrollment_number if student else "N/A",
        department_name=student.department.name if student and student.department else "Engineering",
        course_name=student.course.name if student and student.course else "B.Tech",
        application_type=a.application_type,
        reason=a.reason,
        status=a.status,
        supporting_document_url=a.supporting_document_url,
        generated_document_url=a.generated_document_url,
        academic_year=a.academic_year,
        semester_number=a.semester_number,
        admin_remarks=a.admin_remarks,
        created_at=a.created_at,
        updated_at=a.updated_at,
        history=history_items
    )
