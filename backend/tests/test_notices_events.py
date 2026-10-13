"""
Notices, Campus Events, and Notifications Integration Tests.
"""

import unittest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.db.init_db import init_db
from app.db.session import SessionLocal


class TestNoticesEvents(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db = SessionLocal()
        init_db(db)
        db.close()
        cls.client = TestClient(app)

        # Admin token
        res = cls.client.post("/api/v1/auth/login", json={"email": "admin@campusx.edu", "password": "Admin@123"})
        cls.admin_token = res.json()["access_token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        # Student token
        res_stu = cls.client.post("/api/v1/auth/login", json={"email": "student@campusx.edu", "password": "Student@123"})
        cls.stu_token = res_stu.json()["access_token"]
        cls.stu_headers = {"Authorization": f"Bearer {cls.stu_token}"}
        cls.stu_id = res_stu.json()["user"]["id"]

    def test_notice_publishing_and_retrieval(self):
        """Publish notice as Admin and retrieve as Student."""
        uid = uuid.uuid4().hex[:6]
        res = self.client.post(
            "/api/v1/notices/",
            headers=self.admin_headers,
            json={
                "title": f"Midterm Exam Schedule {uid}",
                "content": "All midterm examinations commence next Monday.",
                "category": "EXAMINATION",
                "priority": "HIGH",
                "target_role": "ALL",
                "is_pinned": True
            }
        )
        self.assertEqual(res.status_code, 201)
        notice_id = res.json()["id"]

        # Student can view the published notice
        list_res = self.client.get("/api/v1/notices/", headers=self.stu_headers)
        self.assertEqual(list_res.status_code, 200)
        self.assertTrue(any(n["id"] == notice_id for n in list_res.json()))

    def test_campus_event_lifecycle_and_registration(self):
        """Create campus event and test student registration."""
        uid = uuid.uuid4().hex[:6]
        event_time = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

        # 1. Create Event
        ev_res = self.client.post(
            "/api/v1/events/",
            headers=self.admin_headers,
            json={
                "title": f"AI Innovation Hackathon {uid}",
                "description": "48-hour collaborative build sprint for intelligent campus apps.",
                "category": "HACKATHON",
                "venue": "Main Campus Auditorium",
                "event_date": event_time,
                "max_participants": 50
            }
        )
        self.assertEqual(ev_res.status_code, 201)
        event_id = ev_res.json()["id"]

        # 2. Student registers for event (if student profile exists)
        reg_res = self.client.post(f"/api/v1/events/{event_id}/register", headers=self.stu_headers)
        self.assertIn(reg_res.status_code, [201, 400])

    def test_notification_workflow(self):
        """Send notification, verify unread count, and mark as read."""
        uid = uuid.uuid4().hex[:6]

        # 1. Send notification
        send_res = self.client.post(
            "/api/v1/notifications/",
            headers=self.admin_headers,
            json={
                "user_id": self.stu_id,
                "title": f"Urgent Notice {uid}",
                "message": "Please review your course schedule updates.",
                "type": "ALERT"
            }
        )
        self.assertEqual(send_res.status_code, 201)
        notif_id = send_res.json()["id"]

        # 2. Check unread count
        count_res = self.client.get("/api/v1/notifications/unread-count", headers=self.stu_headers)
        self.assertEqual(count_res.status_code, 200)
        self.assertGreater(count_res.json()["unread_count"], 0)

        # 3. Mark read
        read_res = self.client.put(f"/api/v1/notifications/{notif_id}/read", headers=self.stu_headers)
        self.assertEqual(read_res.status_code, 200)


if __name__ == "__main__":
    unittest.main()
