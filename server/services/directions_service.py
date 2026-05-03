import logging
import math
import os

import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)

MAPBOX_SECRET_TOKEN = os.environ.get("MAPBOX_SECRET_TOKEN", "")
DIRECTIONS_BASE = "https://api.mapbox.com/directions/v5/mapbox/walking"

WALKING_SPEED_M_PER_MIN = 80.0


def _haversine_minutes(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6_371_000  # Earth radius in metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    distance_m = 2 * R * math.asin(math.sqrt(a))
    return round(distance_m / WALKING_SPEED_M_PER_MIN, 1)


def _apply_straight_line_legs(stops: list[dict]) -> list[dict]:
    for i, stop in enumerate(stops):
        if i < len(stops) - 1:
            nxt = stops[i + 1]
            stop["walking_minutes_to_next"] = _haversine_minutes(
                stop["lat"], stop["lng"], nxt["lat"], nxt["lng"]
            )
        else:
            stop["walking_minutes_to_next"] = 0
    return stops


def _straight_line_geojson(stops: list[dict]) -> dict:
    return {
        "type": "LineString",
        "coordinates": [[s["lng"], s["lat"]] for s in stops],
    }


async def _fetch_directions(stops: list[dict]) -> dict | None:
    coords = ";".join(f"{s['lng']},{s['lat']}" for s in stops)
    url = f"{DIRECTIONS_BASE}/{coords}"
    params = {
        "access_token": MAPBOX_SECRET_TOKEN,
        "geometries": "geojson",
        "overview": "full",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params=params)

    if not resp.is_success:
        logger.error("Mapbox Directions error %s: %s", resp.status_code, resp.text[:300])
        raise HTTPException(status_code=502, detail="Mapbox Directions API request failed")

    data = resp.json()
    routes = data.get("routes")
    if not routes:
        logger.warning("Mapbox NoRoute — using straight-line fallback (code=%s)", data.get("code"))
        return None

    return routes[0]


async def get_walking_legs(stops: list[dict]) -> list[dict]:
    if len(stops) < 2:
        if stops:
            stops[0]["walking_minutes_to_next"] = 0
        return stops

    result = list(stops)
    route = await _fetch_directions(result)

    if route is None:
        return _apply_straight_line_legs(result)

    legs = route.get("legs", [])
    for i, stop in enumerate(result):
        if i < len(legs):
            stop["walking_minutes_to_next"] = round(legs[i].get("duration", 0) / 60, 1)
        else:
            stop["walking_minutes_to_next"] = 0

    logger.info("Directions: %d stops, %d legs returned", len(result), len(legs))
    return result


async def get_route_geojson(stops: list[dict]) -> dict | None:
    if len(stops) < 2:
        return None

    route = await _fetch_directions(stops)

    if route is None:
        return _straight_line_geojson(stops)

    return route.get("geometry")
