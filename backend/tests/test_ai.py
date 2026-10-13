"""
AI Academic Assistant and Context Grounding Integration Tests.
"""

import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.db.init_db import init_db
from app.db.session import SessionLocal


class TestAIAssistant(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db = SessionLocal()
        init_db(db)
        db.close()
        cls.client = TestClient(app)

        # Student login
        res_stu = cls.client.post("/api/v1/auth/login", json={"email": "student@campusx.edu", "password": "Student@123"})
        cls.stu_token = res_stu.json()["access_token"]
        cls.stu_headers = {"Authorization": f"Bearer {cls.stu_token}"}

        # Faculty login
        res_fac = cls.client.post("/api/v1/auth/login", json={"email": "faculty@campusx.edu", "password": "Faculty@123"})
        cls.fac_token = res_fac.json()["access_token"]
        cls.fac_headers = {"Authorization": f"Bearer {cls.fac_token}"}

    def test_student_grounded_ai_chat(self):
        """Student asks assistant about attendance and grades; verifies response is evidence-grounded."""
        # 1. Suggested Prompts
        sug_res = self.client.get("/api/v1/ai/suggested-prompts", headers=self.stu_headers)
        self.assertEqual(sug_res.status_code, 200)
        sug_data = sug_res.json()
        self.assertEqual(sug_data["role"], "STUDENT")
        self.assertTrue(len(sug_data["suggestions"]) > 0)

        # 2. Query attendance
        chat_att = self.client.post(
            "/api/v1/ai/chat",
            headers=self.stu_headers,
            json={"prompt": "What is my current attendance percentage and am I at risk of detention?"}
        )
        self.assertEqual(chat_att.status_code, 200)
        att_data = chat_att.json()
        self.assertEqual(att_data["role"], "STUDENT")
        self.assertIn("91.5", att_data["response"])  # Alex Rivera's seeded 91.5%
        self.assertIn("student", att_data["grounding_evidence"])

        # 3. Query CGPA
        chat_cgpa = self.client.post(
            "/api/v1/ai/chat",
            headers=self.stu_headers,
            json={"prompt": "What is my current cumulative CGPA score?"}
        )
        self.assertEqual(chat_cgpa.status_code, 200)
        cgpa_data = chat_cgpa.json()
        self.assertTrue(
            "8.85" in cgpa_data["response"] or "9.26" in cgpa_data["response"] or "CGPA of" in cgpa_data["response"]
        )

    def test_faculty_grounded_ai_chat(self):
        """Faculty asks assistant about at-risk students and class averages."""
        sug_res = self.client.get("/api/v1/ai/suggested-prompts", headers=self.fac_headers)
        self.assertEqual(sug_res.status_code, 200)
        self.assertEqual(sug_res.json()["role"], "FACULTY")

        chat_res = self.client.post(
            "/api/v1/ai/chat",
            headers=self.fac_headers,
            json={"prompt": "Which students in my department are at risk of failing?"}
        )
        self.assertEqual(chat_res.status_code, 200)
        res_data = chat_res.json()
        self.assertEqual(res_data["role"], "FACULTY")
        self.assertIn("faculty", res_data["grounding_evidence"])


if __name__ == "__main__":
    unittest.main()
