from datetime import timedelta
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app import auth
from app.auth import DEMO_USER_ID, current_user
from app.config import Settings
from app.models import utc_now


def credentials(token):
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def test_missing_auth_and_production_demo_protection(monkeypatch):
    with pytest.raises(HTTPException) as missing:
        current_user(None)
    assert missing.value.status_code == 401
    with pytest.raises(ValueError, match="LOCAL_DEMO_MODE"):
        Settings(app_env="production", local_demo_mode=True)
    monkeypatch.setattr(
        auth,
        "get_settings",
        lambda: Settings(
            app_env="test",
            local_demo_mode=False,
            supabase_url="https://example.supabase.co",
        ),
    )
    with pytest.raises(HTTPException) as invalid:
        current_user(credentials("local-demo"))
    assert invalid.value.status_code == 401


@pytest.mark.parametrize(
    "change",
    [
        {},
        {"aud": "other"},
        {"iss": "https://attacker.example/auth/v1"},
        {"exp": utc_now() - timedelta(minutes=1)},
        {"sub": "invalid-uuid"},
    ],
)
def test_jwt_signature_and_claims_are_verified(monkeypatch, change):
    key = ec.generate_private_key(ec.SECP256R1())
    monkeypatch.setattr(
        auth,
        "get_settings",
        lambda: Settings(
            app_env="test",
            local_demo_mode=False,
            supabase_url="https://example.supabase.co",
        ),
    )
    monkeypatch.setattr(
        auth,
        "jwks_client",
        lambda url: SimpleNamespace(
            get_signing_key_from_jwt=lambda token: SimpleNamespace(key=key.public_key()),
        ),
    )
    claims = {
        "sub": str(DEMO_USER_ID),
        "iss": "https://example.supabase.co/auth/v1",
        "aud": "authenticated",
        "iat": utc_now(),
        "exp": utc_now() + timedelta(minutes=5),
        **change,
    }
    token = jwt.encode(claims, key, algorithm="ES256")
    if not change:
        assert current_user(credentials(token)) == DEMO_USER_ID
    else:
        with pytest.raises(HTTPException) as invalid:
            current_user(credentials(token))
        assert invalid.value.status_code == 401


def test_a_token_signed_by_another_key_is_rejected(monkeypatch):
    trusted_key = ec.generate_private_key(ec.SECP256R1())
    other_key = ec.generate_private_key(ec.SECP256R1())
    monkeypatch.setattr(
        auth,
        "get_settings",
        lambda: Settings(
            app_env="test",
            local_demo_mode=False,
            supabase_url="https://example.supabase.co",
        ),
    )
    monkeypatch.setattr(
        auth,
        "jwks_client",
        lambda url: SimpleNamespace(
            get_signing_key_from_jwt=lambda token: SimpleNamespace(key=trusted_key.public_key()),
        ),
    )
    token = jwt.encode(
        {
            "sub": str(DEMO_USER_ID),
            "iss": "https://example.supabase.co/auth/v1",
            "aud": "authenticated",
            "iat": utc_now(),
            "exp": utc_now() + timedelta(minutes=5),
        },
        other_key,
        algorithm="ES256",
    )
    with pytest.raises(HTTPException) as invalid:
        current_user(credentials(token))
    assert invalid.value.status_code == 401
