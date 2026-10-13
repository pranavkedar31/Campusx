import unittest
from fastapi.testclient import TestClient
from app.main import app


class TestHealthEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_root_endpoint(self):
        """Verify platform root info endpoint returns valid status."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["platform"], "CampusX")
        self.assertEqual(data["status"], "operational")

    def test_root_health_check(self):
        """Verify top-level health endpoint."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")

    def test_api_v1_health_check(self):
        """Verify API v1 router health endpoint."""
        response = self.client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["api_version"], "v1")


if __name__ == "__main__":
    unittest.main()
