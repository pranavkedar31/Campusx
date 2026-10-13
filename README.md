# CampusX — AI-Powered Smart Campus Management & Student Intelligence Platform

![CampusX Platform Architecture](https://img.shields.io/badge/Architecture-Modular%20FastAPI%20%2B%20React-blue)
![Python Version](https://img.shields.io/badge/Python-3.12%2B-green)
![React Version](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20Tailwind-cyan)
![Database](https://img.shields.io/badge/Database-PostgreSQL%20%2F%20Deterministic%20SQLite-darkblue)
![ML Model](https://img.shields.io/badge/ML%20Accuracy-89.3%25%20Random%20Forest-emerald)
![Test Suite](https://img.shields.io/badge/Tests-34%2F34%20Passing-brightgreen)
![Status](https://img.shields.io/badge/Status-All%2014%20Phases%20Completed-success)

> **"Transforming distributed campus data into intelligent academic, operational, and career insights."**

CampusX is an enterprise-grade academic operating system and predictive student intelligence platform. It bridges administrative campus operations, faculty management, placement intelligence, and student analytics using explainable Machine Learning and Role-Based Retrieval-Augmented Generation (RAG).

---

## 🏛️ System Overview

The core philosophy of CampusX is:
$$\text{Campus Data} \longrightarrow \text{Analytics} \longrightarrow \text{ML Predictions} \longrightarrow \text{AI Insights} \longrightarrow \text{Action}$$

### Role-Tailored Capabilities
- **Students**: Real-time academic tracking, subject-level attendance monitoring with 75% warnings, marks progression, explainable academic risk predictions, AI Academic Companion, digital QR certificates, and campus placement application board.
- **Faculty**: Department class analytics, attendance logging, continuous assessment marks entry, class at-risk rosters with early intervention recommendations, and AI Teaching & Cohort Advisor.
- **Placement Officers**: Corporate recruiter registry, drive publishing with CGPA/department eligibility filters, student application review funnel (`Applied` $\rightarrow$ `Shortlisted` $\rightarrow$ `Interview` $\rightarrow$ `Offered`), and career placement analytics.
- **Administrators**: Complete user directory, department and course lifecycle management, certificate request review & digital signing, campus notices and event registrations, and immutable security audit logs.
- **Institutional Management**: High-level cross-department KPIs, attendance compliance matrices, faculty-to-student ratios, placement packages (Highest & Average CTC), and retention indices.

---

## 🔑 Default Seed Credentials

CampusX includes a comprehensive production-grade institutional seed dataset. You can log into any of the following pre-provisioned persona accounts:

| Role | Email Address | Password | Profile Details |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@campusx.edu` | `SuperAdmin@123` | Dr. Sarah Jenkins (Institutional Head) |
| **Administrator** | `admin@campusx.edu` | `Admin@123` | Campus Operations Registrar |
| **Faculty** | `faculty@campusx.edu` | `Faculty@123` | Prof. Alan Turing (CSE Department Head) |
| **Student** | `student@campusx.edu` | `Student@123` | Alex Rivera (B.Tech CSE, 8.85 CGPA, 91.5% Att) |
| **Placement Officer** | `placement@campusx.edu` | `Placement@123` | Elena Rostova (Head of Corporate Relations) |
| **Management** | `management@campusx.edu` | `Management@123` | Chancellor V. Raman (Executive Board) |

---

## 🛠️ Technology Stack

| Layer | Technologies | Description |
| :--- | :--- | :--- |
| **Frontend** | React 18/19, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts | Premium Dark SaaS UI with interactive dashboards |
| **Backend** | Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2.x, Alembic, Uvicorn | High-performance async REST API with strict Anti-IDOR |
| **Database** | PostgreSQL 16 (Primary) / Deterministic SQLite fallback | Reliable auto-connecting database layer |
| **Machine Learning** | Scikit-learn (RandomForestClassifier), Joblib, NumPy, Pandas | 89.3% accuracy early warning student risk model |
| **AI / RAG** | BaseAIProvider (Gemini, OpenAI, Deterministic Mock), TF-IDF Vector Cosine Similarity | Evidence-grounded student & faculty reasoning with official policy citations |
| **Document Engine**| ReportLab + QRCode | Dynamic PDF certificates with public verification QR |
| **DevOps** | Docker, Docker Compose, Multi-stage builds | Production containerized deployment |

---

## 🚦 Phased Development Milestones (All Completed)

- [x] **PHASE 1**: Architecture & Clean Modular Foundation
- [x] **PHASE 2**: Database Schema, JWT Authentication & 6-Tier RBAC
- [x] **PHASE 3**: Student, Faculty & Academic Department Management
- [x] **PHASE 4**: Attendance, Assessment Marks & Performance Analytics
- [x] **PHASE 5**: Campus Notices, Events & Notification Popovers
- [x] **PHASE 6**: Tamper-Evident Digital Certificates & Public QR Verification
- [x] **PHASE 7**: Placement Management, Recruitment Funnels & CTC Analytics
- [x] **PHASE 8**: ML Student Risk Prediction & Early Warning System
- [x] **PHASE 9**: AI Student Academic Companion & Faculty Teaching Assistant
- [x] **PHASE 10**: RAG Campus Knowledge Assistant with Regulatory Handbooks
- [x] **PHASE 11**: Management & Institutional Executive Dashboards
- [x] **PHASE 12**: Security Hardening, Audit Trail & Threat Monitoring
- [x] **PHASE 13**: Full Institutional Seeder (60+ Students) & 34/34 Test Suite
- [x] **PHASE 14**: Dockerization, Verification & Comprehensive Engineering Specs

---

## ⚡ Quickstart (Running Locally)

### 1. Prerequisites
- Python 3.12+
- Node.js 18+ and npm
- Docker & Docker Compose (Optional)

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations & seed institutional database
python -m app.db.init_db
python ..\scripts\seed_data.py

# Start FastAPI development server
uvicorn app.main:app --reload --port 8000
```
Backend API will be running at `http://localhost:8000`.
Interactive Swagger API documentation: `http://localhost:8000/docs`.

### 3. Frontend Setup
```bash
# Open a new terminal in the frontend directory
cd frontend

# Install Node modules
npm install

# Start Vite development server
npm run dev
```
Frontend Web Application will be running at `http://localhost:5173`.

### 4. Running Automated Tests
```bash
cd backend
.\.venv\Scripts\python -m unittest discover tests
```
Runs the complete 34-test suite covering authentication, RBAC, IDOR protection, academic calculations, certificates, placements, ML predictions, AI assistants, RAG search, analytics, and audit logging.

### 5. Dockerized Deployment
```bash
docker-compose up --build
```
Orchestrates PostgreSQL database, FastAPI backend container on `:8000`, and Nginx frontend container on `:5173`.

---

## 📄 License
This major academic project is released under the **MIT License**.
