import asyncio
import os

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy.dialects.postgresql import insert as pg_insert

from server.database import async_session
from server.models import Airport

AIRPORTS = [
    {"iata_code": "YYZ", "name": "Toronto Pearson International Airport", "city": "Toronto", "terminal_count": 2},
    {"iata_code": "JFK", "name": "John F. Kennedy International Airport", "city": "New York", "terminal_count": 8},
    {"iata_code": "LAX", "name": "Los Angeles International Airport", "city": "Los Angeles", "terminal_count": 9},
]


async def seed():
    async with async_session() as session:
        async with session.begin():
            for data in AIRPORTS:
                stmt = (
                    pg_insert(Airport)
                    .values(**data)
                    .on_conflict_do_nothing(index_elements=["iata_code"])
                )
                await session.execute(stmt)
    print(f"Seeded {len(AIRPORTS)} airports (skipped any duplicates).")


if __name__ == "__main__":
    asyncio.run(seed())
