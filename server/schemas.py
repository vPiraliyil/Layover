from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class AirportBase(BaseModel):
    iata_code: str
    name: str
    city: str
    terminal_count: int


class AirportCreate(AirportBase):
    pass


class AirportRead(AirportBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime


class POIBase(BaseModel):
    airport_iata: str
    terminal: str
    name: str
    category: str
    lat: float
    lng: float
    google_place_id: str
    rating: float | None = None
    address: str | None = None


class POICreate(POIBase):
    pass


class POIRead(POIBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    cached_at: datetime


class ItineraryBase(BaseModel):
    airport_iata: str
    terminal: str
    duration_minutes: int
    preferences: list[str] = []
    itinerary_json: list[Any] = []
    route_geojson: dict[str, Any] | None = None
    user_id: uuid.UUID | None = None


class ItineraryCreate(ItineraryBase):
    pass


class ItineraryRead(ItineraryBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime


class ChatMessageBase(BaseModel):
    itinerary_id: uuid.UUID
    role: str
    content: str


class ChatMessageCreate(ChatMessageBase):
    pass


class ChatMessageRead(ChatMessageBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
