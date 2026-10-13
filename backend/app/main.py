"""
CampusX Application Entrypoint.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router

app = FastAPI(
    title=settings.APP_NAME,
    description="CampusX — AI-Powered Smart Campus Management & Student Intelligence Platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root level health checks
@app.get("/", tags=["Root"])
def root_info():
    """Platform root information and status."""
    return {
        "platform": settings.APP_NAME,
        "description": "AI-Powered Smart Campus Management & Student Intelligence Platform",
        "version": "1.0.0",
        "status": "operational",
        "phase": "PHASE 14 - Production-Ready Intelligent Operating System"
    }


@app.get("/health", tags=["Health"])
def root_health_check():
    """Top-level health check endpoint for container orchestrators and load balancers."""
    return {
        "status": "healthy",
        "environment": settings.APP_ENV,
        "debug": settings.DEBUG,
        "deterministic_data_dir": str(settings.UPLOAD_DIR)
    }


# Mount Version 1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)
