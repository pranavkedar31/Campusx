"""
CampusX Database Models Registry.
"""

from app.models.user import User
from app.models.academic import (
    Department,
    Course,
    AcademicYear,
    Semester,
    Subject,
    SubjectType,
    CalendarEventType,
    Syllabus,
    AcademicCalendarEvent,
    Enrollment,
    FacultySubjectAssignment,
)
from app.models.student import Student
from app.models.faculty import Faculty
from app.models.performance import (
    AttendanceRecord,
    AttendanceStatus,
    Assessment,
    AssessmentType,
    Mark,
)
from app.models.communication import (
    Notice,
    NoticeCategory,
    NoticePriority,
    NoticeRead,
    CampusEvent,
    EventCategory,
    EventRegistration,
    Notification,
    NotificationType,
)
from app.models.certificate import (
    Certificate,
    CertificateType,
    CertificateStatus,
)
from app.models.placement import (
    Company,
    JobRole,
    JobStatus,
    PlacementApplication,
    ApplicationStatus,
    PlacementOffer,
    OfferStatus,
)
from app.models.audit import AuditLog
from app.models.fee import (
    FeeHead,
    FeeStructure,
    FeeStructureComponent,
    StudentFee,
    FeeTransaction,
    FeeReceipt,
    FeeStatus,
    PaymentMode,
    TransactionStatus,
)
from app.models.examination import (
    Examination,
    ExamSchedule,
    ExamForm,
    ExamFormSubject,
    ExamResult,
    ExamResultSubject,
    ExamType,
    ExamStatus,
    ExamFormStatus,
    ResultStatus,
    HallTicket,
)
from app.models.assignment import (
    Assignment,
    AssignmentSubmission,
    AssignmentStatus,
    SubmissionStatus,
)
from app.models.learning import (
    StudyMaterial,
    MaterialType,
)
from app.models.timetable import (
    Room,
    ClassSection,
    Timetable,
    TimetableSlot,
    DayOfWeek,
    RoomType,
)
from app.models.application import (
    ApplicationType,
    ApplicationStatus as StudentAppStatus,
    StudentApplication,
    ApplicationHistory,
)
from app.models.grade import (
    GradeRule,
    ExtracurricularActivity,
    InstitutionAcademicConfig,
)

__all__ = [
    "User",
    "Department",
    "Course",
    "AcademicYear",
    "Semester",
    "Subject",
    "SubjectType",
    "CalendarEventType",
    "Syllabus",
    "AcademicCalendarEvent",
    "Enrollment",
    "FacultySubjectAssignment",
    "Student",
    "Faculty",
    "AttendanceRecord",
    "AttendanceStatus",
    "Assessment",
    "AssessmentType",
    "Mark",
    "Notice",
    "NoticeCategory",
    "NoticePriority",
    "NoticeRead",
    "CampusEvent",
    "EventCategory",
    "EventRegistration",
    "Notification",
    "NotificationType",
    "Certificate",
    "CertificateType",
    "CertificateStatus",
    "Company",
    "JobRole",
    "JobStatus",
    "PlacementApplication",
    "ApplicationStatus",
    "PlacementOffer",
    "OfferStatus",
    "AuditLog",
    # ERP Models
    "FeeHead",
    "FeeStructure",
    "FeeStructureComponent",
    "StudentFee",
    "FeeTransaction",
    "FeeReceipt",
    "FeeStatus",
    "PaymentMode",
    "TransactionStatus",
    "Examination",
    "ExamSchedule",
    "ExamForm",
    "ExamFormSubject",
    "ExamResult",
    "ExamResultSubject",
    "ExamType",
    "ExamStatus",
    "ExamFormStatus",
    "ResultStatus",
    "HallTicket",
    "Assignment",
    "AssignmentSubmission",
    "AssignmentStatus",
    "SubmissionStatus",
    "StudyMaterial",
    "MaterialType",
    "Room",
    "ClassSection",
    "Timetable",
    "TimetableSlot",
    "DayOfWeek",
    "RoomType",
    # Deep ERP V3 Models
    "ApplicationType",
    "StudentAppStatus",
    "StudentApplication",
    "ApplicationHistory",
    "GradeRule",
    "ExtracurricularActivity",
    "InstitutionAcademicConfig",
]
