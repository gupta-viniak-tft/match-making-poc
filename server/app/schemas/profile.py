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
    looking_for: Optional[str] = None

    class Config:
        from_attributes = True
