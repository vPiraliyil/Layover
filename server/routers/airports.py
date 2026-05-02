from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Airport

router = APIRouter(tags=["airports"])


@router.get("")
async def list_airports(db: AsyncSession = Depends(get_db)) -> list[dict]:
    result = await db.execute(select(Airport).order_by(Airport.iata_code))
    airports = result.scalars().all()
    return [
        {
            "id": str(a.id),
            "iata_code": a.iata_code,
            "name": a.name,
            "city": a.city,
            "terminal_count": a.terminal_count,
            "created_at": a.created_at.isoformat(),
        }
        for a in airports
    ]
