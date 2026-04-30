import enum
import uuid

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, mapped_column


class Base(DeclarativeBase):
    pass


class POICategory(enum.Enum):
    food = "food"
    drink = "drink"
    shopping = "shopping"
    lounge = "lounge"
    gate = "gate"
    other = "other"


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
    name = mapped_column(String, nullable=False)
    city = mapped_column(String, nullable=False)
    terminal_count = mapped_column(Integer, nullable=False)
    created_at = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class POI(Base):
    __tablename__ = "points_of_interest"

    id = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    airport_id = mapped_column(
        UUID(as_uuid=True), ForeignKey("airports.id"), nullable=False
    )
    name = mapped_column(String, nullable=False)
    category = mapped_column(Enum(POICategory), nullable=False)
    terminal = mapped_column(String, nullable=True)
    gate_area = mapped_column(String, nullable=True)
    lat = mapped_column(Float, nullable=True)
    lng = mapped_column(Float, nullable=True)
    meta = mapped_column(JSONB, name="metadata", nullable=True)
    created_at = mapped_column(
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
    user_id = mapped_column(UUID(as_uuid=True), nullable=False)
    airport_id = mapped_column(
        UUID(as_uuid=True), ForeignKey("airports.id"), nullable=False
    )
    layover_duration_minutes = mapped_column(Integer, nullable=False)
    stops = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    created_at = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
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
