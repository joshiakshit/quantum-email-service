import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class StorageSettings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./qmail_gateway.db"
    redis_url: str = "redis://localhost:6379/0"
    session_ttl_seconds: int = 86400

    model_config = SettingsConfigDict(
        env_prefix="QMAIL_",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache
def get_storage_settings() -> StorageSettings:
    return StorageSettings()
