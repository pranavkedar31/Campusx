"""
Digital Certificate Management and Public QR Verification API endpoints.
"""

from typing import List, Optional
from datetime import datetime, timezone
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.db.session import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user, require_roles
from app.core.rbac import UserRole
from app.models.user import User
from app.models.student import Student
from app.models.certificate import Certificate, CertificateType, CertificateStatus
from app.schemas.certificate import (
    CertificateRequest, CertificateApproval, CertificateResponse,
    CertificateVerificationResponse
)
from app.services.pdf_service import generate_certificate_pdf, CERTIFICATES_DIR

router = APIRouter()


@router.post("/request", response_model=CertificateResponse, status_code=status.HTTP_201_CREATED, summary="Request Certificate")
def request_certificate(
    req_in: CertificateRequest,
    current_user: User = Depends(require_roles([UserRole.STUDENT])),
    db: Session = Depends(get_db)
):
    """Student submits a request for an academic certificate."""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=400, detail="Student profile not found.")

    cert_uuid = f"CX-{req_in.type.value[:4]}-{datetime.now().year}-{uuid.uuid4().hex[:6].upper()}"

    cert = Certificate(
        certificate_uuid=cert_uuid,
        student_id=student.id,
        type=req_in.type,
        status=CertificateStatus.PENDING,
        purpose=req_in.purpose
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)

    return CertificateResponse(
        id=cert.id,
        certificate_uuid=cert.certificate_uuid,
        student_id=cert.student_id,
        type=cert.type,
        status=cert.status,
        purpose=cert.purpose,
        issue_date=cert.issue_date,
        pdf_filename=cert.pdf_filename,
        created_at=cert.created_at,
        student_name=current_user.full_name,
        roll_number=student.roll_number
    )


@router.get("/my-certificates", response_model=List[CertificateResponse], summary="List My Certificates")
def get_my_certificates(
    current_user: User = Depends(require_roles([UserRole.STUDENT])),
    db: Session = Depends(get_db)
):
    """Retrieve list of requested certificates for current student."""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        return []

    certs = db.query(Certificate).filter(Certificate.student_id == student.id).order_by(desc(Certificate.created_at)).all()
    return [
        CertificateResponse(
            id=c.id,
            certificate_uuid=c.certificate_uuid,
            student_id=c.student_id,
            type=c.type,
            status=c.status,
            purpose=c.purpose,
            issue_date=c.issue_date,
            pdf_filename=c.pdf_filename,
            created_at=c.created_at,
            student_name=current_user.full_name,
            roll_number=student.roll_number
        )
        for c in certs
    ]


@router.get("/pending", response_model=List[CertificateResponse], summary="List Pending Certificate Requests")
def get_pending_certificates(
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Retrieve pending certificate requests for administrative review."""
    certs = db.query(Certificate).filter(Certificate.status == CertificateStatus.PENDING).order_by(Certificate.created_at.asc()).all()
    return [
        CertificateResponse(
            id=c.id,
            certificate_uuid=c.certificate_uuid,
            student_id=c.student_id,
            type=c.type,
            status=c.status,
            purpose=c.purpose,
            issue_date=c.issue_date,
            pdf_filename=c.pdf_filename,
            created_at=c.created_at,
            student_name=c.student.user.full_name if (c.student and c.student.user) else "Student",
            roll_number=c.student.roll_number if c.student else ""
        )
        for c in certs
    ]


@router.put("/{cert_id}/review", response_model=CertificateResponse, summary="Review Certificate Request")
def review_certificate(
    cert_id: str,
    approval_in: CertificateApproval,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """
    Approve or reject a certificate request.
    Upon approval, generates an authentic PDF with embedded verification QR code.
    """
    cert = db.query(Certificate).filter(Certificate.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate request not found.")

    cert.status = approval_in.status
    cert.approved_by_user_id = current_admin.id

    if approval_in.status == CertificateStatus.APPROVED:
        cert.issue_date = datetime.now(timezone.utc)
        student = cert.student
        student_name = student.user.full_name if (student and student.user) else "Student"
        roll_no = student.roll_number if student else ""
        dept_name = student.department.name if (student and student.department) else "Engineering"
        course_name = student.course.name if (student and student.course) else "Degree Program"
        sem = student.current_semester if student else 1

        # Generate PDF
        pdf_path = generate_certificate_pdf(
            certificate_uuid=cert.certificate_uuid,
            cert_type=cert.type.value,
            student_name=student_name,
            roll_number=roll_no,
            department_name=dept_name,
            course_name=course_name,
            semester=sem,
            purpose=cert.purpose,
            issue_date=cert.issue_date
        )
        cert.pdf_filename = Path(pdf_path).name

    db.commit()
    db.refresh(cert)

    return CertificateResponse(
        id=cert.id,
        certificate_uuid=cert.certificate_uuid,
        student_id=cert.student_id,
        type=cert.type,
        status=cert.status,
        purpose=cert.purpose,
        issue_date=cert.issue_date,
        pdf_filename=cert.pdf_filename,
        created_at=cert.created_at,
        student_name=cert.student.user.full_name if (cert.student and cert.student.user) else "Student",
        roll_number=cert.student.roll_number if cert.student else ""
    )


@router.get("/{cert_id}/download", summary="Download Certificate PDF")
def download_certificate(
    cert_id: str,
    db: Session = Depends(get_db)
):
    """Download the official generated certificate PDF file."""
    cert = db.query(Certificate).filter(Certificate.id == cert_id).first()
    if not cert or not cert.pdf_filename:
        raise HTTPException(status_code=404, detail="Certificate file not generated or available.")

    pdf_full_path = CERTIFICATES_DIR / cert.pdf_filename
    if not pdf_full_path.exists():
        raise HTTPException(status_code=404, detail="Certificate file not found on disk.")

    return FileResponse(
        path=str(pdf_full_path),
        filename=cert.pdf_filename,
        media_type="application/pdf"
    )


@router.get("/verify/{certificate_uuid}", response_model=CertificateVerificationResponse, summary="Public Certificate Verification")
def public_verify_certificate(
    certificate_uuid: str,
    db: Session = Depends(get_db)
):
    """
    Public digital verification endpoint.
    Accessed when a third-party scans the QR code on a student certificate.
    """
    cert = db.query(Certificate).filter(Certificate.certificate_uuid == certificate_uuid).first()
    if not cert:
        return CertificateVerificationResponse(
            is_valid=False,
            certificate_id=certificate_uuid,
            status="INVALID",
            document_type="UNKNOWN",
            student_name="N/A",
            roll_number="N/A",
            department="N/A",
            course="N/A",
            message="No institutional record found corresponding to this Certificate ID."
        )

    student = cert.student
    student_name = student.user.full_name if (student and student.user) else "Student"
    roll_no = student.roll_number if student else ""
    dept_name = student.department.name if (student and student.department) else "N/A"
    course_name = student.course.name if (student and student.course) else "N/A"

    is_valid = cert.status == CertificateStatus.APPROVED

    return CertificateVerificationResponse(
        is_valid=is_valid,
        certificate_id=cert.certificate_uuid,
        status=cert.status.value,
        document_type=cert.type.value,
        student_name=student_name,
        roll_number=roll_no,
        department=dept_name,
        course=course_name,
        issue_date=cert.issue_date,
        message="Authentic certificate issued and signed by CampusX University Registrar." if is_valid else f"Certificate status is {cert.status.value}."
    )
