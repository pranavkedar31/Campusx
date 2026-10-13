"""
Digital Certificates and QR Verification Integration Tests.
"""

import unittest
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.db.init_db import init_db
from app.db.session import SessionLocal


class TestCertificates(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db = SessionLocal()
        init_db(db)
        db.close()
        cls.client = TestClient(app)

        # Admin login
        res_adm = cls.client.post("/api/v1/auth/login", json={"email": "admin@campusx.edu", "password": "Admin@123"})
        cls.admin_token = res_adm.json()["access_token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        # Student login
        res_stu = cls.client.post("/api/v1/auth/login", json={"email": "student@campusx.edu", "password": "Student@123"})
        cls.stu_token = res_stu.json()["access_token"]
        cls.stu_headers = {"Authorization": f"Bearer {cls.stu_token}"}

    def test_certificate_request_approval_and_verification_flow(self):
        """Complete certificate workflow: request -> approve -> PDF -> public QR verification."""
        # 1. Student requests Bonafide Certificate
        req_res = self.client.post(
            "/api/v1/certificates/request",
            headers=self.stu_headers,
            json={
                "type": "BONAFIDE",
                "purpose": "Bank Education Loan Application"
            }
        )
        self.assertEqual(req_res.status_code, 201)
        cert = req_res.json()
        cert_id = cert["id"]
        cert_uuid = cert["certificate_uuid"]
        self.assertEqual(cert["status"], "PENDING")

        # 2. Admin reviews and approves
        approve_res = self.client.put(
            f"/api/v1/certificates/{cert_id}/review",
            headers=self.admin_headers,
            json={"status": "APPROVED"}
        )
        self.assertEqual(approve_res.status_code, 200)
        approved_cert = approve_res.json()
        self.assertEqual(approved_cert["status"], "APPROVED")
        self.assertIsNotNone(approved_cert["pdf_filename"])

        # 3. Public Verification Endpoint (No auth header required)
        verify_res = self.client.get(f"/api/v1/certificates/verify/{cert_uuid}")
        self.assertEqual(verify_res.status_code, 200)
        verify_data = verify_res.json()
        self.assertTrue(verify_data["is_valid"])
        self.assertEqual(verify_data["status"], "APPROVED")
        self.assertEqual(verify_data["certificate_id"], cert_uuid)

        # 4. Public Verification on invalid UUID
        fake_res = self.client.get("/api/v1/certificates/verify/CX-FAKE-999-XXXXX")
        self.assertEqual(fake_res.status_code, 200)
        self.assertFalse(fake_res.json()["is_valid"])


if __name__ == "__main__":
    unittest.main()
