"""
CampusX Production Institutional Data Seeder.
Provisions complete realistic university data: departments, courses, faculty,
60+ multi-tier students, attendance records, assessment marks, placement drives,
corporate offers, notices, events, and verifiable digital certificates.
"""

import sys
from pathlib import Path
import random
from datetime import datetime, date, timedelta, timezone

# Add backend directory to Python path
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.core.config import settings
from app.core.security import get_password_hash
from app.core.rbac import UserRole
from app.models.user import User
from app.models.academic import Department, Course, Subject, Enrollment, FacultySubjectAssignment
from app.models.student import Student
from app.models.faculty import Faculty
from app.models.performance import AttendanceRecord, AttendanceStatus, Assessment, AssessmentType, Mark
from app.models.communication import Notice, NoticeCategory, NoticePriority, CampusEvent, EventCategory, EventRegistration
from app.models.certificate import Certificate, CertificateType, CertificateStatus
from app.models.placement import Company, JobRole, JobStatus, PlacementApplication, ApplicationStatus, PlacementOffer, OfferStatus
from app.models.audit import AuditLog
from app.models.fee import (
    FeeHead, FeeStructure, FeeStructureComponent, StudentFee, FeeTransaction, FeeReceipt, FeeStatus, PaymentMode, TransactionStatus
)
from app.models.examination import (
    Examination, ExamSchedule, ExamForm, ExamFormSubject, ExamResult, ExamResultSubject, ExamType, ExamStatus, ExamFormStatus, ResultStatus
)
from app.models.assignment import (
    Assignment, AssignmentSubmission, AssignmentStatus, SubmissionStatus
)
from app.models.learning import (
    StudyMaterial, MaterialType
)
from app.models.timetable import (
    Room, ClassSection, Timetable, TimetableSlot, DayOfWeek, RoomType
)
from app.services.pdf_service import generate_certificate_pdf, generate_fee_receipt_pdf, generate_marksheet_pdf



