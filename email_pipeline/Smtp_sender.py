from __future__ import annotations
import smtplib
from email.mime.multipart import MIMEMultipart

from crypto.envelope import seal_envelope
from crypto.email_helpers import envelope_to_mime

from .config import SMTPConfig
from .errors import SendError, EnvelopeError
from . import key_provider


def compose_and_seal(
    plaintext: bytes,
    recipient_kem_public_key: bytes,
    sender_signing_secret_key: bytes,
    sender_signing_public_key: bytes,
    sender_email: str,
    recipient_email: str,
    subject: str = "Quantum Secured Message",
) -> MIMEMultipart:
    """
    Seals plaintext via M1's seal_envelope() and packages it via the
    existing envelope_to_mime() helper. Returns a ready-to-send MIME
    message.

    Raises:
        EnvelopeError: if seal_envelope() fails (bad key sizes, non-bytes
            plaintext, etc. — see M1's crypto.pqc / crypto.symmetric).
    """
    try:
        envelope_json = seal_envelope(
            plaintext,
            recipient_kem_public_key,
            sender_signing_secret_key,
            sender_signing_public_key,
        )
    except (ValueError, TypeError) as exc:
        raise EnvelopeError("Failed to seal envelope for outgoing message") from exc

    return envelope_to_mime(
        envelope_json,
        sender_email=sender_email,
        recipient_email=recipient_email,
        subject=subject,
    )


def send_mime_message(mime_msg: MIMEMultipart, config: SMTPConfig) -> None:
    """
    Delivers an already-built MIME message over SMTP using the given
    config. Handles both STARTTLS (typical for port 587) and plain
    connections; does not assume implicit TLS (port 465) since M2/M1 have
    not specified a mail server — adjust use_tls/port via env vars if the
    target mailbox needs SMTPS instead.

    Raises:
        SendError: on any connection, authentication, or SMTP protocol
            failure.
    """
    try:
        with smtplib.SMTP(config.host, config.port, timeout=config.timeout) as server:
            server.ehlo()
            if config.use_tls:
                server.starttls()
                server.ehlo()
            if config.username and config.password:
                server.login(config.username, config.password)
            server.send_message(mime_msg)
    except smtplib.SMTPException as exc:
        raise SendError(f"SMTP send failed: {exc}") from exc
    except (OSError, TimeoutError) as exc:
        raise SendError(f"SMTP connection failed: {exc}") from exc


def send_secure_email(
    plaintext: bytes,
    recipient_id: str,
    recipient_email: str,
    sender_email: str,
    sender_signing_secret_key: bytes,
    sender_signing_public_key: bytes,
    km_client,
    smtp_config: SMTPConfig,
    subject: str = "Quantum Secured Message",
    recipient_kem_public_key: bytes | None = None,
) -> None:
    """
    Full send flow: resolve recipient KEM public key (via M2, unless
    caller already supplied one) -> seal -> MIME -> SMTP send.

    If `recipient_kem_public_key` is provided directly, the KM lookup is
    skipped — useful for testing or when M2's server isn't reachable yet.
    """
    if recipient_kem_public_key is None:
        recipient_kem_public_key = key_provider.get_recipient_kem_public_key(
            km_client, recipient_id
        )

    mime_msg = compose_and_seal(
        plaintext=plaintext,
        recipient_kem_public_key=recipient_kem_public_key,
        sender_signing_secret_key=sender_signing_secret_key,
        sender_signing_public_key=sender_signing_public_key,
        sender_email=sender_email,
        recipient_email=recipient_email,
        subject=subject,
    )

    send_mime_message(mime_msg, smtp_config)