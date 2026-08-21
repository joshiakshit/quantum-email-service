from storage.config import get_storage_settings
from storage.database import init_db, get_db, close_db
from storage.sessions import SessionStore
from storage.repositories import (
    get_credential_by_email,
    save_credential,
    get_registered_user,
    save_registered_user,
    get_client_id_by_email,
    save_email_mapping,
    get_inbox,
    append_to_inbox,
    get_sent,
    append_to_sent,
)
