import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "AICTE Integrated Institution Complaint Monitoring and Coordination Platform"
    TAGLINE: str = "One Institution. One Coordinated View. Better Grievance Resolution."
    API_V1_STR: str = "/api"
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

settings = Settings()
