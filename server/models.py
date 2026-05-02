import enum
import uuid

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, mapped_column


class Base(DeclarativeBase):
    pass


class MessageRole(enum.Enum):
    user = "user"
    assistant = "assistant"


class Airport(Base):
    __tablename__ = "airports"

    id = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    iata_code = mapped_column(String(3), unique=True, nullable=False)
    name = mapped_column(String(150), nullable=False)
    city = mapped_column(String(100), nullable=False)
    terminal_count = mapped_column(Integer, nullable=False, server_default=text("1"))
    created_at = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class POI(Base):
    __tablename__ = "pois"

    id = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    airport_iata = mapped_column(String(3), ForeignKey("airports.iata_code"), nullable=False)
    terminal = mapped_column(String(20), nullable=False)
    name = mapped_column(String(150), nullable=False)
    category = mapped_column(String(50), nullable=False)
    lat = mapped_column(Float, nullable=False)
    lng = mapped_column(Float, nullable=False)
    google_place_id = mapped_column(String(255), unique=True, nullable=False)
    rating = mapped_column(Float, nullable=True)
    address = mapped_column(Text, nullable=True)
    cached_at = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Itinerary(Base):
    __tablename__ = "itineraries"

    id = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    user_id = mapped_column(UUID(as_uuid=True), nullable=True)
    airport_iata = mapped_column(String(3), ForeignKey("airports.iata_code"), nullable=False)
    terminal = mapped_column(String(20), nullable=False)
    duration_minutes = mapped_column(Integer, nullable=False)
    preferences = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    itinerary_json = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    route_geojson = mapped_column(JSONB, nullable=True)
    created_at = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    itinerary_id = mapped_column(
        UUID(as_uuid=True), ForeignKey("itineraries.id"), nullable=False
    )
    role = mapped_column(Enum(MessageRole), nullable=False)
    content = mapped_column(Text, nullable=False)
    created_at = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
