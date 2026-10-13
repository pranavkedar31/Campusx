"""
Attendance Tracking and Attendance Intelligence API Endpoints.
Configurable warning (75%) and critical (65%) thresholds.
"""

from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user, require_roles
from app.core.rbac import UserRole
from app.models.user import User
from app.models.student import Student
from app.models.academic import Subject
from app.models.faculty import Faculty
from app.models.performance import AttendanceRecord, AttendanceStatus
from app.schemas.performance import (
    AttendanceCreate, AttendanceBulkCreate, AttendanceResponse,
    OverallAttendanceSummary, SubjectAttendanceSummary
)

router = APIRouter()


@router.post("/mark", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED, summary="Mark Single Attendance")
def mark_attendance(
    att_in: AttendanceCreate,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Record an individual student's attendance for a subject class."""
    # Find faculty record if current user is faculty
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    faculty_id = faculty.id if faculty else None

    # Check for existing record on same date
    existing = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == att_in.student_id,
        AttendanceRecord.subject_id == att_in.subject_id,
        AttendanceRecord.date == att_in.date
    ).first()

    if existing:
        existing.status = att_in.status
        existing.recorded_by_faculty_id = faculty_id
        db.commit()
        db.refresh(existing)
        return existing

    record = AttendanceRecord(
        student_id=att_in.student_id,
        subject_id=att_in.subject_id,
        date=att_in.date,
        status=att_in.status,
        recorded_by_faculty_id=faculty_id
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # Re-calculate overall attendance for student
    _update_student_attendance_pct(db, att_in.student_id)

    return record


@router.post("/bulk", status_code=status.HTTP_201_CREATED, summary="Bulk Mark Class Attendance")
def mark_bulk_attendance(
    bulk_in: AttendanceBulkCreate,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Mark attendance for an entire classroom section in batch."""
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    faculty_id = faculty.id if faculty else None

    for item in bulk_in.records:
        existing = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == item.student_id,
            AttendanceRecord.subject_id == bulk_in.subject_id,
            AttendanceRecord.date == bulk_in.date
        ).first()

        if existing:
            existing.status = item.status
            existing.recorded_by_faculty_id = faculty_id
        else:
            rec = AttendanceRecord(
                student_id=item.student_id,
                subject_id=bulk_in.subject_id,
                date=bulk_in.date,
                status=item.status,
                recorded_by_faculty_id=faculty_id
            )
            db.add(rec)

    db.commit()

    # Recalculate percentages
    for item in bulk_in.records:
        _update_student_attendance_pct(db, item.student_id)

    return {"status": "success", "message": f"Recorded attendance for {len(bulk_in.records)} students."}


@router.get("/student/{student_id}", response_model=OverallAttendanceSummary, summary="Get Student Attendance Analytics")
def get_student_attendance(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve subject-wise and overall attendance percentage for a student.
    Enforces Anti-IDOR: students can only view their own attendance.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    if current_user.role == UserRole.STUDENT and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to view this student's attendance records.")

    records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id).all()

    # Group by subject
    subjects_map = {}
    total_classes = len(records)
    attended_classes = sum(1 for r in records if r.status in [AttendanceStatus.PRESENT, AttendanceStatus.LATE, AttendanceStatus.EXCUSED])

    for r in records:
        if r.subject_id not in subjects_map:
            sub = db.query(Subject).filter(Subject.id == r.subject_id).first()
            subjects_map[r.subject_id] = {
                "subject_id": r.subject_id,
                "subject_name": sub.name if sub else "Unknown Subject",
                "subject_code": sub.code if sub else "SUB",
                "total": 0,
                "attended": 0
            }
        subjects_map[r.subject_id]["total"] += 1
        if r.status in [AttendanceStatus.PRESENT, AttendanceStatus.LATE, AttendanceStatus.EXCUSED]:
            subjects_map[r.subject_id]["attended"] += 1

    subject_breakdown = []
    for sid, data in subjects_map.items():
        pct = (data["attended"] / data["total"] * 100) if data["total"] > 0 else 100.0
        status_label = "Normal"
        if pct < settings.ATTENDANCE_CRITICAL_THRESHOLD:
            status_label = "Critical"
        elif pct < settings.ATTENDANCE_WARNING_THRESHOLD:
            status_label = "Warning"

        subject_breakdown.append(SubjectAttendanceSummary(
            subject_id=data["subject_id"],
            subject_name=data["subject_name"],
            subject_code=data["subject_code"],
            total_classes=data["total"],
            attended_classes=data["attended"],
            attendance_pct=round(pct, 1),
            status=status_label
        ))

    overall_pct = (attended_classes / total_classes * 100) if total_classes > 0 else 100.0
    overall_status = "Normal"
    if overall_pct < settings.ATTENDANCE_CRITICAL_THRESHOLD:
        overall_status = "Critical"
    elif overall_pct < settings.ATTENDANCE_WARNING_THRESHOLD:
        overall_status = "Warning"

    return OverallAttendanceSummary(
        student_id=student_id,
        total_classes=total_classes,
        attended_classes=attended_classes,
        overall_percentage=round(overall_pct, 1),
        status=overall_status,
        subject_breakdown=subject_breakdown
    )


@router.get("/low-attendance", summary="List Students with Low Attendance")
def get_low_attendance_students(
    threshold: float = Query(75.0, description="Attendance threshold percentage"),
    department_id: Optional[str] = None,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY, UserRole.MANAGEMENT])),
    db: Session = Depends(get_db)
):
    """
    Retrieve students with attendance below configurable threshold.
    """
    query = db.query(Student).join(User, Student.user_id == User.id).filter(Student.attendance_pct < threshold)
    if department_id:
        query = query.filter(Student.department_id == department_id)

    students = query.all()
    return [
        {
            "id": s.id,
            "roll_number": s.roll_number,
            "full_name": s.user.full_name if s.user else "Student",
            "email": s.user.email if s.user else "",
            "attendance_pct": s.attendance_pct,
            "current_semester": s.current_semester,
            "is_critical": s.attendance_pct < settings.ATTENDANCE_CRITICAL_THRESHOLD
        }
        for s in students
    ]


def _update_student_attendance_pct(db: Session, student_id: str):
    """Helper function to update cached attendance percentage on student entity."""
    records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id).all()
    if not records:
        return
    total = len(records)
    attended = sum(1 for r in records if r.status in [AttendanceStatus.PRESENT, AttendanceStatus.LATE, AttendanceStatus.EXCUSED])
    pct = round((attended / total * 100), 2)
    student = db.query(Student).filter(Student.id == student_id).first()
    if student:
        student.attendance_pct = pct
        db.commit()
