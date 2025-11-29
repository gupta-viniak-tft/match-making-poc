import json
import logging
from typing import List, Dict, Any, Optional, Tuple

import numpy as np
from openai import APIError, RateLimitError
from sqlalchemy.orm import Session
from collections.abc import Sequence

from ..db.models import Profile
from ..utils.geo import geocode_city, haversine_km
from .client import client
from .prompts import RERANK_SYSTEM_PROMPT


def _canonical_text(canon: Dict[str, Any] | None) -> str:
    """
    Convert canonical dict to a compact key: value; key: value string.
    """
    if not canon:
        return ""
    parts: list[str] = []
    for k, v in canon.items():
        if v is None:
            continue
        text = str(v).strip()
        if text:
            parts.append(f"{k}: {text}")
    return "; ".join(parts)


def _dynamic_text(dynamic: Dict[str, Any] | None) -> str:
    """
    Convert dynamic_features dict to a compact key: value; key: value string.
    """
    if not dynamic:
        return ""
    parts: list[str] = []
    for k, v in dynamic.items():
        if v is None:
            continue
        text = str(v).strip()
        if text:
            parts.append(f"{k}: {text}")
    return "; ".join(parts)

def _is_vector(vec: Sequence | None) -> bool:
    return vec is not None and not isinstance(vec, (str, bytes))


def _cosine(a, b) -> float:
    if not _is_vector(a) or not _is_vector(b):
        return 0.0
    try:
        va = np.array(a, dtype=float)
        vb = np.array(b, dtype=float)
    except Exception:
        return 0.0
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    if denom == 0:
        return 0.0
    return float(np.dot(va, vb) / denom)


def _canonical_similarity(src: dict | None, cand: dict | None) -> float:
    if not src or not cand:
        return 0.0
    keys = ["city", "state", "country", "education", "profession", "religion", "caste"]
    matches = 0
    total = 0
    for k in keys:
        s_val = (src.get(k) or "").strip().lower()
        c_val = (cand.get(k) or "").strip().lower()
        if not s_val or not c_val:
            continue
        total += 1
        if s_val == c_val:
            matches += 1
    if total == 0:
        return 0.0
    return matches / total

def _dynamic_similarity(src: dict | None, cand: dict | None) -> float:
    if not src or not cand:
        return 0.0
    src_keys = set(src.keys())
    cand_keys = set(cand.keys())
    if not src_keys or not cand_keys:
        return 0.0
    overlap = src_keys & cand_keys
    return len(overlap) / len(src_keys | cand_keys)



def _coords_from_profile(profile: Profile) -> Optional[Tuple[float, float]]:
    if profile.location_lat is not None and profile.location_lon is not None:
        return profile.location_lat, profile.location_lon
    city = (profile.canonical or {}).get("city")
    return geocode_city(city) if city else None


def _components_for(seeker: Profile, cand: Profile) -> dict[str, float]:
    pref_to_self = _cosine(seeker.pref_embedding, cand.self_embedding)
    self_to_pref = _cosine(seeker.self_embedding, cand.pref_embedding)
    canonical_sim = _canonical_similarity(seeker.canonical, cand.canonical)
    dynamic_sim = _dynamic_similarity(seeker.dynamic_features, cand.dynamic_features)
    distance_bonus = 0.0

    seeker_coords = _coords_from_profile(seeker)
    if seeker_coords:
        cand_coords = _coords_from_profile(cand)
        if cand_coords:
            dist_km = haversine_km(seeker_coords[0], seeker_coords[1], cand_coords[0], cand_coords[1])
            distance_bonus = max(0.0, 1.0 - (dist_km / 1500.0))

    return {
        "pref_to_self": pref_to_self,
        "self_to_pref": self_to_pref,
        "canonical": canonical_sim,
        "dynamic": dynamic_sim,
        "distance": distance_bonus,
    }


