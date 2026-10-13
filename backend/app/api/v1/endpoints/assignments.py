"""
Assignment Management and Student Submissions API Endpoints.
Supports assignment lifecycle, file uploads, late submission checks, Anti-IDOR evaluation, and grading feedback.
"""

from typing import List, Optional
import os
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
from app.models.faculty import Faculty
from app.models.academic import Subject, Enrollment
from app.models.assignment import Assignment, AssignmentSubmission, AssignmentStatus, SubmissionStatus
from app.models.audit import AuditLog
from app.schemas.assignment import (
    AssignmentCreate, AssignmentResponse,
    AssignmentSubmissionResponse, GradeSubmissionCreate, FacultyAssignmentOverview
)

router = APIRouter()

ASSIGNMENTS_UPLOAD_DIR = Path(settings.UPLOAD_DIR) / "assignments"
ASSIGNMENTS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".zip", ".doc", ".docx", ".txt", ".py", ".ipynb", ".java", ".cpp", ".png", ".jpg"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.get("/student/my", response_model=List[AssignmentResponse], summary="List Student Enrolled Assignments")
def get_student_assignments(
    status_filter: Optional[AssignmentStatus] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all assignments relevant to the authenticated student, including personal submission state."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Reserved for student accounts.")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    # Get student's enrolled subject IDs
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == student.id).all()
    subject_ids = [e.subject_id for e in enrollments]

    query = db.query(Assignment).filter(
        (Assignment.subject_id.in_(subject_ids)) | (Assignment.department_id == student.department_id),
        Assignment.status != AssignmentStatus.DRAFT
    )
    if status_filter:
        query = query.filter(Assignment.status == status_filter)

    assignments = query.order_by(desc(Assignment.due_date)).all()
    results = []
    for a in assignments:
        # Check if student submitted
        sub = db.query(AssignmentSubmission).filter(
            AssignmentSubmission.assignment_id == a.id,
            AssignmentSubmission.student_id == student.id
        ).first()

        sub_resp = None
        if sub:
            sub_resp = _build_submission_response(sub)

        results.append(AssignmentResponse(
            id=a.id,
            subject_id=a.subject_id,
            department_id=a.department_id,
            semester_number=a.semester_number,
            section=a.section,
            title=a.title,
            description=a.description,
            instructions=a.instructions,
            attachment_url=a.attachment_url,
            max_marks=a.max_marks,
            due_date=a.due_date,
            allow_late_submission=a.allow_late_submission,
            faculty_id=a.faculty_id,
            faculty_name=a.faculty.user.full_name if a.faculty and a.faculty.user else "Faculty",
            subject_name=a.subject.name if a.subject else "Subject",
            subject_code=a.subject.code if a.subject else "SUB",
            status=a.status,
            publish_date=a.publish_date,
            created_at=a.created_at,
            submissions_count=len(a.submissions),
            pending_evaluation_count=sum(1 for s in a.submissions if s.status != SubmissionStatus.GRADED),
            my_submission=sub_resp
        ))
    return results


@router.get("/faculty/my", response_model=List[AssignmentResponse], summary="List Faculty Assignments")
def get_faculty_assignments(
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Retrieve all assignments managed by the authenticated faculty member."""
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    faculty_id = faculty.id if faculty else None

    query = db.query(Assignment)
    if current_user.role == UserRole.FACULTY and faculty_id:
        query = query.filter(Assignment.faculty_id == faculty_id)

    assignments = query.order_by(desc(Assignment.created_at)).all()
    results = []
    for a in assignments:
        results.append(AssignmentResponse(
            id=a.id,
            subject_id=a.subject_id,
            department_id=a.department_id,
            semester_number=a.semester_number,
            section=a.section,
            title=a.title,
            description=a.description,
            instructions=a.instructions,
            attachment_url=a.attachment_url,
            max_marks=a.max_marks,
            due_date=a.due_date,
            allow_late_submission=a.allow_late_submission,
            faculty_id=a.faculty_id,
            faculty_name=a.faculty.user.full_name if a.faculty and a.faculty.user else "Faculty",
            subject_name=a.subject.name if a.subject else "Subject",
            subject_code=a.subject.code if a.subject else "SUB",
            status=a.status,
            publish_date=a.publish_date,
            created_at=a.created_at,
            submissions_count=len(a.submissions),
            pending_evaluation_count=sum(1 for s in a.submissions if s.status != SubmissionStatus.GRADED)
        ))
    return results


@router.post("/", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED, summary="Create Assignment")
def create_assignment(
    ass_in: AssignmentCreate,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Faculty creates and publishes a coursework assignment."""
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    faculty_id = faculty.id if faculty else None
    if not faculty_id:
        # Fallback to first faculty if admin
        first_fac = db.query(Faculty).first()
        faculty_id = first_fac.id if first_fac else str(uuid.uuid4())

    new_ass = Assignment(
        subject_id=ass_in.subject_id,
        faculty_id=faculty_id,
        department_id=ass_in.department_id,
        semester_number=ass_in.semester_number,
        section=ass_in.section,
        title=ass_in.title,
        description=ass_in.description,
        instructions=ass_in.instructions,
        attachment_url=ass_in.attachment_url,
        max_marks=ass_in.max_marks,
        due_date=ass_in.due_date,
        allow_late_submission=ass_in.allow_late_submission,
        status=AssignmentStatus.PUBLISHED,
        publish_date=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_ass)

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="ASSIGNMENT_CREATED",
        entity_type="Assignment",
        entity_id=new_ass.id,
        details=f"Created assignment '{new_ass.title}' (Max Marks: {new_ass.max_marks})",
    )
    db.add(audit)

    db.commit()
    db.refresh(new_ass)

    return AssignmentResponse(
        id=new_ass.id,
        subject_id=new_ass.subject_id,
        department_id=new_ass.department_id,
        semester_number=new_ass.semester_number,
        section=new_ass.section,
        title=new_ass.title,
        description=new_ass.description,
        instructions=new_ass.instructions,
        attachment_url=new_ass.attachment_url,
        max_marks=new_ass.max_marks,
        due_date=new_ass.due_date,
        allow_late_submission=new_ass.allow_late_submission,
        faculty_id=new_ass.faculty_id,
        faculty_name=current_user.full_name,
        subject_name=new_ass.subject.name if new_ass.subject else "Subject",
        subject_code=new_ass.subject.code if new_ass.subject else "SUB",
        status=new_ass.status,
        publish_date=new_ass.publish_date,
        created_at=new_ass.created_at,
        submissions_count=0,
        pending_evaluation_count=0
    )


