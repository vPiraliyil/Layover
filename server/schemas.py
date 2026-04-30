from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

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
    airport_id: uuid.UUID
    name: str
    category: Literal["food", "drink", "shopping", "lounge", "gate", "other"]
    terminal: str | None = None
    gate_area: str | None = None
    lat: float | None = None
    lng: float | None = None
    meta: dict[str, Any] | None = None


class POICreate(POIBase):
    pass


class POIRead(POIBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime


class ItineraryBase(BaseModel):
    user_id: uuid.UUID
    airport_id: uuid.UUID
    layover_duration_minutes: int
    stops: list[Any] = []


class ItineraryCreate(ItineraryBase):
    pass


class ItineraryRead(ItineraryBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ChatMessageBase(BaseModel):
    itinerary_id: uuid.UUID
    role: Literal["user", "assistant"]
    content: str


class ChatMessageCreate(ChatMessageBase):
    pass


class ChatMessageRead(ChatMessageBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
