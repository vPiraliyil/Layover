import logging

logger = logging.getLogger(__name__)


class SchedulingError(Exception):
    pass


def schedule_itinerary(
    stops: list[dict],
    layover_minutes: int,
    preferences: list[str] | None = None,
    tsa_buffer_minutes: int = 30,
) -> list[dict]:
    available_minutes = layover_minutes - tsa_buffer_minutes
    prefs = set(preferences or [])

    def total_time(s: list[dict]) -> float:
        return sum(stop.get("duration_minutes", 0) for stop in s) + sum(
            stop.get("walking_minutes_to_next", 0) for stop in s
        )

    def priority_key(stop: dict) -> tuple:
        pref_match = 0 if stop.get("category") in prefs else 1
        duration = stop.get("duration_minutes", 999)
        return (pref_match, duration)

    working = list(stops)
    current_total = total_time(working)

    logger.info(
        "Scheduler: %d stops, total_time=%.1f min, available=%.1f min (layover=%d, tsa_buffer=%d)",
        len(working),
        current_total,
        available_minutes,
        layover_minutes,
        tsa_buffer_minutes,
    )

    while current_total > available_minutes and len(working) >= 2:
        working.sort(key=priority_key)
        removed = working.pop()
        logger.info("Scheduler trimmed stop: %s (category=%s, duration=%d min)", removed.get("name"), removed.get("category"), removed.get("duration_minutes", 0))
        current_total = total_time(working)

    if current_total > available_minutes and len(working) < 2:
        raise SchedulingError("Layover too short to build a valid itinerary")

    working.sort(key=lambda s: s.get("stop_number", 0))
    for i, stop in enumerate(working, start=1):
        stop["stop_number"] = i

    if working:
        working[-1]["walking_minutes_to_next"] = 0

    logger.info(
        "Scheduler: finalized %d stops, total_time=%.1f min",
        len(working),
        total_time(working),
    )

    return working
