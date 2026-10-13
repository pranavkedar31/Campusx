"""
Placement Management and Career Intelligence API endpoints.
"""

from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.db.session import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.rbac import UserRole
from app.models.user import User
from app.models.student import Student
from app.models.academic import Department
from app.models.placement import (
    Company, JobRole, JobStatus, PlacementApplication,
    ApplicationStatus, PlacementOffer, OfferStatus
)
from app.schemas.placement import (
    CompanyCreate, CompanyResponse,
    JobRoleCreate, JobRoleResponse,
    PlacementApplicationCreate, PlacementApplicationResponse,
    ApplicationStatusUpdate, PlacementStatsResponse, PlacementOfferResponse
)

router = APIRouter()


# -------------------------------------------------------------
# Companies
# -------------------------------------------------------------
@router.post("/companies", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED, summary="Create Partner Company")
def create_company(
    comp_in: CompanyCreate,
    current_user: User = Depends(require_roles([UserRole.PLACEMENT_OFFICER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    """Register an recruiting partner company."""
    existing = db.query(Company).filter(Company.name == comp_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Company with this name already registered.")

    company = Company(
        name=comp_in.name,
        website=comp_in.website,
        industry=comp_in.industry,
        contact_email=comp_in.contact_email,
        location=comp_in.location,
        headquarters=comp_in.headquarters,
        contact_person=comp_in.contact_person,
        phone=comp_in.phone,
        description=comp_in.description
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.get("/companies", response_model=List[CompanyResponse], summary="List Partner Companies")
def list_companies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve list of all registered recruiting companies."""
    return db.query(Company).order_by(Company.name.asc()).all()


# -------------------------------------------------------------
# Job Roles
# -------------------------------------------------------------
@router.post("/jobs", response_model=JobRoleResponse, status_code=status.HTTP_201_CREATED, summary="Post Placement Job Role")
def create_job(
    job_in: JobRoleCreate,
    current_user: User = Depends(require_roles([UserRole.PLACEMENT_OFFICER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    """Publish a new placement job opportunity."""
    company = db.query(Company).filter(Company.id == job_in.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")

    job = JobRole(
        company_id=job_in.company_id,
        title=job_in.title,
        description=job_in.description,
        package_ctc=job_in.package_ctc,
        min_cgpa=job_in.min_cgpa,
        eligible_departments=job_in.eligible_departments,
        application_deadline=job_in.application_deadline,
        drive_date=job_in.drive_date,
        status=JobStatus.OPEN
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    return JobRoleResponse(
        id=job.id,
        company_id=job.company_id,
        company_name=company.name,
        title=job.title,
        description=job.description,
        package_ctc=job.package_ctc,
        min_cgpa=job.min_cgpa,
        eligible_departments=job.eligible_departments,
        application_deadline=job.application_deadline,
        drive_date=job.drive_date,
        status=job.status,
        created_at=job.created_at
    )


@router.get("/jobs", response_model=List[JobRoleResponse], summary="List Job Roles with Eligibility Intelligence")
def list_jobs(
    status_filter: Optional[JobStatus] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all campus job drives. If authenticated as a student,
    calculates real-time academic eligibility against student's CGPA and department.
    """
    query = db.query(JobRole)
    if status_filter:
        query = query.filter(JobRole.status == status_filter)
    jobs = query.order_by(desc(JobRole.created_at)).all()

    student = None
    applied_map = {}
    if current_user.role == UserRole.STUDENT:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            apps = db.query(PlacementApplication).filter(PlacementApplication.student_id == student.id).all()
            applied_map = {a.job_role_id: a.status.value for a in apps}

    results = []
    for job in jobs:
        comp_name = job.company.name if job.company else "Unknown"
        is_eligible = None
        eligibility_reason = None
        has_applied = False
        app_status = None

        if student:
            has_applied = job.id in applied_map
            app_status = applied_map.get(job.id)

            # Check eligibility
            dept_code = student.department.code if student.department else ""
            dept_eligible = (
                job.eligible_departments == "ALL"
                or dept_code in [d.strip() for d in job.eligible_departments.split(",")]
            )
            cgpa_eligible = student.cgpa >= job.min_cgpa

            if not cgpa_eligible:
                is_eligible = False
                eligibility_reason = f"Requires min CGPA {job.min_cgpa} (current: {student.cgpa})"
            elif not dept_eligible:
                is_eligible = False
                eligibility_reason = f"Restricted to {job.eligible_departments}"
            else:
                is_eligible = True
                eligibility_reason = "Eligible for this drive"

        results.append(JobRoleResponse(
            id=job.id,
            company_id=job.company_id,
            company_name=comp_name,
            title=job.title,
            description=job.description,
            package_ctc=job.package_ctc,
            min_cgpa=job.min_cgpa,
            eligible_departments=job.eligible_departments,
            application_deadline=job.application_deadline,
            drive_date=job.drive_date,
            status=job.status,
            is_eligible=is_eligible,
            eligibility_reason=eligibility_reason,
            has_applied=has_applied,
            application_status=app_status,
            created_at=job.created_at
        ))

    return results


# -------------------------------------------------------------
# Applications
# -------------------------------------------------------------
@router.post("/apply", response_model=PlacementApplicationResponse, status_code=status.HTTP_201_CREATED, summary="Apply for Campus Drive")
def apply_for_job(
    app_in: PlacementApplicationCreate,
    current_user: User = Depends(require_roles([UserRole.STUDENT])),
    db: Session = Depends(get_db)
):
    """Student submits an application to a campus recruitment drive."""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=400, detail="Student profile not found.")

    job = db.query(JobRole).filter(JobRole.id == app_in.job_role_id).first()
    if not job or job.status != JobStatus.OPEN:
        raise HTTPException(status_code=400, detail="Job drive is closed or not found.")

    # Check CGPA eligibility
    if student.cgpa < job.min_cgpa:
        raise HTTPException(status_code=400, detail=f"Ineligible: Minimum CGPA of {job.min_cgpa} required.")

    # Check Department eligibility
    dept_code = student.department.code if student.department else ""
    if job.eligible_departments != "ALL" and dept_code not in [d.strip() for d in job.eligible_departments.split(",")]:
        raise HTTPException(status_code=400, detail=f"Ineligible: Department restricted to {job.eligible_departments}.")

    # Check Deadline
    if job.application_deadline and datetime.now(timezone.utc) > job.application_deadline.replace(tzinfo=timezone.utc if job.application_deadline.tzinfo is None else None):
        raise HTTPException(status_code=400, detail="Application deadline for this drive has expired.")

    # Check Duplicate
    existing = db.query(PlacementApplication).filter(
        PlacementApplication.job_role_id == job.id,
        PlacementApplication.student_id == student.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied to this drive.")

    application = PlacementApplication(
        job_role_id=job.id,
        student_id=student.id,
        status=ApplicationStatus.APPLIED,
        resume_url=app_in.resume_url,
        notes=app_in.notes
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    return PlacementApplicationResponse(
        id=application.id,
        job_role_id=job.id,
        job_title=job.title,
        company_name=job.company.name if job.company else "",
        student_id=student.id,
        student_name=current_user.full_name,
        roll_number=student.roll_number,
        department_name=student.department.name if student.department else "",
        cgpa=student.cgpa,
        status=application.status,
        resume_url=application.resume_url,
        notes=application.notes,
        applied_at=application.applied_at,
        updated_at=application.updated_at
    )


@router.get("/my-applications", response_model=List[PlacementApplicationResponse], summary="List Student's Applications")
def get_my_applications(
    current_user: User = Depends(require_roles([UserRole.STUDENT])),
    db: Session = Depends(get_db)
):
    """Retrieve all campus placement applications submitted by the logged in student."""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        return []

    apps = db.query(PlacementApplication).filter(PlacementApplication.student_id == student.id).order_by(desc(PlacementApplication.applied_at)).all()
    results = []
    for a in apps:
        offer_resp = None
        if a.offer:
            offer_resp = PlacementOfferResponse(
                id=a.offer.id,
                application_id=a.offer.application_id,
                ctc_offered=a.offer.ctc_offered,
                status=a.offer.status,
                offer_date=a.offer.offer_date
            )
        results.append(PlacementApplicationResponse(
            id=a.id,
            job_role_id=a.job_role_id,
            job_title=a.job_role.title if a.job_role else "",
            company_name=a.job_role.company.name if (a.job_role and a.job_role.company) else "",
            student_id=student.id,
            student_name=current_user.full_name,
            roll_number=student.roll_number,
            department_name=student.department.name if student.department else "",
            cgpa=student.cgpa,
            status=a.status,
            resume_url=a.resume_url,
            notes=a.notes,
            applied_at=a.applied_at,
            updated_at=a.updated_at,
            offer=offer_resp
        ))
    return results


@router.get("/applications", response_model=List[PlacementApplicationResponse], summary="List Placement Applications Pipeline")
def list_applications(
    job_role_id: Optional[str] = None,
    status_filter: Optional[ApplicationStatus] = None,
    current_user: User = Depends(require_roles([UserRole.PLACEMENT_OFFICER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    """Placement Officer views candidates across the hiring pipeline."""
    query = db.query(PlacementApplication)
    if job_role_id:
        query = query.filter(PlacementApplication.job_role_id == job_role_id)
    if status_filter:
        query = query.filter(PlacementApplication.status == status_filter)

    apps = query.order_by(desc(PlacementApplication.applied_at)).all()
    results = []
    for a in apps:
        stu = a.student
        stu_name = stu.user.full_name if (stu and stu.user) else "Unknown"
        dept_name = stu.department.name if (stu and stu.department) else "Unknown"
        roll = stu.roll_number if stu else ""
        cgpa = stu.cgpa if stu else 0.0

        offer_resp = None
        if a.offer:
            offer_resp = PlacementOfferResponse(
                id=a.offer.id,
                application_id=a.offer.application_id,
                ctc_offered=a.offer.ctc_offered,
                status=a.offer.status,
                offer_date=a.offer.offer_date
            )

        results.append(PlacementApplicationResponse(
            id=a.id,
            job_role_id=a.job_role_id,
            job_title=a.job_role.title if a.job_role else "",
            company_name=a.job_role.company.name if (a.job_role and a.job_role.company) else "",
            student_id=a.student_id,
            student_name=stu_name,
            roll_number=roll,
            department_name=dept_name,
            cgpa=cgpa,
            status=a.status,
            resume_url=a.resume_url,
            notes=a.notes,
            applied_at=a.applied_at,
            updated_at=a.updated_at,
            offer=offer_resp
        ))
    return results


@router.put("/applications/{app_id}/status", response_model=PlacementApplicationResponse, summary="Advance Candidate in Pipeline")
def update_application_status(
    app_id: str,
    update_in: ApplicationStatusUpdate,
    current_user: User = Depends(require_roles([UserRole.PLACEMENT_OFFICER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Advance candidate through recruitment funnel (SHORTLISTED, INTERVIEW_SCHEDULED, OFFERED, REJECTED).
    If status is OFFERED, generates an official placement offer record.
    """
    app = db.query(PlacementApplication).filter(PlacementApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    app.status = update_in.status
    if update_in.notes:
        app.notes = update_in.notes

    offer_resp = None
    if update_in.status == ApplicationStatus.OFFERED:
        ctc = update_in.ctc_offered or (app.job_role.package_ctc if app.job_role else 0.0)
        existing_offer = db.query(PlacementOffer).filter(PlacementOffer.application_id == app.id).first()
        if not existing_offer:
            offer = PlacementOffer(
                application_id=app.id,
                ctc_offered=ctc,
                status=OfferStatus.PENDING,
                offer_date=datetime.now(timezone.utc)
            )
            db.add(offer)
            db.commit()
            db.refresh(offer)
            existing_offer = offer
        else:
            existing_offer.ctc_offered = ctc
            db.commit()
            db.refresh(existing_offer)

        offer_resp = PlacementOfferResponse(
            id=existing_offer.id,
            application_id=existing_offer.application_id,
            ctc_offered=existing_offer.ctc_offered,
            status=existing_offer.status,
            offer_date=existing_offer.offer_date
        )

    db.commit()
    db.refresh(app)

    stu = app.student
    return PlacementApplicationResponse(
        id=app.id,
        job_role_id=app.job_role_id,
        job_title=app.job_role.title if app.job_role else "",
        company_name=app.job_role.company.name if (app.job_role and app.job_role.company) else "",
        student_id=app.student_id,
        student_name=stu.user.full_name if (stu and stu.user) else "",
        roll_number=stu.roll_number if stu else "",
        department_name=stu.department.name if (stu and stu.department) else "",
        cgpa=stu.cgpa if stu else 0.0,
        status=app.status,
        resume_url=app.resume_url,
        notes=app.notes,
        applied_at=app.applied_at,
        updated_at=app.updated_at,
        offer=offer_resp
    )


# -------------------------------------------------------------
# Placement Statistics & Institutional Intelligence
# -------------------------------------------------------------
@router.get("/stats", response_model=PlacementStatsResponse, summary="Placement Funnel & Career Intelligence Metrics")
def get_placement_stats(
    current_user: User = Depends(require_roles([UserRole.PLACEMENT_OFFICER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGEMENT])),
    db: Session = Depends(get_db)
):
    """Aggregates campus placement KPIs, CTC distributions, and recruitment funnel stages."""
    total_companies = db.query(Company).count()
    active_drives = db.query(JobRole).filter(JobRole.status == JobStatus.OPEN).count()
    total_applications = db.query(PlacementApplication).count()

    offers = db.query(PlacementOffer).all()
    total_offers = len(offers)
    highest_ctc = max([o.ctc_offered for o in offers], default=0.0)
    avg_ctc = round(sum([o.ctc_offered for o in offers]) / total_offers, 2) if total_offers > 0 else 0.0

    total_students = db.query(Student).count()
    unique_placed_students = db.query(PlacementApplication.student_id).filter(
        PlacementApplication.status == ApplicationStatus.OFFERED
    ).distinct().count()
    placement_rate = round((unique_placed_students / total_students * 100), 2) if total_students > 0 else 0.0

    # Funnel
    funnel = {
        "Applied": db.query(PlacementApplication).filter(PlacementApplication.status == ApplicationStatus.APPLIED).count(),
        "Shortlisted": db.query(PlacementApplication).filter(PlacementApplication.status == ApplicationStatus.SHORTLISTED).count(),
        "Interview Scheduled": db.query(PlacementApplication).filter(PlacementApplication.status == ApplicationStatus.INTERVIEW_SCHEDULED).count(),
        "Offers Extended": total_offers,
        "Rejected": db.query(PlacementApplication).filter(PlacementApplication.status == ApplicationStatus.REJECTED).count(),
    }

    # Department breakdown
    dept_breakdown = []
    depts = db.query(Department).all()
    for d in depts:
        total_dept_students = db.query(Student).filter(Student.department_id == d.id).count()
        placed_dept = db.query(PlacementApplication).join(Student).filter(
            Student.department_id == d.id,
            PlacementApplication.status == ApplicationStatus.OFFERED
        ).distinct().count()
        dept_breakdown.append({
            "department": d.code,
            "department_name": d.name,
            "total_students": total_dept_students,
            "placed_students": placed_dept,
            "placement_rate": round(placed_dept / total_dept_students * 100, 1) if total_dept_students > 0 else 0.0
        })

    return PlacementStatsResponse(
        total_companies=total_companies,
        active_drives=active_drives,
        total_applications=total_applications,
        total_offers=total_offers,
        highest_ctc=highest_ctc,
        average_ctc=avg_ctc,
        placement_rate=placement_rate,
        funnel=funnel,
        department_breakdown=dept_breakdown
    )
