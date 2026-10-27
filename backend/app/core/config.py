import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "AICTE Case360+: Intelligent Cross-Bureau Complaint Monitoring & Coordination"
    TAGLINE: str = "One Institution. One Coordinated View. Better Grievance Resolution & Conflict Prevention."
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "aicte_icms_dev_secret_key_change_in_production_min_32_chars_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    DATABASE_URL: str = "sqlite:///./aicte_icms.db"
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 15
    ENABLE_SCHEDULER: bool = True
    DEADLINE_CHECK_INTERVAL_MINUTES: int = 15

    class Config:
        env_file = ".env"
        extra = "allow"

    def validate_production_security(self):
        if self.ENVIRONMENT.lower() == "production":
            dev_defaults = [
                "aicte_icms_dev_secret_key_change_in_production_min_32_chars_2026",
                "secret",
                "changeme",
                "admin",
                "default"
            ]
            if not self.SECRET_KEY or self.SECRET_KEY in dev_defaults or len(self.SECRET_KEY) < 32:
                raise RuntimeError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: "
                    "SECRET_KEY must be set to a cryptographically secure value with at least 32 characters in production."
                )

settings = Settings()
settings.validate_production_security()

