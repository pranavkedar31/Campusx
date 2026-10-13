"""
College ERP Expansion Integration Tests for CampusX.
Verifies Fees, Examinations, Assignments, Learning Materials, Timetable,
ERP Composite Dashboards, Reports, and Anti-IDOR Security Controls.
"""

import io
import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.student import Student
from app.models.fee import StudentFee
from app.models.examination import Examination, ExamResult
from app.models.assignment import Assignment, AssignmentSubmission


class TestERPExpansion(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

        # Login roles
        roles = {
            "admin": ("admin@campusx.edu", "Admin@123"),
            "faculty": ("faculty@campusx.edu", "Faculty@123"),
            "student": ("student@campusx.edu", "Student@123"),
        }
        cls.tokens = {}
        for role, (email, pwd) in roles.items():
            res = cls.client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
            cls.tokens[role] = res.json()["access_token"]

        cls.admin_headers = {"Authorization": f"Bearer {cls.tokens['admin']}"}
        cls.faculty_headers = {"Authorization": f"Bearer {cls.tokens['faculty']}"}
        cls.student_headers = {"Authorization": f"Bearer {cls.tokens['student']}"}

        db = SessionLocal()
        cls.alex_student = db.query(Student).filter(Student.roll_number == "CS2023001").first()
        cls.other_student = db.query(Student).filter(Student.roll_number != "CS2023001").first()
        db.close()

    # --- 1. FEES MANAGEMENT TESTS ---
    def test_student_fee_ledger_and_anti_idor(self):
        """Verify student views own fee ledger; blocked from other student's ledger."""
        res = self.client.get("/api/v1/fees/student/me", headers=self.student_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total_fees", data)
        self.assertIn("total_paid", data)
        self.assertIn("total_pending", data)
        self.assertEqual(data["roll_number"], "CS2023001")

        # Anti-IDOR: Accessing other student's fee ledger must return 403 Forbidden
        if self.other_student:
            idor_res = self.client.get(f"/api/v1/fees/student/{self.other_student.id}", headers=self.student_headers)
            self.assertEqual(idor_res.status_code, 403)

    def test_admin_fee_overview(self):
        """Verify Admin retrieves university-wide fee metrics."""
        res = self.client.get("/api/v1/fees/admin-overview", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total_collected", data)
        self.assertIn("total_pending", data)
        self.assertIn("collection_rate_pct", data)

    # --- 2. EXAMINATION MANAGEMENT TESTS ---
    def test_examinations_list_and_schedule(self):
        """Verify examination sessions and course schedules."""
        res = self.client.get("/api/v1/examinations/", headers=self.student_headers)
        self.assertEqual(res.status_code, 200)
        exams = res.json()
        self.assertGreaterEqual(len(exams), 1)
        self.assertIn("schedules", exams[0])

    def test_student_results_and_marksheet_pdf(self):
        """Verify semester results and downloadable marksheet PDF."""
        if not self.alex_student:
            return

        res = self.client.get(f"/api/v1/examinations/results/student/{self.alex_student.id}", headers=self.student_headers)
        self.assertEqual(res.status_code, 200)
        results = res.json()
        self.assertGreaterEqual(len(results), 1)
        res_obj = results[0]
        self.assertIn("sgpa", res_obj)
        self.assertIn("cgpa", res_obj)
        self.assertIn("subjects", res_obj)

        # Download Marksheet PDF
        pdf_res = self.client.get(f"/api/v1/examinations/results/{res_obj['id']}/marksheet-pdf", headers=self.student_headers)
        self.assertEqual(pdf_res.status_code, 200)
        self.assertEqual(pdf_res.headers.get("content-type"), "application/pdf")

        # Anti-IDOR: Student cannot access other student's exam results
        if self.other_student:
            idor_res = self.client.get(f"/api/v1/examinations/results/student/{self.other_student.id}", headers=self.student_headers)
            self.assertEqual(idor_res.status_code, 403)

    # --- 3. ASSIGNMENT MANAGEMENT TESTS ---
    def test_assignment_lifecycle_and_submission(self):
        """Verify student views assignments, submits work, and faculty grades."""
        # 1. Student views assignments
        res = self.client.get("/api/v1/assignments/student/my", headers=self.student_headers)
        self.assertEqual(res.status_code, 200)
        assignments = res.json()
        self.assertGreaterEqual(len(assignments), 1)
        first_ass = assignments[0]

        # 2. Student uploads a submission file
        fake_file = io.BytesIO(b"import numpy as np\nprint('Solution Code')")
        fake_file.name = "solution_script.py"
        submit_res = self.client.post(
            f"/api/v1/assignments/{first_ass['id']}/submit",
            headers=self.student_headers,
            files={"file": ("solution_script.py", fake_file, "text/x-python")}
        )
        self.assertEqual(submit_res.status_code, 201)
        sub_data = submit_res.json()
        self.assertEqual(sub_data["original_filename"], "solution_script.py")

        # 3. Faculty views submissions
        fac_subs = self.client.get(f"/api/v1/assignments/{first_ass['id']}/submissions", headers=self.faculty_headers)
        self.assertEqual(fac_subs.status_code, 200)

        # 4. Faculty grades submission
        grade_res = self.client.post(
            f"/api/v1/assignments/submissions/{sub_data['id']}/grade",
            headers=self.faculty_headers,
            json={"marks_awarded": 95.0, "feedback": "Well-structured algorithm implementation."}
        )
        self.assertEqual(grade_res.status_code, 200)
        self.assertEqual(grade_res.json()["marks_awarded"], 95.0)

        # 5. Anti-IDOR: Student cannot grade assignments
        stu_grade_res = self.client.post(
            f"/api/v1/assignments/submissions/{sub_data['id']}/grade",
            headers=self.student_headers,
            json={"marks_awarded": 100.0, "feedback": "Self-grading attempt."}
        )
        self.assertEqual(stu_grade_res.status_code, 403)

    # --- 4. STUDY MATERIAL (LMS) TESTS ---
    def test_study_materials_access(self):
        """Verify study materials repository."""
        res = self.client.get("/api/v1/learning-material/", headers=self.student_headers)
        self.assertEqual(res.status_code, 200)
        materials = res.json()
        self.assertGreaterEqual(len(materials), 1)

    # --- 5. CLASS TIMETABLE TESTS ---
    def test_timetable_schedules(self):
        """Verify student daily/weekly and faculty timetable."""
        # Student today schedule
        stu_today = self.client.get("/api/v1/timetable/student/today", headers=self.student_headers)
        self.assertEqual(stu_today.status_code, 200)
        self.assertIn("day", stu_today.json())

        # Student weekly timetable
        stu_week = self.client.get("/api/v1/timetable/student/weekly", headers=self.student_headers)
        self.assertEqual(stu_week.status_code, 200)
        self.assertIn("schedule_by_day", stu_week.json())

        # Faculty today schedule
        fac_today = self.client.get("/api/v1/timetable/faculty/today", headers=self.faculty_headers)
        self.assertEqual(fac_today.status_code, 200)

    # --- 6. ERP COMPOSITE DASHBOARDS TESTS ---
    def test_erp_composite_dashboards(self):
        """Verify high-performance composite dashboard feeds."""
        # Student ERP Dashboard
        stu_dash = self.client.get("/api/v1/dashboard/student-erp", headers=self.student_headers)
        self.assertEqual(stu_dash.status_code, 200)
        s_data = stu_dash.json()
        self.assertIn("academic_summary", s_data)
        self.assertIn("attendance_summary", s_data)
        self.assertIn("fees_summary", s_data)
        self.assertIn("today_classes", s_data)
        self.assertIn("upcoming_exams", s_data)
        self.assertIn("recent_notices", s_data)

        # Faculty ERP Dashboard
        fac_dash = self.client.get("/api/v1/dashboard/faculty-erp", headers=self.faculty_headers)
        self.assertEqual(fac_dash.status_code, 200)
        f_data = fac_dash.json()
        self.assertIn("today_classes", f_data)
        self.assertIn("assigned_subjects", f_data)
        self.assertIn("assignments_pending_evaluation", f_data)

        # Admin ERP Dashboard
        adm_dash = self.client.get("/api/v1/dashboard/admin-erp", headers=self.admin_headers)
        self.assertEqual(adm_dash.status_code, 200)
        a_data = adm_dash.json()
        self.assertIn("total_students", a_data)
        self.assertIn("fees_collected", a_data)
        self.assertIn("average_attendance_pct", a_data)

    # --- 7. REPORTS & CSV EXPORT TESTS ---
    def test_reports_generation_and_csv_export(self):
        """Verify tabular reports generation and CSV download."""
        # Students report
        rep_res = self.client.post(
            "/api/v1/reports/generate",
            headers=self.admin_headers,
            json={"report_type": "STUDENTS"}
        )
        self.assertEqual(rep_res.status_code, 200)
        rep_data = rep_res.json()
        self.assertIn("headers", rep_data)
        self.assertIn("rows", rep_data)

        # CSV stream export
        csv_res = self.client.get(
            "/api/v1/reports/export/csv?report_type=STUDENTS",
            headers=self.admin_headers
        )
        self.assertEqual(csv_res.status_code, 200)
        self.assertEqual(csv_res.headers.get("content-type"), "text/csv; charset=utf-8")
        self.assertIn("Roll Number", csv_res.text)


if __name__ == "__main__":
    unittest.main()
