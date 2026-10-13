"""
ERP Institutional Reports and CSV Data Export API Endpoints.
Supports generating customizable reports across all university operations.
"""

from typing import List, Optional
import io
import csv
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.rbac import UserRole
from app.models.user import User
from app.models.student import Student
from app.models.faculty import Faculty
from app.models.academic import Department, Course, Subject
from app.models.performance import AttendanceRecord, AttendanceStatus, Mark
from app.models.fee import StudentFee, FeeTransaction, FeeStatus
from app.models.examination import Examination, ExamResult, ExamSchedule
from app.models.assignment import Assignment, AssignmentSubmission
from app.models.placement import PlacementApplication, JobRole
from app.models.certificate import Certificate
from app.schemas.report import ReportFilter, ReportType, ReportDataResponse

router = APIRouter()


@router.post("/generate", response_model=ReportDataResponse, summary="Generate ERP Report Data")
def generate_report(
    filter_in: ReportFilter,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY, UserRole.MANAGEMENT])),
    db: Session = Depends(get_db)
):
    """Generate structured tabular report dataset with applied filters."""
    rtype = filter_in.report_type

    if rtype == ReportType.STUDENTS:
        query = db.query(Student)
        if filter_in.department_id:
            query = query.filter(Student.department_id == filter_in.department_id)
        if filter_in.semester_number:
            query = query.filter(Student.current_semester == filter_in.semester_number)
        students = query.all()

        headers = ["Roll Number", "Enrollment No", "Full Name", "Department", "Semester", "Section", "CGPA", "Attendance %"]
        rows = [
            {
                "Roll Number": s.roll_number,
                "Enrollment No": s.enrollment_number,
                "Full Name": s.user.full_name if s.user else "Student",
                "Department": s.department.code if s.department else "CSE",
                "Semester": s.current_semester,
                "Section": s.section,
                "CGPA": s.cgpa,
                "Attendance %": f"{s.attendance_pct:.1f}%"
            }
            for s in students
        ]
        return ReportDataResponse(report_type=rtype.value, title="Enrolled Students Roster", total_records=len(rows), headers=headers, rows=rows)

    elif rtype == ReportType.FEE_LEDGER or rtype == ReportType.FEE_OUTSTANDING:
        query = db.query(StudentFee)
        if filter_in.semester_number:
            query = query.filter(StudentFee.semester_number == filter_in.semester_number)
        if rtype == ReportType.FEE_OUTSTANDING:
            query = query.filter(StudentFee.pending_amount > 0)
        fees = query.all()

        headers = ["Roll Number", "Student Name", "Semester", "Total Fee (₹)", "Paid (₹)", "Pending (₹)", "Due Date", "Status"]
        rows = [
            {
                "Roll Number": f.student.roll_number if f.student else "N/A",
                "Student Name": f.student.user.full_name if f.student and f.student.user else "Student",
                "Semester": f.semester_number,
                "Total Fee (₹)": f"{f.total_amount:,.2f}",
                "Paid (₹)": f"{f.paid_amount:,.2f}",
                "Pending (₹)": f"{f.pending_amount:,.2f}",
                "Due Date": str(f.due_date),
                "Status": f.status.value
            }
            for f in fees
        ]
        title = "Outstanding Fee Report" if rtype == ReportType.FEE_OUTSTANDING else "Comprehensive Fee Ledger Report"
        return ReportDataResponse(report_type=rtype.value, title=title, total_records=len(rows), headers=headers, rows=rows)

    elif rtype == ReportType.RESULTS:
        query = db.query(ExamResult)
        if filter_in.semester_number:
            query = query.filter(ExamResult.semester_number == filter_in.semester_number)
        results = query.all()

        headers = ["Roll Number", "Student Name", "Semester", "Marks Obtained", "Total Marks", "%", "SGPA", "CGPA", "Result Status"]
        rows = [
            {
                "Roll Number": r.student.roll_number if r.student else "N/A",
                "Student Name": r.student.user.full_name if r.student and r.student.user else "Student",
                "Semester": r.semester_number,
                "Marks Obtained": f"{r.total_marks_obtained:.0f}",
                "Total Marks": f"{r.total_max_marks:.0f}",
                "%": f"{r.percentage:.1f}%",
                "SGPA": r.sgpa,
                "CGPA": r.cgpa,
                "Result Status": r.result_status.value
            }
            for r in results
        ]
        return ReportDataResponse(report_type=rtype.value, title="Semester Examination Results Report", total_records=len(rows), headers=headers, rows=rows)

    elif rtype == ReportType.ASSIGNMENT_SUBMISSIONS:
        query = db.query(AssignmentSubmission)
        subs = query.all()

        headers = ["Assignment Title", "Roll Number", "Student Name", "Submitted At", "Status", "Marks Awarded", "Feedback"]
        rows = [
            {
                "Assignment Title": s.assignment.title if s.assignment else "Assignment",
                "Roll Number": s.student.roll_number if s.student else "N/A",
                "Student Name": s.student.user.full_name if s.student and s.student.user else "Student",
                "Submitted At": s.submitted_at.strftime("%Y-%m-%d %H:%M"),
                "Status": s.status.value,
                "Marks Awarded": str(s.marks_awarded) if s.marks_awarded is not None else "Pending",
                "Feedback": s.feedback or ""
            }
            for s in subs
        ]
        return ReportDataResponse(report_type=rtype.value, title="Assignment Submissions Report", total_records=len(rows), headers=headers, rows=rows)

    elif rtype == ReportType.PLACEMENTS:
        query = db.query(PlacementApplication)
        apps = query.all()

        headers = ["Student Name", "Roll Number", "Company", "Job Role", "Application Status", "Applied At"]
        rows = [
            {
                "Student Name": a.student.user.full_name if a.student and a.student.user else "Student",
                "Roll Number": a.student.roll_number if a.student else "N/A",
                "Company": a.job_role.company.name if a.job_role and a.job_role.company else "Company",
                "Job Role": a.job_role.title if a.job_role else "Role",
                "Application Status": a.status.value,
                "Applied At": a.applied_at.strftime("%Y-%m-%d")
            }
            for a in apps
        ]
        return ReportDataResponse(report_type=rtype.value, title="Campus Placements Report", total_records=len(rows), headers=headers, rows=rows)

    # Default / Fallback: Attendance
    query = db.query(Student)
    if filter_in.department_id:
        query = query.filter(Student.department_id == filter_in.department_id)
    students = query.all()
    headers = ["Roll Number", "Student Name", "Department", "Semester", "Attendance %", "Compliance Status"]
    rows = [
        {
            "Roll Number": s.roll_number,
            "Student Name": s.user.full_name if s.user else "Student",
            "Department": s.department.code if s.department else "CSE",
            "Semester": s.current_semester,
            "Attendance %": f"{s.attendance_pct:.1f}%",
            "Compliance Status": "CRITICAL" if s.attendance_pct < 65 else "WARNING" if s.attendance_pct < 75 else "GOOD"
        }
        for s in students
    ]
    return ReportDataResponse(report_type="ATTENDANCE", title="Campus Attendance Compliance Report", total_records=len(rows), headers=headers, rows=rows)


@router.get("/export/csv", summary="Export Report as Downloadable CSV")
def export_report_csv(
    report_type: ReportType = Query(ReportType.STUDENTS),
    department_id: Optional[str] = None,
    semester_number: Optional[int] = None,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY, UserRole.MANAGEMENT])),
    db: Session = Depends(get_db)
):
    """Stream CSV file generated on the fly for the selected report type."""
    filter_in = ReportFilter(report_type=report_type, department_id=department_id, semester_number=semester_number)
    data_resp = generate_report(filter_in=filter_in, current_user=current_user, db=db)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(data_resp.headers)
    for r in data_resp.rows:
        writer.writerow([r.get(h, "") for h in data_resp.headers])

    output.seek(0)
    filename = f"CampusX_{report_type.value.lower()}_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
