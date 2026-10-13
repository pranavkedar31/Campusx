"""
CampusX Core Configuration Module.

Resolves application settings, database URLs, AI provider configs,
and ensures deterministic file and SQLite paths across all environments.
"""

from pathlib import Path
from typing import List, Union
import os
from pydantic import Field, field_validator

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:
    # Graceful fallback if pydantic-settings is not installed in current environment
    from pydantic import BaseModel
    class BaseSettings(BaseModel):
        def __init__(self, **values):
            super().__init__(**values)
    SettingsConfigDict = dict

# Base directory for backend (backend/)
BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
DATA_DIR: Path = BASE_DIR / "data"
UPLOAD_DIR_PATH: Path = BASE_DIR / "uploads"

# Ensure deterministic directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR_PATH.mkdir(parents=True, exist_ok=True)

# Deterministic default SQLite database path (used as fallback when PostgreSQL is not configured)
DEFAULT_SQLITE_URL = f"sqlite:///{DATA_DIR.as_posix()}/campusx.db"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR.parent / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    # Application Information
    APP_NAME: str = "CampusX"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "campusx-dev-secret-key-32-chars-long-min"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Server Binding
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    FRONTEND_PORT: int = 5173

    # Database Configuration (PostgreSQL primary, SQLite fallback with deterministic path)
    DATABASE_URL: str = Field(
        default="postgresql+psycopg2://postgres:postgres@localhost:5432/campusx_db",
        description="Primary database connection string. Set to SQLite fallback if PostgreSQL is unavailable."
    )

    # Vector Storage / RAG
    VECTOR_DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/campusx_db"
    VECTOR_COLLECTION_NAME: str = "campusx_rag_docs"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # AI Provider Selection: 'mock' | 'gemini' | 'openai'
    AI_PROVIDER: str = "mock"
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # CORS Allowed Origins
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Academic & Early Warning Thresholds
    ATTENDANCE_WARNING_THRESHOLD: float = 75.0
    ATTENDANCE_CRITICAL_THRESHOLD: float = 65.0

    # Uploads & Storage
    MAX_UPLOAD_SIZE_MB: int = 10
    UPLOAD_DIR: str = str(UPLOAD_DIR_PATH)

    # Security & Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 100


settings = Settings()
