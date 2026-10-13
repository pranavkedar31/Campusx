"""
Examination and Results Management API Endpoints.
Handles examination schedules, timetable conflict checking, student exam registration forms,
fee payment simulation, administrative verification, results, and PDF Hall Tickets & Marksheets.
"""

from typing import List, Optional
import uuid
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.rbac import UserRole
from app.models.user import User
from app.models.student import Student
from app.models.academic import Subject
from app.models.examination import (
    Examination, ExamSchedule, ExamForm, ExamFormSubject,
    ExamResult, ExamResultSubject, ExamType, ExamStatus, ExamFormStatus, ResultStatus,
    HallTicket
)
from app.models.audit import AuditLog
from app.schemas.examination import (
    ExaminationCreate, ExaminationResponse,
    ExamScheduleCreate, ExamScheduleResponse,
    ExamFormCreate, ExamFormReview, ExamFormResponse, ExamFormSubjectResponse,
    ExamFormPaymentRequest, HallTicketResponse,
    ConflictCheckRequest, ConflictCheckResponse,
    ExamResultResponse, ExamResultSubjectResponse
)
from app.services.pdf_service import generate_marksheet_pdf, generate_hall_ticket_pdf, MARKSHEETS_DIR, HALL_TICKETS_DIR

router = APIRouter()


@router.get("/", response_model=List[ExaminationResponse], summary="List Examinations")
def list_examinations(
    semester_number: Optional[int] = None,
    academic_year: Optional[str] = None,
    status: Optional[ExamStatus] = None,
    db: Session = Depends(get_db)
):
    """Retrieve all university examinations and their schedules."""
    query = db.query(Examination)
    if semester_number:
        query = query.filter(Examination.semester_number == semester_number)
    if academic_year:
        query = query.filter(Examination.academic_year == academic_year)
    if status:
        query = query.filter(Examination.status == status)

    exams = query.order_by(desc(Examination.start_date)).all()
    results = []
    for e in exams:
        scheds = [
            ExamScheduleResponse(
                id=s.id,
                examination_id=s.examination_id,
                subject_id=s.subject_id,
                subject_name=s.subject.name if s.subject else "Subject",
                subject_code=s.subject.code if s.subject else "SUB",
                exam_date=s.exam_date,
                start_time=s.start_time,
                end_time=s.end_time,
                room_no=s.room_no,
                max_marks=s.max_marks
            )
            for s in e.schedules
        ]

        results.append(ExaminationResponse(
            id=e.id,
            name=e.name,
            exam_type=e.exam_type,
            academic_year=e.academic_year,
            semester_number=e.semester_number,
            start_date=e.start_date,
            end_date=e.end_date,
            exam_fee=e.exam_fee,
            form_opening_date=e.form_opening_date,
            form_closing_date=e.form_closing_date,
            eligible_courses=e.eligible_courses,
            eligible_semesters=e.eligible_semesters,
            status=e.status,
            instructions=e.instructions,
            created_at=e.created_at,
            schedules=scheds
        ))
    return results


