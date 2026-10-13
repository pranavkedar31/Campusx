"""
Student Fee and Ledger Management API Endpoints.
Provides fee overview, transaction tracking, simulated payment processing, and PDF receipts.
"""

from typing import List, Optional
import uuid
from datetime import datetime, date, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.rbac import UserRole
from app.models.user import User
from app.models.student import Student
from app.models.academic import Department, Course
from app.models.fee import (
    FeeHead, FeeStructure, FeeStructureComponent, StudentFee,
    FeeTransaction, FeeReceipt, FeeStatus, PaymentMode, TransactionStatus
)
from app.models.audit import AuditLog
from app.schemas.fee import (
    FeeHeadCreate, FeeHeadResponse,
    FeeStructureCreate, FeeStructureResponse,
    StudentFeeResponse, FeePaymentCreate, FeeTransactionResponse,
    FeeReceiptResponse, StudentFeeLedgerResponse, AdminFeeOverview
)
from app.services.pdf_service import generate_fee_receipt_pdf, FEE_RECEIPTS_DIR

router = APIRouter()


@router.get("/student/me", response_model=StudentFeeLedgerResponse, summary="Get Current Student's Fee Ledger")
def get_my_fee_ledger(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve the authenticated student's complete fee ledger and payment history."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=400, detail="Endpoint is reserved for students. Use /fees/student/{id} for other roles.")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    return _build_student_ledger(db, student)


@router.get("/student/{student_id}", response_model=StudentFeeLedgerResponse, summary="Get Student Fee Ledger by ID")
def get_student_fee_ledger(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve student fee ledger with strict Anti-IDOR enforcement:
    Students can only view their own ledger; administrative/faculty roles can view authorized students.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    if current_user.role == UserRole.STUDENT and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Anti-IDOR: Unauthorized to access another student's fee ledger.")

    return _build_student_ledger(db, student)


@router.post("/pay", response_model=FeeReceiptResponse, status_code=status.HTTP_201_CREATED, summary="Record/Simulate Fee Payment")
def pay_student_fee(
    payment_in: FeePaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute student fee payment ledger transaction:
    Deducts pending amount, updates fee status, creates immutable transaction log,
    and generates an official ReportLab fee receipt PDF.
    """
    fee = db.query(StudentFee).filter(StudentFee.id == payment_in.student_fee_id).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Fee record not found.")

    student = db.query(Student).filter(Student.id == fee.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Associated student not found.")

    # Anti-IDOR check
    if current_user.role == UserRole.STUDENT and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Anti-IDOR: You cannot make payments for other students.")

    if payment_in.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")

    if payment_in.amount > fee.pending_amount:
        raise HTTPException(status_code=400, detail=f"Amount exceeds outstanding pending balance of ₹{fee.pending_amount:,.2f}")

    # Generate unique transaction reference & receipt number
    txn_ref = f"TXN-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
    receipt_no = f"RCP-{datetime.now().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"

    # Create transaction
    txn = FeeTransaction(
        student_fee_id=fee.id,
        student_id=student.id,
        amount=payment_in.amount,
        payment_mode=payment_in.payment_mode,
        transaction_ref=txn_ref,
        transaction_date=datetime.now(timezone.utc),
        status=TransactionStatus.SUCCESS,
        remarks=payment_in.remarks or "Online Fee Payment"
    )
    db.add(txn)

    # Update fee balances
    fee.paid_amount += payment_in.amount
    fee.pending_amount = max(0.0, fee.total_amount - fee.paid_amount)
    if fee.pending_amount <= 0:
        fee.status = FeeStatus.PAID
    else:
        fee.status = FeeStatus.PARTIAL

    db.flush()

    # Generate Receipt PDF
    dept_name = student.department.name if student.department else "Engineering"
    course_name = student.course.name if student.course else "B.Tech"
    pdf_path_str = generate_fee_receipt_pdf(
        receipt_number=receipt_no,
        student_name=student.user.full_name if student.user else "Student",
        roll_number=student.roll_number,
        department_name=dept_name,
        course_name=course_name,
        semester=fee.semester_number,
        academic_year=fee.academic_year,
        amount=payment_in.amount,
        payment_mode=payment_in.payment_mode.value,
        transaction_ref=txn_ref,
        transaction_date=txn.transaction_date,
        remaining_balance=fee.pending_amount
    )

    receipt = FeeReceipt(
        receipt_number=receipt_no,
        fee_transaction_id=txn.id,
        student_fee_id=fee.id,
        student_id=student.id,
        amount=payment_in.amount,
        receipt_date=txn.transaction_date,
        pdf_filename=Path(pdf_path_str).name
    )
    db.add(receipt)

    # Record Audit Log
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="FEE_PAYMENT_RECORDED",
        entity_type="StudentFee",
        entity_id=fee.id,
        details=f"Paid ₹{payment_in.amount:,.2f} via {payment_in.payment_mode.value}. Receipt: {receipt_no}",
    )
    db.add(audit)

    db.commit()
    db.refresh(receipt)
    return receipt


@router.get("/receipts/{receipt_id}/download", summary="Download Official Fee Receipt PDF")
def download_fee_receipt(
    receipt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download generated PDF fee receipt with Anti-IDOR security."""
    receipt = db.query(FeeReceipt).filter(FeeReceipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found.")

    student = db.query(Student).filter(Student.id == receipt.student_id).first()
    if current_user.role == UserRole.STUDENT and student and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Anti-IDOR: Unauthorized to download another student's receipt.")

    pdf_path = FEE_RECEIPTS_DIR / receipt.pdf_filename
    if not pdf_path.exists():
        # Regenerate on the fly if needed
        student_fee = db.query(StudentFee).filter(StudentFee.id == receipt.student_fee_id).first()
        dept_name = student.department.name if student and student.department else "Engineering"
        course_name = student.course.name if student and student.course else "B.Tech"
        txn = receipt.transaction
        pdf_path_str = generate_fee_receipt_pdf(
            receipt_number=receipt.receipt_number,
            student_name=student.user.full_name if student and student.user else "Student",
            roll_number=student.roll_number if student else "N/A",
            department_name=dept_name,
            course_name=course_name,
            semester=student_fee.semester_number if student_fee else 1,
            academic_year=student_fee.academic_year if student_fee else "2025-2026",
            amount=receipt.amount,
            payment_mode=txn.payment_mode.value if txn else "UPI",
            transaction_ref=txn.transaction_ref if txn else "TXN-REF",
            transaction_date=receipt.receipt_date,
            remaining_balance=student_fee.pending_amount if student_fee else 0.0
        )
        pdf_path = Path(pdf_path_str)

    return FileResponse(
        str(pdf_path),
        media_type="application/pdf",
        filename=f"CampusX_Receipt_{receipt.receipt_number}.pdf"
    )


@router.get("/admin-overview", response_model=AdminFeeOverview, summary="Get Institutional Fees Overview")
def get_admin_fee_overview(
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT])),
    db: Session = Depends(get_db)
):
    """Retrieve university-wide fee metrics: total expected, collected, pending, and overdue."""
    fees = db.query(StudentFee).all()
    total_expected = sum(f.total_amount for f in fees)
    total_collected = sum(f.paid_amount for f in fees)
    total_pending = sum(f.pending_amount for f in fees if f.status != FeeStatus.PAID)
    total_overdue = sum(f.pending_amount for f in fees if f.due_date < date.today() and f.status != FeeStatus.PAID)
    collection_rate = (total_collected / total_expected * 100.0) if total_expected > 0 else 0.0

    recent_txns = db.query(FeeTransaction).order_by(desc(FeeTransaction.transaction_date)).limit(10).all()
    txns_data = []
    for t in recent_txns:
        r = db.query(FeeReceipt).filter(FeeReceipt.fee_transaction_id == t.id).first()
        txns_data.append(FeeTransactionResponse(
            id=t.id,
            student_fee_id=t.student_fee_id,
            student_id=t.student_id,
            amount=t.amount,
            payment_mode=t.payment_mode,
            transaction_ref=t.transaction_ref,
            transaction_date=t.transaction_date,
            status=t.status,
            remarks=t.remarks,
            receipt_number=r.receipt_number if r else None
        ))

    return AdminFeeOverview(
        total_expected=round(total_expected, 2),
        total_collected=round(total_collected, 2),
        total_pending=round(total_pending, 2),
        total_overdue=round(total_overdue, 2),
        collection_rate_pct=round(collection_rate, 1),
        recent_transactions=txns_data
    )


@router.get("/structures", response_model=List[FeeStructureResponse], summary="List Fee Structures")
def list_fee_structures(
    department_id: Optional[str] = None,
    academic_year: Optional[str] = None,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT])),
    db: Session = Depends(get_db)
):
    """List approved institutional fee structures."""
    query = db.query(FeeStructure)
    if department_id:
        query = query.filter(FeeStructure.department_id == department_id)
    if academic_year:
        query = query.filter(FeeStructure.academic_year == academic_year)
    return query.all()


