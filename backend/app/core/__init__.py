"""
Core package exports.
"""

from app.core.config import settings
from app.core.rbac import UserRole, is_authorized

__all__ = ["settings", "UserRole", "is_authorized"]
