"""
Declarative base foundation for SQLAlchemy 2.0 models.
Entities will be defined in Phase 2.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy 2.0 ORM models in CampusX."""
    pass
