"""Bearer-token guard shared by every non-public route."""

import hmac

from fastapi import Header, HTTPException, status

from .config import settings


async def require_api_key(authorization: str | None = Header(default=None)) -> None:
    expected = settings.model_api_key
    if not expected:
        # No key configured -> open mode (local development only).
        return
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    if not hmac.compare_digest(token, expected):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid API key")
