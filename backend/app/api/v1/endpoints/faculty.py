"""
Faculty management and subject assignment endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.rbac import UserRole
from app.core.security import get_password_hash
from app.models.user import User
from app.models.faculty import Faculty
from app.models.academic import FacultySubjectAssignment, Subject
from app.schemas.faculty import (
    FacultyResponse, FacultyRegistration, FacultyUpdate,
    FacultySubjectAssignmentCreate, FacultySubjectAssignmentResponse
)

router = APIRouter()


@router.get("/", response_model=List[FacultyResponse], summary="List Faculty Members")
def list_faculty(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    department_id: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List faculty members with optional department filter and search.
    """
    query = db.query(Faculty).join(User, Faculty.user_id == User.id)

    if department_id:
        query = query.filter(Faculty.department_id == department_id)
    if search:
        query = query.filter(
            (Faculty.employee_id.ilike(f"%{search}%")) |
            (User.full_name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )

    faculty_list = query.offset(skip).limit(limit).all()
    return faculty_list


@router.post("/", response_model=FacultyResponse, status_code=status.HTTP_201_CREATED, summary="Register Faculty")
def create_faculty(
    faculty_in: FacultyRegistration,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Register a faculty member along with user authentication credentials.
    """
    if db.query(User).filter(User.email == faculty_in.email).first():
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    if db.query(Faculty).filter(Faculty.employee_id == faculty_in.employee_id).first():
        raise HTTPException(status_code=400, detail="Employee ID already registered.")

    new_user = User(
        email=faculty_in.email,
        password_hash=get_password_hash(faculty_in.password),
        full_name=faculty_in.full_name,
        phone=faculty_in.phone,
        role=UserRole.FACULTY,
        is_active=True
    )
    db.add(new_user)
    db.flush()

    faculty = Faculty(
        user_id=new_user.id,
        employee_id=faculty_in.employee_id,
        department_id=faculty_in.department_id,
        designation=faculty_in.designation,
        specialization=faculty_in.specialization
    )
    db.add(faculty)
    db.commit()
    db.refresh(faculty)
    return faculty


@router.get("/me", response_model=FacultyResponse, summary="Get Current Faculty Profile")
def get_my_faculty_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve profile for currently authenticated faculty.
    """
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty profile not found for this account.")
    return faculty


@router.get("/{faculty_id}", response_model=FacultyResponse, summary="Get Faculty by ID")
def get_faculty_by_id(faculty_id: str, db: Session = Depends(get_db)):
    """Retrieve faculty details by ID."""
    faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found.")
    return faculty


@router.post("/assign-subject", response_model=FacultySubjectAssignmentResponse, status_code=status.HTTP_201_CREATED, summary="Assign Subject to Faculty")
def assign_subject_to_faculty(
    assignment_in: FacultySubjectAssignmentCreate,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Assign a teaching subject to a faculty member for a specified academic year and section.
    """
    faculty = db.query(Faculty).filter(Faculty.id == assignment_in.faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found.")

    subject = db.query(Subject).filter(Subject.id == assignment_in.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found.")

    assignment = FacultySubjectAssignment(
        faculty_id=assignment_in.faculty_id,
        subject_id=assignment_in.subject_id,
        academic_year=assignment_in.academic_year,
        section=assignment_in.section
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment
