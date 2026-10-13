"""
Marks and Academic Performance Analytics API endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.db.session import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.rbac import UserRole
from app.models.user import User
from app.models.student import Student
from app.models.academic import Subject
from app.models.faculty import Faculty
from app.models.performance import Assessment, Mark
from app.schemas.performance import (
    AssessmentCreate, AssessmentResponse,
    MarkCreate, MarkBulkCreate, MarkResponse,
    StudentPerformanceAnalytics, SubjectPerformanceSummary
)

router = APIRouter()


@router.post("/assessments", response_model=AssessmentResponse, status_code=status.HTTP_201_CREATED, summary="Create Assessment")
def create_assessment(
    ass_in: AssessmentCreate,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Create an assessment (Midterm, Final, Internal, Assignment, Practical)."""
    sub = db.query(Subject).filter(Subject.id == ass_in.subject_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found.")

    assessment = Assessment(**ass_in.model_dump())
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.get("/assessments", response_model=List[AssessmentResponse], summary="List Assessments")
def list_assessments(subject_id: Optional[str] = None, db: Session = Depends(get_db)):
    """List scheduled assessments, optionally filtered by subject."""
    query = db.query(Assessment)
    if subject_id:
        query = query.filter(Assessment.subject_id == subject_id)
    return query.all()


@router.post("/marks", response_model=MarkResponse, status_code=status.HTTP_201_CREATED, summary="Record Mark")
def record_mark(
    mark_in: MarkCreate,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Record an individual student mark."""
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    faculty_id = faculty.id if faculty else None

    # Check existing mark
    existing = db.query(Mark).filter(
        Mark.assessment_id == mark_in.assessment_id,
        Mark.student_id == mark_in.student_id
    ).first()

    if existing:
        existing.score = mark_in.score
        existing.feedback = mark_in.feedback
        existing.graded_by_faculty_id = faculty_id
        db.commit()
        db.refresh(existing)
        return existing

    mark = Mark(
        assessment_id=mark_in.assessment_id,
        student_id=mark_in.student_id,
        score=mark_in.score,
        feedback=mark_in.feedback,
        graded_by_faculty_id=faculty_id
    )
    db.add(mark)
    db.commit()
    db.refresh(mark)

    # Recalculate CGPA
    _recalculate_student_cgpa(db, mark_in.student_id)

    return mark


@router.post("/marks/bulk", status_code=status.HTTP_201_CREATED, summary="Bulk Record Marks")
def record_bulk_marks(
    bulk_in: MarkBulkCreate,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Record marks for multiple students in an assessment."""
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    faculty_id = faculty.id if faculty else None

    for item in bulk_in.marks:
        existing = db.query(Mark).filter(
            Mark.assessment_id == bulk_in.assessment_id,
            Mark.student_id == item.student_id
        ).first()

        if existing:
            existing.score = item.score
            existing.feedback = item.feedback
            existing.graded_by_faculty_id = faculty_id
        else:
            m = Mark(
                assessment_id=bulk_in.assessment_id,
                student_id=item.student_id,
                score=item.score,
                feedback=item.feedback,
                graded_by_faculty_id=faculty_id
            )
            db.add(m)

    db.commit()

    for item in bulk_in.marks:
        _recalculate_student_cgpa(db, item.student_id)

    return {"status": "success", "message": f"Recorded marks for {len(bulk_in.marks)} students."}


@router.get("/student/{student_id}", response_model=StudentPerformanceAnalytics, summary="Get Student Performance Analytics")
def get_student_performance(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Compute academic analytics: CGPA, subject averages, strengths, weak subjects, performance trend.
    Anti-IDOR: students can only access their own profile.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    if current_user.role == UserRole.STUDENT and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to access this student's performance.")

    marks = db.query(Mark).filter(Mark.student_id == student_id).all()

    # Group scores by subject
    subject_scores = {}
    for m in marks:
        ass = m.assessment
        if not ass:
            continue
        sid = ass.subject_id
        if sid not in subject_scores:
            sub = db.query(Subject).filter(Subject.id == sid).first()
            subject_scores[sid] = {
                "name": sub.name if sub else "Subject",
                "code": sub.code if sub else "SUB",
                "scores": [],
                "max_scores": []
            }
        subject_scores[sid]["scores"].append(m.score)
        subject_scores[sid]["max_scores"].append(ass.max_marks)

    subject_summaries = []
    strengths = []
    weak_subjects = []

    for sid, data in subject_scores.items():
        total_obtained = sum(data["scores"])
        total_possible = sum(data["max_scores"])
        pct = (total_obtained / total_possible * 100) if total_possible > 0 else 0.0
        is_weak = pct < 60.0

        if is_weak:
            weak_subjects.append(data["name"])
        elif pct >= 80.0:
            strengths.append(data["name"])

        subject_summaries.append(SubjectPerformanceSummary(
            subject_id=sid,
            subject_name=data["name"],
            subject_code=data["code"],
            score_percentage=round(pct, 1),
            is_weak_subject=is_weak
        ))

    # Needs attention if attendance < 75% or weak subjects exist or CGPA < 6.0
    needs_attention = student.attendance_pct < 75.0 or len(weak_subjects) > 0 or student.cgpa < 6.0

    return StudentPerformanceAnalytics(
        student_id=student_id,
        cgpa=student.cgpa,
        attendance_percentage=student.attendance_pct,
        strengths=strengths,
        weak_subjects=weak_subjects,
        subject_summaries=subject_summaries,
        needs_attention=needs_attention,
        recent_trend="Improving" if student.cgpa >= 7.5 else "Declining" if student.cgpa < 6.0 else "Stable"
    )


@router.get("/top-performers", summary="Get Top Performing Students")
def get_top_performers(
    limit: int = Query(10, ge=1, le=50),
    department_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieve highest CGPA students across campus or department."""
    query = db.query(Student).join(User, Student.user_id == User.id)
    if department_id:
        query = query.filter(Student.department_id == department_id)

    top_students = query.order_by(desc(Student.cgpa)).limit(limit).all()
    return [
        {
            "id": s.id,
            "roll_number": s.roll_number,
            "full_name": s.user.full_name if s.user else "Student",
            "cgpa": s.cgpa,
            "attendance_pct": s.attendance_pct,
            "department": s.department.code if s.department else "CSE"
        }
        for s in top_students
    ]


@router.get("/attention-required", summary="List Students Requiring Academic Attention")
def get_students_needing_attention(
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY, UserRole.MANAGEMENT])),
    db: Session = Depends(get_db)
):
    """Retrieve students with low attendance (<75%) or low CGPA (<6.0)."""
    students = db.query(Student).join(User, Student.user_id == User.id).filter(
        (Student.attendance_pct < 75.0) | (Student.cgpa < 6.0)
    ).all()

    return [
        {
            "id": s.id,
            "roll_number": s.roll_number,
            "full_name": s.user.full_name if s.user else "Student",
            "attendance_pct": s.attendance_pct,
            "cgpa": s.cgpa,
            "reasons": [
                *(["Attendance below 75%"] if s.attendance_pct < 75.0 else []),
                *(["CGPA below 6.0"] if s.cgpa < 6.0 else [])
            ]
        }
        for s in students
    ]


def _recalculate_student_cgpa(db: Session, student_id: str):
    """Calculate and update CGPA (out of 10.0) based on all assessment marks."""
    marks = db.query(Mark).filter(Mark.student_id == student_id).all()
    if not marks:
        return
    total_score = 0.0
    total_max = 0.0
    for m in marks:
        ass = m.assessment
        if ass and ass.max_marks > 0:
            total_score += m.score
            total_max += ass.max_marks

    if total_max > 0:
        pct = (total_score / total_max) * 100.0
        # Convert % to 10.0 scale CGPA
        cgpa = round((pct / 10.0), 2)
        student = db.query(Student).filter(Student.id == student_id).first()
        if student:
            student.cgpa = min(cgpa, 10.0)
            db.commit()