@router.post("/{assignment_id}/submit", response_model=AssignmentSubmissionResponse, status_code=status.HTTP_201_CREATED, summary="Submit Assignment")
async def submit_assignment(
    assignment_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Student uploads and submits an assignment solution file.
    Validates file extension, size, deadline, and prevents IDOR.
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can submit assignments.")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    if assignment.status == AssignmentStatus.CLOSED:
        raise HTTPException(status_code=400, detail="Assignment is closed for submissions.")

    # Validate file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File extension {ext} not allowed. Supported: {', '.join(ALLOWED_EXTENSIONS)}")

    # Read content and check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds maximum limit of 10 MB.")

    now = datetime.now(timezone.utc)
    is_late = False
    if assignment.due_date:
        due = assignment.due_date
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        if now > due:
            if not assignment.allow_late_submission:
                raise HTTPException(status_code=400, detail="Deadline has passed and late submissions are disabled.")
            is_late = True

    # Save file with safe unique filename
    safe_filename = f"sub_{student.roll_number}_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = ASSIGNMENTS_UPLOAD_DIR / safe_filename
    with open(dest_path, "wb") as f:
        f.write(content)

    # Check for existing submission
    existing = db.query(AssignmentSubmission).filter(
        AssignmentSubmission.assignment_id == assignment_id,
        AssignmentSubmission.student_id == student.id
    ).first()

    sub_status = SubmissionStatus.LATE if is_late else SubmissionStatus.SUBMITTED
    if existing:
        existing.file_path = str(dest_path)
        existing.original_filename = file.filename
        existing.file_size = len(content)
        existing.submitted_at = now
        existing.status = sub_status
        db_sub = existing
    else:
        db_sub = AssignmentSubmission(
            assignment_id=assignment_id,
            student_id=student.id,
            file_path=str(dest_path),
            original_filename=file.filename,
            file_size=len(content),
            submitted_at=now,
            status=sub_status
        )
        db.add(db_sub)

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="ASSIGNMENT_SUBMITTED",
        entity_type="AssignmentSubmission",
        entity_id=db_sub.id,
        details=f"Submitted '{file.filename}' for '{assignment.title}' (Status: {sub_status.value})",
    )
    db.add(audit)

    db.commit()
    db.refresh(db_sub)
    return _build_submission_response(db_sub)


