"""
Management & Institutional Analytics API Endpoints.
Aggregates campus-wide KPIs, department matrices, and retention metrics.
"""

from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.core.dependencies import require_roles
from app.core.rbac import UserRole
from app.models.user import User
from app.models.student import Student
from app.models.faculty import Faculty
from app.models.academic import Department, Course
from app.models.placement import PlacementApplication, PlacementOffer, ApplicationStatus
from app.schemas.analytics import (
    InstitutionalSummaryResponse, InstitutionalKPIs, DepartmentPerformance
)
from app.ml.risk_predictor import predict_risk

router = APIRouter()


@router.get(
    "/institutional-summary",
    response_model=InstitutionalSummaryResponse,
    summary="Executive Institutional Summary & Performance KPIs"
)
def get_institutional_summary(
    current_user: User = Depends(require_roles([UserRole.MANAGEMENT, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Produces executive-level institutional intelligence for Chancellor, Deans, and Executive Management.
    """
    total_students = db.query(Student).count()
    total_faculty = db.query(Faculty).count()
    total_departments = db.query(Department).count()
    total_courses = db.query(Course).count()

    # Academic averages
    students = db.query(Student).all()
    if students:
        avg_att = round(sum(s.attendance_pct or 0.0 for s in students) / len(students), 1)
        avg_cgpa = round(sum(s.cgpa or 0.0 for s in students) / len(students), 2)
    else:
        avg_att = 0.0
        avg_cgpa = 0.0

    # Placement metrics
    offers = db.query(PlacementOffer).all()
    total_offers = len(offers)
    highest_ctc = max([o.ctc_offered for o in offers], default=0.0)
    avg_ctc = round(sum(o.ctc_offered for o in offers) / total_offers, 2) if total_offers > 0 else 0.0

    placed_count = db.query(PlacementApplication.student_id).filter(
        PlacementApplication.status == ApplicationStatus.OFFERED
    ).distinct().count()
    placement_rate = round((placed_count / total_students * 100), 1) if total_students > 0 else 0.0

    # Faculty ratio
    ratio_num = round(total_students / total_faculty, 1) if total_faculty > 0 else total_students
    ratio_str = f"{ratio_num}:1"

    kpis = InstitutionalKPIs(
        total_students=total_students,
        total_faculty=total_faculty,
        total_departments=total_departments,
        total_courses=total_courses,
        average_attendance=avg_att,
        average_cgpa=avg_cgpa,
        total_placement_offers=total_offers,
        placement_rate=placement_rate,
        highest_ctc=highest_ctc,
        average_ctc=avg_ctc,
        student_faculty_ratio=ratio_str
    )

    # Risk Distribution & Department Matrix
    risk_dist = {"HIGH": 0, "MODERATE": 0, "LOW": 0}
    for s in students:
        res = predict_risk(
            attendance_pct=s.attendance_pct or 100.0,
            cgpa=s.cgpa or 0.0,
            failed_assessments_count=0
        )
        risk_dist[res["risk_level"]] = risk_dist.get(res["risk_level"], 0) + 1

    departments = db.query(Department).all()
    dept_matrix: List[DepartmentPerformance] = []

    for d in departments:
        dept_students = db.query(Student).filter(Student.department_id == d.id).all()
        dept_faculty = db.query(Faculty).filter(Faculty.department_id == d.id).count()

        s_count = len(dept_students)
        d_avg_att = round(sum(s.attendance_pct or 0.0 for s in dept_students) / s_count, 1) if s_count > 0 else 0.0
        d_avg_cgpa = round(sum(s.cgpa or 0.0 for s in dept_students) / s_count, 2) if s_count > 0 else 0.0

        # At-Risk in this department
        d_risk_count = 0
        for s in dept_students:
            s_res = predict_risk(
                attendance_pct=s.attendance_pct or 100.0,
                cgpa=s.cgpa or 0.0,
                failed_assessments_count=0
            )
            if s_res["risk_level"] in ["HIGH", "MODERATE"]:
                d_risk_count += 1

        # Placed in this department
        dept_placed = db.query(PlacementApplication).join(Student).filter(
            Student.department_id == d.id,
            PlacementApplication.status == ApplicationStatus.OFFERED
        ).distinct().count()
        d_placement_rate = round((dept_placed / s_count * 100), 1) if s_count > 0 else 0.0

        dept_matrix.append(DepartmentPerformance(
            department_id=d.id,
            code=d.code,
            name=d.name,
            student_count=s_count,
            faculty_count=dept_faculty,
            avg_attendance=d_avg_att,
            avg_cgpa=d_avg_cgpa,
            at_risk_count=d_risk_count,
            placement_rate=d_placement_rate
        ))

    return InstitutionalSummaryResponse(
        kpis=kpis,
        department_matrix=dept_matrix,
        risk_distribution=risk_dist,
        generated_at=datetime.now(timezone.utc)
    )
