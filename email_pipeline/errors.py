class QuMailError(Exception):
    """Base class for all M3 email-pipeline errors."""


class ConfigurationError(QuMailError):
    """Raised when required configuration/environment variables are missing."""


class KeyLookupError(QuMailError):
    """
    Raised when M3 cannot obtain the key material it needs from M2's
    Key Manager (or from a caller-supplied fallback). Wraps underlying
    requests/HTTP errors from km_client.py.
    """


class EnvelopeError(QuMailError):
    """
    Raised when M1's seal_envelope/open_envelope fails — e.g. signature
    verification failure, GCM tag mismatch, malformed/unsupported envelope
    version, or bad key sizes. Wraps the original ValueError/TypeError from
    M1's crypto module.
    """


class SendError(QuMailError):
    """Raised when SMTP sending fails (connection, auth, or protocol error)."""


class ReceiveError(QuMailError):
    """Raised when IMAP/POP3 fetching fails, or a fetched message is not a
    valid QuMail message (no envelope part found, malformed MIME, etc.)."""