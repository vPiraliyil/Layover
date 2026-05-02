import logging
import os
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from models import POI

logger = logging.getLogger(__name__)

GOOGLE_PLACES_KEY = os.environ.get("GOOGLE_PLACES_KEY", "")
PLACES_NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby"
FIELD_MASK = "places.id,places.displayName,places.location,places.rating,places.formattedAddress,places.types"

AIRPORT_COORDS: dict[str, tuple[float, float]] = {
    "YYZ": (43.6777, -79.6248),
    "JFK": (40.6413, -73.7781),
    "LAX": (33.9425, -118.4081),
}

# Preference tag → Places API (New) includedTypes list (empty = no type filter)
PREFERENCE_TYPE_MAP: dict[str, list[str]] = {
    "food": ["restaurant", "cafe", "meal_takeaway"],
    "drinks": ["bar", "cafe"],
    "shopping": ["clothing_store", "book_store", "convenience_store"],
    "quiet": ["library", "spa"],
    "walking": [],  # no type filter; radius expanded to 1500m
}


async def fetch_pois_from_places(
    airport_iata: str,
    terminal: str,
    preferences: list[str],
    db: AsyncSession,
) -> list[dict]:
    iata = airport_iata.upper()
    coords = AIRPORT_COORDS.get(iata)
    if not coords:
        raise ValueError(f"Unknown airport IATA code: {airport_iata}")

    lat, lng = coords

    seen: set[str] = set()
    rows: list[dict] = []

    headers = {
        "X-Goog-Api-Key": GOOGLE_PLACES_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        for pref in preferences:
            if pref not in PREFERENCE_TYPE_MAP:
                continue

            types = PREFERENCE_TYPE_MAP[pref]
            radius = 1500.0 if pref == "walking" else 1000.0

            body: dict = {
                "locationRestriction": {
                    "circle": {
                        "center": {"latitude": lat, "longitude": lng},
                        "radius": radius,
                    }
                },
                "maxResultCount": 20,
            }
            if types:
                body["includedTypes"] = types

            resp = await client.post(PLACES_NEARBY_URL, json=body, headers=headers)

            if not resp.is_success:
                logger.warning("Places API error %s for pref=%s: %s", resp.status_code, pref, resp.text[:300])
                continue

            for place in resp.json().get("places", []):
                pid = place.get("id")
                if not pid or pid in seen:
                    continue

                loc = place.get("location", {})
                place_lat = loc.get("latitude")
                place_lng = loc.get("longitude")
                if place_lat is None or place_lng is None:
                    continue

                seen.add(pid)
                rows.append({
                    "airport_iata": iata,
                    "terminal": terminal,
                    "name": place.get("displayName", {}).get("text", "Unknown"),
                    "category": pref,
                    "lat": place_lat,
                    "lng": place_lng,
                    "google_place_id": pid,
                    "rating": place.get("rating"),
                    "address": place.get("formattedAddress"),
                    "cached_at": datetime.now(timezone.utc),
                })

    if not rows:
        return []

    insert_stmt = pg_insert(POI).values(rows)
    upsert_stmt = insert_stmt.on_conflict_do_update(
        index_elements=["google_place_id"],
        set_={
            "airport_iata": insert_stmt.excluded.airport_iata,
            "terminal": insert_stmt.excluded.terminal,
            "name": insert_stmt.excluded.name,
            "category": insert_stmt.excluded.category,
            "lat": insert_stmt.excluded.lat,
            "lng": insert_stmt.excluded.lng,
            "rating": insert_stmt.excluded.rating,
            "address": insert_stmt.excluded.address,
            "cached_at": insert_stmt.excluded.cached_at,
        },
    )
    await db.execute(upsert_stmt)
    await db.commit()

    result = await db.execute(
        select(POI).where(POI.google_place_id.in_([r["google_place_id"] for r in rows]))
    )
    return [_poi_to_dict(p) for p in result.scalars().all()]


async def get_pois_for_itinerary(
    airport_iata: str,
    terminal: str,
    preferences: list[str],
    db: AsyncSession,
) -> list[dict]:
    cache_cutoff = datetime.now(timezone.utc) - timedelta(days=7)

    result = await db.execute(
        select(POI).where(
            POI.airport_iata == airport_iata.upper(),
            POI.terminal == terminal,
            POI.category.in_(preferences),
            POI.cached_at > cache_cutoff,
        )
    )
    cached = result.scalars().all()

    if len(cached) >= 5:
        logger.info("cache hit: %s terminal %s %s", airport_iata, terminal, preferences)
        return [_poi_to_dict(p) for p in cached]

    logger.info("cache miss: %s terminal %s %s", airport_iata, terminal, preferences)
    return await fetch_pois_from_places(airport_iata, terminal, preferences, db)


def _poi_to_dict(poi: POI) -> dict:
    return {
        "id": str(poi.id),
        "airport_iata": poi.airport_iata,
        "terminal": poi.terminal,
        "name": poi.name,
        "category": poi.category,
        "lat": poi.lat,
        "lng": poi.lng,
        "google_place_id": poi.google_place_id,
        "rating": poi.rating,
        "address": poi.address,
        "cached_at": poi.cached_at.isoformat() if poi.cached_at else None,
    }
