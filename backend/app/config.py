from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/society_maintenance"

    # JWT
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # Resend
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "noreply@example.com"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Overdue default (overridden by DB settings row)
    OVERDUE_DAYS: int = 3

    # App
    APP_NAME: str = "Society Maintenance Tracker"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def cloudinary_configured(self) -> bool:
        return bool(self.CLOUDINARY_CLOUD_NAME and self.CLOUDINARY_API_KEY and self.CLOUDINARY_API_SECRET)

    @property
    def resend_configured(self) -> bool:
        return bool(self.RESEND_API_KEY)

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
