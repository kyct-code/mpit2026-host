from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Otmech.AI API"
    APP_ENV: str = "development"

    DATABASE_URL: str = "sqlite:///./app.db"
    SECRET_KEY: str = "change-me-super-secret-key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080

    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]

    GIGACHAT_CREDENTIALS: str | None = None
    GIGACHAT_CLIENT_ID: str | None = None
    GIGACHAT_CLIENT_SECRET: str | None = None
    GIGACHAT_VERIFY_SSL_CERTS: bool = True
    GIGACHAT_CA_BUNDLE_FILE: str | None = None
    GIGACHAT_MODEL: str = "GigaChat"

    DGIS_API_KEY: str | None = None
    DGIS_BASE_URL: str = "https://catalog.api.2gis.com/3.0/items"
    DGIS_TIMEOUT_SECONDS: int = 20

    GOOGLE_CALENDAR_ENABLED: bool = False
    GOOGLE_CALENDAR_ID: str | None = None
    GOOGLE_SERVICE_ACCOUNT_FILE: str | None = None
    GOOGLE_TIMEZONE: str = "Europe/Moscow"

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_TLS: bool = True
    EMAIL_FROM: str | None = None

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, value):
        if not isinstance(value, str):
            return value

        value = value.strip()

        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg://", 1)

        if value.startswith("postgresql://") and "+psycopg" not in value:
            return value.replace("postgresql://", "postgresql+psycopg://", 1)

        return value

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()