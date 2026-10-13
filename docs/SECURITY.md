# CampusX Security & Access Control Architecture

## 1. Authentication & Token Standards
- **Algorithm**: HMAC-SHA256 (`HS256`) via `python-jose`.
- **Password Storage**: Passwords hashed with `bcrypt` (12 rounds) or Argon2. Plaintext passwords are never stored or logged.
- **Tokens**: Access tokens carry user ID, email, role, and expiration timestamp.
- **Expiration**: Standard 24-hour expiration for sessions with refresh mechanism.

## 2. Insecure Direct Object Reference (IDOR) Protection
All resource queries enforce tenant and owner constraints:
```python
# Anti-IDOR: verify ownership before returning record
if current_user.role == UserRole.STUDENT and student.user_id != current_user.id:
    raise HTTPException(status_code=403, detail="Access denied to student record")
```

## 3. Threat Modeling & Safeguards

| Threat Vector | Mitigation Strategy |
| :--- | :--- |
| **SQL Injection** | Strict SQLAlchemy 2.0 ORM parameterization; no raw dynamic string SQL. |
| **Cross-Site Scripting (XSS)** | React JSX output escaping; server-side sanitization. |
| **Privilege Escalation** | Role enforcement on backend dependencies; frontend role-checks are purely visual. |
| **Prompt Injection** | Strict system instruction isolation; user input treated strictly as inert data parameter. |
| **Credential Leakage** | `.env` untracked in Git; `.env.example` contains only placeholders; redaction filter in logs. |
| **Brute Force Attacks** | Rate limiting applied to `/api/v1/auth/login`. |

## 4. Audit Logging Standard
Sensitive institutional events (logins, role changes, mark adjustments, certificate approvals) are recorded in `audit_logs` capturing timestamp, user ID, client IP, action name, and altered entity metadata.