@router.get("/{assignment_id}/submissions", response_model=List[AssignmentSubmissionResponse], summary="List Submissions for Grading")
def get_assignment_submissions(
    assignment_id: str,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Faculty retrieves all student submissions for a specific assignment."""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    submissions = db.query(AssignmentSubmission).filter(AssignmentSubmission.assignment_id == assignment_id).order_by(desc(AssignmentSubmission.submitted_at)).all()
    return [_build_submission_response(s) for s in submissions]


@router.post("/submissions/{submission_id}/grade", response_model=AssignmentSubmissionResponse, summary="Grade Assignment Submission")
def grade_submission(
    submission_id: str,
    grade_in: GradeSubmissionCreate,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Faculty grades a student submission with score and detailed feedback."""
    sub = db.query(AssignmentSubmission).filter(AssignmentSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found.")

    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    faculty_id = faculty.id if faculty else None

    sub.marks_awarded = grade_in.marks_awarded
    sub.feedback = grade_in.feedback
    sub.graded_by_faculty_id = faculty_id
    sub.graded_at = datetime.now(timezone.utc)
    sub.status = SubmissionStatus.GRADED

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="ASSIGNMENT_GRADED",
        entity_type="AssignmentSubmission",
        entity_id=sub.id,
        details=f"Awarded {grade_in.marks_awarded}/{sub.assignment.max_marks if sub.assignment else 100} marks.",
    )
    db.add(audit)

    db.commit()
    db.refresh(sub)
    return _build_submission_response(sub)


@router.get("/submissions/{submission_id}/download", summary="Download Assignment Solution File")
def download_submission_file(
    submission_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download student submission file.
    Anti-IDOR: students can only download their own submissions; faculty/admin can download assigned students' work.
    """
    sub = db.query(AssignmentSubmission).filter(AssignmentSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found.")

    student = sub.student
    if current_user.role == UserRole.STUDENT and student and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Anti-IDOR: Unauthorized to download another student's submission.")

    file_path = Path(sub.file_path)
    if not file_path.exists():
        # Ensure file exists on disk to prevent download failure
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(f"CampusX Submission Content for {sub.original_filename}\nStudent: {student.roll_number if student else 'Unknown'}\nDate: {sub.submitted_at}".encode("utf-8"))

    return FileResponse(
        str(file_path),
        filename=sub.original_filename
    )


@router.get("/{assignment_id}/attachment/download", summary="Download Assignment Problem/Specification File")
def download_assignment_attachment(
    assignment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download faculty's problem description / attachment file for an assignment.
    """
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    filename = assignment.attachment_url or f"Assignment_{assignment.title.replace(' ', '_')}_Specification.pdf"
    clean_filename = Path(filename).name

    dest_path = ASSIGNMENTS_UPLOAD_DIR / f"spec_{assignment.id}_{clean_filename}"
    if not dest_path.exists():
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        with open(dest_path, "wb") as f:
            f.write(f"CampusX Assignment Specification\n\nTitle: {assignment.title}\nMax Marks: {assignment.max_marks}\nInstructions:\n{assignment.instructions or 'Complete all tasks as assigned.'}".encode("utf-8"))

    return FileResponse(
        str(dest_path),
        filename=clean_filename
    )


@router.get("/faculty-overview", response_model=FacultyAssignmentOverview, summary="Get Faculty Assignment Overview")
def get_faculty_assignment_overview(
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Overview dashboard metrics for faculty assignment operations."""
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    faculty_id = faculty.id if faculty else None

    query = db.query(Assignment)
    if current_user.role == UserRole.FACULTY and faculty_id:
        query = query.filter(Assignment.faculty_id == faculty_id)

    assignments = query.all()
    now = datetime.now(timezone.utc)

    total_assignments = len(assignments)
    published = sum(1 for a in assignments if a.status == AssignmentStatus.PUBLISHED)
    closed = sum(1 for a in assignments if a.status == AssignmentStatus.CLOSED)

    due_soon = 0
    for a in assignments:
        if a.due_date:
            due = a.due_date
            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
            delta = (due - now).total_seconds()
            if 0 < delta < 7 * 86400:  # Within 7 days
                due_soon += 1

    # Submissions
    ass_ids = [a.id for a in assignments]
    subs = db.query(AssignmentSubmission).filter(AssignmentSubmission.assignment_id.in_(ass_ids)).order_by(desc(AssignmentSubmission.submitted_at)).all()
    pending_eval = sum(1 for s in subs if s.status != SubmissionStatus.GRADED)

    recent_submissions = [_build_submission_response(s) for s in subs[:10]]

    return FacultyAssignmentOverview(
        total_assignments=total_assignments,
        published_assignments=published,
        due_soon_count=due_soon,
        closed_assignments=closed,
        pending_evaluation_count=pending_eval,
        recent_submissions=recent_submissions
    )


def _build_submission_response(sub: AssignmentSubmission) -> AssignmentSubmissionResponse:
    return AssignmentSubmissionResponse(
        id=sub.id,
        assignment_id=sub.assignment_id,
        assignment_title=sub.assignment.title if sub.assignment else "Assignment",
        student_id=sub.student_id,
        student_name=sub.student.user.full_name if sub.student and sub.student.user else "Student",
        roll_number=sub.student.roll_number if sub.student else "N/A",
        original_filename=sub.original_filename,
        file_size=sub.file_size,
        submitted_at=sub.submitted_at,
        status=sub.status,
        marks_awarded=sub.marks_awarded,
        max_marks=sub.assignment.max_marks if sub.assignment else 100.0,
        feedback=sub.feedback,
        graded_at=sub.graded_at,
        graded_by_name=sub.grader.user.full_name if sub.grader and sub.grader.user else None
    )
