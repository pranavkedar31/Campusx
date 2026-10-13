"""
ML Student Risk Prediction and Early Warning Integration Tests.
"""

import unittest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.models.student import Student
from app.models.academic import Department, Course


class TestPredictions(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db = SessionLocal()
        init_db(db)
        # Fetch the seeded student profile
        cls.seeded_student = db.query(Student).filter(Student.roll_number == "CS2023001").first()
        cls.seeded_student_id = cls.seeded_student.id if cls.seeded_student else None
        db.close()

        cls.client = TestClient(app)

        # Faculty login
        res_fac = cls.client.post("/api/v1/auth/login", json={"email": "faculty@campusx.edu", "password": "Faculty@123"})
        cls.fac_token = res_fac.json()["access_token"]
        cls.fac_headers = {"Authorization": f"Bearer {cls.fac_token}"}

        # Seeded Student login (Alex Rivera)
        res_stu = cls.client.post("/api/v1/auth/login", json={"email": "student@campusx.edu", "password": "Student@123"})
        cls.stu_token = res_stu.json()["access_token"]
        cls.stu_headers = {"Authorization": f"Bearer {cls.stu_token}"}

    def test_ad_hoc_risk_evaluation(self):
        """Test hypothetical risk simulation for high and low risk profiles."""
        # High Risk Profile
        res_high = self.client.post(
            "/api/v1/predictions/evaluate",
            headers=self.fac_headers,
            json={
                "attendance_pct": 52.0,
                "cgpa": 4.1,
                "failed_assessments_count": 3,
                "assignment_submission_rate": 50.0,
                "marks_drop": 22.0
            }
        )
        self.assertEqual(res_high.status_code, 200)
        data_high = res_high.json()
        self.assertEqual(data_high["risk_level"], "HIGH")
        self.assertGreaterEqual(data_high["risk_score"], 0.60)
        self.assertTrue(len(data_high["contributing_factors"]) > 0)
        self.assertTrue(len(data_high["recommended_interventions"]) > 0)

        # Low Risk Profile
        res_low = self.client.post(
            "/api/v1/predictions/evaluate",
            headers=self.fac_headers,
            json={
                "attendance_pct": 95.0,
                "cgpa": 9.1,
                "failed_assessments_count": 0,
                "assignment_submission_rate": 98.0,
                "marks_drop": 0.0
            }
        )
        self.assertEqual(res_low.status_code, 200)
        data_low = res_low.json()
        self.assertEqual(data_low["risk_level"], "LOW")
        self.assertLessEqual(data_low["risk_score"], 0.40)

    def test_student_risk_prediction_and_anti_idor(self):
        """Verify student can view own prediction but not other students'."""
        if not self.seeded_student_id:
            self.skipTest("No seeded student available")

        # 1. Own risk prediction succeeds
        own_res = self.client.get(
            f"/api/v1/predictions/student/{self.seeded_student_id}",
            headers=self.stu_headers
        )
        self.assertEqual(own_res.status_code, 200)
        self.assertEqual(own_res.json()["student_id"], self.seeded_student_id)

        # 2. Register another student
        uid = uuid.uuid4().hex[:6]
        res_adm = self.client.post("/api/v1/auth/login", json={"email": "admin@campusx.edu", "password": "Admin@123"})
        adm_headers = {"Authorization": f"Bearer {res_adm.json()['access_token']}"}

        db = SessionLocal()
        dept = db.query(Department).first()
        course = db.query(Course).first()
        db.close()

        other_stu = self.client.post(
            "/api/v1/students/",
            headers=adm_headers,
            json={
                "email": f"other_{uid}@campusx.edu",
                "password": "Password@123",
                "full_name": f"Other Student {uid}",
                "roll_number": f"ROLL_{uid}",
                "enrollment_number": f"ENR_{uid}",
                "department_id": dept.id,
                "course_id": course.id,
                "current_semester": 2,
                "section": "A",
                "admission_year": 2024
            }
        ).json()
        other_stu_id = other_stu["id"]

        # Login as the new student
        other_login = self.client.post(
            "/api/v1/auth/login",
            json={"email": f"other_{uid}@campusx.edu", "password": "Password@123"}
        )
        other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}

        # Anti-IDOR: New student tries to inspect seeded student's risk profile -> 403 Forbidden
        forbidden_res = self.client.get(
            f"/api/v1/predictions/student/{self.seeded_student_id}",
            headers=other_headers
        )
        self.assertEqual(forbidden_res.status_code, 403)

        # Faculty CAN inspect any student
        fac_res = self.client.get(
            f"/api/v1/predictions/student/{self.seeded_student_id}",
            headers=self.fac_headers
        )
        self.assertEqual(fac_res.status_code, 200)

    def test_at_risk_cohort_and_model_metadata(self):
        """Verify at-risk roster query and model metadata endpoint."""
        roster_res = self.client.get("/api/v1/predictions/at-risk", headers=self.fac_headers)
        self.assertEqual(roster_res.status_code, 200)
        roster = roster_res.json()
        self.assertIn("total_students", roster)
        self.assertIn("risk_distribution", roster)

        meta_res = self.client.get("/api/v1/predictions/metadata", headers=self.fac_headers)
        self.assertEqual(meta_res.status_code, 200)
        meta = meta_res.json()
        self.assertEqual(meta["status"], "Operational")
        self.assertIn("RandomForestClassifier", meta["model_type"])


if __name__ == "__main__":
    unittest.main()
