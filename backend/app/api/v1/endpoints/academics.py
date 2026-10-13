"""
Academic management endpoints: Departments, Courses, Subjects, Semesters.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.dependencies import require_roles, get_current_user
from app.core.rbac import UserRole
from app.models.user import User
from app.models.academic import Department, Course, Subject, AcademicYear, Semester, Syllabus, AcademicCalendarEvent
from app.schemas.academic import (
    DepartmentCreate, DepartmentUpdate, DepartmentResponse,
    CourseCreate, CourseUpdate, CourseResponse,
    SubjectCreate, SubjectUpdate, SubjectResponse,
    AcademicYearBase, AcademicYearResponse,
    SemesterBase, SemesterResponse,
    SyllabusCreate, SyllabusUpdate, SyllabusResponse,
    AcademicCalendarEventCreate, AcademicCalendarEventUpdate, AcademicCalendarEventResponse
)

router = APIRouter()

# ----------------- DEPARTMENTS -----------------
@router.get("/departments", response_model=List[DepartmentResponse], summary="List Departments")
def list_departments(db: Session = Depends(get_db)):
    """List all academic departments."""
    return db.query(Department).all()


@router.post("/departments", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED, summary="Create Department")
def create_department(
    dept_in: DepartmentCreate,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Create a new department (Admin only)."""
    existing = db.query(Department).filter(Department.code == dept_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Department with code '{dept_in.code}' already exists.")

    dept = Department(**dept_in.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.delete("/departments/{dept_id}", summary="Delete Department")
def delete_department(
    dept_id: str,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")
    db.delete(dept)
    db.commit()
    return {"status": "success", "message": f"Department {dept.name} deleted."}


# ----------------- COURSES -----------------
@router.get("/courses", response_model=List[CourseResponse], summary="List Courses")
def list_courses(department_id: Optional[str] = None, db: Session = Depends(get_db)):
    """List courses with optional department filter."""
    query = db.query(Course)
    if department_id:
        query = query.filter(Course.department_id == department_id)
    return query.all()


@router.post("/courses", response_model=CourseResponse, status_code=status.HTTP_201_CREATED, summary="Create Course")
def create_course(
    course_in: CourseCreate,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Create a course within a department."""
    existing = db.query(Course).filter(Course.code == course_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Course with code '{course_in.code}' already exists.")

    dept = db.query(Department).filter(Department.id == course_in.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    course = Course(**course_in.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


# ----------------- SUBJECTS -----------------
@router.get("/subjects", response_model=List[SubjectResponse], summary="List Subjects")
def list_subjects(
    course_id: Optional[str] = None,
    semester_number: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """List academic subjects with optional course and semester filter."""
    query = db.query(Subject)
    if course_id:
        query = query.filter(Subject.course_id == course_id)
    if semester_number:
        query = query.filter(Subject.semester_number == semester_number)
    return query.all()


@router.post("/subjects", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED, summary="Create Subject")
def create_subject(
    sub_in: SubjectCreate,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Create a subject assigned to a course."""
    existing = db.query(Subject).filter(Subject.code == sub_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Subject with code '{sub_in.code}' already exists.")

    subject = Subject(**sub_in.model_dump())
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


# ----------------- ACADEMIC YEARS & SEMESTERS -----------------
@router.get("/academic-years", response_model=List[AcademicYearResponse], summary="List Academic Years")
def list_academic_years(db: Session = Depends(get_db)):
    return db.query(AcademicYear).all()


@router.post("/academic-years", response_model=AcademicYearResponse, status_code=status.HTTP_201_CREATED)
def create_academic_year(
    ay_in: AcademicYearBase,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    ay = AcademicYear(**ay_in.model_dump())
    db.add(ay)
    db.commit()
    db.refresh(ay)
    return ay


@router.get("/semesters", response_model=List[SemesterResponse], summary="List Semesters")
def list_semesters(db: Session = Depends(get_db)):
    return db.query(Semester).all()


# ----------------- SYLLABUS MANAGEMENT -----------------
@router.get("/subjects/{subject_id}/syllabus", response_model=Optional[SyllabusResponse], summary="Get Subject Syllabus")
def get_subject_syllabus(subject_id: str, db: Session = Depends(get_db)):
    """Retrieve detailed 5-unit curriculum syllabus for a subject."""
    syllabus = db.query(Syllabus).filter(Syllabus.subject_id == subject_id).first()
    if not syllabus:
        return None

    return SyllabusResponse(
        id=syllabus.id,
        subject_id=syllabus.subject_id,
        subject_code=syllabus.subject.code if syllabus.subject else "SUB",
        subject_name=syllabus.subject.name if syllabus.subject else "Subject",
        semester_number=syllabus.semester_number,
        academic_year=syllabus.academic_year,
        unit_1_title=syllabus.unit_1_title,
        unit_1_content=syllabus.unit_1_content,
        unit_2_title=syllabus.unit_2_title,
        unit_2_content=syllabus.unit_2_content,
        unit_3_title=syllabus.unit_3_title,
        unit_3_content=syllabus.unit_3_content,
        unit_4_title=syllabus.unit_4_title,
        unit_4_content=syllabus.unit_4_content,
        unit_5_title=syllabus.unit_5_title,
        unit_5_content=syllabus.unit_5_content,
        learning_objectives=syllabus.learning_objectives,
        course_outcomes=syllabus.course_outcomes,
        recommended_books=syllabus.recommended_books,
        reference_materials=syllabus.reference_materials,
        created_at=syllabus.created_at,
        updated_at=syllabus.updated_at
    )


@router.post("/subjects/{subject_id}/syllabus", response_model=SyllabusResponse, status_code=status.HTTP_201_CREATED, summary="Create/Update Syllabus")
def create_or_update_syllabus(
    subject_id: str,
    syl_in: SyllabusCreate,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Publish comprehensive unit-by-unit curriculum."""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found.")

    existing = db.query(Syllabus).filter(Syllabus.subject_id == subject_id).first()
    if existing:
        for field, val in syl_in.model_dump().items():
            setattr(existing, field, val)
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        syl_record = existing
    else:
        syl_record = Syllabus(**syl_in.model_dump())
        syl_record.subject_id = subject_id
        db.add(syl_record)
        db.commit()
        db.refresh(syl_record)

    return SyllabusResponse(
        id=syl_record.id,
        subject_id=syl_record.subject_id,
        subject_code=subject.code,
        subject_name=subject.name,
        semester_number=syl_record.semester_number,
        academic_year=syl_record.academic_year,
        unit_1_title=syl_record.unit_1_title,
        unit_1_content=syl_record.unit_1_content,
        unit_2_title=syl_record.unit_2_title,
        unit_2_content=syl_record.unit_2_content,
        unit_3_title=syl_record.unit_3_title,
        unit_3_content=syl_record.unit_3_content,
        unit_4_title=syl_record.unit_4_title,
        unit_4_content=syl_record.unit_4_content,
        unit_5_title=syl_record.unit_5_title,
        unit_5_content=syl_record.unit_5_content,
        learning_objectives=syl_record.learning_objectives,
        course_outcomes=syl_record.course_outcomes,
        recommended_books=syl_record.recommended_books,
        reference_materials=syl_record.reference_materials,
        created_at=syl_record.created_at,
        updated_at=syl_record.updated_at
    )


# ----------------- ACADEMIC CALENDAR -----------------
@router.get("/academic-calendar", response_model=List[AcademicCalendarEventResponse], summary="List Calendar Events")
def list_calendar_events(
    academic_year: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieve institutional academic calendar timeline."""
    query = db.query(AcademicCalendarEvent)
    if academic_year:
        query = query.filter(AcademicCalendarEvent.academic_year == academic_year)
    return query.order_by(AcademicCalendarEvent.start_date.asc()).all()


@router.post("/academic-calendar", response_model=AcademicCalendarEventResponse, status_code=status.HTTP_201_CREATED, summary="Create Calendar Event")
def create_calendar_event(
    ev_in: AcademicCalendarEventCreate,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    ev = AcademicCalendarEvent(**ev_in.model_dump())
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


@router.put("/academic-calendar/{event_id}", response_model=AcademicCalendarEventResponse, summary="Update Calendar Event")
def update_calendar_event(
    event_id: str,
    ev_in: AcademicCalendarEventUpdate,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    ev = db.query(AcademicCalendarEvent).filter(AcademicCalendarEvent.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found.")

    for field, val in ev_in.model_dump(exclude_unset=True).items():
        setattr(ev, field, val)

    db.commit()
    db.refresh(ev)
    return ev


@router.delete("/academic-calendar/{event_id}", summary="Delete Calendar Event")
def delete_calendar_event(
    event_id: str,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    ev = db.query(AcademicCalendarEvent).filter(AcademicCalendarEvent.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found.")
    db.delete(ev)
    db.commit()
    return {"status": "success", "message": "Calendar event deleted."}

