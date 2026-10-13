"""
Authentication and JWT integration tests for CampusX.
"""

import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.db.init_db import init_db
from app.db.session import SessionLocal


class TestAuthentication(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db = SessionLocal()
        init_db(db)
        db.close()
        cls.client = TestClient(app)

    def test_login_success(self):
        """Verify successful login returns valid JWT token."""
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "admin@campusx.edu", "password": "Admin@123"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["token_type"], "bearer")
        self.assertEqual(data["user"]["email"], "admin@campusx.edu")
        self.assertEqual(data["user"]["role"], "ADMIN")

    def test_login_invalid_password(self):
        """Verify invalid credentials return 401 Unauthorized."""
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "admin@campusx.edu", "password": "WrongPassword999"}
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn("Incorrect email or password", response.json()["detail"])

    def test_get_current_user_me(self):
        """Verify /auth/me returns profile for authorized bearer token."""
        login_res = self.client.post(
            "/api/v1/auth/login",
            json={"email": "student@campusx.edu", "password": "Student@123"}
        )
        token = login_res.json()["access_token"]

        response = self.client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        user = response.json()
        self.assertEqual(user["email"], "student@campusx.edu")
        self.assertEqual(user["role"], "STUDENT")

    def test_unauthorized_access_fails(self):
        """Verify accessing /auth/me without token returns 401."""
        response = self.client.get("/api/v1/auth/me")
        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
