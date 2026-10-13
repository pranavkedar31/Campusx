"""
Student profile and academic records API endpoints.
Strictly enforces ownership and anti-IDOR rules.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.rbac import UserRole
from app.core.security import get_password_hash
from app.models.user import User
from app.models.student import Student
from app.models.academic import Department, Course
from app.schemas.student import StudentResponse, StudentRegistration, StudentUpdate, ResetPasswordRequest

router = APIRouter()


@router.get("/", response_model=List[StudentResponse], summary="List Students")
def list_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    department_id: Optional[str] = None,
    current_semester: Optional[int] = None,
    section: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY, UserRole.PLACEMENT_OFFICER, UserRole.MANAGEMENT])),
    db: Session = Depends(get_db)
):
    """
    List students with flexible filtering and search by roll number, name, or enrollment.
    """
    query = db.query(Student).join(User, Student.user_id == User.id)

    if department_id:
        query = query.filter(Student.department_id == department_id)
    if current_semester:
        query = query.filter(Student.current_semester == current_semester)
    if section:
        query = query.filter(Student.section == section)
    if search:
        query = query.filter(
            (Student.roll_number.ilike(f"%{search}%")) |
            (Student.enrollment_number.ilike(f"%{search}%")) |
            (User.full_name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )

    students = query.offset(skip).limit(limit).all()
    return students


@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED, summary="Register Student")
def create_student(
    student_in: StudentRegistration,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Register a new student identity along with their user authentication credentials.
    """
    # Verify user email uniqueness
    if db.query(User).filter(User.email == student_in.email).first():
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    # Verify roll number uniqueness
    if db.query(Student).filter(Student.roll_number == student_in.roll_number).first():
        raise HTTPException(status_code=400, detail="Roll number already registered.")

    # Verify enrollment number uniqueness
    if db.query(Student).filter(Student.enrollment_number == student_in.enrollment_number).first():
        raise HTTPException(status_code=400, detail="Enrollment number already registered.")

    # Verify PRN uniqueness if provided
    if student_in.prn and db.query(Student).filter(Student.prn == student_in.prn).first():
        raise HTTPException(status_code=400, detail="PRN already registered.")

    # Create User account
    new_user = User(
        email=student_in.email,
        password_hash=get_password_hash(student_in.password),
        full_name=student_in.full_name,
        phone=student_in.phone,
        role=UserRole.STUDENT,
        is_active=True
    )
    db.add(new_user)
    db.flush()

    # Create Student profile
    student = Student(
        user_id=new_user.id,
        roll_number=student_in.roll_number,
        enrollment_number=student_in.enrollment_number,
        prn=student_in.prn,
        registration_number=student_in.registration_number,
        date_of_birth=student_in.date_of_birth,
        gender=student_in.gender,
        address=student_in.address,
        parent_name=student_in.parent_name,
        parent_phone=student_in.parent_phone,
        department_id=student_in.department_id,
        course_id=student_in.course_id,
        current_semester=student_in.current_semester,
        section=student_in.section,
        admission_year=student_in.admission_year,
        cgpa=0.0,
        attendance_pct=100.0
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.post("/bulk-import", summary="Bulk Import Students")
def bulk_import_students(
    students_in: List[StudentRegistration],
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Bulk create student accounts and profiles."""
    created_count = 0
    errors = []

    for idx, s in enumerate(students_in):
        try:
            if db.query(User).filter(User.email == s.email).first():
                errors.append(f"Row {idx+1}: Email {s.email} already exists")
                continue
            if db.query(Student).filter(Student.roll_number == s.roll_number).first():
                errors.append(f"Row {idx+1}: Roll number {s.roll_number} already exists")
                continue

            user = User(
                email=s.email,
                password_hash=get_password_hash(s.password),
                full_name=s.full_name,
                phone=s.phone,
                role=UserRole.STUDENT,
                is_active=True
            )
            db.add(user)
            db.flush()

            st = Student(
                user_id=user.id,
                roll_number=s.roll_number,
                enrollment_number=s.enrollment_number,
                prn=s.prn,
                registration_number=s.registration_number,
                date_of_birth=s.date_of_birth,
                gender=s.gender,
                address=s.address,
                parent_name=s.parent_name,
                parent_phone=s.parent_phone,
                department_id=s.department_id,
                course_id=s.course_id,
                current_semester=s.current_semester,
                section=s.section,
                admission_year=s.admission_year,
                cgpa=0.0,
                attendance_pct=100.0
            )
            db.add(st)
            created_count += 1
        except Exception as e:
            errors.append(f"Row {idx+1}: {str(e)}")

    db.commit()
    return {"status": "success", "imported_count": created_count, "errors": errors}


@router.post("/{student_id}/reset-password", summary="Reset Student Password")
def reset_student_password(
    student_id: str,
    req: ResetPasswordRequest,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Administrator resets credentials for a student."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    user = student.user
    if not user:
        raise HTTPException(status_code=404, detail="Associated user account not found.")

    user.password_hash = get_password_hash(req.new_password)
    db.commit()
    return {"status": "success", "message": f"Password reset successfully for student {student.roll_number}."}


@router.get("/me", response_model=StudentResponse, summary="Get Current Student Profile")
def get_my_student_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve profile for the currently logged-in student.
    """
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found for this account.")
    return student


@router.get("/{student_id}", response_model=StudentResponse, summary="Get Student by ID")
def get_student_by_id(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve student record. Enforces Anti-IDOR: students can only access their own record.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    if current_user.role == UserRole.STUDENT and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to view this student profile.")

    return student


@router.get("/{student_id}/id-card", summary="Download Student ID Card PDF")
def download_student_id_card(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate and download digital student identity card PDF."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    if current_user.role == UserRole.STUDENT and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to access this ID card.")

    from app.services.pdf_service import generate_student_id_card_pdf
    from fastapi.responses import FileResponse
    from pathlib import Path

    pdf_path_str = generate_student_id_card_pdf(
        student_name=student.user.full_name if student.user else "Student",
        roll_number=student.roll_number,
        enrollment_number=student.enrollment_number,
        department_name=student.department.name if student.department else "Computer Science",
        course_name=student.course.name if student.course else "B.Tech Computer Science & Engineering",
        admission_year=student.admission_year,
        valid_until=str(student.admission_year + 4)
    )

    pdf_path = Path(pdf_path_str)
    return FileResponse(
        str(pdf_path),
        filename=f"ID_Card_{student.roll_number}.pdf",
        media_type="application/pdf"
    )


@router.put("/{student_id}", response_model=StudentResponse, summary="Update Student Record")
def update_student(
    student_id: str,
    student_in: StudentUpdate,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """
    Update student academic metrics (CGPA, attendance, semester, section).
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    update_data = student_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(student, field, val)

    db.commit()
    db.refresh(student)
    return student


@router.delete("/{student_id}", summary="Delete Student Record")
def delete_student(
    student_id: str,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    user = student.user
    db.delete(student)
    if user:
        db.delete(user)
    db.commit()
    return {"status": "success", "message": "Student record deleted successfully."}
