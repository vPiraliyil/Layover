import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth import optional_user, require_user
from models import ChatMessage, Itinerary, MessageRole
from services.claude_service import generate_itinerary, patch_itinerary
from services.directions_service import get_route_geojson, get_walking_legs
from services.places_service import get_cached_pois_for_airport, get_pois_for_itinerary
from services.scheduler_service import SchedulingError, deduplicate_stops, schedule_itinerary

logger = logging.getLogger(__name__)
router = APIRouter()


class GenerateRequest(BaseModel):
    airport: str
    terminal: str
    duration_minutes: int
    preferences: list[str] = []
    gate: str | None = None


class PatchRequest(BaseModel):
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
        stops = generate_itinerary(pois, preferences, duration_minutes, terminal, gate)
    except ValueError as exc:
        logger.error("Claude generation failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))

    logger.info("Claude returned %d stops", len(stops))

    before = len(stops)
    stops = deduplicate_stops(stops, preferences)
    removed = before - len(stops)
    if removed:
        logger.info("Removed %d duplicate stops before scheduling", removed)

    stops = await get_walking_legs(stops)

    try:
        stops = schedule_itinerary(stops, duration_minutes, preferences)
    except SchedulingError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    route_result = await get_route_geojson(stops)
    route_geojson = route_result["geojson"]
    is_real_route = route_result["is_real_route"]

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
        "is_real_route": is_real_route,
    }


@router.get("/my")
async def get_my_itineraries(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_user),
):
    user_uuid = uuid.UUID(user["sub"])
    result = await db.execute(
        select(Itinerary)
        .where(Itinerary.user_id == user_uuid)
        .order_by(Itinerary.created_at.desc())
    )
    rows = result.scalars().all()
    return [
        {
            "id": str(row.id),
            "airport_iata": row.airport_iata,
            "terminal": row.terminal,
            "duration_minutes": row.duration_minutes,
            "preferences": row.preferences,
            "created_at": row.created_at.isoformat(),
            "preview_stop": row.itinerary_json[0]["name"] if row.itinerary_json else "",
        }
        for row in rows
    ]


@router.get("/{itinerary_id}")
async def get_itinerary(
    itinerary_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        itin_uuid = uuid.UUID(itinerary_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid itinerary ID")
    row = await db.get(Itinerary, itin_uuid)
    if row is None:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    return {
        "id": str(row.id),
        "stops": row.itinerary_json,
        "route_geojson": row.route_geojson,
    }


@router.patch("/{itinerary_id}/patch")
async def patch_itinerary_route(
    itinerary_id: str,
    body: PatchRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        itin_uuid = uuid.UUID(itinerary_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid itinerary ID")

    itinerary_row = await db.get(Itinerary, itin_uuid)
    if itinerary_row is None:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.itinerary_id == itin_uuid)
        .order_by(ChatMessage.created_at.asc())
    )
    chat_rows = result.scalars().all()
    chat_history = [{"role": row.role.value, "content": row.content} for row in chat_rows]

    pois = await get_cached_pois_for_airport(itinerary_row.airport_iata, itinerary_row.terminal, db)
    logger.info("Patch: itinerary=%s, history_len=%d, pois=%d, message=%r", itinerary_id, len(chat_history), len(pois), body.user_message)

    try:
        updated_stops = patch_itinerary(
            itinerary_row.itinerary_json,
            chat_history,
            body.user_message,
            pois,
        )
    except ValueError as exc:
        logger.error("Claude patch failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))

    logger.info("Claude patch returned %d stops", len(updated_stops))

    updated_stops = await get_walking_legs(updated_stops)

    try:
        updated_stops = schedule_itinerary(
            updated_stops,
            itinerary_row.duration_minutes,
            itinerary_row.preferences,
        )
    except SchedulingError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    route_result = await get_route_geojson(updated_stops)

    itinerary_row.itinerary_json = updated_stops
    itinerary_row.route_geojson = route_result["geojson"]

    db.add(ChatMessage(
        itinerary_id=itin_uuid,
        role=MessageRole.user,
        content=body.user_message,
    ))
    db.add(ChatMessage(
        itinerary_id=itin_uuid,
        role=MessageRole.assistant,
        content="Done! I've updated your itinerary.",
    ))

    await db.commit()

    logger.info("Patch complete: itinerary=%s, stops=%d", itinerary_id, len(updated_stops))

    return {
        "stops": updated_stops,
        "route_geojson": route_result["geojson"],
        "is_real_route": route_result["is_real_route"],
    }
