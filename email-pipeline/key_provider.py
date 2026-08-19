from __future__ import annotations

from .errors import KeyLookupError

try:
    from crypto.km_client import KMClient
except ImportError:
    KeyManagerClient = None  # type: ignore

def get_recipient_kem_public_key(
    client: "KMClient",
    recipient_id: str,
) -> bytes:
    """
    ACTIVE PATH. Returns the recipient's ML-KEM-768 public key via M2's
    confirmed km_client.get_public_keys(client_id) -> dict interface.

    This return value is passed as-is into
    crypto.envelope.seal_envelope(..., recipient_kem_public_key=...).

    Raises:
        KeyLookupError: if the KM call fails (network, HTTP error, or
            missing/malformed response).
    """
    try:
        key_info = client.get_public_keys(recipient_id)
    except Exception as exc:  # requests.exceptions.HTTPError, ConnectionError, etc.
        raise KeyLookupError(
            f"Failed to fetch KEM public key for recipient '{recipient_id}' from KM"
        ) from exc

    try:
        return key_info["kem_public_key"]
    except KeyError as exc:
        raise KeyLookupError(
            f"KM response for recipient '{recipient_id}' did not contain "
            f"'kem_public_key': {key_info!r}"
        ) from exc


def get_qkd_session_key_reference(
    client: "KMClient",
    sender_id: str,
    recipient_id: str,
) -> dict:
    """
    STUB / FUTURE INTEGRATION POINT — not called by pipeline.py today.

    Wraps km_client.request_qkd_session_key(sender_id, recipient_id), which
    returns {key_id, session_key, sender_id, recipient_id, algorithm, status}
    per the current km_client.py source.

    This is provided so the QKD/session-key path is available and testable
    in isolation, without committing to how (or whether) it will be
    combined with M1's KEM-based seal_envelope() flow. When M1/M2 finalize
    that design, the integration should be added HERE, and — if needed —
    the calling code in smtp_sender.py should change to call this function
    instead of / in addition to get_recipient_kem_public_key(). No other
    M3 file should need to change.

    Raises:
        KeyLookupError: if the KM call fails.
    """
    try:
        return client.request_qkd_session_key(sender_id, recipient_id)
    except Exception as exc:
        raise KeyLookupError(
            f"Failed to obtain QKD/session key for {sender_id} -> {recipient_id}"
        ) from exc