def seed_campus_data():
    db = SessionLocal()
    print("=" * 65)
    print("  CAMPUSX INSTITUTIONAL DATA SEEDING ENGINE")
    print("=" * 65)

    print("\n[1/10] Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    # 1. Base Administrative & Role Accounts
    print("[2/10] Provisioning primary role access accounts...")
    base_users = [
        {"email": "superadmin@campusx.edu", "password": "SuperAdmin@123", "full_name": "Dr. Sarah Jenkins", "role": UserRole.SUPER_ADMIN},
        {"email": "admin@campusx.edu", "password": "Admin@123", "full_name": "Campus Administrator", "role": UserRole.ADMIN},
        {"email": "faculty@campusx.edu", "password": "Faculty@123", "full_name": "Prof. Alan Turing", "role": UserRole.FACULTY},
        {"email": "student@campusx.edu", "password": "Student@123", "full_name": "Alex Rivera", "role": UserRole.STUDENT},
        {"email": "placement@campusx.edu", "password": "Placement@123", "full_name": "Elena Rostova", "role": UserRole.PLACEMENT_OFFICER},
        {"email": "management@campusx.edu", "password": "Management@123", "full_name": "Chancellor V. Raman", "role": UserRole.MANAGEMENT},
    ]

    for u_data in base_users:
        u = db.query(User).filter(User.email == u_data["email"]).first()
        if not u:
            u = User(
                email=u_data["email"],
                password_hash=get_password_hash(u_data["password"]),
                full_name=u_data["full_name"],
                role=u_data["role"],
                is_active=True
            )
            db.add(u)
    db.commit()

    # 2. Departments
    print("[3/10] Seeding 4 Academic Departments...")
    dept_defs = [
        ("CSE", "Computer Science & Engineering", "Core computing, artificial intelligence, and software engineering"),
        ("ECE", "Electronics & Communication Engineering", "Signal processing, VLSI design, and embedded systems"),
        ("MECH", "Mechanical Engineering", "Robotics, thermal systems, and advanced manufacturing"),
        ("IT", "Information Technology", "Cloud computing, cyber security, and enterprise software systems"),
    ]
    dept_objs = {}
    for code, name, desc in dept_defs:
        d = db.query(Department).filter(Department.code == code).first()
        if not d:
            d = Department(code=code, name=name, description=desc)
            db.add(d)
            db.commit()
            db.refresh(d)
        dept_objs[code] = d

    # 3. Courses
    print("[4/10] Seeding Degree Programs...")
    course_defs = [
        ("BTECH-CSE", "B.Tech Computer Science and Engineering", "CSE", 160),
        ("BTECH-ECE", "B.Tech Electronics and Communication", "ECE", 160),
        ("BTECH-MECH", "B.Tech Mechanical Engineering", "MECH", 160),
        ("BTECH-IT", "B.Tech Information Technology", "IT", 160),
    ]
    course_objs = {}
    for code, name, dept_code, credits in course_defs:
        c = db.query(Course).filter(Course.code == code).first()
        if not c:
            c = Course(code=code, name=name, department_id=dept_objs[dept_code].id, credits=credits)
            db.add(c)
            db.commit()
            db.refresh(c)
        course_objs[code] = c

    # 4. Subjects
    print("[5/10] Seeding Academic Subjects...")
    subject_defs = [
        # CSE
        ("CS401", "Design & Analysis of Algorithms", "BTECH-CSE", 4),
        ("CS402", "Database Management Systems", "BTECH-CSE", 4),
        ("CS403", "Operating Systems & Concurrency", "BTECH-CSE", 4),
        ("CS404", "Machine Learning Fundamentals", "BTECH-CSE", 4),
        # ECE
        ("EC401", "Digital Signal Processing", "BTECH-ECE", 4),
        ("EC402", "Microcontrollers & Embedded Systems", "BTECH-ECE", 4),
        ("EC403", "VLSI Design & Architecture", "BTECH-ECE", 4),
        # MECH
        ("ME401", "Thermodynamics & Heat Transfer", "BTECH-MECH", 4),
        ("ME402", "Fluid Mechanics & Turbo Machinery", "BTECH-MECH", 4),
        # IT
        ("IT401", "Cloud Infrastructure & DevOps", "BTECH-IT", 4),
        ("IT402", "Enterprise Cyber Security", "BTECH-IT", 4),
    ]
    sub_objs = {}
    for code, name, course_code, credits in subject_defs:
        s = db.query(Subject).filter(Subject.code == code).first()
        if not s:
            s = Subject(code=code, name=name, course_id=course_objs[course_code].id, semester_number=4, credits=credits)
            db.add(s)
            db.commit()
            db.refresh(s)
        sub_objs[code] = s

    # 5. Faculty Members
    print("[6/10] Seeding Faculty Members & Subject Assignments...")
    faculty_specs = [
        ("Prof. Alan Turing", "faculty@campusx.edu", "CSE", "FAC-CSE-001", "Professor & Head", "CS401"),
        ("Dr. Grace Hopper", "grace.hopper@campusx.edu", "CSE", "FAC-CSE-002", "Associate Professor", "CS402"),
        ("Dr. Claude Shannon", "claude.shannon@campusx.edu", "ECE", "FAC-ECE-001", "Professor", "EC401"),
        ("Dr. Nikola Tesla", "nikola.tesla@campusx.edu", "ECE", "FAC-ECE-002", "Associate Professor", "EC402"),
        ("Dr. James Watt", "james.watt@campusx.edu", "MECH", "FAC-MEC-001", "Professor", "ME401"),
        ("Dr. Ada Lovelace", "ada.lovelace@campusx.edu", "IT", "FAC-IT-001", "Professor", "IT401"),
    ]

    for name, email, dept_code, emp_id, desig, sub_code in faculty_specs:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                password_hash=get_password_hash("Faculty@123"),
                full_name=name,
                role=UserRole.FACULTY,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        fac = db.query(Faculty).filter(Faculty.user_id == user.id).first()
        if not fac:
            fac = Faculty(
                user_id=user.id,
                employee_id=emp_id,
                department_id=dept_objs[dept_code].id,
                designation=desig,
                specialization="Advanced Engineering Research"
            )
            db.add(fac)
            db.commit()
            db.refresh(fac)

        # Assign subject
        if sub_code in sub_objs:
            s_id = sub_objs[sub_code].id
            assign = db.query(FacultySubjectAssignment).filter(
                FacultySubjectAssignment.faculty_id == fac.id,
                FacultySubjectAssignment.subject_id == s_id
            ).first()
            if not assign:
                assign = FacultySubjectAssignment(
                    faculty_id=fac.id,
                    subject_id=s_id,
                    academic_year="2024-2025",
                    section="A"
                )
                db.add(assign)
                db.commit()

    # 6. Students (60 Students across profiles: high, moderate, at-risk)
    print("[7/10] Seeding 60+ Students with Academic History...")
    random.seed(42)

    first_names = [
        "Aarav", "Ananya", "Rohan", "Priya", "Vikram", "Neha", "Aditya", "Sneha", "Karan", "Pooja",
        "Arjun", "Diya", "Kabir", "Meera", "Siddharth", "Ishita", "Rahul", "Tanvi", "Varun", "Rhea",
        "Dev", "Kavya", "Manish", "Shreya", "Aryan", "Tara", "Gaurav", "Simran", "Nikhil", "Anjali"
    ]
    last_names = [
        "Sharma", "Patel", "Verma", "Iyer", "Reddy", "Gupta", "Malhotra", "Mehta", "Bhat", "Nair",
        "Chopra", "Joshi", "Saxena", "Deshmukh", "Singhania", "Kapoor", "Banerjee", "Menon", "Rao", "Kulkarni"
    ]

    # Ensure default student Alex Rivera has profile
    alex_u = db.query(User).filter(User.email == "student@campusx.edu").first()
    if alex_u:
        alex_p = db.query(Student).filter(Student.user_id == alex_u.id).first()
        if not alex_p:
            alex_p = Student(
                user_id=alex_u.id,
                roll_number="CS2023001",
                enrollment_number="EN2023001",
                department_id=dept_objs["CSE"].id,
                course_id=course_objs["BTECH-CSE"].id,
                current_semester=4,
                section="A",
                admission_year=2023,
                cgpa=8.85,
                attendance_pct=91.5
            )
            db.add(alex_p)
            db.commit()
        else:
            alex_p.cgpa = 8.85
            alex_p.attendance_pct = 91.5
            db.commit()

    created_students = []
    dept_keys = ["CSE", "ECE", "MECH", "IT"]

    for i in range(1, 61):
        dept_code = dept_keys[i % len(dept_keys)]
        course_code = f"BTECH-{dept_code}"
        fn = first_names[i % len(first_names)]
        ln = last_names[(i * 3) % len(last_names)]
        full_name = f"{fn} {ln}"
        email = f"student_{i}@{dept_code.lower()}.campusx.edu"
        roll = f"{dept_code}2023{i:03d}"
        enr = f"ENR{dept_code}2023{i:03d}"

        # Assign academic tier:
        # 1-42: Good performers
        # 43-52: Moderate
        # 53-60: High Risk (for early warning / ML model demonstrations)
        if i <= 42:
            cgpa = round(random.uniform(7.6, 9.7), 2)
            att = round(random.uniform(82.0, 98.0), 1)
        elif i <= 52:
            cgpa = round(random.uniform(6.1, 7.4), 2)
            att = round(random.uniform(71.0, 81.0), 1)
        else:
            cgpa = round(random.uniform(4.2, 5.7), 2)
            att = round(random.uniform(52.0, 64.5), 1)

        u = db.query(User).filter(User.email == email).first()
        if not u:
            u = User(
                email=email,
                password_hash=get_password_hash("Student@123"),
                full_name=full_name,
                role=UserRole.STUDENT,
                is_active=True
            )
            db.add(u)
            db.commit()
            db.refresh(u)

        stu = db.query(Student).filter(Student.user_id == u.id).first()
        if not stu:
            stu = Student(
                user_id=u.id,
                roll_number=roll,
                enrollment_number=enr,
                department_id=dept_objs[dept_code].id,
                course_id=course_objs[course_code].id,
                current_semester=4,
                section="A" if i % 2 == 0 else "B",
                admission_year=2023,
                cgpa=cgpa,
                attendance_pct=att
            )
            db.add(stu)
            db.commit()
            db.refresh(stu)

        created_students.append(stu)

        # Enroll in core subjects of their course
        dept_subs = [s for s in sub_objs.values() if s.course_id == course_objs[course_code].id]
        for sub in dept_subs:
            enr_rec = db.query(Enrollment).filter(
                Enrollment.student_id == stu.id,
                Enrollment.subject_id == sub.id
            ).first()
            if not enr_rec:
                enr_rec = Enrollment(student_id=stu.id, subject_id=sub.id, semester_number=4, academic_year="2024-2025")
                db.add(enr_rec)

    db.commit()

    # 7. Assessments and Marks
    print("[8/10] Seeding Assessments and Continuous Evaluation Marks...")
    cse_sub = sub_objs["CS401"]
    assessments = [
        ("Midterm Examination CIA-1", AssessmentType.MIDTERM, 50.0, 20.0),
        ("Lab Term Practical Evaluation", AssessmentType.PRACTICAL, 25.0, 10.0),
        ("Continuous Assessment CIA-2", AssessmentType.INTERNAL, 50.0, 20.0),
    ]
    ass_objs = []
    for title, a_type, max_m, wt in assessments:
        a = db.query(Assessment).filter(Assessment.subject_id == cse_sub.id, Assessment.title == title).first()
        if not a:
            a = Assessment(subject_id=cse_sub.id, title=title, type=a_type, max_marks=max_m, weightage=wt)
            db.add(a)
            db.commit()
            db.refresh(a)
        ass_objs.append(a)

    cse_students = [s for s in created_students if s.department_id == dept_objs["CSE"].id]
    for stu in cse_students[:20]:
        for ass in ass_objs:
            existing_m = db.query(Mark).filter(Mark.assessment_id == ass.id, Mark.student_id == stu.id).first()
            if not existing_m:
                # Grade proportional to student CGPA
                pct = (stu.cgpa / 10.0) * random.uniform(0.85, 1.05)
                score = round(min(ass.max_marks, max(8.0, ass.max_marks * pct)), 1)
                m = Mark(assessment_id=ass.id, student_id=stu.id, score=score, feedback="Graded by Course Instructor")
                db.add(m)
    db.commit()

    # 8. Partner Companies & Placement Job Drives
    print("[9/10] Seeding Recruiting Companies, Job Drives, and Funnel Offers...")
    company_data = [
        ("Google", "https://careers.google.com", "Cloud Computing & AI", "recruiting@google.com"),
        ("Microsoft", "https://careers.microsoft.com", "Enterprise Software & Cloud", "talent@microsoft.com"),
        ("Amazon", "https://amazon.jobs", "Distributed Systems & E-Commerce", "campus@amazon.com"),
        ("Cisco Systems", "https://cisco.com/careers", "Networking & Cybersecurity", "graduates@cisco.com"),
        ("TCS Innovate", "https://tcs.com/careers", "Information Technology & Consulting", "campus@tcs.com"),
    ]
    comp_map = {}
    for c_name, web, ind, em in company_data:
        comp = db.query(Company).filter(Company.name == c_name).first()
        if not comp:
            comp = Company(name=c_name, website=web, industry=ind, contact_email=em)
            db.add(comp)
            db.commit()
            db.refresh(comp)
        comp_map[c_name] = comp

    job_data = [
        ("Google", "Software Engineer - Systems & Cloud", 24.5, 8.5, "CSE,IT"),
        ("Microsoft", "Applied Data Scientist", 22.0, 8.0, "ALL"),
        ("Amazon", "Software Development Engineer (SDE-1)", 19.5, 7.5, "CSE,ECE,IT"),
        ("Cisco Systems", "Network Architecture Engineer", 16.0, 7.0, "CSE,ECE"),
        ("TCS Innovate", "Digital Technology Specialist", 9.5, 6.0, "ALL"),
    ]
    job_objs = []
    for c_name, title, ctc, min_gpa, depts in job_data:
        comp = comp_map[c_name]
        job = db.query(JobRole).filter(JobRole.company_id == comp.id, JobRole.title == title).first()
        if not job:
            job = JobRole(
                company_id=comp.id,
                title=title,
                description=f"Campus recruitment drive for {title} at {c_name}. Work on mission-critical products.",
                package_ctc=ctc,
                min_cgpa=min_gpa,
                eligible_departments=depts,
                status=JobStatus.OPEN,
                drive_date=datetime.now(timezone.utc) + timedelta(days=14)
            )
            db.add(job)
            db.commit()
            db.refresh(job)
        job_objs.append(job)

    # Seed placement applications across stages
    for idx, stu in enumerate(created_students[:25]):
        target_job = job_objs[idx % len(job_objs)]
        if stu.cgpa >= target_job.min_cgpa:
            existing_app = db.query(PlacementApplication).filter(
                PlacementApplication.job_role_id == target_job.id,
                PlacementApplication.student_id == stu.id
            ).first()
            if not existing_app:
                # Distribute funnel stages
                if idx % 4 == 0:
                    status = ApplicationStatus.OFFERED
                elif idx % 4 == 1:
                    status = ApplicationStatus.INTERVIEW_SCHEDULED
                elif idx % 4 == 2:
                    status = ApplicationStatus.SHORTLISTED
                else:
                    status = ApplicationStatus.APPLIED

                app_rec = PlacementApplication(
                    job_role_id=target_job.id,
                    student_id=stu.id,
                    status=status,
                    resume_url=f"https://campusx.edu/resumes/{stu.roll_number}.pdf",
                    notes="Application processed via campus placement portal"
                )
                db.add(app_rec)
                db.commit()
                db.refresh(app_rec)

                if status == ApplicationStatus.OFFERED:
                    offer = PlacementOffer(
                        application_id=app_rec.id,
                        ctc_offered=target_job.package_ctc,
                        status=OfferStatus.ACCEPTED,
                        offer_date=datetime.now(timezone.utc)
                    )
                    db.add(offer)

    db.commit()

    # 9. Campus Notices & Events
    print("[10/10] Seeding Institutional Notices, Events & Verifiable Digital Certificates...")
    notices_defs = [
        ("End-Semester Examination Schedule - Spring 2026", "Official datesheets for final theoretical and practical examinations are published on the portal.", NoticeCategory.EXAMINATION, NoticePriority.URGENT, True),
        ("Google & Microsoft Placement Pre-Placement Talks", "Campus placement registration deadline closes in 48 hours for final-year cohorts.", NoticeCategory.PLACEMENT, NoticePriority.HIGH, True),
        ("Annual Inter-Collegiate AI Hackathon (HackCampusX)", "Teams of 3-4 students are invited to build innovative AI applications. Prize pool: ₹2,00,000.", NoticeCategory.GENERAL, NoticePriority.MEDIUM, False),
        ("Library 24/7 Extended Hours for Revision Period", "Central Library reading rooms will remain accessible 24/7 with verified student identity credentials.", NoticeCategory.ACADEMIC, NoticePriority.LOW, False),
    ]
    for title, content, cat, prio, pinned in notices_defs:
        if not db.query(Notice).filter(Notice.title == title).first():
            n = Notice(
                title=title,
                content=content,
                category=cat,
                priority=prio,
                is_pinned=pinned,
                target_role="ALL",
                publish_date=datetime.now(timezone.utc)
            )
            db.add(n)

    # Events
    event_defs = [
        ("CampusX Grand Hackathon 2026", "48-hour generative AI and system engineering sprint.", EventCategory.HACKATHON, "Main Innovation Hub", datetime.now(timezone.utc) + timedelta(days=7), 200),
        ("Distinguished Lecture in Distributed Systems", "Guest seminar delivered by leading cloud architects.", EventCategory.SEMINAR, "Auditorium Hall A", datetime.now(timezone.utc) + timedelta(days=12), 150),
    ]
    for title, desc, cat, venue, dt, max_p in event_defs:
        if not db.query(CampusEvent).filter(CampusEvent.title == title).first():
            ev = CampusEvent(
                title=title,
                description=desc,
                category=cat,
                venue=venue,
                event_date=dt,
                max_participants=max_p
            )
            db.add(ev)

    # Certificates for Alex Rivera
    if alex_u and alex_p:
        cert_uuid = f"CX-BONA-2026-{alex_p.id[:6].upper()}"
        existing_cert = db.query(Certificate).filter(Certificate.certificate_uuid == cert_uuid).first()
        if not existing_cert:
            pdf_path = generate_certificate_pdf(
                certificate_uuid=cert_uuid,
                cert_type="BONAFIDE",
                student_name=alex_u.full_name,
                roll_number=alex_p.roll_number,
                department_name="Computer Science & Engineering",
                course_name="B.Tech Computer Science and Engineering",
                semester=4,
                purpose="Passport & Visa Documentation",
                issue_date=datetime.now(timezone.utc)
            )
            cert = Certificate(
                certificate_uuid=cert_uuid,
                student_id=alex_p.id,
                type=CertificateType.BONAFIDE,
                status=CertificateStatus.APPROVED,
                purpose="Passport & Visa Documentation",
                pdf_filename=Path(pdf_path).name,
                issue_date=datetime.now(timezone.utc)
            )
            db.add(cert)

    # [11/11] College ERP Expansion Seeding: Fees, Examinations, Assignments, Study Materials, Timetable
    print("[11/11] Seeding College ERP modules (Fees, Examinations, Assignments, Study Materials, Timetable)...")

    # 1. Fee Heads
    fee_heads_data = [
        ("TUIT", "Academic Tuition Fee", "Semester tuition and instructional costs", 50000.0),
        ("LAB", "Laboratory & Computing Fee", "Hardware, software, and laboratory maintenance", 15000.0),
        ("LIB", "Digital Library & Resources", "Access to ACM, IEEE, textbooks, journals", 5000.0),
        ("EXAM", "Semester Examination Fee", "Evaluation, hall tickets, and transcript generation", 5000.0),
        ("DEV", "Institutional Development Fee", "Campus infrastructure and career support", 10000.0),
    ]
    fee_head_objs = {}
    for code, name, desc, amt in fee_heads_data:
        fh = db.query(FeeHead).filter(FeeHead.code == code).first()
        if not fh:
            fh = FeeHead(code=code, name=name, description=desc)
            db.add(fh)
            db.flush()
        fee_head_objs[code] = (fh, amt)

    # 2. Fee Structure for CSE Semester 4
    cse_dept = dept_objs.get("CSE")
    cse_course = course_objs.get("BTECH-CSE")
    if cse_dept and cse_course:
        fs = db.query(FeeStructure).filter(
            FeeStructure.department_id == cse_dept.id,
            FeeStructure.course_id == cse_course.id,
            FeeStructure.semester_number == 4
        ).first()
        if not fs:
            fs = FeeStructure(
                department_id=cse_dept.id,
                course_id=cse_course.id,
                academic_year="2025-2026",
                semester_number=4,
                total_amount=85000.0,
                due_date=date.today() + timedelta(days=25)
            )
            db.add(fs)
            db.flush()

            for code, (fh, amt) in fee_head_objs.items():
                db.add(FeeStructureComponent(
                    fee_structure_id=fs.id,
                    fee_head_id=fh.id,
                    amount=amt
                ))
            db.flush()

        # 3. Student Fees
        # Alex Rivera (Partial payment)
        if alex_p:
            stu_fee = db.query(StudentFee).filter(
                StudentFee.student_id == alex_p.id,
                StudentFee.semester_number == 4
            ).first()
            if not stu_fee:
                stu_fee = StudentFee(
                    student_id=alex_p.id,
                    fee_structure_id=fs.id if fs else None,
                    academic_year="2025-2026",
                    semester_number=4,
                    total_amount=85000.0,
                    paid_amount=60000.0,
                    pending_amount=25000.0,
                    due_date=date.today() + timedelta(days=25),
                    status=FeeStatus.PARTIAL
                )
                db.add(stu_fee)
                db.flush()

                # Record transaction
                txn_ref = f"TXN-20260215-{alex_p.id[:6].upper()}"
                txn = FeeTransaction(
                    student_fee_id=stu_fee.id,
                    student_id=alex_p.id,
                    amount=60000.0,
                    payment_mode=PaymentMode.UPI,
                    transaction_ref=txn_ref,
                    transaction_date=datetime.now(timezone.utc) - timedelta(days=15),
                    status=TransactionStatus.SUCCESS,
                    remarks="First Installment Paid via Netbanking"
                )
                db.add(txn)
                db.flush()

                # Generate Receipt
                rcp_no = f"RCP-2026-001"
                rcp_pdf = generate_fee_receipt_pdf(
                    receipt_number=rcp_no,
                    student_name=alex_u.full_name if alex_u else "Alex Rivera",
                    roll_number=alex_p.roll_number,
                    department_name="Computer Science & Engineering",
                    course_name="B.Tech Computer Science and Engineering",
                    semester=4,
                    academic_year="2025-2026",
                    amount=60000.0,
                    payment_mode="UPI",
                    transaction_ref=txn_ref,
                    transaction_date=txn.transaction_date,
                    remaining_balance=25000.0
                )
                db.add(FeeReceipt(
                    receipt_number=rcp_no,
                    fee_transaction_id=txn.id,
                    student_fee_id=stu_fee.id,
                    student_id=alex_p.id,
                    amount=60000.0,
                    receipt_date=txn.transaction_date,
                    pdf_filename=Path(rcp_pdf).name
                ))

        # Seed fees for other students (mix of PAID, PARTIAL, OVERDUE)
        all_students = db.query(Student).all()
        for idx, s in enumerate(all_students):
            if s.id == (alex_p.id if alex_p else None):
                continue
            existing_f = db.query(StudentFee).filter(StudentFee.student_id == s.id).first()
            if not existing_f:
                if idx % 3 == 0:
                    status_f = FeeStatus.PAID
                    paid = 85000.0
                    pending = 0.0
                    due = date.today() + timedelta(days=30)
                elif idx % 3 == 1:
                    status_f = FeeStatus.PARTIAL
                    paid = 45000.0
                    pending = 40000.0
                    due = date.today() + timedelta(days=15)
                else:
                    status_f = FeeStatus.OVERDUE
                    paid = 0.0
                    pending = 85000.0
                    due = date.today() - timedelta(days=10)

                db.add(StudentFee(
                    student_id=s.id,
                    fee_structure_id=fs.id if fs else None,
                    academic_year="2025-2026",
                    semester_number=s.current_semester,
                    total_amount=85000.0,
                    paid_amount=paid,
                    pending_amount=pending,
                    due_date=due,
                    status=status_f
                ))
        db.flush()

    # 4. Examinations & Results
    exam_endsem = db.query(Examination).filter(Examination.name == "Spring 2026 End-Semester Examination").first()
    if not exam_endsem:
        exam_endsem = Examination(
            name="Spring 2026 End-Semester Examination",
            exam_type=ExamType.END_SEMESTER,
            academic_year="2025-2026",
            semester_number=4,
            start_date=date.today() + timedelta(days=40),
            end_date=date.today() + timedelta(days=55),
            status=ExamStatus.UPCOMING,
            instructions="Candidates must bring valid University ID cards and approved Hall Tickets."
        )
        db.add(exam_endsem)
        db.flush()

        # Exam schedules for CSE subjects
        cse_subjects = db.query(Subject).join(Course).filter(Course.code == "BTECH-CSE").limit(5).all()
        exam_dates = [
            date.today() + timedelta(days=42),
            date.today() + timedelta(days=45),
            date.today() + timedelta(days=48),
            date.today() + timedelta(days=51),
            date.today() + timedelta(days=54),
        ]
        for sub, edate in zip(cse_subjects, exam_dates):
            db.add(ExamSchedule(
                examination_id=exam_endsem.id,
                subject_id=sub.id,
                exam_date=edate,
                start_time="10:00 AM",
                end_time="01:00 PM",
                room_no="LH-101",
                max_marks=100.0
            ))
        db.flush()

        # Approved ExamForm for Alex Rivera
        if alex_p:
            ef = ExamForm(
                examination_id=exam_endsem.id,
                student_id=alex_p.id,
                status=ExamFormStatus.APPROVED,
                submission_date=datetime.now(timezone.utc) - timedelta(days=3),
                verification_notes="Registration verified. All prerequisites fulfilled."
            )
            db.add(ef)
            db.flush()
            for sub in cse_subjects:
                db.add(ExamFormSubject(
                    exam_form_id=ef.id,
                    subject_id=sub.id,
                    is_backlog=False
                ))

        # Previous Semester Exam & Result for Alex Rivera (Sem 3)
        exam_prev = db.query(Examination).filter(Examination.name == "Fall 2025 Regular Semester Examination").first()
        if not exam_prev:
            exam_prev = Examination(
                name="Fall 2025 Regular Semester Examination",
                exam_type=ExamType.END_SEMESTER,
                academic_year="2025-2026",
                semester_number=3,
                start_date=date.today() - timedelta(days=120),
                end_date=date.today() - timedelta(days=105),
                status=ExamStatus.RESULTS_PUBLISHED,
                instructions="Official semester results published."
            )
            db.add(exam_prev)
            db.flush()

            if alex_p:
                res = ExamResult(
                    examination_id=exam_prev.id,
                    student_id=alex_p.id,
                    semester_number=3,
                    academic_year="2025-2026",
                    sgpa=8.85,
                    cgpa=8.85,
                    total_marks_obtained=421.0,
                    total_max_marks=500.0,
                    percentage=84.2,
                    result_status=ResultStatus.PASS,
                    published_at=datetime.now(timezone.utc) - timedelta(days=90)
                )
                db.add(res)
                db.flush()

                sample_grades = [
                    (cse_subjects[0].id if len(cse_subjects) > 0 else "s1", 28.0, 62.0, 90.0, "A+", 9.0),
                    (cse_subjects[1].id if len(cse_subjects) > 1 else "s2", 29.0, 65.0, 94.0, "O", 10.0),
                    (cse_subjects[2].id if len(cse_subjects) > 2 else "s3", 24.0, 56.0, 80.0, "A", 8.0),
                    (cse_subjects[3].id if len(cse_subjects) > 3 else "s4", 26.0, 55.0, 81.0, "A", 8.0),
                    (cse_subjects[4].id if len(cse_subjects) > 4 else "s5", 25.0, 51.0, 76.0, "B+", 7.0),
                ]
                for sid, int_m, ext_m, tot_m, gr, gp in sample_grades:
                    db.add(ExamResultSubject(
                        exam_result_id=res.id,
                        subject_id=sid,
                        internal_marks=int_m,
                        external_marks=ext_m,
                        practical_marks=0.0,
                        total_marks=tot_m,
                        max_marks=100.0,
                        grade=gr,
                        grade_point=gp,
                        status="PASS"
                    ))
                db.flush()

    # 5. Assignments & Submissions
    first_faculty = db.query(Faculty).first()
    cse_subjects = db.query(Subject).join(Course).filter(Course.code == "BTECH-CSE").limit(3).all()

    if first_faculty and cse_dept and len(cse_subjects) >= 2:
        # Assignment 1: Graded
        ass1 = db.query(Assignment).filter(Assignment.title == "Advanced SQL Indexing & Optimization").first()
        if not ass1:
            ass1 = Assignment(
                subject_id=cse_subjects[0].id,
                faculty_id=first_faculty.id,
                department_id=cse_dept.id,
                semester_number=4,
                section="A",
                title="Advanced SQL Indexing & Optimization",
                description="Analyze execution plans of B-tree and Hash indexes on PostgreSQL with 1M synthetic records.",
                instructions="Submit your query plan analysis report along with benchmark scripts.",
                max_marks=100.0,
                due_date=datetime.now(timezone.utc) + timedelta(days=5),
                allow_late_submission=True,
                status=AssignmentStatus.PUBLISHED,
                publish_date=datetime.now(timezone.utc) - timedelta(days=7),
                created_at=datetime.now(timezone.utc) - timedelta(days=7)
            )
            db.add(ass1)
            db.flush()

            # Submission by Alex Rivera (Graded)
            if alex_p:
                db.add(AssignmentSubmission(
                    assignment_id=ass1.id,
                    student_id=alex_p.id,
                    file_path=str(Path(settings.UPLOAD_DIR) / "assignments" / "sample_alex_sql_analysis.pdf"),
                    original_filename="alex_rivera_sql_indexing_report.pdf",
                    file_size=204850,
                    submitted_at=datetime.now(timezone.utc) - timedelta(days=2),
                    status=SubmissionStatus.GRADED,
                    marks_awarded=94.0,
                    feedback="Outstanding analysis of composite indexes and EXPLAIN ANALYZE execution cost metrics.",
                    graded_by_faculty_id=first_faculty.id,
                    graded_at=datetime.now(timezone.utc) - timedelta(days=1)
                ))

        # Assignment 2: Pending Submission / In Review
        ass2 = db.query(Assignment).filter(Assignment.title == "Distributed Consensus Implementation").first()
        if not ass2 and len(cse_subjects) > 1:
            ass2 = Assignment(
                subject_id=cse_subjects[1].id,
                faculty_id=first_faculty.id,
                department_id=cse_dept.id,
                semester_number=4,
                section="A",
                title="Distributed Consensus Implementation",
                description="Implement a minimal Raft leader election prototype in Python or Go.",
                instructions="Ensure your cluster handles node failure and split votes correctly.",
                max_marks=100.0,
                due_date=datetime.now(timezone.utc) + timedelta(days=8),
                allow_late_submission=True,
                status=AssignmentStatus.PUBLISHED,
                publish_date=datetime.now(timezone.utc) - timedelta(days=3),
                created_at=datetime.now(timezone.utc) - timedelta(days=3)
            )
            db.add(ass2)
            db.flush()

            if alex_p:
                db.add(AssignmentSubmission(
                    assignment_id=ass2.id,
                    student_id=alex_p.id,
                    file_path=str(Path(settings.UPLOAD_DIR) / "assignments" / "sample_alex_raft.zip"),
                    original_filename="raft_leader_election_alex.zip",
                    file_size=512000,
                    submitted_at=datetime.now(timezone.utc) - timedelta(hours=6),
                    status=SubmissionStatus.SUBMITTED,
                    marks_awarded=None,
                    feedback=None
                ))
        db.flush()

    # 6. Study Materials
    if first_faculty and cse_dept and len(cse_subjects) > 0:
        existing_mat = db.query(StudyMaterial).filter(StudyMaterial.title == "Comprehensive Database Indexing Guide").first()
        if not existing_mat:
            db.add(StudyMaterial(
                subject_id=cse_subjects[0].id,
                faculty_id=first_faculty.id,
                department_id=cse_dept.id,
                semester_number=4,
                title="Comprehensive Database Indexing Guide",
                description="In-depth handbook on PostgreSQL B-Tree, GiST, GIN, and BRIN indexes with performance tradeoffs.",
                file_type=MaterialType.PDF,
                external_url="https://postgresql.org/docs/current/indexes.html",
                created_at=datetime.now(timezone.utc) - timedelta(days=10)
            ))
            db.add(StudyMaterial(
                subject_id=cse_subjects[0].id,
                faculty_id=first_faculty.id,
                department_id=cse_dept.id,
                semester_number=4,
                title="Distributed Systems Lecture Slides - Part 1",
                description="Slide deck covering CAP theorem, Byzantine Fault Tolerance, and Raft consensus.",
                file_type=MaterialType.PPT,
                external_url="https://raft.github.io/",
                created_at=datetime.now(timezone.utc) - timedelta(days=5)
            ))
            db.add(StudyMaterial(
                subject_id=cse_subjects[0].id,
                faculty_id=first_faculty.id,
                department_id=cse_dept.id,
                semester_number=4,
                title="Computer Networks RFC References & Protocol Cheatsheet",
                description="Curated RFC specifications for HTTP/2, HTTP/3, and TCP congestion control.",
                file_type=MaterialType.NOTES,
                external_url="https://www.rfc-editor.org/",
                created_at=datetime.now(timezone.utc) - timedelta(days=2)
            ))
        db.flush()

    # 7. Rooms, ClassSection & Timetable
    room_101 = db.query(Room).filter(Room.room_number == "LH-101").first()
    if not room_101:
        room_101 = Room(room_number="LH-101", building="Main Academic Block", capacity=80, type=RoomType.LECTURE_HALL)
        db.add(room_101)
    room_lab = db.query(Room).filter(Room.room_number == "CS-LAB-1").first()
    if not room_lab:
        room_lab = Room(room_number="CS-LAB-1", building="Computing Block", capacity=40, type=RoomType.LAB)
        db.add(room_lab)
    db.flush()

    if cse_dept and cse_course:
        cs_sec = db.query(ClassSection).filter(
            ClassSection.department_id == cse_dept.id,
            ClassSection.semester_number == 4,
            ClassSection.section_name == "A"
        ).first()
        if not cs_sec:
            cs_sec = ClassSection(
                department_id=cse_dept.id,
                course_id=cse_course.id,
                semester_number=4,
                section_name="A",
                academic_year="2025-2026"
            )
            db.add(cs_sec)
            db.flush()

        tt = db.query(Timetable).filter(Timetable.class_section_id == cs_sec.id).first()
        if not tt:
            tt = Timetable(
                class_section_id=cs_sec.id,
                academic_year="2025-2026",
                semester_number=4,
                is_active=True
            )
            db.add(tt)
            db.flush()

            days = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY]
            time_slots = [
                ("09:00", "10:00"),
                ("10:15", "11:15"),
                ("11:30", "12:30"),
                ("14:00", "15:00")
            ]
            for day in days:
                for idx, (st, et) in enumerate(time_slots):
                    sub = cse_subjects[idx % len(cse_subjects)] if cse_subjects else None
                    if sub and first_faculty:
                        db.add(TimetableSlot(
                            timetable_id=tt.id,
                            day_of_week=day,
                            start_time=st,
                            end_time=et,
                            subject_id=sub.id,
                            faculty_id=first_faculty.id,
                            room_id=room_101.id if idx < 3 else room_lab.id
                        ))
            db.flush()

    # Audit log

    db.add(AuditLog(
        action="SYSTEM_DATABASE_SEEDED",
        entity_type="SYSTEM",
        user_email="superadmin@campusx.edu",
        details="Full synthetic institutional dataset seeded successfully across 4 departments."
    ))

    db.commit()
    db.close()

    print("\n" + "=" * 65)
    print("  INSTITUTIONAL SEEDING COMPLETE: 60+ STUDENTS, 4 DEPTS,")
    print("  PLACEMENTS, CERTIFICATES, AND ASSESSMENTS READY!")
    print("=" * 65)


if __name__ == "__main__":
    seed_campus_data()
