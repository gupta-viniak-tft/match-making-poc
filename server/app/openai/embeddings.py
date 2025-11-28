import logging
from typing import List

from openai import APIError, RateLimitError

from ..config import settings
from .client import client


def _normalize_embedding(vec: List[float]) -> List[float]:
    target = settings.embedding_dim
    if len(vec) == target:
        return vec
    if len(vec) > target:
        return vec[:target]
    # pad with zeros if shorter
    return vec + [0.0] * (target - len(vec))


def get_embedding(text: str) -> List[float]:
    if not text.strip() or not client.api_key:
        return [0.0] * settings.embedding_dim

    try:
        resp = client.embeddings.create(
            model="text-embedding-3-small",
            input=text,
        )
        raw = resp.data[0].embedding
        return _normalize_embedding(raw)
    except (RateLimitError, APIError) as exc:
        logging.warning("OpenAI embeddings failed: %s", exc)
        return [0.0] * settings.embedding_dim
    except Exception as exc:
        logging.warning("OpenAI embeddings unexpected error: %s", exc)
        return [0.0] * settings.embedding_dim
