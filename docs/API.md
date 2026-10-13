# CampusX REST API Specification (v1)

## 1. Base URL
All API requests must target the versioned prefix:
```text
/api/v1
```

## 2. Global Status & Health Endpoints
- `GET /`: Platform metadata, status, and active phase.
- `GET /health`: Operational health check.
- `GET /api/v1/health`: API version 1 health check.

## 3. Planned Endpoint Modules (Phase 2+)

| Module | Prefix | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `/auth` | Public, All | Login, Token Refresh, Password Reset |
| **Users** | `/users` | `SUPER_ADMIN`, `ADMIN` | User CRUD, role updates, deactivation |
| **Students** | `/students` | `STUDENT` (own), `FACULTY`, `ADMIN` | Profile management, enrolled courses |
| **Faculty** | `/faculty` | `FACULTY`, `ADMIN`, `MANAGEMENT` | Faculty directory, course assignments |
| **Academics** | `/academics` | All (Role-scoped) | Courses, subjects, syllabus |
| **Attendance**| `/attendance` | `STUDENT` (own), `FACULTY`, `ADMIN` | Logs, thresholds, percentage analytics |
| **Performance**| `/performance`| `STUDENT` (own), `FACULTY`, `ADMIN` | Assessment marks, CGPA trends |
| **Predictions**| `/predictions`| `STUDENT` (own), `FACULTY`, `ADMIN` | ML risk classification, contributing factors |
| **Notices** | `/notices` | All | Bulletins, institutional circulars |
| **Events** | `/events` | All | Campus events, registrations |
| **Certificates**| `/certificates`| `STUDENT` (request), `ADMIN` (issue) | PDF generation, QR verification |
| **Placements** | `/placements` | `STUDENT`, `PLACEMENT_OFFICER` | Drives, applications, funnel statistics |
| **AI** | `/ai` | All (Context-restricted) | Student advisor, Faculty class summarizer |
| **RAG** | `/rag` | All | Campus policy question answering |
| **Analytics** | `/analytics` | `ADMIN`, `MANAGEMENT` | Institution-wide KPIs, department reports |
| **Notifications**| `/notifications`| All (User-specific) | Read/unread alerts, threshold warnings |
| **Audit** | `/audit` | `SUPER_ADMIN`, `ADMIN` | System event logs, security tracing |
