"""
Database initialization and default seed credentials provisioning.
"""

from sqlalchemy.orm import Session
from app.db.base import Base
from app.db.session import engine, SessionLocal
import app.models  # Register all models for Base.metadata
from app.models.user import User
from app.core.rbac import UserRole
from app.core.security import get_password_hash


def init_db(db: Session) -> None:
    """
    Create tables and seed initial role-based access accounts.
    """
    Base.metadata.create_all(bind=engine)

    # Initial system users across all roles
    seed_users = [
        {
            "email": "superadmin@campusx.edu",
            "password": "SuperAdmin@123",
            "full_name": "Dr. Sarah Jenkins",
            "role": UserRole.SUPER_ADMIN,
        },
        {
            "email": "admin@campusx.edu",
            "password": "Admin@123",
            "full_name": "Campus Administrator",
            "role": UserRole.ADMIN,
        },
        {
            "email": "faculty@campusx.edu",
            "password": "Faculty@123",
            "full_name": "Prof. Alan Turing",
            "role": UserRole.FACULTY,
        },
        {
            "email": "student@campusx.edu",
            "password": "Student@123",
            "full_name": "Alex Rivera",
            "role": UserRole.STUDENT,
        },
        {
            "email": "placement@campusx.edu",
            "password": "Placement@123",
            "full_name": "Elena Rostova",
            "role": UserRole.PLACEMENT_OFFICER,
        },
        {
            "email": "management@campusx.edu",
            "password": "Management@123",
            "full_name": "Chancellor V. Raman",
            "role": UserRole.MANAGEMENT,
        },
    ]

    for item in seed_users:
        user = db.query(User).filter(User.email == item["email"]).first()
        if not user:
            user = User(
                email=item["email"],
                password_hash=get_password_hash(item["password"]),
                full_name=item["full_name"],
                role=item["role"],
                is_active=True,
            )
            db.add(user)

    db.commit()

    # Ensure default Department and Course exist
    from app.models.academic import Department, Course
    from app.models.student import Student
    from app.models.faculty import Faculty

    dept = db.query(Department).filter(Department.code == "CSE").first()
    if not dept:
        dept = Department(
            code="CSE",
            name="Computer Science & Engineering",
            description="Core computing, software engineering, and artificial intelligence"
        )
        db.add(dept)
        db.commit()
        db.refresh(dept)

    course = db.query(Course).filter(Course.code == "BTECH-CSE").first()
    if not course:
        course = Course(
            code="BTECH-CSE",
            name="B.Tech Computer Science and Engineering",
            department_id=dept.id,
            credits=160
        )
        db.add(course)
        db.commit()
        db.refresh(course)

    # Link Student profile for student@campusx.edu
    stu_user = db.query(User).filter(User.email == "student@campusx.edu").first()
    if stu_user and not db.query(Student).filter(Student.user_id == stu_user.id).first():
        student_prof = Student(
            user_id=stu_user.id,
            roll_number="CS2023001",
            enrollment_number="EN2023001",
            department_id=dept.id,
            course_id=course.id,
            current_semester=4,
            section="A",
            admission_year=2023,
            cgpa=8.85,
            attendance_pct=91.5
        )
        db.add(student_prof)

    # Link Faculty profile for faculty@campusx.edu
    fac_user = db.query(User).filter(User.email == "faculty@campusx.edu").first()
    if fac_user and not db.query(Faculty).filter(Faculty.user_id == fac_user.id).first():
        faculty_prof = Faculty(
            user_id=fac_user.id,
            employee_id="FAC-CSE-001",
            department_id=dept.id,
            designation="Professor & Head",
            specialization="Machine Learning & Distributed Systems"
        )
        db.add(faculty_prof)

    db.commit()


if __name__ == "__main__":
    db = SessionLocal()
    init_db(db)
    db.close()
    print("Database initialized and initial accounts provisioned.")
