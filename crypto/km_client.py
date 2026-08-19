import requests
from crypto.keys import encode_key, decode_key


DEFAULT_KM_URL = "http://localhost:8000"
API_PREFIX = "/api/v1"


class KeyManagerClient:

    def __init__(self, base_url: str = DEFAULT_KM_URL, verify_ssl: bool = True):
        self.base_url = base_url.rstrip("/")
        self.api_url = f"{self.base_url}{API_PREFIX}"
        self.session = requests.Session()
        self.session.verify = verify_ssl

    def register(self, name: str, kem_public_key: bytes, signing_public_key: bytes) -> dict:
        response = self.session.post(
            f"{self.api_url}/clients/register",
            json={
                "name": name,
                "ml_kem_public_key": encode_key(kem_public_key),
                "ml_dsa_public_key": encode_key(signing_public_key),
            },
        )
        response.raise_for_status()
        data = response.json()
        return {
            "client_id": data["client_id"],
            "registration_secret": data["registration_secret"],
            "status": data["status"],
        }

    def authenticate(self, client_id: str, registration_secret: str) -> str:
        response = self.session.post(
            f"{self.api_url}/auth/token",
            json={
                "client_id": client_id,
                "registration_secret": registration_secret,
            },
        )
        response.raise_for_status()
        data = response.json()
        token = data["access_token"]
        self.session.headers["Authorization"] = f"Bearer {token}"
        return token

    def get_public_keys(self, client_id: str) -> dict:
        response = self.session.get(f"{self.api_url}/keys/public/{client_id}")
        response.raise_for_status()
        data = response.json()
        return {
            "client_id": data["client_id"],
            "name": data["name"],
            "kem_public_key": decode_key(data["ml_kem_public_key"]),
            "signing_public_key": decode_key(data["ml_dsa_public_key"]),
        }

    def request_qkd_session_key(self, sender_id: str, recipient_id: str) -> dict:
        response = self.session.post(
            f"{self.api_url}/keys/request",
            json={
                "sender_id": sender_id,
                "recipient_id": recipient_id,
            },
        )
        response.raise_for_status()
        data = response.json()
        return {
            "key_id": data["key_id"],
            "session_key": decode_key(data["key_material"]),
            "sender_id": data["sender_id"],
            "recipient_id": data["recipient_id"],
            "algorithm": data["algorithm"],
            "status": data["status"],
        }

    def get_session_key(self, key_id: str) -> dict:
        response = self.session.get(f"{self.api_url}/keys/{key_id}")
        response.raise_for_status()
        data = response.json()
        return {
            "key_id": data["key_id"],
            "session_key": decode_key(data["key_material"]),
            "sender_id": data["sender_id"],
            "recipient_id": data["recipient_id"],
            "algorithm": data["algorithm"],
            "status": data["status"],
        }

    def health_check(self) -> dict:
        response = self.session.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()
