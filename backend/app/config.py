from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    database_url: str = "sqlite:///./leadflow.db"
    cors_origins: str = "http://localhost:3000"
    local_demo_mode: bool = False
    supabase_url: str = ""

    @model_validator(mode="after")
    def protect_production(self):
        if self.app_env not in {"development", "production", "test"}:
            raise ValueError("APP_ENV must be development, production, or test")
        if self.app_env == "production":
            if self.local_demo_mode:
                raise ValueError("LOCAL_DEMO_MODE must be false in production")
            if not self.supabase_url.startswith("https://"):
                raise ValueError("Production requires an HTTPS SUPABASE_URL")
            if not self.database_url.startswith(("postgresql", "postgres://")):
                raise ValueError("Production requires PostgreSQL")
        return self

    @property
    def origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.cors_origins.split(",") if origin]

    @property
    def sqlalchemy_url(self) -> str:
        # Some hosts return postgres:// URLs; explicitly choose the installed psycopg driver.
        for prefix in ("postgres://", "postgresql://"):
            if self.database_url.startswith(prefix):
                return self.database_url.replace(prefix, "postgresql+psycopg://", 1)
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