def _build_student_ledger(db: Session, student: Student) -> StudentFeeLedgerResponse:
    """Helper to assemble student fee records, transactions, and status."""
    fees = db.query(StudentFee).filter(StudentFee.student_id == student.id).all()
    txns = db.query(FeeTransaction).filter(FeeTransaction.student_id == student.id).order_by(desc(FeeTransaction.transaction_date)).all()

    total_fees = sum(f.total_amount for f in fees)
    total_paid = sum(f.paid_amount for f in fees)
    total_pending = sum(f.pending_amount for f in fees)

    overall_status = FeeStatus.PAID
    if total_pending > 0:
        is_overdue = any(f.due_date < date.today() and f.pending_amount > 0 for f in fees)
        overall_status = FeeStatus.OVERDUE if is_overdue else FeeStatus.PENDING if total_paid == 0 else FeeStatus.PARTIAL

    next_due = None
    pending_fees = [f for f in fees if f.pending_amount > 0]
    if pending_fees:
        next_due = min(f.due_date for f in pending_fees)

    fees_data = []
    for f in fees:
        f_txns = [t for t in txns if t.student_fee_id == f.id]
        f_txns_data = []
        for t in f_txns:
            r = db.query(FeeReceipt).filter(FeeReceipt.fee_transaction_id == t.id).first()
            f_txns_data.append(FeeTransactionResponse(
                id=t.id,
                student_fee_id=t.student_fee_id,
                student_id=t.student_id,
                amount=t.amount,
                payment_mode=t.payment_mode,
                transaction_ref=t.transaction_ref,
                transaction_date=t.transaction_date,
                status=t.status,
                remarks=t.remarks,
                receipt_number=r.receipt_number if r else None
            ))

        fees_data.append(StudentFeeResponse(
            id=f.id,
            student_id=f.student_id,
            fee_structure_id=f.fee_structure_id,
            academic_year=f.academic_year,
            semester_number=f.semester_number,
            total_amount=f.total_amount,
            paid_amount=f.paid_amount,
            pending_amount=f.pending_amount,
            due_date=f.due_date,
            status=f.status,
            transactions=f_txns_data
        ))

    txns_data = []
    for t in txns:
        r = db.query(FeeReceipt).filter(FeeReceipt.fee_transaction_id == t.id).first()
        txns_data.append(FeeTransactionResponse(
            id=t.id,
            student_fee_id=t.student_fee_id,
            student_id=t.student_id,
            amount=t.amount,
            payment_mode=t.payment_mode,
            transaction_ref=t.transaction_ref,
            transaction_date=t.transaction_date,
            status=t.status,
            remarks=t.remarks,
            receipt_number=r.receipt_number if r else None
        ))

    return StudentFeeLedgerResponse(
        student_id=student.id,
        student_name=student.user.full_name if student.user else "Student",
        roll_number=student.roll_number,
        total_fees=round(total_fees, 2),
        total_paid=round(total_paid, 2),
        total_pending=round(total_pending, 2),
        status=overall_status,
        next_due_date=next_due,
        fees=fees_data,
        recent_transactions=txns_data
    )
