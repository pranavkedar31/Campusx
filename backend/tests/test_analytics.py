"""
Institutional Analytics and Management Intelligence Integration Tests.
"""

import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.db.init_db import init_db
from app.db.session import SessionLocal


class TestInstitutionalAnalytics(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db = SessionLocal()
        init_db(db)
        db.close()
        cls.client = TestClient(app)

        # Management login
        res_mgmt = cls.client.post("/api/v1/auth/login", json={"email": "management@campusx.edu", "password": "Management@123"})
        cls.mgmt_token = res_mgmt.json()["access_token"]
        cls.mgmt_headers = {"Authorization": f"Bearer {cls.mgmt_token}"}

        # Admin login
        res_adm = cls.client.post("/api/v1/auth/login", json={"email": "admin@campusx.edu", "password": "Admin@123"})
        cls.adm_token = res_adm.json()["access_token"]
        cls.adm_headers = {"Authorization": f"Bearer {cls.adm_token}"}

        # Student login
        res_stu = cls.client.post("/api/v1/auth/login", json={"email": "student@campusx.edu", "password": "Student@123"})
        cls.stu_token = res_stu.json()["access_token"]
        cls.stu_headers = {"Authorization": f"Bearer {cls.stu_token}"}

    def test_executive_institutional_summary(self):
        """Management can access complete institutional analytics summary."""
        res = self.client.get("/api/v1/analytics/institutional-summary", headers=self.mgmt_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("kpis", data)
        self.assertIn("department_matrix", data)
        self.assertIn("risk_distribution", data)

        kpis = data["kpis"]
        self.assertGreaterEqual(kpis["total_students"], 1)
        self.assertGreaterEqual(kpis["total_departments"], 1)
        self.assertIn("student_faculty_ratio", kpis)

    def test_rbac_security_on_analytics(self):
        """Verify role protection: Students are forbidden from viewing institutional analytics."""
        res_stu = self.client.get("/api/v1/analytics/institutional-summary", headers=self.stu_headers)
        self.assertEqual(res_stu.status_code, 403)

        # Admin allowed
        res_adm = self.client.get("/api/v1/analytics/institutional-summary", headers=self.adm_headers)
        self.assertEqual(res_adm.status_code, 200)


if __name__ == "__main__":
    unittest.main()
