"""
Security Hardening and Audit Logging Integration Tests.
"""

import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.db.init_db import init_db
from app.db.session import SessionLocal


class TestAuditLogging(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db = SessionLocal()
        init_db(db)
        db.close()
        cls.client = TestClient(app)

        # 1. Trigger failed login attempt to generate audit entry
        cls.client.post("/api/v1/auth/login", json={"email": "intruder@campusx.edu", "password": "WrongPassword@123"})

        # 2. Admin login (generates AUTH_LOGIN_SUCCESS entry)
        res_adm = cls.client.post("/api/v1/auth/login", json={"email": "admin@campusx.edu", "password": "Admin@123"})
        cls.admin_token = res_adm.json()["access_token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        # 3. Student login
        res_stu = cls.client.post("/api/v1/auth/login", json={"email": "student@campusx.edu", "password": "Student@123"})
        cls.stu_token = res_stu.json()["access_token"]
        cls.stu_headers = {"Authorization": f"Bearer {cls.stu_token}"}

    def test_audit_logs_recording_and_filtering(self):
        """Admin can view immutable audit logs and filter by action."""
        res = self.client.get("/api/v1/audit/logs", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        logs = res.json()
        self.assertTrue(len(logs) >= 2)

        # Verify failed login was captured
        fail_logs = self.client.get("/api/v1/audit/logs?action=AUTH_LOGIN_FAILURE", headers=self.admin_headers)
        self.assertEqual(fail_logs.status_code, 200)
        self.assertTrue(any(l["user_email"] == "intruder@campusx.edu" for l in fail_logs.json()))

    def test_audit_summary_metrics(self):
        """Admin can access high-level security metrics summary."""
        res = self.client.get("/api/v1/audit/summary", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(data["failed_logins_count"], 1)
        self.assertGreaterEqual(data["successful_logins_count"], 1)
        self.assertIn("AUTH_LOGIN_SUCCESS", data["action_breakdown"])

    def test_rbac_security_on_audit_logs(self):
        """Verify non-admin users cannot access security audit logs."""
        res = self.client.get("/api/v1/audit/logs", headers=self.stu_headers)
        self.assertEqual(res.status_code, 403)


if __name__ == "__main__":
    unittest.main()
