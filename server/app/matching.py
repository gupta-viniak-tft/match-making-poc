from typing import Iterable, List

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db.models import Profile


def _opposite_gender(gender: str) -> str | None:
    g = (gender or "").lower()
    if g == "male":
        return "female"
    if g == "female":
        return "male"
    return None


def _is_vector(vec: Iterable | None) -> bool:
    return vec is not None and isinstance(vec, (list, tuple))


def _cosine(a: List[float] | None, b: List[float] | None) -> float:
    if not _is_vector(a) or not _is_vector(b):
        return 0.0
    va = np.array(a, dtype=float)
    vb = np.array(b, dtype=float)
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


def top_matches(db: Session, source_profile_id: str, limit: int = 20):
    """
    Similarity matcher combining:
    - pref vs candidate who_am_i (pref_embedding vs self_embedding)
    - self vs candidate preferences (self_embedding vs pref_embedding)
    - canonical overlap
    - dynamic feature overlap
    """
    profile = db.get(Profile, source_profile_id)
    if not profile or profile.pref_embedding is None or profile.self_embedding is None:
        return []

    target_gender = _opposite_gender(profile.gender)
    if target_gender is None:
        return []

    candidates = db.execute(
        select(Profile)
        .where(Profile.id != profile.id)
        .where(Profile.gender == target_gender)
        .where(Profile.self_embedding.isnot(None))
        .where(Profile.pref_embedding.isnot(None))
    ).scalars().all()

    scored = []
    for cand in candidates:
        pref_to_self = _cosine(profile.pref_embedding, cand.self_embedding)
        self_to_pref = _cosine(profile.self_embedding, cand.pref_embedding)
        canonical_sim = _canonical_similarity(profile.canonical, cand.canonical)
        dynamic_sim = _dynamic_similarity(profile.dynamic_features, cand.dynamic_features)

        weights = []
        parts = []

        # Embedding similarities carry most weight
        if pref_to_self > 0:
            weights.append(0.4)
            parts.append(0.4 * pref_to_self)
        if self_to_pref > 0:
            weights.append(0.4)
            parts.append(0.4 * self_to_pref)

        # Structured overlaps if present
        if canonical_sim > 0:
            weights.append(0.1)
            parts.append(0.1 * canonical_sim)
        if dynamic_sim > 0:
            weights.append(0.1)
            parts.append(0.1 * dynamic_sim)

        if weights:
            score = sum(parts) / sum(weights)
        else:
            score = 0.0

        scored.append(
            {
                "profile_id": cand.id,
                "score": score,
                "canonical": cand.canonical,
                "dynamic_features": cand.dynamic_features,
                "looking_for": cand.looking_for,
            }
        )

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]
