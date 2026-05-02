from dotenv import load_dotenv
load_dotenv()

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.auth import router as auth_router

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


@app.get("/health")
async def health():
    return {"status": "ok"}
