"""
Deep ERP V3 Institutional Seeder.
Provisions physical files on disk, syllabi, grade rules, academic calendar, student applications,
extracurricular activities, PRNs, and exam records for complete end-to-end verification.
"""

import sys
from pathlib import Path
import zipfile
from datetime import datetime, date, timedelta, timezone

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.core.config import settings
from app.core.rbac import UserRole
from app.models.user import User
from app.models.student import Student
from app.models.academic import Department, Course, Subject, Syllabus, AcademicCalendarEvent, CalendarEventType, SubjectType
from app.models.communication import Notice, CampusEvent
from app.models.examination import Examination, ExamSchedule, ExamForm, ExamFormSubject, ExamFormStatus, ExamStatus, ExamType
from app.models.assignment import Assignment, AssignmentSubmission
from app.models.learning import StudyMaterial, MaterialType
from app.models.placement import Company
from app.models.grade import GradeRule, ExtracurricularActivity, InstitutionAcademicConfig
from app.models.application import StudentApplication, ApplicationHistory, ApplicationType, ApplicationStatus
from app.services.pdf_service import generate_certificate_pdf, generate_hall_ticket_pdf, generate_application_document_pdf


def run_seeder():
    db = SessionLocal()
    print("=" * 60)
    print("  SEEDING CAMPUSX DEEP ERP COMPLETION V3 DATA")
    print("=" * 60)

    # 1. Guarantee Physical Files on Disk
    print("\n[1/8] Generating physical sample files on disk...")
    upload_root = Path(settings.UPLOAD_DIR)
    assignments_dir = upload_root / "assignments"
    materials_dir = upload_root / "materials"
    notices_dir = upload_root / "notices"
    for d in [assignments_dir, materials_dir, notices_dir]:
        d.mkdir(parents=True, exist_ok=True)

    # Sample zip for Alex's Raft submission
    raft_zip_path = assignments_dir / "sample_alex_raft.zip"
    with zipfile.ZipFile(raft_zip_path, 'w') as zf:
        zf.writestr("raft_cluster.py", "# CampusX Raft Implementation\nclass RaftNode:\n    def __init__(self, node_id):\n        self.node_id = node_id\n        self.state = 'FOLLOWER'\n")
        zf.writestr("README.md", "# Raft Consensus Node Prototype\nImplemented leader election and heartbeat protocols.\n")

    # Sample PDF files for Study Materials
    mat1_pdf = materials_dir / "db_indexing_handbook.pdf"
    with open(mat1_pdf, "wb") as f:
        f.write(b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n180\n%%EOF\n")

    mat2_pdf = materials_dir / "distributed_systems_slides.pdf"
    with open(mat2_pdf, "wb") as f:
        f.write(b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n180\n%%EOF\n")

    notice_pdf = notices_dir / "campus_announcement_spring2026.pdf"
    with open(notice_pdf, "wb") as f:
        f.write(b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n180\n%%EOF\n")

    # Update StudyMaterial file_paths
    mats = db.query(StudyMaterial).all()
    for m in mats:
        if "Index" in m.title:
            m.file_path = str(mat1_pdf)
        else:
            m.file_path = str(mat2_pdf)
    db.commit()

    # 2. Grade Rules
    print("[2/8] Provisioning Grade Rules scale...")
    grade_rules_data = [
        ("O", 10.0, 90.0, 100.0, "Outstanding Performance", True),
        ("A+", 9.0, 80.0, 89.99, "Excellent Performance", True),
        ("A", 8.0, 70.0, 79.99, "Very Good Performance", True),
        ("B+", 7.0, 60.0, 69.99, "Good Performance", True),
        ("B", 6.0, 50.0, 59.99, "Above Average", True),
        ("C", 5.0, 40.0, 49.99, "Average / Marginal Pass", True),
        ("P", 4.0, 35.0, 39.99, "Pass Class", True),
        ("F", 0.0, 0.0, 34.99, "Fail / Unsuccessful", False),
    ]
    for gr, gp, min_p, max_p, desc, is_p in grade_rules_data:
        rule = db.query(GradeRule).filter(GradeRule.grade == gr).first()
        if not rule:
            db.add(GradeRule(
                grade=gr,
                grade_point=gp,
                min_percentage=min_p,
                max_percentage=max_p,
                description=desc,
                is_passing=is_p
            ))
    db.commit()

    # Academic Config
    cfg = db.query(InstitutionAcademicConfig).first()
    if not cfg:
        db.add(InstitutionAcademicConfig(
            include_extracurricular_in_cgpa=False,
            minimum_attendance_pct_for_exam=75.0,
            pass_percentage=40.0
        ))
        db.commit()

    # 3. Student PRNs and Profile Fields
    print("[3/8] Updating student PRNs and personal details...")
    students = db.query(Student).all()
    for s in students:
        if not s.prn:
            s.prn = f"PRN-{s.admission_year}-{s.roll_number}"
        if not s.registration_number:
            s.registration_number = f"REG-{s.admission_year}-{s.enrollment_number}"
        if not s.date_of_birth:
            s.date_of_birth = "2003-05-14"
        if not s.gender:
            s.gender = "Male" if hash(s.roll_number) % 2 == 1 else "Female"
        if not s.address:
            s.address = "CampusX Residential Hall Block B, Tech City"
        if not s.parent_name:
            s.parent_name = f"Robert {s.user.full_name.split()[-1]}" if s.user else "Robert Parent"
        if not s.parent_phone:
            s.parent_phone = "+1 (555) 234-5678"
    db.commit()

    # 4. Syllabi for Subjects
    print("[4/8] Seeding curriculum syllabi for subjects...")
    subjects = db.query(Subject).all()
    for sub in subjects:
        sub.short_name = sub.code
        sub.subject_type = SubjectType.THEORY
        sub.lecture_hours = 3
        sub.practical_hours = 2 if "Lab" in sub.name else 0
        sub.tutorial_hours = 1

        syl = db.query(Syllabus).filter(Syllabus.subject_id == sub.id).first()
        if not syl:
            db.add(Syllabus(
                subject_id=sub.id,
                semester_number=sub.semester_number,
                academic_year="2025-2026",
                unit_1_title="Unit 1: Foundations and Architectural Principles",
                unit_1_content="Fundamental concepts, formal definitions, historical evolution, standard abstractions, and core system architectures.",
                unit_2_title="Unit 2: Algorithmic Mechanisms and Core Logic",
                unit_2_content="Detailed algorithms, mathematical models, operational invariants, state-space representations, and proof sketches.",
                unit_3_title="Unit 3: Implementation Strategies and System Design",
                unit_3_content="Concurrency control, memory management, storage indexing structures, and distributed communication primitives.",
                unit_4_title="Unit 4: Verification, Security, and Fault Tolerance",
                unit_4_content="Failure modes, Byzantine fault mitigation, consensus protocols, cryptographic integrity, and performance benchmarks.",
                unit_5_title="Unit 5: Advanced Industry Applications and Case Studies",
                unit_5_content="Modern cloud scale deployments, real-time streaming architectures, high-performance computing, and emerging trends.",
                learning_objectives="Equip candidates with deep theoretical rigor and hands-on system building capabilities.",
                course_outcomes="CO1: Formulate system specifications. CO2: Implement scalable algorithms. CO3: Evaluate system latency and throughput tradeoffs.",
                recommended_books="Distributed Systems: Concepts and Design (Coulouris et al.); Modern Operating Systems (Tanenbaum).",
                reference_materials="IEEE Transactions on Software Engineering; ACM Computing Surveys (2024-2026)."
            ))
    db.commit()

    # 5. Academic Calendar Events
    print("[5/8] Seeding Academic Calendar timeline...")
    cal_events = [
        ("Commencement of Spring Semester 2026", CalendarEventType.SEMESTER_START, datetime(2026, 1, 12, 9, 0), datetime(2026, 1, 12, 17, 0), "Official start of academic classes for all undergraduate departments."),
        ("Mid-Term Internal Assessments", CalendarEventType.INTERNAL_EXAM, datetime(2026, 3, 2, 9, 30), datetime(2026, 3, 7, 16, 30), "Continuous internal assessment examinations across all semesters."),
        ("CampusX Annual Innovation Hackathon", CalendarEventType.OTHER, datetime(2026, 3, 20, 10, 0), datetime(2026, 3, 22, 18, 0), "48-hour institutional hackathon with corporate partners and angel investors."),
        ("Spring Break & Institutional Recess", CalendarEventType.HOLIDAY, datetime(2026, 3, 23, 0, 0), datetime(2026, 3, 29, 23, 59), "College closed for spring festival recess."),
        ("Regular End-Semester University Examinations", CalendarEventType.END_SEM_EXAM, datetime(2026, 5, 4, 10, 0), datetime(2026, 5, 22, 13, 0), "Summative degree credit examinations conducted under Controller of Examinations."),
        ("Publication of Results & Grade Cards", CalendarEventType.RESULT_DATE, datetime(2026, 6, 5, 12, 0), datetime(2026, 6, 5, 18, 0), "Official tabulation of results and issuance of SGPA/CGPA grade sheets.")
    ]
    for title, etype, sdate, edate, desc in cal_events:
        exist_cal = db.query(AcademicCalendarEvent).filter(AcademicCalendarEvent.title == title).first()
        if not exist_cal:
            db.add(AcademicCalendarEvent(
                title=title,
                event_type=etype,
                start_date=sdate.replace(tzinfo=timezone.utc),
                end_date=edate.replace(tzinfo=timezone.utc),
                academic_year="2025-2026",
                semester_number=4,
                description=desc
            ))
    db.commit()

    # 6. Student Applications
    print("[6/8] Seeding Student Applications in Request Center...")
    student_alex = db.query(Student).join(User, Student.user_id == User.id).filter(User.email == "student@campusx.edu").first()
    admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()

    if student_alex:
        app_samples = [
            (
                "APP-2026-0001",
                ApplicationType.BONAFIDE_CERTIFICATE,
                "Required for passport application and educational visa verification.",
                ApplicationStatus.APPROVED,
                "Approved after verifying active enrollment and clearance of tuition fees."
            ),
            (
                "APP-2026-0002",
                ApplicationType.RAILWAY_CONCESSION,
                "Subsidized student travel pass between home residence and university campus.",
                ApplicationStatus.APPROVED,
                "Concession pass issued for local railway zone."
            ),
            (
                "APP-2026-0003",
                ApplicationType.INTERNSHIP_NOC,
                "No Objection Certificate for upcoming summer software engineering internship at Google.",
                ApplicationStatus.UNDER_REVIEW,
                "Forwarded to Dean of Academics for academic credit compatibility review."
            )
        ]
        for app_no, atype, rsn, st, rem in app_samples:
            existing_app = db.query(StudentApplication).filter(StudentApplication.application_number == app_no).first()
            if not existing_app:
                sa = StudentApplication(
                    application_number=app_no,
                    student_id=student_alex.id,
                    application_type=atype,
                    reason=rsn,
                    status=st,
                    academic_year="2025-2026",
                    semester_number=4,
                    admin_remarks=rem,
                    reviewed_by_user_id=admin_user.id if admin_user else None,
                    created_at=datetime.now(timezone.utc) - timedelta(days=5),
                    updated_at=datetime.now(timezone.utc) - timedelta(days=2)
                )
                db.add(sa)
                db.flush()

                db.add(ApplicationHistory(
                    application_id=sa.id,
                    status=ApplicationStatus.SUBMITTED,
                    action_by_user_id=student_alex.user_id,
                    remarks="Submitted with student declaration.",
                    created_at=datetime.now(timezone.utc) - timedelta(days=5)
                ))
                if st != ApplicationStatus.SUBMITTED:
                    db.add(ApplicationHistory(
                        application_id=sa.id,
                        status=st,
                        action_by_user_id=admin_user.id if admin_user else None,
                        remarks=rem,
                        created_at=datetime.now(timezone.utc) - timedelta(days=2)
                    ))
        db.commit()

    # 7. Extracurricular Activities
    print("[7/8] Seeding Extracurricular Activities for students...")
    if student_alex:
        acts = [
            ("Inter-University Hackathon Winner", "Technical Club", 2, "O", 10.0, "First prize in National AI & Systems Hackathon 2026."),
            ("University Varsity Basketball Team", "Sports", 1, "A", 8.0, "Represented university in regional athletic championship."),
            ("Campus Open Source Community Lead", "Cultural", 1, "A+", 9.0, "Mentored 120+ first-year students in Git and Python.")
        ]
        for name, cat, cred, grd, gpt, rem in acts:
            ex_act = db.query(ExtracurricularActivity).filter(
                ExtracurricularActivity.student_id == student_alex.id,
                ExtracurricularActivity.activity_name == name
            ).first()
            if not ex_act:
                db.add(ExtracurricularActivity(
                    student_id=student_alex.id,
                    activity_name=name,
                    category=cat,
                    academic_year="2025-2026",
                    semester_number=4,
                    credits=cred,
                    grade=grd,
                    grade_point=gpt,
                    remarks=rem
                ))
        db.commit()

    # 8. Companies Details & Notice Attachment
    print("[8/8] Updating companies and notice attachments...")
    companies = db.query(Company).all()
    for c in companies:
        if not c.location:
            c.location = "San Francisco, CA / Bengaluru, India"
            c.headquarters = "Global Headquarters, Cyber Gateway"
            c.contact_person = "Dr. Michael Chen"
            c.phone = "+1 (800) 555-0199"
            c.description = f"{c.name} is a premier multinational enterprise recruiting graduating engineers."
    db.commit()

    # Update Notice attachments
    notices = db.query(Notice).all()
    for n in notices:
        n.attachment_path = str(notice_pdf)
        n.attachment_name = "End_Semester_Official_Schedule.pdf"
        n.status = "PUBLISHED"
        n.views_count = 142
    db.commit()

    # Exam Form: Ensure Alex has an APPROVED exam form with payment_status=SUCCESS and timetable
    exam = db.query(Examination).first()
    if exam and student_alex:
        exam.exam_fee = 1500.0
        exam.form_opening_date = date(2026, 4, 1)
        exam.form_closing_date = date(2026, 4, 25)

        form = db.query(ExamForm).filter(
            ExamForm.examination_id == exam.id,
            ExamForm.student_id == student_alex.id
        ).first()

        if form:
            form.status = ExamFormStatus.APPROVED
            form.payment_status = "SUCCESS"
            form.amount_paid = 1500.0
            form.transaction_id = "TXN-EXAM-998822"
            form.paid_at = datetime.now(timezone.utc) - timedelta(days=2)
            form.verification_notes = "Verified by Dean of Examinations. All criteria satisfied."
            db.commit()

    db.close()
    print("\n" + "=" * 60)
    print("  CAMPUSX DEEP ERP V3 SEEDING COMPLETE!")
    print("=" * 60)


if __name__ == "__main__":
    run_seeder()
