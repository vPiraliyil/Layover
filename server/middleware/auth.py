import os

from dotenv import load_dotenv
from fastapi import Header, HTTPException
from jose import JWTError, jwt

load_dotenv()

SUPABASE_JWT_SECRET = os.environ["SUPABASE_JWT_SECRET"]


async def require_user(authorization: str | None = Header(None)) -> dict[str, str]:
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.removeprefix("Bearer ").strip()

    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    sub = payload.get("sub")
    email = payload.get("email")

    if not sub or not email:
        raise HTTPException(status_code=401, detail="Token missing required claims")

    return {"sub": str(sub), "email": str(email)}


async def optional_user(authorization: str | None = Header(None)) -> dict[str, str] | None:
    if authorization is None:
        return None

    return await require_user(authorization)
