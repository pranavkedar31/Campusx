"""
CampusX Role-Based Access Control (RBAC) Definitions.

Defines platform roles, permission hierarchies, and authorization scopes.
"""

from enum import Enum
from typing import Set


class UserRole(str, Enum):
    """
    Standard platform roles for CampusX.
    """
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    FACULTY = "FACULTY"
    STUDENT = "STUDENT"
    PLACEMENT_OFFICER = "PLACEMENT_OFFICER"
    MANAGEMENT = "MANAGEMENT"


# Role hierarchy and permissions mapping
ROLE_HIERARCHY = {
    UserRole.SUPER_ADMIN: {
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.FACULTY,
        UserRole.STUDENT,
        UserRole.PLACEMENT_OFFICER,
        UserRole.MANAGEMENT,
    },
    UserRole.ADMIN: {
        UserRole.ADMIN,
        UserRole.FACULTY,
        UserRole.STUDENT,
        UserRole.PLACEMENT_OFFICER,
    },
    UserRole.MANAGEMENT: {
        UserRole.MANAGEMENT,
    },
    UserRole.FACULTY: {
        UserRole.FACULTY,
    },
    UserRole.PLACEMENT_OFFICER: {
        UserRole.PLACEMENT_OFFICER,
    },
    UserRole.STUDENT: {
        UserRole.STUDENT,
    },
}


def is_authorized(user_role: UserRole, allowed_roles: Set[UserRole]) -> bool:
    """
    Verify if a user's role meets the required role set.
    """
    if user_role == UserRole.SUPER_ADMIN:
        return True
    return user_role in allowed_roles