def rerank_with_llm(
    seeker: Profile,
    candidates: List[Dict[str, Any]],
    db: Session | None = None,
    limit: int = 20,
) -> List[Dict[str, Any]]:
    """
    Rerank candidates using an LLM, focusing on:
    - mutual fit (seeker <-> candidate)
    - seeker preferences expressed in `looking_for` overriding strict canonical/dynamic similarity
    - short reason for each score

    Expects `candidates` items to have:
      - profile_id
      - score (pre-LLM score)
      - canonical (dict)
      - dynamic_features (dict)
      - looking_for (str, candidate's own preferences)
      - optionally: who_am_i (if you add it later)
    """
    if not client.api_key or not candidates:
        return candidates[:limit]

    # Build seeker summary
    seeker_summary = {
        "profile_id": seeker.id,
        "name": (seeker.canonical or {}).get("name", ""),
        "who_am_i": seeker.who_am_i or "",
        "looking_for": seeker.looking_for or "",
        "canonical": seeker.canonical or {},
        "dynamic_features": seeker.dynamic_features or {},
    }

    # Precompute component breakdowns using DB profiles if available
    components_map: dict[str, dict[str, float]] = {}
    who_map: dict[str, str] = {}
    if db:
        for c in candidates:
            cid = c.get("profile_id")
            if not cid:
                continue
            cand_profile = db.get(Profile, cid)
            if not cand_profile:
                continue
            try:
                components_map[cid] = _components_for(seeker, cand_profile)
                if cand_profile.who_am_i:
                    who_map[cid] = cand_profile.who_am_i
            except Exception as exc:  # defensive; avoid breaking rerank on one failure
                logging.warning("Component calc failed for %s: %s", cid, exc)

    # Trim candidates for LLM context (LLM will only see at most `limit`)
    cand_payload: list[dict[str, Any]] = []
    for c in candidates[:limit]:
        cid = c.get("profile_id")
        cand_payload.append(
            {
                "profile_id": cid,
                "base_score": float(c.get("score", 0.0)),
                "name": (c.get("canonical") or {}).get("name", ""),
                "canonical": c.get("canonical") or {},
                "dynamic_features": c.get("dynamic_features") or {},
                "looking_for": c.get("looking_for") or "",
                # if you later include who_am_i per candidate, pass it through:
                "who_am_i": c.get("who_am_i") or who_map.get(cid) or "",
                "components": components_map.get(cid),
                "location_proximity": (components_map.get(cid) or {}).get("distance"),
            }
        )

    # Build a single structured text block – this is easier for the LLM to parse
    seeker_block = (
        "Seeker:\n"
        f"  profile_id: {seeker_summary['profile_id']}\n"
        f"  name: {seeker_summary['name']}\n"
        f"  who_am_i: {seeker_summary['who_am_i']}\n"
        f"  looking_for: {seeker_summary['looking_for']}\n"
        f"  canonical: {_canonical_text(seeker_summary['canonical'])}\n"
        f"  dynamic: {_dynamic_text(seeker_summary['dynamic_features'])}\n"
    )

    candidates_block_lines: list[str] = ["Candidates:"]
    for c in cand_payload:
        loc_prox = c.get("location_proximity")
        loc_line = f"  location_proximity: {loc_prox:.3f}" if isinstance(loc_prox, (int, float)) else "  location_proximity: null"
        candidates_block_lines.append(
            (
                f"- profile_id: {c['profile_id']}\n"
                f"  name: {c.get('name', '')}\n"
                f"  base_score: {c['base_score']:.3f}\n"
                f"  who_am_i: {c.get('who_am_i', '')}\n"
                f"  looking_for: {c['looking_for']}\n"
                f"{loc_line}\n"
                f"  canonical: {_canonical_text(c['canonical'])}\n"
                f"  dynamic: {_dynamic_text(c['dynamic_features'])}"
            )
        )
    candidates_block = "\n".join(candidates_block_lines)

    messages = [
        {"role": "system", "content": RERANK_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"{seeker_block}\n\n{candidates_block}",
        },
    ]

    try:
        resp = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        content = resp.choices[0].message.content
    except (RateLimitError, APIError) as exc:
        logging.warning("LLM rerank failed: %s", exc)
        return candidates[:limit]
    except Exception as exc:
        logging.warning("LLM rerank unexpected error: %s", exc)
        return candidates[:limit]

    try:
        data = json.loads(content or "{}")

        # We expect either:
        #   { "candidates": [ { "profile_id": "...", "score": 0.87, "reason": "..." }, ... ] }
        # or directly:
        #   [ { "profile_id": "...", "score": 0.87, "reason": "..." }, ... ]
        if isinstance(data, dict) and "candidates" in data:
            items = data["candidates"]
        elif isinstance(data, list):
            items = data
        else:
            logging.warning("LLM rerank: unexpected JSON shape: %s", type(data))
            return candidates[:limit]

        reranked_map: dict[str, dict[str, Any]] = {}
        for item in items:
            pid = item.get("profile_id")
            if not pid:
                continue
            reranked_map[pid] = {
                "score": float(item.get("score", 0.0)),
                "reason": item.get("reason"),
                "pref_to_self_reason": item.get("pref_to_self_reason"),
                "self_to_pref_reason": item.get("self_to_pref_reason"),
                "location_reason": item.get("location_reason"),
                "location_open": item.get("location_open"),
            }

        # Merge LLM scores/reasons into existing candidates
        merged: list[dict[str, Any]] = []
        for cand in candidates:
            cid = cand.get("profile_id")
            overrides = reranked_map.get(cid)
            base_components = cand.get("components") or components_map.get(cid)
            if overrides:
                cand = {
                    **cand,
                    "score": overrides["score"],
                    "reason": overrides.get("reason"),
                    "pref_to_self_reason": overrides.get("pref_to_self_reason"),
                    "self_to_pref_reason": overrides.get("self_to_pref_reason"),
                    "location_reason": overrides.get("location_reason"),
                    "location_open": overrides.get("location_open"),
                    "components": base_components,
                    "who_am_i": cand.get("who_am_i") or who_map.get(cid) or "",
                }
            elif base_components:
                cand = {**cand, "components": base_components, "who_am_i": cand.get("who_am_i") or who_map.get(cid) or ""}
            merged.append(cand)

        merged.sort(key=lambda x: x.get("score", 0.0), reverse=True)
        return merged[:limit]
    except Exception as exc:
        logging.warning("LLM rerank parse error: %s", exc)
        return candidates[:limit]
