"""
Attendance & Academic Performance Analytics Integration Tests.
"""

import unittest
from datetime import date
from fastapi.testclient import TestClient
from app.main import app
from app.db.init_db import init_db
from app.db.session import SessionLocal


class TestPerformance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db = SessionLocal()
        init_db(db)
        db.close()
        cls.client = TestClient(app)

        # Admin login
        res = cls.client.post("/api/v1/auth/login", json={"email": "admin@campusx.edu", "password": "Admin@123"})
        cls.admin_token = res.json()["access_token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        # Setup base academic entities if needed
        depts = cls.client.get("/api/v1/academics/departments").json()
        if not depts:
            dept = cls.client.post("/api/v1/academics/departments", headers=cls.admin_headers, json={"code": "EC", "name": "Electronics"}).json()
            dept_id = dept["id"]
        else:
            dept_id = depts[0]["id"]

        courses = cls.client.get("/api/v1/academics/courses").json()
        if not courses:
            course = cls.client.post("/api/v1/academics/courses", headers=cls.admin_headers, json={"code": "BTECH-EC", "name": "BTech Electronics", "department_id": dept_id}).json()
            course_id = course["id"]
        else:
            course_id = courses[0]["id"]

        subs = cls.client.get("/api/v1/academics/subjects").json()
        if not subs:
            sub = cls.client.post("/api/v1/academics/subjects", headers=cls.admin_headers, json={"code": "EC101", "name": "Circuits", "course_id": course_id, "semester_number": 1}).json()
            cls.subject_id = sub["id"]
        else:
            cls.subject_id = subs[0]["id"]

        # Ensure student exists
        students = cls.client.get("/api/v1/students/", headers=cls.admin_headers).json()
        if not students:
            stu = cls.client.post("/api/v1/students/", headers=cls.admin_headers, json={
                "email": "perf_student@campusx.edu", "password": "Password@123", "full_name": "Performance Student",
                "roll_number": "PERF001", "enrollment_number": "ENRPERF001", "department_id": dept_id,
                "course_id": course_id, "current_semester": 1, "section": "A", "admission_year": 2024
            }).json()
            cls.student_id = stu["id"]
        else:
            cls.student_id = students[0]["id"]

    def test_attendance_lifecycle_and_thresholds(self):
        """Mark attendance, compute percentage, and check low attendance alerts."""
        today = date.today().isoformat()

        # Mark 1 Present, 1 Absent
        att_res = self.client.post(
            "/api/v1/attendance/mark",
            headers=self.admin_headers,
            json={
                "student_id": self.student_id,
                "subject_id": self.subject_id,
                "date": today,
                "status": "Absent"
            }
        )
        self.assertEqual(att_res.status_code, 201)

        # Retrieve student attendance
        summary_res = self.client.get(
            f"/api/v1/attendance/student/{self.student_id}",
            headers=self.admin_headers
        )
        self.assertEqual(summary_res.status_code, 200)
        data = summary_res.json()
        self.assertIn("overall_percentage", data)
        self.assertIn(data["status"], ["Warning", "Critical", "Normal"])

    def test_assessment_and_marks_analytics(self):
        """Create assessment, enter marks, and check student analytics."""
        # 1. Create Assessment
        ass_res = self.client.post(
            "/api/v1/performance/assessments",
            headers=self.admin_headers,
            json={
                "subject_id": self.subject_id,
                "title": "Midterm Examination",
                "type": "MIDTERM",
                "max_marks": 100.0,
                "weightage": 30.0
            }
        )
        self.assertEqual(ass_res.status_code, 201)
        assessment_id = ass_res.json()["id"]

        # 2. Record Mark
        mark_res = self.client.post(
            "/api/v1/performance/marks",
            headers=self.admin_headers,
            json={
                "assessment_id": assessment_id,
                "student_id": self.student_id,
                "score": 88.5,
                "feedback": "Outstanding analytical reasoning."
            }
        )
        self.assertEqual(mark_res.status_code, 201)

        # 3. Retrieve Performance Analytics
        perf_res = self.client.get(
            f"/api/v1/performance/student/{self.student_id}",
            headers=self.admin_headers
        )
        self.assertEqual(perf_res.status_code, 200)
        perf_data = perf_res.json()
        self.assertGreater(perf_data["cgpa"], 0.0)
        self.assertIn("subject_summaries", perf_data)
        self.assertIn("recent_trend", perf_data)


if __name__ == "__main__":
    unittest.main()
