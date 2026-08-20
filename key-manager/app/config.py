from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "QMail Key Manager"
    app_version: str = "1.0.0"
    debug: bool = False

    database_url: str = "sqlite+aiosqlite:///./qmail_keys.db"

    jwt_secret_key: str = "CHANGE_ME_IN_PRODUCTION"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    session_key_expiry_hours: int = 24
    session_key_length_bytes: int = 32

    client_id_prefix: str = "QM"
    client_id_length: int = 8

    cors_origins: str = "http://localhost:5173"
    enforce_https: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


_JWT_DEFAULT = "CHANGE_ME_IN_PRODUCTION"


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if not s.debug and s.jwt_secret_key == _JWT_DEFAULT:
        raise RuntimeError(
            "JWT_SECRET_KEY still has the default value. "
            "Set a strong random key via .env or environment variable."
        )
    return s
