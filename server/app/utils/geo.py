import logging
import math
from functools import lru_cache
from typing import Optional, Tuple

import requests


@lru_cache(maxsize=256)
def geocode_city(city: str) -> Optional[Tuple[float, float]]:
    """Geocode a city name to (lat, lon) using Nominatim. Returns None on failure."""
    if not city:
        return None
    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": city, "format": "json", "limit": 1},
            headers={"User-Agent": "match-maker/1.0"},
            timeout=5,
        )
        resp.raise_for_status()
        data = resp.json()
        if not data:
            return None
        item = data[0]
        return float(item["lat"]), float(item["lon"])
    except Exception as exc:  # noqa: BLE001
        logging.debug("Geocode failed for %s: %s", city, exc)
        return None


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c