@router.post("/", response_model=ExaminationResponse, status_code=status.HTTP_201_CREATED, summary="Create Examination")
def create_examination(
    exam_in: ExaminationCreate,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Administrator creates examination session and publishes exam timetable schedules."""
    exam = Examination(
        name=exam_in.name,
        exam_type=exam_in.exam_type,
        academic_year=exam_in.academic_year,
        semester_number=exam_in.semester_number,
        start_date=exam_in.start_date,
        end_date=exam_in.end_date,
        exam_fee=exam_in.exam_fee,
        form_opening_date=exam_in.form_opening_date,
        form_closing_date=exam_in.form_closing_date,
        eligible_courses=exam_in.eligible_courses,
        eligible_semesters=exam_in.eligible_semesters,
        instructions=exam_in.instructions,
        status=ExamStatus.UPCOMING,
        created_at=datetime.now(timezone.utc)
    )
    db.add(exam)
    db.flush()

    for s in exam_in.schedules:
        sched = ExamSchedule(
            examination_id=exam.id,
            subject_id=s.subject_id,
            exam_date=s.exam_date,
            start_time=s.start_time,
            end_time=s.end_time,
            room_no=s.room_no,
            max_marks=s.max_marks
        )
        db.add(sched)

    db.commit()
    db.refresh(exam)

    scheds = [
        ExamScheduleResponse(
            id=s.id,
            examination_id=s.examination_id,
            subject_id=s.subject_id,
            subject_name=s.subject.name if s.subject else "Subject",
            subject_code=s.subject.code if s.subject else "SUB",
            exam_date=s.exam_date,
            start_time=s.start_time,
            end_time=s.end_time,
            room_no=s.room_no,
            max_marks=s.max_marks
        )
        for s in exam.schedules
    ]

    return ExaminationResponse(
        id=exam.id,
        name=exam.name,
        exam_type=exam.exam_type,
        academic_year=exam.academic_year,
        semester_number=exam.semester_number,
        start_date=exam.start_date,
        end_date=exam.end_date,
        exam_fee=exam.exam_fee,
        form_opening_date=exam.form_opening_date,
        form_closing_date=exam.form_closing_date,
        eligible_courses=exam.eligible_courses,
        eligible_semesters=exam.eligible_semesters,
        status=exam.status,
        instructions=exam.instructions,
        created_at=exam.created_at,
        schedules=scheds
    )


@router.post("/check-conflict", response_model=ConflictCheckResponse, summary="Check Exam Timetable Conflicts")
def check_timetable_conflict(
    req: ConflictCheckRequest,
    db: Session = Depends(get_db)
):
    """
    Check if a proposed exam slot conflicts with existing schedules (same room or same subject/date).
    """
    conflicts = []
    # Check same room & same date
    room_conflicts = db.query(ExamSchedule).filter(
        ExamSchedule.exam_date == req.exam_date,
        ExamSchedule.room_no == req.room_no
    )
    if req.exclude_schedule_id:
        room_conflicts = room_conflicts.filter(ExamSchedule.id != req.exclude_schedule_id)

    for rc in room_conflicts.all():
        if rc.start_time == req.start_time:
            conflicts.append(f"Room '{req.room_no}' is already reserved for subject '{rc.subject.code}' on {req.exam_date} at {rc.start_time}")

    # Check same subject & date
    sub_conflicts = db.query(ExamSchedule).filter(
        ExamSchedule.exam_date == req.exam_date,
        ExamSchedule.subject_id == req.subject_id
    )
    if req.exclude_schedule_id:
        sub_conflicts = sub_conflicts.filter(ExamSchedule.id != req.exclude_schedule_id)

    for sc in sub_conflicts.all():
        conflicts.append(f"Subject '{sc.subject.name}' already has an exam scheduled on {req.exam_date} at {sc.start_time}")

    return ConflictCheckResponse(
        has_conflict=len(conflicts) > 0,
        conflicts=conflicts
    )


@router.get("/forms/all", response_model=List[ExamFormResponse], summary="List All Exam Forms (Admin)")
def list_all_exam_forms(
    examination_id: Optional[str] = None,
    status_filter: Optional[ExamFormStatus] = None,
    payment_status: Optional[str] = None,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Admin reviews student exam applications."""
    query = db.query(ExamForm)
    if examination_id:
        query = query.filter(ExamForm.examination_id == examination_id)
    if status_filter:
        query = query.filter(ExamForm.status == status_filter)
    if payment_status:
        query = query.filter(ExamForm.payment_status == payment_status)

    forms = query.order_by(desc(ExamForm.submission_date)).all()
    return [_build_exam_form_response(f) for f in forms]


@router.get("/{exam_id}/form", response_model=Optional[ExamFormResponse], summary="Get Student Exam Form")
def get_student_exam_form(
    exam_id: str,
    student_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get exam form status for a student.
    Anti-IDOR: students can only view their own exam form.
    """
    if current_user.role == UserRole.STUDENT:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        target_student_id = student.id if student else None
    else:
        target_student_id = student_id

    if not target_student_id:
        return None

    form = db.query(ExamForm).filter(
        ExamForm.examination_id == exam_id,
        ExamForm.student_id == target_student_id
    ).first()

    if not form:
        return None

    return _build_exam_form_response(form)


@router.post("/{exam_id}/form/submit", response_model=ExamFormResponse, status_code=status.HTTP_201_CREATED, summary="Submit Exam Form")
def submit_exam_form(
    exam_id: str,
    form_in: ExamFormCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Student submits examination registration form.
    Sets status to SUBMITTED and payment_status to PENDING.
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can submit examination forms.")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found.")

    existing = db.query(ExamForm).filter(
        ExamForm.examination_id == exam_id,
        ExamForm.student_id == student.id
    ).first()

    if existing and existing.status in [ExamFormStatus.APPROVED]:
        raise HTTPException(status_code=400, detail="Exam form is already APPROVED. Modification not allowed.")

    sem = form_in.semester_number or exam.semester_number or student.current_semester
    acad_year = form_in.academic_year or exam.academic_year

    if not existing:
        existing = ExamForm(
            examination_id=exam_id,
            student_id=student.id,
            semester_number=sem,
            academic_year=acad_year,
            status=ExamFormStatus.SUBMITTED,
            payment_status="PENDING",
            submission_date=datetime.now(timezone.utc)
        )
        db.add(existing)
        db.flush()
    else:
        existing.status = ExamFormStatus.SUBMITTED
        existing.semester_number = sem
        existing.academic_year = acad_year
        existing.submission_date = datetime.now(timezone.utc)
        db.query(ExamFormSubject).filter(ExamFormSubject.exam_form_id == existing.id).delete()

    for sub in form_in.subjects:
        db.add(ExamFormSubject(
            exam_form_id=existing.id,
            subject_id=sub.subject_id,
            is_backlog=sub.is_backlog
        ))

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="EXAM_FORM_SUBMITTED",
        entity_type="ExamForm",
        entity_id=existing.id,
        details=f"Submitted exam form for {exam.name} with {len(form_in.subjects)} subjects.",
    )
    db.add(audit)

    db.commit()
    db.refresh(existing)
    return _build_exam_form_response(existing)


@router.post("/forms/{form_id}/pay-fee", response_model=ExamFormResponse, summary="Pay Exam Fee")
def pay_exam_fee(
    form_id: str,
    payment_in: ExamFormPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Simulate payment for exam form fee.
    CRITICAL: Payment alone does NOT approve the form. Status remains SUBMITTED until admin approval.
    """
    form = db.query(ExamForm).filter(ExamForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Exam form not found.")

    student = form.student
    if current_user.role == UserRole.STUDENT and student and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Anti-IDOR: Unauthorized to pay for another student's form.")

    if form.payment_status == "SUCCESS":
        raise HTTPException(status_code=400, detail="Exam fee has already been paid for this form.")

    txn_id = f"TXN-EXAM-{uuid.uuid4().hex[:10].upper()}"
    form.payment_status = "SUCCESS"
    form.transaction_id = txn_id
    form.payment_reference = payment_in.payment_reference or f"UPI-PAY-{uuid.uuid4().hex[:8]}"
    form.amount_paid = form.examination.exam_fee if form.examination else 1500.0
    form.paid_at = datetime.now(timezone.utc)

    # Note: form.status is intentionally left as SUBMITTED/VERIFIED, NOT changed to APPROVED.
    db.commit()
    db.refresh(form)
    return _build_exam_form_response(form)


@router.put("/forms/{form_id}/review", response_model=ExamFormResponse, summary="Review/Approve Exam Form")
def review_exam_form(
    form_id: str,
    review_in: ExamFormReview,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Administrative or faculty review and verification of student exam form."""
    form = db.query(ExamForm).filter(ExamForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Exam form not found.")

    form.status = review_in.status
    form.verification_notes = review_in.verification_notes
    form.verified_by_user_id = current_user.id

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action=f"EXAM_FORM_{review_in.status.value}",
        entity_type="ExamForm",
        entity_id=form.id,
        details=f"Status updated to {review_in.status.value}. Notes: {review_in.verification_notes}",
    )
    db.add(audit)

    db.commit()
    db.refresh(form)
    return _build_exam_form_response(form)


@router.get("/forms/{form_id}/hall-ticket", response_model=HallTicketResponse, summary="Get Hall Ticket Details")
def get_hall_ticket_details(
    form_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve metadata of generated Hall Ticket."""
    form = db.query(ExamForm).filter(ExamForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Exam form not found.")

    student = form.student
    if current_user.role == UserRole.STUDENT and student and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Anti-IDOR: Unauthorized to access another student's hall ticket.")

    ht = form.hall_ticket
    if not ht:
        raise HTTPException(status_code=404, detail="Hall ticket has not been generated yet.")

    return _build_hall_ticket_response(ht, form)


@router.get("/forms/{form_id}/hall-ticket-pdf", summary="Generate & Download Hall Ticket PDF")
def download_hall_ticket_pdf(
    form_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download official authenticated examination Admit Card / Hall Ticket PDF.
    GUARD REQUIREMENTS:
    1. Form status must be APPROVED.
    2. Payment status must be SUCCESS.
    3. Examination schedule timetable must exist.
    """
    form = db.query(ExamForm).filter(ExamForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Exam form not found.")

    student = form.student
    if current_user.role == UserRole.STUDENT and student and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Anti-IDOR: Unauthorized to download another student's hall ticket.")

    # Guard 1: Must be APPROVED
    if form.status != ExamFormStatus.APPROVED:
        raise HTTPException(
            status_code=400,
            detail=f"Hall Ticket cannot be issued: Exam form status is '{form.status.value}'. Must be APPROVED by administrator."
        )

    # Guard 2: Payment must be SUCCESS
    if form.payment_status != "SUCCESS":
        raise HTTPException(
            status_code=400,
            detail=f"Hall Ticket cannot be issued: Exam fee payment is '{form.payment_status}'. Please complete fee clearance."
        )

    # Guard 3: Examination schedules timetable must exist
    schedules = form.examination.schedules if form.examination else []
    if not schedules:
        raise HTTPException(
            status_code=400,
            detail="Hall Ticket cannot be issued: No timetable schedule has been published for this examination."
        )

    # Find or generate HallTicket record
    ht = form.hall_ticket
    if not ht:
        ht_num = f"HT-{form.examination.academic_year[:4] if form.examination else '2026'}-{student.roll_number}"
        ht = HallTicket(
            exam_form_id=form.id,
            student_id=student.id,
            examination_id=form.examination_id,
            hall_ticket_number=ht_num,
            pdf_filename=f"{ht_num}.pdf",
            qr_data=f"CAMPUSX:HT:{ht_num}:{student.roll_number}:{form.examination.name if form.examination else 'Exam'}",
            generated_at=datetime.now(timezone.utc)
        )
        db.add(ht)
        db.commit()
        db.refresh(ht)

    # Prepare schedule list for PDF
    sched_list = [
        {
            "exam_date": s.exam_date,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "subject_code": s.subject.code if s.subject else "SUB",
            "subject_name": s.subject.name if s.subject else "Subject",
            "room_no": s.room_no
        }
        for s in schedules
    ]

    pdf_path_str = generate_hall_ticket_pdf(
        hall_ticket_number=ht.hall_ticket_number,
        student_name=student.user.full_name if student and student.user else "Student",
        roll_number=student.roll_number if student else "N/A",
        prn=student.prn or student.enrollment_number or "N/A",
        department_name=student.department.name if student and student.department else "Engineering",
        course_name=student.course.name if student and student.course else "Academic Program",
        examination_name=form.examination.name if form.examination else "University Examination",
        semester=form.semester_number,
        academic_year=form.academic_year,
        schedules=sched_list,
        qr_data=ht.qr_data
    )

    return FileResponse(
        pdf_path_str,
        media_type="application/pdf",
        filename=f"CampusX_HallTicket_{student.roll_number}.pdf"
    )


@router.get("/results/student/{student_id}", response_model=List[ExamResultResponse], summary="Get Student Exam Results")
def get_student_exam_results(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve semester results and grade cards for a student with Anti-IDOR enforcement.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    if current_user.role == UserRole.STUDENT and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Anti-IDOR: Unauthorized to access another student's examination results.")

    results = db.query(ExamResult).filter(ExamResult.student_id == student_id).order_by(desc(ExamResult.semester_number)).all()
    return [_build_exam_result_response(r) for r in results]


@router.get("/results/{result_id}/marksheet-pdf", summary="Download Official Marksheet PDF")
def download_marksheet_pdf(
    result_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate and download official academic semester marksheet PDF.
    Anti-IDOR protected: only student owner or authorized staff can download.
    """
    result = db.query(ExamResult).filter(ExamResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result record not found.")

    student = result.student
    if current_user.role == UserRole.STUDENT and student and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Anti-IDOR: Unauthorized to download another student's marksheet.")

    subjects_data = []
    for s in result.subjects:
        subjects_data.append({
            "subject_code": s.subject.code if s.subject else "SUB",
            "subject_name": s.subject.name if s.subject else "Course Subject",
            "credits": s.subject.credits if s.subject else 3,
            "internal_marks": s.internal_marks,
            "external_marks": s.external_marks,
            "total_marks": s.total_marks,
            "grade": s.grade,
            "grade_point": s.grade_point,
            "status": s.status,
        })

    pdf_path_str = generate_marksheet_pdf(
        examination_name=result.examination.name if result.examination else "Semester Examination",
        student_name=student.user.full_name if student and student.user else "Student",
        roll_number=student.roll_number if student else "N/A",
        enrollment_number=student.enrollment_number if student else "N/A",
        department_name=student.department.name if student and student.department else "Engineering",
        course_name=student.course.name if student and student.course else "B.Tech",
        semester=result.semester_number,
        academic_year=result.academic_year,
        sgpa=result.sgpa,
        cgpa=result.cgpa,
        percentage=result.percentage,
        result_status=result.result_status.value,
        subjects=subjects_data
    )

    return FileResponse(
        pdf_path_str,
        media_type="application/pdf",
        filename=f"CampusX_Marksheet_{student.roll_number if student else 'student'}_Sem{result.semester_number}.pdf"
    )


def _build_exam_form_response(form: ExamForm) -> ExamFormResponse:
    sub_responses = [
        ExamFormSubjectResponse(
            id=s.id,
            subject_id=s.subject_id,
            subject_name=s.subject.name if s.subject else "Subject",
            subject_code=s.subject.code if s.subject else "SUB",
            credits=s.subject.credits if s.subject else 3,
            is_backlog=s.is_backlog
        )
        for s in form.subjects
    ]

    ht = form.hall_ticket
    return ExamFormResponse(
        id=form.id,
        examination_id=form.examination_id,
        examination_name=form.examination.name if form.examination else "Examination",
        student_id=form.student_id,
        student_name=form.student.user.full_name if form.student and form.student.user else "Student",
        roll_number=form.student.roll_number if form.student else "N/A",
        prn=form.student.prn if form.student else None,
        department_name=form.student.department.name if (form.student and form.student.department) else None,
        course_name=form.student.course.name if (form.student and form.student.course) else None,
        semester_number=form.semester_number,
        academic_year=form.academic_year,
        status=form.status,
        payment_status=form.payment_status,
        payment_reference=form.payment_reference,
        transaction_id=form.transaction_id,
        amount_paid=form.amount_paid,
        paid_at=form.paid_at,
        submission_date=form.submission_date,
        verification_notes=form.verification_notes,
        has_hall_ticket=ht is not None,
        hall_ticket_number=ht.hall_ticket_number if ht else None,
        subjects=sub_responses
    )


def _build_hall_ticket_response(ht: HallTicket, form: ExamForm) -> HallTicketResponse:
    student = form.student
    schedules = form.examination.schedules if form.examination else []
    sched_responses = [
        ExamScheduleResponse(
            id=s.id,
            examination_id=s.examination_id,
            subject_id=s.subject_id,
            subject_name=s.subject.name if s.subject else "Subject",
            subject_code=s.subject.code if s.subject else "SUB",
            exam_date=s.exam_date,
            start_time=s.start_time,
            end_time=s.end_time,
            room_no=s.room_no,
            max_marks=s.max_marks
        )
        for s in schedules
    ]

    return HallTicketResponse(
        id=ht.id,
        exam_form_id=ht.exam_form_id,
        student_id=ht.student_id,
        student_name=student.user.full_name if student and student.user else "Student",
        roll_number=student.roll_number if student else "N/A",
        prn=student.prn if student else None,
        course_name=student.course.name if student and student.course else "Academic Program",
        department_name=student.department.name if student and student.department else "Engineering",
        examination_id=ht.examination_id,
        examination_name=form.examination.name if form.examination else "University Exam",
        hall_ticket_number=ht.hall_ticket_number,
        pdf_filename=ht.pdf_filename,
        is_blocked=ht.is_blocked,
        generated_at=ht.generated_at,
        schedules=sched_responses
    )


def _build_exam_result_response(res: ExamResult) -> ExamResultResponse:
    sub_responses = [
        ExamResultSubjectResponse(
            id=s.id,
            subject_id=s.subject_id,
            subject_name=s.subject.name if s.subject else "Subject",
            subject_code=s.subject.code if s.subject else "SUB",
            credits=s.subject.credits if s.subject else 3,
            internal_marks=s.internal_marks,
            external_marks=s.external_marks,
            practical_marks=s.practical_marks,
            total_marks=s.total_marks,
            max_marks=s.max_marks,
            grade=s.grade,
            grade_point=s.grade_point,
            status=s.status
        )
        for s in res.subjects
    ]

    return ExamResultResponse(
        id=res.id,
        examination_id=res.examination_id,
        examination_name=res.examination.name if res.examination else "Semester Exam",
        student_id=res.student_id,
        student_name=res.student.user.full_name if res.student and res.student.user else "Student",
        roll_number=res.student.roll_number if res.student else "N/A",
        prn=res.student.prn if res.student else None,
        department_name=res.student.department.name if res.student and res.student.department else "Engineering",
        course_name=res.student.course.name if res.student and res.student.course else "B.Tech",
        semester_number=res.semester_number,
        academic_year=res.academic_year,
        sgpa=res.sgpa,
        cgpa=res.cgpa,
        total_marks_obtained=res.total_marks_obtained,
        total_max_marks=res.total_max_marks,
        percentage=res.percentage,
        result_status=res.result_status,
        published_at=res.published_at,
        subjects=sub_responses
    )
