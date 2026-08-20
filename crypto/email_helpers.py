import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders, message_from_string

ENVELOPE_CONTENT_TYPE = "application/x-qmail-envelope"
QMAIL_HEADER_VERSION = "QMail-Version"
QMAIL_HEADER_SENDER_ID = "QMail-Sender-ID"


def envelope_to_mime(
    envelope_json: str,
    sender_email: str,
    recipient_email: str,
    subject: str = "Quantum Secured Message",
) -> MIMEMultipart:
    msg = MIMEMultipart()
    msg["From"] = sender_email
    msg["To"] = recipient_email
    msg["Subject"] = subject
    msg[QMAIL_HEADER_VERSION] = "1"
    msg[QMAIL_HEADER_SENDER_ID] = sender_email

    readable_part = MIMEText(
        "This message is encrypted with QMail (ML-KEM-768 + ML-DSA-65). "
        "Use a QMail-compatible client to read it.",
        "plain",
    )
    msg.attach(readable_part)

    encrypted_part = MIMEBase("application", "x-qmail-envelope")
    encrypted_part.set_payload(envelope_json)
    encrypted_part.add_header("Content-Disposition", "attachment", filename="envelope.json")
    encoders.encode_base64(encrypted_part)
    msg.attach(encrypted_part)

    return msg


def mime_to_envelope(raw_email: str) -> str:
    msg = message_from_string(raw_email)

    if not msg.is_multipart():
        raise ValueError("Not a QMail message — expected multipart MIME")

    for part in msg.walk():
        content_type = part.get_content_type()
        if content_type == ENVELOPE_CONTENT_TYPE:
            payload = part.get_payload(decode=True)
            return payload.decode("utf-8")

    raise ValueError("No QMail envelope found in this message")


def extract_metadata(raw_email: str) -> dict:
    msg = message_from_string(raw_email)
    return {
        "from": msg.get("From", ""),
        "to": msg.get("To", ""),
        "subject": msg.get("Subject", ""),
        "qmail_version": msg.get(QMAIL_HEADER_VERSION),
        "qmail_sender_id": msg.get(QMAIL_HEADER_SENDER_ID),
        "is_qmail": msg.get(QMAIL_HEADER_VERSION) is not None,
    }
