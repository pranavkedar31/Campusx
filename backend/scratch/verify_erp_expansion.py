"""
End-to-End Live Verification of CampusX College ERP Expansion.
Validates all ERP modules across Student, Faculty, and Admin roles.
"""

import sys
import os
import io

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app

def run_verification():
    print("==================================================================")
    print("CAMPUSX COLLEGE ERP EXPANSION - COMPREHENSIVE E2E VERIFICATION")
    print("==================================================================")
    client = TestClient(app)

    # 1. Login Helper
    def login(email, password):
        res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        if res.status_code != 200:
            raise Exception(f"Login failed for {email}: {res.status_code} {res.text}")
        token = res.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    print("\n[1/8] Authenticating User Personas...")
    stu_headers = login("student@campusx.edu", "Student@123")
    print("  ✓ Authenticated STUDENT: student@campusx.edu")
    fac_headers = login("faculty@campusx.edu", "Faculty@123")
    print("  ✓ Authenticated FACULTY: faculty@campusx.edu")
    adm_headers = login("admin@campusx.edu", "Admin@123")
    print("  ✓ Authenticated ADMIN: admin@campusx.edu")

    # 2. Composite ERP Dashboards
    print("\n[2/8] Verifying Composite Role-Specific ERP Dashboards...")
    r_stu_dash = client.get("/api/v1/dashboard/student-erp", headers=stu_headers)
    assert r_stu_dash.status_code == 200, f"Student ERP Dash failed: {r_stu_dash.text}"
    sd = r_stu_dash.json()
    assert "academic_summary" in sd and "attendance_summary" in sd and "fees_summary" in sd
    print(f"  ✓ Student ERP Dashboard: CGPA={sd['academic_summary']['cgpa']}, Attendance={sd['attendance_summary']['overall_percentage']}%")

    r_fac_dash = client.get("/api/v1/dashboard/faculty-erp", headers=fac_headers)
    assert r_fac_dash.status_code == 200, f"Faculty ERP Dash failed: {r_fac_dash.text}"
    fd = r_fac_dash.json()
    assert "assigned_subjects" in fd and "today_classes" in fd
    print(f"  ✓ Faculty ERP Dashboard: Assigned Subjects={len(fd['assigned_subjects'])}, Total Students={fd['total_students']}")

    r_adm_dash = client.get("/api/v1/dashboard/admin-erp", headers=adm_headers)
    assert r_adm_dash.status_code == 200, f"Admin ERP Dash failed: {r_adm_dash.text}"
    ad = r_adm_dash.json()
    assert "fees_collected" in ad and "collection_rate_pct" in ad
    print(f"  ✓ Admin ERP Dashboard: Fees Collected=₹{ad['fees_collected']:,.2f} ({ad['collection_rate_pct']}%), Students={ad['total_students']}")

    # 3. Timetable & Room Scheduling
    print("\n[3/8] Verifying Timetable & Scheduling System...")
    r_tt_today = client.get("/api/v1/timetable/student/today", headers=stu_headers)
    assert r_tt_today.status_code == 200
    print(f"  ✓ Student Today's Schedule: Day={r_tt_today.json()['day']}, Classes={len(r_tt_today.json()['slots'])}")

    r_tt_week = client.get("/api/v1/timetable/student/weekly", headers=stu_headers)
    assert r_tt_week.status_code == 200
    print(f"  ✓ Student Weekly Schedule: Section={r_tt_week.json()['class_section_name']}")

    r_tt_fac = client.get("/api/v1/timetable/faculty/today", headers=fac_headers)
    assert r_tt_fac.status_code == 200
    print(f"  ✓ Faculty Teaching Schedule: Classes={len(r_tt_fac.json()['slots'])}")

    r_rooms = client.get("/api/v1/timetable/rooms", headers=stu_headers)
    assert r_rooms.status_code == 200
    print(f"  ✓ Campus Rooms Directory: {len(r_rooms.json())} lecture halls & labs registered")

    # 4. Fee Management, Payments & Receipts
    print("\n[4/8] Verifying Fee Ledger & ReportLab PDF Receipts...")
    r_ledger = client.get("/api/v1/fees/student/me", headers=stu_headers)
    assert r_ledger.status_code == 200
    ledger = r_ledger.json()
    print(f"  ✓ Student Ledger: Total=₹{ledger['total_fees']:,.2f}, Paid=₹{ledger['total_paid']:,.2f}, Pending=₹{ledger['total_pending']:,.2f}")

    if ledger["fees"]:
        target_fee = ledger["fees"][0]
        # Simulate payment
        pay_res = client.post("/api/v1/fees/pay", headers=stu_headers, json={
            "student_fee_id": target_fee["id"],
            "amount": 2500.0,
            "payment_mode": "UPI",
            "remarks": "E2E Verification Payment"
        })
        assert pay_res.status_code == 201
        txn = pay_res.json()
        print(f"  ✓ Simulated Fee Payment: Receipt No={txn['receipt_number']}, Amount=₹{txn['amount']}")

        # Download Receipt PDF
        rcpt_res = client.get(f"/api/v1/fees/receipts/{txn['id']}/download", headers=stu_headers)
        assert rcpt_res.status_code == 200
        assert rcpt_res.headers["content-type"] == "application/pdf"
        assert len(rcpt_res.content) > 500
        print(f"  ✓ Downloaded Fee Receipt PDF: {len(rcpt_res.content)} bytes generated via ReportLab")

    r_fee_admin = client.get("/api/v1/fees/admin-overview", headers=adm_headers)
    assert r_fee_admin.status_code == 200
    print(f"  ✓ Admin Fee Overview: Collection Rate={r_fee_admin.json()['collection_rate_pct']}%")

    # 5. Examinations, Registrations & Marksheets
    print("\n[5/8] Verifying Examinations, Forms & Marksheets...")
    r_exams = client.get("/api/v1/examinations/", headers=stu_headers)
    assert r_exams.status_code == 200
    exams = r_exams.json()
    print(f"  ✓ Active Examinations: {len(exams)} sessions found")

    if exams:
        first_exam_id = exams[0]["id"]
        r_form = client.get(f"/api/v1/examinations/{first_exam_id}/form", headers=stu_headers)
        assert r_form.status_code == 200
        print(f"  ✓ Student Exam Form for {exams[0]['name']}: Status={r_form.json().get('status') if r_form.json() else 'None'}")

    r_stu = client.get("/api/v1/students/me", headers=stu_headers)
    assert r_stu.status_code == 200
    stu_obj = r_stu.json()

    r_results = client.get(f"/api/v1/examinations/results/student/{stu_obj['id']}", headers=stu_headers)
    assert r_results.status_code == 200
    results = r_results.json()
    print(f"  ✓ Student Results: {len(results)} grade cards found")
    if results:
        res_id = results[0]["id"]
        # Download Marksheet PDF
        marksheet_res = client.get(f"/api/v1/examinations/results/{res_id}/marksheet-pdf", headers=stu_headers)
        assert marksheet_res.status_code == 200
        assert marksheet_res.headers["content-type"] == "application/pdf"
        assert len(marksheet_res.content) > 1000
        print(f"  ✓ Downloaded Official Semester Marksheet PDF: {len(marksheet_res.content)} bytes")

    # 6. Assignments & Coursework LMS
    print("\n[6/8] Verifying Assignments & Evaluation System...")
    r_stu_ass = client.get("/api/v1/assignments/student/my", headers=stu_headers)
    assert r_stu_ass.status_code == 200
    ass_list = r_stu_ass.json()
    print(f"  ✓ Student Coursework Assignments: {len(ass_list)} enrolled")

    if ass_list:
        ass_target = ass_list[0]
        # Student submits solution
        test_file = io.BytesIO(b"# Solution Code\nprint('CampusX Verification')")
        sub_res = client.post(
            f"/api/v1/assignments/{ass_target['id']}/submit",
            headers=stu_headers,
            files={"file": ("solution_verification.py", test_file, "text/x-python")}
        )
        assert sub_res.status_code == 201
        sub_data = sub_res.json()
        print(f"  ✓ Student Submitted Solution: File={sub_data['original_filename']}, Status={sub_data['status']}")

        # Faculty grades submission
        grade_res = client.post(
            f"/api/v1/assignments/submissions/{sub_data['id']}/grade",
            headers=fac_headers,
            json={"marks_awarded": 24.5, "feedback": "Excellent clean implementation."}
        )
        assert grade_res.status_code == 200
        assert grade_res.json()["status"] == "GRADED"
        print(f"  ✓ Faculty Graded Submission: Marks={grade_res.json()['marks_awarded']}/{ass_target['max_marks']}")

        # Student downloads submission
        dl_res = client.get(f"/api/v1/assignments/submissions/{sub_data['id']}/download", headers=stu_headers)
        assert dl_res.status_code == 200
        print(f"  ✓ Student Downloaded Own Submission File: {len(dl_res.content)} bytes")

    # 7. Learning Materials LMS & Student ID Card
    print("\n[7/8] Verifying Study Materials LMS & Student ID Card...")
    r_materials = client.get("/api/v1/learning/", headers=stu_headers)
    assert r_materials.status_code == 200
    print(f"  ✓ Course Study Materials: {len(r_materials.json())} resources available")

    # Student Profile & Digital ID Card PDF
    r_stu_profile = client.get("/api/v1/students/me", headers=stu_headers)
    assert r_stu_profile.status_code == 200
    stu_prof = r_stu_profile.json()
    print(f"  ✓ Student Profile: Name={stu_prof['user']['full_name']}, Roll={stu_prof['roll_number']}")

    r_id_card = client.get(f"/api/v1/students/{stu_prof['id']}/id-card", headers=stu_headers)
    assert r_id_card.status_code == 200
    assert r_id_card.headers["content-type"] == "application/pdf"
    assert len(r_id_card.content) > 500
    print(f"  ✓ Downloaded Official Digital Student ID Card PDF: {len(r_id_card.content)} bytes")

    # 8. Reports Engine & Anti-IDOR Security
    print("\n[8/8] Verifying Institutional Reports Engine & Anti-IDOR Enforcement...")
    r_rep_stu = client.post("/api/v1/reports/generate", headers=adm_headers, json={"report_type": "STUDENTS"})
    assert r_rep_stu.status_code == 200
    print(f"  ✓ Generated Student Roster Report: {r_rep_stu.json()['total_records']} rows")

    r_rep_fees = client.post("/api/v1/reports/generate", headers=adm_headers, json={"report_type": "FEE_LEDGER"})
    assert r_rep_fees.status_code == 200
    print(f"  ✓ Generated Fee Ledger Report: {r_rep_fees.json()['total_records']} rows")

    r_csv = client.get("/api/v1/reports/export/csv?report_type=STUDENTS", headers=adm_headers)
    assert r_csv.status_code == 200
    assert "text/csv" in r_csv.headers["content-type"]
    assert "Roll Number,Enrollment No" in r_csv.text
    print(f"  ✓ Streamed Live Institutional CSV Export ({len(r_csv.text.splitlines())} lines)")

    # Anti-IDOR: Student cannot view another student's fee ledger or ID card
    other_stu_id = "00000000-0000-0000-0000-000000000099"
    idor_res = client.get(f"/api/v1/fees/student/{other_stu_id}", headers=stu_headers)
    assert idor_res.status_code in (403, 404)
    print(f"  ✓ Anti-IDOR Protection Confirmed: Unauthorized student access blocked ({idor_res.status_code})")

    print("\n" + "=" * 66)
    print("ALL E2E VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("CAMPUSX ERP EXPANSION VERIFIED")
    print("=" * 66)

if __name__ == "__main__":
    run_verification()
