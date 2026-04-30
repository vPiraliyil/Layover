import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

CLIENT_URL = os.environ.get("CLIENT_URL", "http://localhost:3000")

app = FastAPI(title="Layover API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CLIENT_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


# TODO: include routers here
# from server.routers import router
# app.include_router(router)
