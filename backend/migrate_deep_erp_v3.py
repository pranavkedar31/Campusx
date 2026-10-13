"""
Database migration script for CampusX Deep ERP Completion V3.
Adds missing columns to existing SQLite tables and creates all new tables.
"""

import sys
from pathlib import Path
import sqlite3

BACKEND_DIR = Path(__file__).resolve().parent
DB_PATH = BACKEND_DIR / "data" / "campusx.db"

print(f"Migrating database at: {DB_PATH}")
conn = sqlite3.connect(str(DB_PATH))
cursor = conn.cursor()

def add_column_if_not_exists(table, col_name, col_type, default=None):
    cursor.execute(f"PRAGMA table_info({table})")
    cols = [r[1] for r in cursor.fetchall()]
    if col_name not in cols:
        def_clause = f" DEFAULT {default}" if default is not None else ""
        sql = f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}{def_clause};"
        print(f"Adding column: {table}.{col_name} ({col_type})")
        cursor.execute(sql)

# 1. notices
add_column_if_not_exists("notices", "department_id", "VARCHAR(36)")
add_column_if_not_exists("notices", "course_id", "VARCHAR(36)")
add_column_if_not_exists("notices", "semester_number", "INTEGER")
add_column_if_not_exists("notices", "attachment_path", "VARCHAR(500)")
add_column_if_not_exists("notices", "attachment_name", "VARCHAR(255)")
add_column_if_not_exists("notices", "status", "VARCHAR(50)", "'PUBLISHED'")
add_column_if_not_exists("notices", "views_count", "INTEGER", "0")
add_column_if_not_exists("notices", "updated_at", "DATETIME")

# 2. campus_events
add_column_if_not_exists("campus_events", "start_time", "VARCHAR(20)")
add_column_if_not_exists("campus_events", "end_time", "VARCHAR(20)")
add_column_if_not_exists("campus_events", "registration_deadline", "DATETIME")
add_column_if_not_exists("campus_events", "attachment_url", "VARCHAR(500)")
add_column_if_not_exists("campus_events", "status", "VARCHAR(50)", "'UPCOMING'")
add_column_if_not_exists("campus_events", "organizer", "VARCHAR(255)")

# 3. students
add_column_if_not_exists("students", "prn", "VARCHAR(50)")
add_column_if_not_exists("students", "registration_number", "VARCHAR(50)")
add_column_if_not_exists("students", "date_of_birth", "VARCHAR(50)")
add_column_if_not_exists("students", "gender", "VARCHAR(20)")
add_column_if_not_exists("students", "address", "VARCHAR(500)")
add_column_if_not_exists("students", "parent_name", "VARCHAR(255)")
add_column_if_not_exists("students", "parent_phone", "VARCHAR(50)")

# 4. examinations
add_column_if_not_exists("examinations", "exam_fee", "FLOAT", "1500.0")
add_column_if_not_exists("examinations", "form_opening_date", "DATE")
add_column_if_not_exists("examinations", "form_closing_date", "DATE")
add_column_if_not_exists("examinations", "eligible_courses", "VARCHAR(255)", "'ALL'")
add_column_if_not_exists("examinations", "eligible_semesters", "VARCHAR(255)", "'ALL'")

# 5. exam_forms
add_column_if_not_exists("exam_forms", "semester_number", "INTEGER", "1")
add_column_if_not_exists("exam_forms", "academic_year", "VARCHAR(50)", "'2025-2026'")
add_column_if_not_exists("exam_forms", "payment_status", "VARCHAR(50)", "'PENDING'")
add_column_if_not_exists("exam_forms", "payment_reference", "VARCHAR(100)")
add_column_if_not_exists("exam_forms", "transaction_id", "VARCHAR(100)")
add_column_if_not_exists("exam_forms", "amount_paid", "FLOAT", "0.0")
add_column_if_not_exists("exam_forms", "paid_at", "DATETIME")

# 6. companies
add_column_if_not_exists("companies", "location", "VARCHAR(255)")
add_column_if_not_exists("companies", "headquarters", "VARCHAR(255)")
add_column_if_not_exists("companies", "contact_person", "VARCHAR(255)")
add_column_if_not_exists("companies", "phone", "VARCHAR(50)")
add_column_if_not_exists("companies", "description", "TEXT")

# 7. subjects
add_column_if_not_exists("subjects", "short_name", "VARCHAR(50)")
add_column_if_not_exists("subjects", "subject_type", "VARCHAR(50)", "'THEORY'")
add_column_if_not_exists("subjects", "lecture_hours", "INTEGER", "3")
add_column_if_not_exists("subjects", "practical_hours", "INTEGER", "0")
add_column_if_not_exists("subjects", "tutorial_hours", "INTEGER", "0")

conn.commit()
conn.close()

# Now create any new tables via SQLAlchemy Base.metadata.create_all
sys.path.insert(0, str(BACKEND_DIR))
from app.db.base import Base
from app.db.session import engine
import app.models

Base.metadata.create_all(bind=engine)
print("All tables and columns migrated successfully!")
