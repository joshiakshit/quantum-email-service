import requests
from crypto.keys import encode_key, decode_key


DEFAULT_KM_URL = "https://localhost:8443"


class KeyManagerClient:

    def __init__(self, base_url: str = DEFAULT_KM_URL, verify_ssl: bool = False):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.verify = verify_ssl

    def register(self, client_id: str, kem_public_key: bytes, signing_public_key: bytes) -> dict:
        response = self.session.post(
            f"{self.base_url}/clients/register",
            json={
                "client_id": client_id,
                "kem_public_key": encode_key(kem_public_key),
                "signing_public_key": encode_key(signing_public_key),
            },
        )
        response.raise_for_status()
        return response.json()

    def get_public_keys(self, client_id: str) -> dict:
        response = self.session.get(f"{self.base_url}/clients/{client_id}/keys")
        response.raise_for_status()
        data = response.json()
        return {
            "client_id": data["client_id"],
            "kem_public_key": decode_key(data["kem_public_key"]),
            "signing_public_key": decode_key(data["signing_public_key"]),
        }

    def request_qkd_session_key(self, sender_id: str, recipient_id: str) -> dict:
        response = self.session.post(
            f"{self.base_url}/sessions/qkd-key",
            json={
                "sender_id": sender_id,
                "recipient_id": recipient_id,
            },
        )
        response.raise_for_status()
        data = response.json()
        return {
            "session_id": data["session_id"],
            "session_key": decode_key(data["session_key"]),
            "sender_id": data["sender_id"],
            "recipient_id": data["recipient_id"],
        }

    def health_check(self) -> dict:
        response = self.session.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()

    def set_auth_token(self, token: str):
        self.session.headers["Authorization"] = f"Bearer {token}"
