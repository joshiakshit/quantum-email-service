from __future__ import annotations
import imaplib
from typing import Iterator

from crypto.envelope import open_envelope
from crypto.email_helpers import extract_metadata, mime_to_envelope

from .config import IMAPConfig
from .errors import ReceiveError, EnvelopeError

def _connect(config: IMAPConfig) -> imaplib.IMAP4:
    try:
        if config.use_ssl:
            conn = imaplib.IMAP4_SSL(config.host, config.port)
        else:
            conn = imaplib.IMAP4(config.host, config.port)
        if config.username and config.password:
            conn.login(config.username, config.password)
        return conn
    except (imaplib.IMAP4.error, OSError, TimeoutError) as exc:
        raise ReceiveError(f"IMAP connection/login failed: {exc}") from exc


def fetch_raw_messages(
    config: IMAPConfig,
    folder: str = "INBOX",
    limit: int | None = 10,
    search_criteria: str = "ALL",
) -> Iterator[str]:
    """
    Connects, selects `folder`, and yields raw RFC822 message text for up
    to `limit` messages matching `search_criteria` (default: all messages).
    Set limit=None to fetch every matching message.
    """
    conn = _connect(config)
    try:
        status, _ = conn.select(folder)
        if status != "OK":
            raise ReceiveError(f"Could not select IMAP folder '{folder}'")

        status, data = conn.search(None, search_criteria)
        if status != "OK":
            raise ReceiveError("IMAP search failed")

        message_ids = data[0].split()
        if limit is not None:
            message_ids = message_ids[-limit:]

        for msg_id in message_ids:
            status, msg_data = conn.fetch(msg_id, "(RFC822)")
            if status != "OK" or not msg_data or msg_data[0] is None:
                continue
            raw_bytes = msg_data[0][1]
            yield raw_bytes.decode("utf-8", errors="replace")
    except imaplib.IMAP4.error as exc:
        raise ReceiveError(f"IMAP fetch failed: {exc}") from exc
    finally:
        try:
            conn.close()
        except Exception:
            pass
        try:
            conn.logout()
        except Exception:
            pass


def decrypt_raw_message(raw_email: str, recipient_kem_secret_key: bytes) -> dict:
    """
    Takes one raw RFC822 message string and returns:
        {
            "metadata": {...from extract_metadata...},
            "plaintext": bytes,
        }

    Raises:
        ReceiveError: if the message isn't a valid QMail MIME message
            (no envelope part, malformed multipart, etc.)
        EnvelopeError: if open_envelope() fails (bad version, signature
            verification failure, decryption/tag failure).
    """
    metadata = extract_metadata(raw_email)

    try:
        envelope_json = mime_to_envelope(raw_email)
    except ValueError as exc:
        raise ReceiveError(f"Not a valid QMail message: {exc}") from exc

    try:
        plaintext = open_envelope(envelope_json, recipient_kem_secret_key)
    except (ValueError, TypeError) as exc:
        raise EnvelopeError(f"Failed to open envelope: {exc}") from exc

    return {"metadata": metadata, "plaintext": plaintext}


def fetch_and_decrypt(
    config: IMAPConfig,
    recipient_kem_secret_key: bytes,
    folder: str = "INBOX",
    limit: int | None = 10,
    search_criteria: str = "ALL",
    skip_non_qmail: bool = True,
) -> list[dict]:
    """
    Full receive flow: IMAP fetch -> for each message, decrypt if it's a
    QMail message. Non-QMail messages are skipped by default
    (skip_non_qmail=True) rather than raising, since a real inbox may
    contain unrelated mail.
    """
    results = []
    for raw_email in fetch_raw_messages(config, folder, limit, search_criteria):
        try:
            results.append(decrypt_raw_message(raw_email, recipient_kem_secret_key))
        except ReceiveError:
            if skip_non_qmail:
                continue
            raise
    return results