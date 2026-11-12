from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="SCHOOL_", extra="ignore")

    environment: Literal["development", "test", "production"] = "development"
    database_url: SecretStr | None = None
    auth_issuer: str | None = None
    auth_jwks_url: str | None = None
    auth_audience: str = "authenticated"
    local_auth_enabled: bool = True
    upload_directory: Path = Path(__file__).resolve().parents[3] / ".local" / "uploads"
    max_upload_bytes: int = 256 * 1024 * 1024
    upload_quota_bytes: int = 5 * 1024 * 1024 * 1024
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    @model_validator(mode="after")
    def validate_configuration(self) -> Settings:
        if bool(self.auth_issuer) != bool(self.auth_jwks_url):
            raise ValueError("Configure AUTH_ISSUER e AUTH_JWKS_URL em conjunto.")
        for url in (self.auth_issuer, self.auth_jwks_url):
            if url and not url.startswith("https://"):
                raise ValueError("O provedor de autenticação deve usar HTTPS.")
        if self.database_url and not self.database_url.get_secret_value().startswith(
            "postgresql+psycopg://"
        ):
            raise ValueError("Use uma conexão PostgreSQL com o driver psycopg.")
        if self.environment == "production":
            if not self.database_url or not (self.auth_issuer or self.local_auth_enabled):
                raise ValueError("Produção requer banco e autenticação configurados.")
            if not self.cors_origins or any(
                not origin.startswith("https://") for origin in self.cors_origins
            ):
                raise ValueError("Produção requer origens HTTPS explícitas.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
