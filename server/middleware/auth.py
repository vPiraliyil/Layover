import logging
import os

from dotenv import load_dotenv
from fastapi import Header, HTTPException

import jwt as pyjwt
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_JWT_SECRET = os.environ["SUPABASE_JWT_SECRET"].strip()
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"

print(f"[auth] JWKS_URL: {JWKS_URL}", flush=True)

_jwks_client = PyJWKClient(JWKS_URL, cache_keys=True)


def _verify_token(token: str) -> dict:
    header = pyjwt.get_unverified_header(token)
    alg = header.get("alg", "RS256")

    if alg == "HS256":
        return pyjwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )

    signing_key = _jwks_client.get_signing_key_from_jwt(token)
    return pyjwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256", "ES256"],
        audience="authenticated",
    )


async def require_user(authorization: str | None = Header(None)) -> dict[str, str]:
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.removeprefix("Bearer ").strip()

    try:
        payload = _verify_token(token)
    except InvalidTokenError as exc:
        logger.error("JWT verification failed: %s", exc)
        print(f"[auth] JWT verification failed: {exc}", flush=True)
        raise HTTPException(status_code=401, detail=f"JWT verification failed: {exc}")

    sub = payload.get("sub")
    email = payload.get("email")

    if not sub or not email:
        raise HTTPException(status_code=401, detail="Token missing required claims")

    return {"sub": str(sub), "email": str(email)}


async def optional_user(authorization: str | None = Header(None)) -> dict[str, str] | None:
    if authorization is None:
        return None
    return await require_user(authorization)
