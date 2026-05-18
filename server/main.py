from dotenv import load_dotenv
load_dotenv()

import logging
import os

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.airports import router as airports_router
from routers.auth import router as auth_router
from routers.itineraries import router as itineraries_router
from routers.pois import router as pois_router

CLIENT_URL = os.environ.get("CLIENT_URL", "http://localhost:3000")

app = FastAPI(title="Layover API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CLIENT_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(airports_router, prefix="/airports")
app.include_router(pois_router, prefix="/pois")
app.include_router(itineraries_router, prefix="/itineraries")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/debug/routes")
def list_routes():
    return [{"path": route.path, "name": route.name} for route in app.routes]


@app.post("/debug/token")
async def debug_token(body: dict):
    """Temporary endpoint — remove before deploying. POST {"token": "<jwt>"}"""
    import jwt as pyjwt
    from jwt import PyJWKClient
    from jwt.exceptions import InvalidTokenError
    from middleware.auth import SUPABASE_JWT_SECRET, JWKS_URL

    token = body.get("token", "")
    try:
        header = pyjwt.get_unverified_header(token)
        claims = pyjwt.decode(token, options={"verify_signature": False})
    except Exception as exc:
        return {"ok": False, "error": f"Could not parse token: {exc}"}

    try:
        if header.get("alg") == "HS256":
            payload = pyjwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        else:
            client = PyJWKClient(JWKS_URL)
            signing_key = client.get_signing_key_from_jwt(token)
            payload = pyjwt.decode(token, signing_key.key, algorithms=["RS256"], audience="authenticated")
        return {"ok": True, "header": header, "claims": claims, "payload": payload}
    except InvalidTokenError as exc:
        return {"ok": False, "error": str(exc), "header": header, "claims": claims}
