import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth import optional_user
from models import Itinerary
from services.claude_service import generate_itinerary, patch_itinerary
from services.directions_service import get_route_geojson, get_walking_legs
from services.places_service import get_pois_for_itinerary
from services.scheduler_service import SchedulingError, schedule_itinerary

logger = logging.getLogger(__name__)
router = APIRouter()


class GenerateRequest(BaseModel):
    airport: str
    terminal: str
    duration_minutes: int
    preferences: list[str] = []
    gate: str | None = None


class PatchRequest(BaseModel):
    itinerary_id: str
    current_itinerary: list[dict[str, Any]]
    chat_history: list[dict[str, Any]] = []
    user_message: str


@router.post("")
async def create_itinerary(
    body: GenerateRequest,
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(optional_user),
):
    airport = body.airport.upper()
    terminal = body.terminal
    duration_minutes = body.duration_minutes
    preferences = body.preferences
    gate = body.gate

    if duration_minutes < 45:
        raise HTTPException(status_code=400, detail="Layover must be at least 45 minutes")
    if not preferences:
        raise HTTPException(status_code=400, detail="At least one preference is required")

    logger.info("Generating itinerary: airport=%s terminal=%s duration=%d prefs=%s", airport, terminal, duration_minutes, preferences)

    pois = await get_pois_for_itinerary(airport, terminal, preferences, db)
    logger.info("POIs fetched: %d results", len(pois))

    if not pois:
        raise HTTPException(status_code=404, detail="No POIs found for this airport and preferences")

    try:
        stops = generate_itinerary(pois, preferences, duration_minutes, gate)
    except ValueError as exc:
        logger.error("Claude generation failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))

    logger.info("Claude returned %d stops", len(stops))

    stops = await get_walking_legs(stops)

    try:
        stops = schedule_itinerary(stops, duration_minutes, preferences)
    except SchedulingError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    route_geojson = await get_route_geojson(stops)

    user_id: uuid.UUID | None = None
    if user:
        try:
            user_id = uuid.UUID(user["sub"])
        except (ValueError, KeyError):
            pass

    itinerary_row = Itinerary(
        user_id=user_id,
        airport_iata=airport,
        terminal=terminal,
        duration_minutes=duration_minutes,
        preferences=preferences,
        itinerary_json=stops,
        route_geojson=route_geojson,
    )
    db.add(itinerary_row)
    await db.commit()
    await db.refresh(itinerary_row)

    logger.info("Itinerary saved: id=%s", itinerary_row.id)

    return {
        "id": str(itinerary_row.id),
        "airport_iata": airport,
        "terminal": terminal,
        "duration_minutes": duration_minutes,
        "preferences": preferences,
        "stops": stops,
        "route_geojson": route_geojson,
    }


@router.post("/patch")
async def patch_itinerary_route(
    body: PatchRequest,
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(optional_user),
):
    try:
        updated_stops = patch_itinerary(
            body.current_itinerary,
            body.chat_history,
            body.user_message,
        )
    except ValueError as exc:
        logger.error("Claude patch failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))

    logger.info("Claude patch returned %d stops", len(updated_stops))

    updated_stops = await get_walking_legs(updated_stops)
    route_geojson = await get_route_geojson(updated_stops)

    return {
        "stops": updated_stops,
        "route_geojson": route_geojson,
    }
