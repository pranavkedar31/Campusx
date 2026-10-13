"""
Academic Management & Profile integration tests for CampusX.
"""

import unittest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.db.init_db import init_db
from app.db.session import SessionLocal


class TestAcademics(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db = SessionLocal()
        init_db(db)
        db.close()
        cls.client = TestClient(app)

        # Obtain Admin token
        res = cls.client.post("/api/v1/auth/login", json={"email": "admin@campusx.edu", "password": "Admin@123"})
        cls.admin_token = res.json()["access_token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

    def test_department_course_subject_lifecycle(self):
        """Create and retrieve department, course, and subject."""
        uid = uuid.uuid4().hex[:6].upper()
        # 1. Create Department
        dept_res = self.client.post(
            "/api/v1/academics/departments",
            headers=self.admin_headers,
            json={"code": f"CSE_{uid}", "name": f"Computer Science {uid}", "description": "Core Computing"}
        )
        self.assertEqual(dept_res.status_code, 201)
        dept_id = dept_res.json()["id"]

        # 2. Create Course
        course_res = self.client.post(
            "/api/v1/academics/courses",
            headers=self.admin_headers,
            json={"code": f"BTECH_{uid}", "name": f"B.Tech Computer Science {uid}", "credits": 160, "department_id": dept_id}
        )
        self.assertEqual(course_res.status_code, 201)
        course_id = course_res.json()["id"]

        # 3. Create Subject
        sub_res = self.client.post(
            "/api/v1/academics/subjects",
            headers=self.admin_headers,
            json={"code": f"CS_{uid}", "name": "Algorithms", "credits": 4, "course_id": course_id, "semester_number": 4}
        )
        self.assertEqual(sub_res.status_code, 201)

        # 4. Verify listings
        list_res = self.client.get("/api/v1/academics/departments")
        self.assertEqual(list_res.status_code, 200)
        self.assertTrue(any(d["code"] == f"CSE_{uid}" for d in list_res.json()))

    def test_student_registration_and_idor_protection(self):
        """Register students and verify Anti-IDOR protection."""
        uid = uuid.uuid4().hex[:6]
        # Get department and course
        depts = self.client.get("/api/v1/academics/departments").json()
        dept_id = depts[0]["id"]
        courses = self.client.get("/api/v1/academics/courses").json()
        course_id = courses[0]["id"]

        # Register Student 1
        stu1_res = self.client.post(
            "/api/v1/students/",
            headers=self.admin_headers,
            json={
                "email": f"stu1_{uid}@campusx.edu",
                "password": "Password@123",
                "full_name": f"Maya Lin {uid}",
                "roll_number": f"CS_{uid}_1",
                "enrollment_number": f"ENR_{uid}_1",
                "department_id": dept_id,
                "course_id": course_id,
                "current_semester": 4,
                "section": "A",
                "admission_year": 2023
            }
        )
        self.assertEqual(stu1_res.status_code, 201)
        stu1_id = stu1_res.json()["id"]

        # Register Student 2
        stu2_res = self.client.post(
            "/api/v1/students/",
            headers=self.admin_headers,
            json={
                "email": f"stu2_{uid}@campusx.edu",
                "password": "Password@123",
                "full_name": f"Rahul Sharma {uid}",
                "roll_number": f"CS_{uid}_2",
                "enrollment_number": f"ENR_{uid}_2",
                "department_id": dept_id,
                "course_id": course_id,
                "current_semester": 4,
                "section": "A",
                "admission_year": 2023
            }
        )
        self.assertEqual(stu2_res.status_code, 201)
        stu2_id = stu2_res.json()["id"]

        # Login as Student 2
        login_res = self.client.post(
            "/api/v1/auth/login",
            json={"email": f"stu2_{uid}@campusx.edu", "password": "Password@123"}
        )
        stu2_token = login_res.json()["access_token"]
        stu2_headers = {"Authorization": f"Bearer {stu2_token}"}

        # Student 2 can view own profile
        own_res = self.client.get(f"/api/v1/students/{stu2_id}", headers=stu2_headers)
        self.assertEqual(own_res.status_code, 200)
        self.assertEqual(own_res.json()["roll_number"], f"CS_{uid}_2")

        # Anti-IDOR: Student 2 cannot view Student 1's profile -> 403 Forbidden
        other_res = self.client.get(f"/api/v1/students/{stu1_id}", headers=stu2_headers)
        self.assertEqual(other_res.status_code, 403)


if __name__ == "__main__":
    unittest.main()
