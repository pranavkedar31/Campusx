"""
Database engine and session factory configuration for CampusX.
Provides deterministic SQLite fallback when PostgreSQL service is unavailable or inaccessible.
"""

import logging
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings, DEFAULT_SQLITE_URL

logger = logging.getLogger("campusx.db")

active_db_url = settings.DATABASE_URL

# Fallback test: verify if PostgreSQL is actually connectable; if not, use deterministic SQLite
if active_db_url.startswith("postgresql"):
    try:
        test_engine = create_engine(active_db_url, connect_args={"connect_timeout": 2})
        with test_engine.connect() as conn:
            pass
        test_engine.dispose()
    except Exception as e:
        logger.warning(f"PostgreSQL connection test failed: {e}. Falling back to deterministic SQLite at: {DEFAULT_SQLITE_URL}")
        active_db_url = DEFAULT_SQLITE_URL

is_sqlite = active_db_url.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_engine(
    active_db_url,
    echo=False,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency generator for injecting database sessions into API routes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
