import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "Sistema Web de Monitoreo de Condición de Bombas"
    DEBUG: bool = True
    
    # Database
    USE_SQLITE_ENV: str = os.getenv("USE_SQLITE", "False")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "pump_user")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "pump_secure_password_2026")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "pump_monitoring_db")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    
    @property
    def USE_SQLITE(self) -> bool:
        env_val = str(os.getenv("USE_SQLITE", "false")).strip().lower()
        return env_val in ("true", "1", "yes")


    @property
    def DATABASE_URL(self) -> str:
        if self.USE_SQLITE:
            return "sqlite:///./pump_monitoring.db"
        env_url = os.getenv("DATABASE_URL")
        if env_url:
            return env_url
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"



    # JWT Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super_secret_jwt_key_pump_monitoring_2026_enterprise_system")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "*"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
