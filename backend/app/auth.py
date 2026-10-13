from functools import lru_cache
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientConnectionError

from app.config import get_settings

DEMO_USER_ID = UUID("00000000-0000-4000-8000-000000000001")
bearer = HTTPBearer(auto_error=False)


@lru_cache
def jwks_client(url: str) -> PyJWKClient:
    return PyJWKClient(f"{url}/auth/v1/.well-known/jwks.json", lifespan=300, timeout=10)


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> UUID:
    unauthorized = HTTPException(
        status_code=401,
        detail="Your session has expired. Please sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized

    settings = get_settings()
    token = credentials.credentials
    if settings.local_demo_mode and settings.app_env != "production" and token == "local-demo":
        return DEMO_USER_ID
    if not settings.supabase_url:
        raise HTTPException(status_code=503, detail="Authentication has not been configured.")

    try:
        url = settings.supabase_url.rstrip("/")
        key = jwks_client(url).get_signing_key_from_jwt(token).key
        # Verify signature, expiry, issuer, and audience. Never trust a decoded-only user ID.
        claims = jwt.decode(
            token,
            key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
            issuer=f"{url}/auth/v1",
            options={"require": ["exp", "iat", "sub", "iss", "aud"]},
        )
        return UUID(claims["sub"])
    except PyJWKClientConnectionError as error:
        raise HTTPException(
            status_code=503, detail="Sign-in is temporarily unavailable."
        ) from error
    except (jwt.PyJWTError, ValueError, KeyError) as error:
        raise unauthorized from error
