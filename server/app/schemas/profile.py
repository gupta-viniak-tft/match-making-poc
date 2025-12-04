from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ProfileCreate(BaseModel):
    who_am_i: str = Field(..., min_length=1)
    looking_for: str = Field(..., min_length=1)


class ProfileResponse(BaseModel):
    profile_id: str
    canonical: Optional[Dict[str, Any]] = None
    dynamic_features: Optional[Dict[str, Any]] = None
    score: Optional[float] = None
    base_score: Optional[float] = None
    looking_for: Optional[str] = None
    components: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None
    who_am_i: Optional[str] = None
    pref_to_self_reason: Optional[str] = None
    self_to_pref_reason: Optional[str] = None
    location_reason: Optional[str] = None
    location_open: Optional[bool] = None

    class Config:
        from_attributes = True


class CanonicalFieldScore(BaseModel):
    field: str
    label: str
    seeker_value: Optional[Any] = None
    candidate_value: Optional[Any] = None
    score: Optional[float] = None
    reason: Optional[str] = None


class CanonicalMatchRequest(BaseModel):
    seeker_canonical: Dict[str, Any]
    candidate_canonical: Dict[str, Any]


class CanonicalMatchResponse(BaseModel):
    overall_score: Optional[float] = None
    summary: Optional[str] = None
    fields: List[CanonicalFieldScore] = Field(default_factory=list)
