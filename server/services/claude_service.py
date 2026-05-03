import json
import logging
import os

import anthropic

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
MODEL = "claude-sonnet-4-20250514"

STOP_SCHEMA = """
{
  "stop_number": <int, 1-indexed>,
  "name": <string>,
  "category": <string, one of: food, drinks, shopping, quiet, walking>,
  "description": <string, 1-2 sentences why this stop fits the layover>,
  "duration_minutes": <int>,
  "lat": <float>,
  "lng": <float>,
  "walking_minutes_to_next": <float, 0 for last stop>
}
"""

GENERATE_SYSTEM_PROMPT = f"""You are an airport layover itinerary planner.

Given a list of points of interest (POIs) and the traveler's preferences, output ONLY a valid JSON array of stops.

Rules:
- Output ONLY the raw JSON array. No prose, no markdown fences, no extra keys, no explanation.
- Each element must exactly match this schema:
{STOP_SCHEMA}
- Select 3-6 stops from the provided POIs that best match the preferences and fit within the layover.
- Set walking_minutes_to_next to 0 for the last stop (it will be filled in later by the directions service).
- Use realistic duration_minutes (15-45 min per stop).
- Do not fabricate POIs — only use locations from the provided list.
- Ensure stop_number is sequential starting at 1.
"""

PATCH_SYSTEM_PROMPT = f"""You are an airport layover itinerary editor.

You will receive a current itinerary JSON array and a user request to modify it. Output ONLY the full updated JSON array.

Rules:
- Output ONLY the raw JSON array. No prose, no markdown fences, no extra keys, no explanation.
- Apply the user's request to the current itinerary (add, remove, reorder, or modify stops as instructed).
- Preserve the exact schema for every stop:
{STOP_SCHEMA}
- Keep stop_number sequential starting at 1 after any changes.
- Set walking_minutes_to_next to 0 for the last stop (it will be recalculated).
- Only use POIs from the original list if adding stops. Do not fabricate new locations.
"""


def _client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


def generate_itinerary(
    pois: list[dict],
    preferences: list[str],
    duration_minutes: int,
) -> list[dict]:
    user_message = (
        f"Layover duration: {duration_minutes} minutes\n"
        f"Preferences: {', '.join(preferences)}\n\n"
        f"Available POIs:\n{json.dumps(pois, indent=2)}"
    )

    response = _client().messages.create(
        model=MODEL,
        max_tokens=2048,
        system=GENERATE_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    raw = response.content[0].text.strip()
    logger.info("Claude generate_itinerary raw response length: %d chars", len(raw))

    try:
        stops = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Claude returned malformed JSON: {exc}") from exc

    if not isinstance(stops, list):
        raise ValueError("Claude response is not a JSON array")

    return stops


def patch_itinerary(
    current_itinerary: list[dict],
    chat_history: list[dict],
    user_message: str,
) -> list[dict]:
    messages = list(chat_history)
    messages.append({
        "role": "user",
        "content": (
            f"Current itinerary:\n{json.dumps(current_itinerary, indent=2)}\n\n"
            f"User request: {user_message}"
        ),
    })

    response = _client().messages.create(
        model=MODEL,
        max_tokens=2048,
        system=PATCH_SYSTEM_PROMPT,
        messages=messages,
    )

    raw = response.content[0].text.strip()
    logger.info("Claude patch_itinerary raw response length: %d chars", len(raw))

    try:
        stops = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Claude returned malformed JSON: {exc}") from exc

    if not isinstance(stops, list):
        raise ValueError("Claude patch response is not a JSON array")

    return stops
