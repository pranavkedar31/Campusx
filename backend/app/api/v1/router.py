"""
Master API v1 Router.
Aggregates all domain-specific routers and provides the version 1 health endpoint.
"""

from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, users, students, faculty, academics, attendance, performance,
    predictions, notices, events, certificates, placements, ai, rag,
    analytics, notifications, audit,
    fees, examinations, assignments, learning, timetable, dashboard, reports,
    applications, activities
)

api_router = APIRouter()


@api_router.get("/health", tags=["Health"])
def v1_health_check():
    """Version 1 API health status check."""
    return {
        "status": "healthy",
        "api_version": "v1",
        "service": "CampusX Core API"
    }


# Modular endpoint routers mounted under /api/v1
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(students.router, prefix="/students", tags=["Students"])
api_router.include_router(faculty.router, prefix="/faculty", tags=["Faculty"])
api_router.include_router(academics.router, prefix="/academics", tags=["Academics"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["Attendance"])
api_router.include_router(performance.router, prefix="/performance", tags=["Performance"])
api_router.include_router(predictions.router, prefix="/predictions", tags=["ML Predictions"])
api_router.include_router(notices.router, prefix="/notices", tags=["Notices"])
api_router.include_router(events.router, prefix="/events", tags=["Events"])
api_router.include_router(certificates.router, prefix="/certificates", tags=["Certificates"])
api_router.include_router(placements.router, prefix="/placements", tags=["Placements"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Assistants"])
api_router.include_router(rag.router, prefix="/rag", tags=["Campus Knowledge RAG"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Campus Analytics"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit Logs"])

# College ERP Expansion Endpoints
api_router.include_router(fees.router, prefix="/fees", tags=["Fees Management"])
api_router.include_router(examinations.router, prefix="/examinations", tags=["Examinations"])
api_router.include_router(assignments.router, prefix="/assignments", tags=["Assignments"])
api_router.include_router(learning.router, prefix="/learning", tags=["Learning Material"])
api_router.include_router(learning.router, prefix="/learning-material", tags=["Learning Material"])
api_router.include_router(timetable.router, prefix="/timetable", tags=["Class Timetable"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["ERP Dashboard"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(applications.router, prefix="/applications", tags=["Student Applications"])
api_router.include_router(activities.router, prefix="/activities", tags=["Extracurricular & Grades"])

