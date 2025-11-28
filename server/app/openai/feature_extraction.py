import json
import logging

from openai import APIError, RateLimitError

from .client import client
from .prompts import EXTRACTION_SYSTEM_PROMPT


def _call_responses_api(pdf_text: str) -> str:
    return client.responses.create(
        model="gpt-4.1-mini",
        input=[
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": pdf_text[:6000]},
        ],
        response_format={"type": "json_object"},
    ).output[0].content[0].text


def _call_chat_api(pdf_text: str) -> str:
    resp = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": pdf_text[:6000]},
        ],
        response_format={"type": "json_object"},
    )
    return resp.choices[0].message.content


def extract_features_from_pdf_text(pdf_text: str) -> dict:
    if not pdf_text.strip():
        return {"canonical": {}, "dynamic_features": {}}

    # Prefer responses API; fall back to chat completion if running an older SDK.
    if not client.api_key:
        # Dev fallback when no API key is configured
        return {"canonical": {}, "dynamic_features": {}}

    try:
        try:
            content = _call_responses_api(pdf_text)
        except TypeError:
            content = _call_chat_api(pdf_text)
    except (RateLimitError, APIError) as exc:
        logging.warning("OpenAI feature extraction failed: %s", exc)
        return {"canonical": {}, "dynamic_features": {}}
    except Exception as exc:  # safety net
        logging.warning("OpenAI feature extraction unexpected error: %s", exc)
        return {"canonical": {}, "dynamic_features": {}}

    try:
        data = json.loads(content)
    except Exception as exc:
        logging.warning("OpenAI feature extraction JSON parse error: %s", exc)
        return {"canonical": {}, "dynamic_features": {}}

    return data


def build_self_text(who_am_i: str, pdf_text: str, canonical: dict, dynamic: dict) -> str:
    parts = [
        f"Who am I: {who_am_i}",
        "",
        "Profile details:",
        json.dumps(canonical, ensure_ascii=False),
        "",
        "Other info:",
        json.dumps(dynamic, ensure_ascii=False),
        "",
        "Original PDF text:",
        pdf_text,
    ]
    return "\n".join(parts)


def build_pref_text(looking_for: str) -> str:
    return f"What am I looking for: {looking_for}"
