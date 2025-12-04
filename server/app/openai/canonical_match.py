import json
import logging
from typing import Any, Dict, List, Optional

from openai import APIError, RateLimitError

from .client import client
from .prompts import CANONICAL_MATCH_SYSTEM_PROMPT

DEFAULT_FIELD_LABELS = {
    "name": "Name",
    "approx_age": "Approx Age",
    "dob": "Date of Birth",
    "city": "City",
    "state": "State",
    "country": "Country",
    "education": "Education",
    "profession": "Profession",
    "religion": "Religion",
    "caste": "Caste",
    "height": "Height",
}

ALLOWED_FIELDS = {
    "caste",
    "height",
    "education",
    "approx_age",
    "profession",
}


def _normalize_value(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return str(value)
    text = str(value).strip()
    return text or None


def _clean_canonical(data: Dict[str, Any] | None) -> Dict[str, Any]:
    if not data:
        return {}
    cleaned: Dict[str, Any] = {}
    for key, value in data.items():
        if key in ALLOWED_FIELDS:
            cleaned[key] = _normalize_value(value)
    return cleaned


def _label_for(field: str) -> str:
    if field in DEFAULT_FIELD_LABELS:
        return DEFAULT_FIELD_LABELS[field]
    return " ".join(part.capitalize() for part in field.split("_"))


def _fallback_scores(seeker: Dict[str, Any], candidate: Dict[str, Any]) -> Dict[str, Any]:
    """
    Cheap deterministic scoring when LLM is unavailable.
    """
    fields: List[Dict[str, Any]] = []
    numeric_fields = {"approx_age", "height"}
    scores: List[float] = []
    keys = sorted(set(seeker.keys()) | set(candidate.keys()))
    for key in keys:
        s_val = seeker.get(key)
        c_val = candidate.get(key)
        label = _label_for(key)
        if s_val is None or c_val is None:
            fields.append(
                {
                    "field": key,
                    "label": label,
                    "seeker_value": s_val,
                    "candidate_value": c_val,
                    "score": None,
                    "reason": "Missing value for one side.",
                }
            )
            continue

        score = 0.0
        reason = "Values differ."
        if key in numeric_fields:
            try:
                s_num = float(s_val)
                c_num = float(c_val)
                diff = abs(s_num - c_num)
                if diff <= 1:
                    score = 1.0
                    reason = "Values are essentially the same."
                elif diff <= 3:
                    score = 0.7
                    reason = "Values are close."
                elif diff <= 5:
                    score = 0.4
                    reason = "Values are somewhat apart."
                else:
                    score = 0.1
                    reason = "Values are far apart."
            except Exception:
                score = 1.0 if str(s_val).lower() == str(c_val).lower() else 0.0
                reason = "Textual comparison only."
        else:
            score = 1.0 if str(s_val).lower() == str(c_val).lower() else 0.0
            reason = "Exact match." if score == 1.0 else "Values are different."

        scores.append(score)
        fields.append(
            {
                "field": key,
                "label": label,
                "seeker_value": s_val,
                "candidate_value": c_val,
                "score": score,
                "reason": reason,
            }
        )

    overall = sum(scores) / len(scores) if scores else None
    return {
        "overall_score": overall,
        "summary": "Basic rule-based comparison (LLM unavailable).",
        "fields": fields,
    }


def _clamp_score(val: Any) -> Optional[float]:
    try:
        num = float(val)
    except (TypeError, ValueError):
        return None
    return max(0.0, min(1.0, num))


def score_canonical_fields(
    seeker_canonical: Dict[str, Any] | None,
    candidate_canonical: Dict[str, Any] | None,
) -> Dict[str, Any]:
    seeker = _clean_canonical(seeker_canonical)
    candidate = _clean_canonical(candidate_canonical)
    if not seeker and not candidate:
        return {"overall_score": None, "summary": "No canonical data provided.", "fields": []}

    base_keys = sorted(set(seeker.keys()) | set(candidate.keys()))
    base_fallback = _fallback_scores(seeker, candidate)

    if not client.api_key:
        return base_fallback

    payload = {"seeker_canonical": seeker, "candidate_canonical": candidate}
    messages = [
        {"role": "system", "content": CANONICAL_MATCH_SYSTEM_PROMPT},
        {"role": "user", "content": json.dumps(payload)},
    ]

    try:
        resp = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        content = resp.choices[0].message.content
        data = json.loads(content or "{}")
    except (RateLimitError, APIError) as exc:
        logging.warning("Canonical match LLM error: %s", exc)
        return base_fallback
    except Exception as exc:  # defensive
        logging.warning("Canonical match unexpected error: %s", exc)
        return base_fallback

    fields = data.get("fields") if isinstance(data, dict) else None
    if not isinstance(fields, list):
        fields = []

    field_map = {}
    for item in fields:
        if not isinstance(item, dict):
            continue
        key = item.get("field")
        if not key:
            continue
        field_map[key] = {
            "field": key,
            "label": item.get("label") or _label_for(key),
            "seeker_value": item.get("seeker_value", seeker.get(key)),
            "candidate_value": item.get("candidate_value", candidate.get(key)),
            "score": _clamp_score(item.get("score")),
            "reason": item.get("reason"),
        }

    for key in base_keys:
        if key not in field_map:
            base = next((f for f in base_fallback["fields"] if f["field"] == key), None)
            field_map[key] = base or {
                "field": key,
                "label": _label_for(key),
                "seeker_value": seeker.get(key),
                "candidate_value": candidate.get(key),
                "score": None,
                "reason": "Not scored.",
            }

    fields_out: List[Dict[str, Any]] = list(field_map.values())
    fields_out.sort(key=lambda f: f["label"])

    overall = _clamp_score(data.get("overall_score"))
    if overall is None:
        scored_values = [f["score"] for f in fields_out if isinstance(f.get("score"), (int, float))]
        overall = sum(scored_values) / len(scored_values) if scored_values else None

    return {
        "overall_score": overall,
        "summary": data.get("summary") or base_fallback.get("summary"),
        "fields": fields_out,
    }
