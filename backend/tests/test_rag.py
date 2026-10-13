"""
RAG Campus Knowledge Assistant Integration Tests.
"""

import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.db.init_db import init_db
from app.db.session import SessionLocal


class TestCampusRAG(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db = SessionLocal()
        init_db(db)
        db.close()
        cls.client = TestClient(app)

        # Authenticate as student
        res = cls.client.post("/api/v1/auth/login", json={"email": "student@campusx.edu", "password": "Student@123"})
        cls.token = res.json()["access_token"]
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

    def test_list_indexed_policy_documents(self):
        """Verify knowledge base documents are indexed properly."""
        res = self.client.get("/api/v1/rag/documents", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        docs = res.json()
        self.assertGreaterEqual(len(docs), 4)
        doc_files = [d["filename"] for d in docs]
        self.assertIn("academic_regulations.md", doc_files)
        self.assertIn("leave_and_attendance_policy.md", doc_files)
        self.assertIn("placement_and_internship_policy.md", doc_files)

    def test_rag_attendance_policy_query(self):
        """Query attendance regulation policy with vector retrieval."""
        res = self.client.post(
            "/api/v1/rag/query",
            headers=self.headers,
            json={"query": "What is the minimum attendance percentage required to sit for semester examinations?"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["confidence"], "HIGH")
        self.assertTrue(len(data["sources"]) > 0)
        self.assertTrue(any("attendance" in s["title"].lower() or "attendance" in s.get("section", "").lower() for s in data["sources"]))
        self.assertTrue(len(data["retrieved_chunks"]) > 0)

    def test_rag_placement_dream_policy_query(self):
        """Query dream company placement policy."""
        res = self.client.post(
            "/api/v1/rag/query",
            headers=self.headers,
            json={"query": "Can I apply for dream or super dream company upgrades after getting placed?"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["confidence"], "HIGH")
        self.assertTrue(any("placement" in s["title"].lower() for s in data["sources"]))

    def test_rag_unrelated_query_graceful_fallback(self):
        """Query completely unrelated topic to verify anti-hallucination fallback."""
        res = self.client.post(
            "/api/v1/rag/query",
            headers=self.headers,
            json={"query": "quantum gravity black hole hawking radiation astrophysics"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["confidence"], "LOW")
        self.assertIn("Insufficient", data["answer"])


if __name__ == "__main__":
    unittest.main()
