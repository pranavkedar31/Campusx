"""
Extracurricular Activities, Grade Rules, and Dynamic GPA Calculation Engine.
"""

from typing import List, Optional
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.rbac import UserRole
from app.models.user import User
from app.models.student import Student
from app.models.academic import Subject
from app.models.examination import ExamResult, ExamResultSubject
from app.models.grade import (
    GradeRule, ExtracurricularActivity, InstitutionAcademicConfig
)
from app.models.audit import AuditLog
from app.schemas.grade import (
    GradeRuleCreate, GradeRuleUpdate, GradeRuleResponse,
    ExtracurricularCreate, ExtracurricularUpdate, ExtracurricularResponse,
    InstitutionAcademicConfigResponse, InstitutionAcademicConfigUpdate
)

router = APIRouter()


# ----------------- GRADE RULES -----------------
@router.get("/rules", response_model=List[GradeRuleResponse], summary="List Grade Rules")
def list_grade_rules(db: Session = Depends(get_db)):
    """List institution grading scale."""
    return db.query(GradeRule).order_by(desc(GradeRule.grade_point)).all()


@router.post("/rules", response_model=GradeRuleResponse, status_code=status.HTTP_201_CREATED, summary="Create Grade Rule")
def create_grade_rule(
    rule_in: GradeRuleCreate,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Add a grading bracket."""
    existing = db.query(GradeRule).filter(GradeRule.grade == rule_in.grade).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Grade rule for '{rule_in.grade}' already exists.")

    rule = GradeRule(**rule_in.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.put("/rules/{rule_id}", response_model=GradeRuleResponse, summary="Update Grade Rule")
def update_grade_rule(
    rule_id: str,
    rule_in: GradeRuleUpdate,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Update a grading bracket."""
    rule = db.query(GradeRule).filter(GradeRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Grade rule not found.")

    for field, val in rule_in.model_dump(exclude_unset=True).items():
        setattr(rule, field, val)

    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}", summary="Delete Grade Rule")
def delete_grade_rule(
    rule_id: str,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    rule = db.query(GradeRule).filter(GradeRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Grade rule not found.")
    db.delete(rule)
    db.commit()
    return {"status": "success", "message": "Grade rule deleted."}


# ----------------- EXTRACURRICULAR ACTIVITIES -----------------
@router.get("/student/{student_id}", response_model=List[ExtracurricularResponse], summary="List Student Activities")
def list_student_activities(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List extra-curricular activities for a student (Anti-IDOR protected)."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    if current_user.role == UserRole.STUDENT and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Anti-IDOR: Unauthorized to view another student's activities.")

    activities = db.query(ExtracurricularActivity).filter(ExtracurricularActivity.student_id == student_id).order_by(desc(ExtracurricularActivity.created_at)).all()
    return [_build_activity_response(a) for a in activities]


@router.get("/", response_model=List[ExtracurricularResponse], summary="List All Activities")
def list_all_activities(
    category: Optional[str] = None,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Admin / Faculty view of institutional activities."""
    query = db.query(ExtracurricularActivity)
    if category:
        query = query.filter(ExtracurricularActivity.category == category)
    activities = query.order_by(desc(ExtracurricularActivity.created_at)).all()
    return [_build_activity_response(a) for a in activities]


@router.post("/", response_model=ExtracurricularResponse, status_code=status.HTTP_201_CREATED, summary="Log Extracurricular Activity")
def create_activity(
    act_in: ExtracurricularCreate,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Add extra-curricular participation credit."""
    student = db.query(Student).filter(Student.id == act_in.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    activity = ExtracurricularActivity(**act_in.model_dump())
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return _build_activity_response(activity)


@router.put("/{activity_id}", response_model=ExtracurricularResponse, summary="Update Activity")
def update_activity(
    activity_id: str,
    act_in: ExtracurricularUpdate,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    act = db.query(ExtracurricularActivity).filter(ExtracurricularActivity.id == activity_id).first()
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found.")

    for field, val in act_in.model_dump(exclude_unset=True).items():
        setattr(act, field, val)

    db.commit()
    db.refresh(act)
    return _build_activity_response(act)


@router.delete("/{activity_id}", summary="Delete Activity")
def delete_activity(
    activity_id: str,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    act = db.query(ExtracurricularActivity).filter(ExtracurricularActivity.id == activity_id).first()
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found.")
    db.delete(act)
    db.commit()
    return {"status": "success", "message": "Activity deleted."}


# ----------------- INSTITUTION ACADEMIC CONFIG -----------------
@router.get("/config", response_model=InstitutionAcademicConfigResponse, summary="Get Academic Config")
def get_academic_config(db: Session = Depends(get_db)):
    """Retrieve global academic grading configuration."""
    cfg = db.query(InstitutionAcademicConfig).first()
    if not cfg:
        cfg = InstitutionAcademicConfig(
            include_extracurricular_in_cgpa=False,
            minimum_attendance_pct_for_exam=75.0,
            pass_percentage=40.0
        )
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg


@router.put("/config", response_model=InstitutionAcademicConfigResponse, summary="Update Academic Config")
def update_academic_config(
    cfg_in: InstitutionAcademicConfigUpdate,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Toggle GPA calculation parameters (e.g. include extra-curricular in CGPA)."""
    cfg = db.query(InstitutionAcademicConfig).first()
    if not cfg:
        cfg = InstitutionAcademicConfig()
        db.add(cfg)

    for field, val in cfg_in.model_dump(exclude_unset=True).items():
        setattr(cfg, field, val)

    db.commit()
    db.refresh(cfg)
    return cfg


# ----------------- DYNAMIC GPA CALCULATION ENGINE -----------------
@router.post("/recalculate-gpa/{student_id}", summary="Recalculate SGPA and CGPA from marks")
def recalculate_student_gpa(
    student_id: str,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """
    Mathematical SGPA/CGPA Calculation Engine:
    SGPA = Sum(credits * grade_point) / Sum(credits) for each semester.
    CGPA = Sum(credits * grade_point across all semesters) / Sum(credits across all semesters).
    Maps percentages to GradeRule table dynamically.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    grade_rules = db.query(GradeRule).all()
    cfg = db.query(InstitutionAcademicConfig).first()
    include_extra = cfg.include_extracurricular_in_cgpa if cfg else False

    def get_grade_info(pct: float):
        for r in grade_rules:
            if r.min_percentage <= pct <= r.max_percentage:
                return r.grade, r.grade_point, "PASS" if r.is_passing else "FAIL"
        # Fallbacks if table empty
        if pct >= 90: return "O", 10.0, "PASS"
        if pct >= 80: return "A+", 9.0, "PASS"
        if pct >= 70: return "A", 8.0, "PASS"
        if pct >= 60: return "B+", 7.0, "PASS"
        if pct >= 50: return "B", 6.0, "PASS"
        if pct >= 40: return "C", 5.0, "PASS"
        return "F", 0.0, "FAIL"

    results = db.query(ExamResult).filter(ExamResult.student_id == student_id).order_by(ExamResult.semester_number.asc()).all()

    total_all_credits = 0.0
    total_all_weighted_points = 0.0

    updated_semesters = []
    for r in results:
        sem_credits = 0.0
        sem_weighted = 0.0
        total_obt = 0.0
        total_max = 0.0

        for sub in r.subjects:
            credits = float(sub.subject.credits) if sub.subject else 3.0
            pct = (sub.total_marks / sub.max_marks * 100.0) if sub.max_marks > 0 else 0.0
            grade, grade_pt, status_str = get_grade_info(pct)
            sub.grade = grade
            sub.grade_point = grade_pt
            sub.status = status_str

            sem_credits += credits
            sem_weighted += credits * grade_pt
            total_obt += sub.total_marks
            total_max += sub.max_marks

        # Include extracurricular if enabled
        if include_extra:
            extra_acts = db.query(ExtracurricularActivity).filter(
                ExtracurricularActivity.student_id == student_id,
                ExtracurricularActivity.semester_number == r.semester_number
            ).all()
            for act in extra_acts:
                sem_credits += act.credits
                sem_weighted += act.credits * act.grade_point

        sgpa = (sem_weighted / sem_credits) if sem_credits > 0 else 0.0
        r.sgpa = round(sgpa, 2)
        r.total_marks_obtained = total_obt
        r.total_max_marks = total_max
        r.percentage = round((total_obt / total_max * 100.0) if total_max > 0 else 0.0, 2)

        total_all_credits += sem_credits
        total_all_weighted_points += sem_weighted

        current_cumulative_cgpa = (total_all_weighted_points / total_all_credits) if total_all_credits > 0 else 0.0
        r.cgpa = round(current_cumulative_cgpa, 2)
        updated_semesters.append({"semester": r.semester_number, "sgpa": r.sgpa, "cgpa": r.cgpa})

    final_cgpa = (total_all_weighted_points / total_all_credits) if total_all_credits > 0 else student.cgpa
    student.cgpa = round(final_cgpa, 2)

    db.commit()
    return {
        "status": "success",
        "student_id": student.id,
        "roll_number": student.roll_number,
        "cgpa": student.cgpa,
        "semesters": updated_semesters,
        "include_extracurricular": include_extra
    }


def _build_activity_response(a: ExtracurricularActivity) -> ExtracurricularResponse:
    student = a.student
    return ExtracurricularResponse(
        id=a.id,
        student_id=a.student_id,
        student_name=student.user.full_name if student and student.user else "Student",
        roll_number=student.roll_number if student else "N/A",
        department_name=student.department.name if student and student.department else "Engineering",
        activity_name=a.activity_name,
        category=a.category,
        academic_year=a.academic_year,
        semester_number=a.semester_number,
        credits=a.credits,
        grade=a.grade,
        grade_point=a.grade_point,
        certificate_url=a.certificate_url,
        remarks=a.remarks,
        created_at=a.created_at
    )
