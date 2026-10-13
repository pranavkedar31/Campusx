"""
Role-Based Access Control (RBAC) integration tests for CampusX.
"""

import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.db.init_db import init_db
from app.db.session import SessionLocal


class TestRBAC(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db = SessionLocal()
        init_db(db)
        db.close()
        cls.client = TestClient(app)

    def _get_token(self, email: str, password: str) -> str:
        res = self.client.post("/api/v1/auth/login", json={"email": email, "password": password})
        return res.json()["access_token"]

    def test_admin_can_access_users_list(self):
        """ADMIN role can access user management endpoints."""
        token = self._get_token("admin@campusx.edu", "Admin@123")
        res = self.client.get("/api/v1/users/", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_student_forbidden_from_users_list(self):
        """STUDENT role receives 403 Forbidden when accessing user management."""
        token = self._get_token("student@campusx.edu", "Student@123")
        res = self.client.get("/api/v1/users/", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res.status_code, 403)
        self.assertIn("Access denied", res.json()["detail"])

    def test_faculty_forbidden_from_users_list(self):
        """FACULTY role receives 403 Forbidden when accessing user management."""
        token = self._get_token("faculty@campusx.edu", "Faculty@123")
        res = self.client.get("/api/v1/users/", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res.status_code, 403)

    def test_super_admin_can_access_users_list(self):
        """SUPER_ADMIN role has full access."""
        token = self._get_token("superadmin@campusx.edu", "SuperAdmin@123")
        res = self.client.get("/api/v1/users/", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res.status_code, 200)


if __name__ == "__main__":
    unittest.main()
