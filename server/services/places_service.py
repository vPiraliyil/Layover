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
PLACES_SEARCH_TEXT_URL = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = "places.id,places.displayName,places.location,places.rating,places.formattedAddress,places.types"

AIRPORT_COORDS: dict[str, tuple[float, float]] = {
    "YYZ": (43.6777, -79.6248),
    "JFK": (40.6413, -73.7781),
    "LAX": (33.9425, -118.4081),
}

AIRPORT_NAMES: dict[str, str] = {
    "YYZ": "Toronto Pearson International Airport",
    "JFK": "John F. Kennedy International Airport",
    "LAX": "Los Angeles International Airport",
}

# Preference tag → human-readable query term used in textQuery
PREF_QUERY_TERM: dict[str, str] = {
    "food": "restaurant or cafe",
    "drinks": "bar or drinks",
    "shopping": "shop or store",
    "quiet": "quiet lounge or seating area",
    "walking": "terminal walkway or landmark",
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
    airport_name = AIRPORT_NAMES.get(iata, f"{iata} Airport")

    seen: set[str] = set()
    rows: list[dict] = []

    headers = {
        "X-Goog-Api-Key": GOOGLE_PLACES_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        for pref in preferences:
            if pref not in PREF_QUERY_TERM:
                continue

            query_term = PREF_QUERY_TERM[pref]
            text_query = f"{airport_name} Terminal {terminal} {query_term}"

            body: dict = {
                "textQuery": text_query,
                "locationBias": {
                    "circle": {
                        "center": {"latitude": lat, "longitude": lng},
                        "radius": 800.0,
                    }
                },
                "maxResultCount": 20,
            }

            resp = await client.post(PLACES_SEARCH_TEXT_URL, json=body, headers=headers)

            if not resp.is_success:
                logger.warning("Places API error %s for pref=%s: %s", resp.status_code, pref, resp.text[:300])
                continue

            places = resp.json().get("places", [])

            # Drop results whose name or address explicitly mentions a different terminal
            other_terminal_markers = [
                f"Terminal {t}" for t in ["1", "2", "3", "4", "5", "A", "B", "C", "D", "E"]
                if t != terminal
            ]

            def _mentions_wrong_terminal(place: dict) -> bool:
                text = (
                    (place.get("displayName", {}).get("text") or "") + " " +
                    (place.get("formattedAddress") or "")
                ).lower()
                return any(marker.lower() in text for marker in other_terminal_markers)

            pref_start = len(rows)
            for place in places:
                pid = place.get("id")
                if not pid or pid in seen:
                    continue

                if _mentions_wrong_terminal(place):
                    logger.debug("Filtered wrong-terminal result: %s", place.get("displayName", {}).get("text"))
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
            logger.info("places fetch: pref=%s query=%r found=%d", pref, text_query, len(rows) - pref_start)

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
        pois = [_poi_to_dict(p) for p in cached]
        for pref in preferences:
            count = sum(1 for p in pois if p["category"] == pref)
            logger.info("cache hit: %s/%s pref=%s count=%d", airport_iata, terminal, pref, count)
        return pois

    logger.info("cache miss: %s terminal %s %s", airport_iata, terminal, preferences)
    return await fetch_pois_from_places(airport_iata, terminal, preferences, db)


async def get_cached_pois_for_airport(
    airport_iata: str,
    terminal: str,
    db: AsyncSession,
) -> list[dict]:
    result = await db.execute(
        select(POI).where(
            POI.airport_iata == airport_iata.upper(),
            POI.terminal == terminal,
        )
    )
    return [_poi_to_dict(p) for p in result.scalars().all()]


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
