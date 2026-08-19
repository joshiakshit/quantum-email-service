"""
QuMail Key Manager — Application Configuration
All secrets are loaded from environment variables. Never hard-code secrets.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # ── Application ──────────────────────────────────────────────────────────
    app_name: str = "QuMail Key Manager"
    app_version: str = "1.0.0"
    debug: bool = False

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str = "sqlite+aiosqlite:///./qumail_keys.db"

    # ── JWT ───────────────────────────────────────────────────────────────────
    # REQUIRED: Set a strong random value in production.
    # Generate one with: python -c "import secrets; print(secrets.token_hex(32))"
    jwt_secret_key: str = "CHANGE_ME_IN_PRODUCTION"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    # ── Session Keys (Simulated QKD) ──────────────────────────────────────────
    session_key_expiry_hours: int = 24
    # Key material length in bytes (256-bit key)
    session_key_length_bytes: int = 32

    # ── Client ID prefix ──────────────────────────────────────────────────────
    client_id_prefix: str = "QM"
    client_id_length: int = 8  # hex characters after prefix

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings (singleton)."""
    return Settings()
