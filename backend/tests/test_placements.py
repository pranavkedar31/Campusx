"""
Placement Management and Career Intelligence Integration Tests.
"""

import unittest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.db.init_db import init_db
from app.db.session import SessionLocal


class TestPlacements(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db = SessionLocal()
        init_db(db)
        db.close()
        cls.client = TestClient(app)

        # Placement Officer Login
        res_plc = cls.client.post("/api/v1/auth/login", json={"email": "placement@campusx.edu", "password": "Placement@123"})
        cls.plc_token = res_plc.json()["access_token"]
        cls.plc_headers = {"Authorization": f"Bearer {cls.plc_token}"}

        # Student Login (Alex Rivera, CGPA 8.85, CSE)
        res_stu = cls.client.post("/api/v1/auth/login", json={"email": "student@campusx.edu", "password": "Student@123"})
        cls.stu_token = res_stu.json()["access_token"]
        cls.stu_headers = {"Authorization": f"Bearer {cls.stu_token}"}

    def test_placement_lifecycle_and_recruitment_funnel(self):
        """Test full placement workflow: Company -> Job -> Student Eligibility & Apply -> Officer Funnel -> Stats."""
        uid = uuid.uuid4().hex[:6]

        # 1. Placement officer registers Company
        comp_res = self.client.post(
            "/api/v1/placements/companies",
            headers=self.plc_headers,
            json={
                "name": f"Nova Dynamics {uid}",
                "website": "https://novadynamics.ai",
                "industry": "Artificial Intelligence & Cloud",
                "contact_email": f"talent_{uid}@novadynamics.ai"
            }
        )
        self.assertEqual(comp_res.status_code, 201)
        company_id = comp_res.json()["id"]

        # 2. Post Job Role (CGPA min 8.0, eligible department: CSE)
        job_res = self.client.post(
            "/api/v1/placements/jobs",
            headers=self.plc_headers,
            json={
                "company_id": company_id,
                "title": f"Associate AI Engineer {uid}",
                "description": "Design and deploy scalable machine learning architectures.",
                "package_ctc": 18.5,
                "min_cgpa": 8.0,
                "eligible_departments": "CSE"
            }
        )
        self.assertEqual(job_res.status_code, 201)
        job_id = job_res.json()["id"]

        # 3. Student views job board with real-time academic eligibility
        student_jobs = self.client.get("/api/v1/placements/jobs", headers=self.stu_headers)
        self.assertEqual(student_jobs.status_code, 200)
        jobs_list = student_jobs.json()
        target_job = next(j for j in jobs_list if j["id"] == job_id)
        self.assertTrue(target_job["is_eligible"])
        self.assertFalse(target_job["has_applied"])

        # 4. Student applies
        apply_res = self.client.post(
            "/api/v1/placements/apply",
            headers=self.stu_headers,
            json={
                "job_role_id": job_id,
                "resume_url": "https://campusx.edu/resumes/alex-rivera.pdf",
                "notes": "Strong background in PyTorch and Distributed Computing."
            }
        )
        self.assertEqual(apply_res.status_code, 201)
        app_data = apply_res.json()
        app_id = app_data["id"]
        self.assertEqual(app_data["status"], "APPLIED")

        # 5. Verify Duplicate Application is prevented
        dup_res = self.client.post(
            "/api/v1/placements/apply",
            headers=self.stu_headers,
            json={"job_role_id": job_id}
        )
        self.assertEqual(dup_res.status_code, 400)

        # 6. Placement Officer reviews candidates pipeline
        apps_res = self.client.get(
            f"/api/v1/placements/applications?job_role_id={job_id}",
            headers=self.plc_headers
        )
        self.assertEqual(apps_res.status_code, 200)
        self.assertTrue(any(a["id"] == app_id for a in apps_res.json()))

        # 7. Advance Candidate through Funnel: APPLIED -> SHORTLISTED -> OFFERED
        shortlist_res = self.client.put(
            f"/api/v1/placements/applications/{app_id}/status",
            headers=self.plc_headers,
            json={"status": "SHORTLISTED", "notes": "Impressive open source portfolio"}
        )
        self.assertEqual(shortlist_res.status_code, 200)
        self.assertEqual(shortlist_res.json()["status"], "SHORTLISTED")

        offer_res = self.client.put(
            f"/api/v1/placements/applications/{app_id}/status",
            headers=self.plc_headers,
            json={"status": "OFFERED", "ctc_offered": 19.5, "notes": "Offered after final interview"}
        )
        self.assertEqual(offer_res.status_code, 200)
        offer_data = offer_res.json()
        self.assertEqual(offer_data["status"], "OFFERED")
        self.assertIsNotNone(offer_data["offer"])
        self.assertEqual(offer_data["offer"]["ctc_offered"], 19.5)

        # 8. Student checks their application status
        my_apps = self.client.get("/api/v1/placements/my-applications", headers=self.stu_headers)
        self.assertEqual(my_apps.status_code, 200)
        my_app_record = next(a for a in my_apps.json() if a["id"] == app_id)
        self.assertEqual(my_app_record["status"], "OFFERED")

        # 9. Verify Institutional Placement Statistics
        stats_res = self.client.get("/api/v1/placements/stats", headers=self.plc_headers)
        self.assertEqual(stats_res.status_code, 200)
        stats = stats_res.json()
        self.assertGreaterEqual(stats["total_offers"], 1)
        self.assertGreaterEqual(stats["highest_ctc"], 19.5)
        self.assertIn("Offers Extended", stats["funnel"])


if __name__ == "__main__":
    unittest.main()
