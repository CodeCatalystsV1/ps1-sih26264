import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.core.config import settings
from backend.app.core.database import engine, Base
import backend.app.models # Discover all models
from backend.app.workers.scheduler import start_scheduler, stop_scheduler

from backend.app.api.auth import router as auth_router
from backend.app.api.institutions import router as institutions_router
from backend.app.api.complaints import router as complaints_router
from backend.app.api.cases import router as cases_router
from backend.app.api.transfers import router as transfers_router
from backend.app.api.overlaps import router as overlaps_router
from backend.app.api.notifications import router as notifications_router
from backend.app.api.reports import router as reports_router
from backend.app.api.audit import router as audit_router
from backend.app.api.admin import router as admin_router
from backend.app.api.regulatory_actions import router as actions_router
from backend.app.api.ai_relationships import router as ai_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database schema is created
    Base.metadata.create_all(bind=engine)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # Start scheduler
    start_scheduler()
    yield
    # Stop scheduler
    stop_scheduler()

app = FastAPI(
    title="AICTE Case360+: Intelligent Cross-Bureau Complaint Monitoring and Regulatory Action Coordination Platform",
    description="Intelligent Cross-Bureau Complaint Monitoring and Regulatory Action Coordination Platform (AICTE Case360+)",
    version="2.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers under API prefix
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(institutions_router, prefix=settings.API_V1_STR)
app.include_router(complaints_router, prefix=settings.API_V1_STR)
app.include_router(cases_router, prefix=settings.API_V1_STR)
app.include_router(transfers_router, prefix=settings.API_V1_STR)
app.include_router(overlaps_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(actions_router, prefix=settings.API_V1_STR)
app.include_router(ai_router, prefix=settings.API_V1_STR)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AICTE Case360+ Backend API",
        "version": "2.0.0",
        "tagline": settings.TAGLINE
    }
