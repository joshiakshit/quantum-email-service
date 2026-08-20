from __future__ import annotations
import os
from dataclasses import dataclass


def _get_bool(name: str, default: bool) -> bool:
    val = os.environ.get(name)
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes", "on")


def _get_int(name: str, default: int) -> int:
    val = os.environ.get(name)
    if val is None:
        return default
    return int(val)


@dataclass(frozen=True)
class SMTPConfig:
    host: str
    port: int
    username: str | None
    password: str | None
    use_tls: bool
    timeout: int

    @classmethod
    def from_env(cls) -> "SMTPConfig":
        return cls(
            host=os.environ.get("QMAIL_SMTP_HOST", "localhost"),
            port=_get_int("QMAIL_SMTP_PORT", 587),
            username=os.environ.get("QMAIL_SMTP_USERNAME"),
            password=os.environ.get("QMAIL_SMTP_PASSWORD"),
            use_tls=_get_bool("QMAIL_SMTP_USE_TLS", True),
            timeout=_get_int("QMAIL_SMTP_TIMEOUT", 30),
        )


@dataclass(frozen=True)
class IMAPConfig:
    host: str
    port: int
    username: str | None
    password: str | None
    use_ssl: bool
    timeout: int

    @classmethod
    def from_env(cls) -> "IMAPConfig":
        return cls(
            host=os.environ.get("QMAIL_IMAP_HOST", "localhost"),
            port=_get_int("QMAIL_IMAP_PORT", 993),
            username=os.environ.get("QMAIL_IMAP_USERNAME"),
            password=os.environ.get("QMAIL_IMAP_PASSWORD"),
            use_ssl=_get_bool("QMAIL_IMAP_USE_SSL", True),
            timeout=_get_int("QMAIL_IMAP_TIMEOUT", 30),
        )


@dataclass(frozen=True)
class POP3Config:
    host: str
    port: int
    username: str | None
    password: str | None
    use_ssl: bool
    timeout: int

    @classmethod
    def from_env(cls) -> "POP3Config":
        return cls(
            host=os.environ.get("QMAIL_POP3_HOST", "localhost"),
            port=_get_int("QMAIL_POP3_PORT", 995),
            username=os.environ.get("QMAIL_POP3_USERNAME"),
            password=os.environ.get("QMAIL_POP3_PASSWORD"),
            use_ssl=_get_bool("QMAIL_POP3_USE_SSL", True),
            timeout=_get_int("QMAIL_POP3_TIMEOUT", 30),
        )


@dataclass(frozen=True)
class KMConfig:
    base_url: str
    verify_ssl: bool

    @classmethod
    def from_env(cls) -> "KMConfig":
        return cls(
            base_url=os.environ.get("QMAIL_KM_URL", "http://localhost:8000"),
            verify_ssl=_get_bool("QMAIL_KM_VERIFY_SSL", True),
        )