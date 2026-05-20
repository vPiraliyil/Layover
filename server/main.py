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
