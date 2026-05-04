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

def _build_generate_system_prompt(required_prefs: list[str]) -> str:
    prefs_str = ", ".join(required_prefs)
    return f"""You are an airport layover itinerary planner.

Given a list of points of interest (POIs) and the traveler's preferences, output ONLY a valid JSON array of stops.

STOP COUNT — non-negotiable based on layover duration:
- 60–90 min layover: exactly 2 stops
- 91–150 min layover: exactly 3 stops
- 151+ min layover: exactly 4 stops

REQUIRED PREFERENCES — non-negotiable:
You MUST include exactly one stop for each of the following preferences: {prefs_str}. This is non-negotiable. If you cannot find a perfect match for a preference in the POI list, include the best available POI from the provided list anyway. Never omit a required preference category from the output.

CATEGORY DIVERSITY — non-negotiable:
- Maximum 1 stop per category. Never pick two restaurants, two bars, two shops, etc.
- If stop count exceeds the number of required preferences, fill remaining stops with complementary categories from the available POIs.
- Every stop must feel meaningfully different from the others.

Other rules:
- All stops must be inside the airport terminal. Never suggest locations that require leaving the secure area or going outdoors.
- Output ONLY the raw JSON array. No prose, no markdown fences, no extra keys, no explanation.
- Each element must exactly match this schema:
{STOP_SCHEMA}
- Only use locations from the provided POI list. Do not fabricate places.
- Set walking_minutes_to_next to 0 for the last stop (filled in later by the directions service).
- Use realistic duration_minutes (15–45 min per stop).
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
    gate: str | None = None,
) -> list[dict]:
    # Determine which preferences have POIs available — skip those that don't
    categories_in_pois = {p["category"] for p in pois}
    required_prefs = [p for p in preferences if p in categories_in_pois]
    skipped = [p for p in preferences if p not in categories_in_pois]
    for s in skipped:
        logger.warning("No POIs found for preference '%s' — excluding from required list", s)
    if not required_prefs:
        # All preferences have no POIs; pass original list and let Claude do its best
        required_prefs = list(preferences)

    gate_line = (
        f"Arrival gate/area: {gate}. Prioritize stops closest to this area and in the same terminal. Never suggest stops in a different terminal.\n"
        if gate
        else ""
    )
    user_message = (
        f"Layover duration: {duration_minutes} minutes\n"
        f"Preferences: {', '.join(preferences)}\n"
        f"{gate_line}"
        f"\nAvailable POIs:\n{json.dumps(pois, indent=2)}"
    )

    response = _client().messages.create(
        model=MODEL,
        max_tokens=2048,
        system=_build_generate_system_prompt(required_prefs),
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

    # Validate every required preference appears at least once in the returned stops
    returned_categories = {s.get("category") for s in stops}
    missing = [p for p in required_prefs if p not in returned_categories]
    if missing:
        raise ValueError(
            f"Claude omitted stops for required preferences: {missing}. "
            f"Returned categories: {sorted(returned_categories)}"
        )

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
