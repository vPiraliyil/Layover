from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.places_service import get_pois_for_itinerary

router = APIRouter(tags=["pois"])


@router.get("")
async def list_pois(
    airport: str = Query(..., description="IATA code, e.g. YYZ"),
    terminal: str = Query(..., description="Terminal identifier, e.g. 1"),
    preferences: str = Query(..., description="Comma-separated preference tags, e.g. food,drinks"),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    pref_list = [p.strip() for p in preferences.split(",") if p.strip()]
    if not pref_list:
        raise HTTPException(status_code=400, detail="At least one preference is required")
    try:
        return await get_pois_for_itinerary(airport, terminal, pref_list, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
