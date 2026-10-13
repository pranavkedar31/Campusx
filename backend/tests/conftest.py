"""
Pytest configuration fixtures for CampusX backend testing.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="session")
def client():
    """
    TestClient fixture for FastAPI endpoints.
    """
    with TestClient(app) as c:
        yield c
