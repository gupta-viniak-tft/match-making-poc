from typing import Any, Dict, Optional

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
