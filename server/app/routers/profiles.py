from uuid import uuid4
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..db.models import Profile
from ..utils.file_utils import save_upload_file, extract_text_from_file
from ..openai import (
    extract_features_from_pdf_text,
    build_self_text,
    build_pref_text,
    get_embedding,
)
from ..schemas.profile import ProfileResponse
from ..matching import top_matches

router = APIRouter(prefix="/profile", tags=["profile"])


@router.post("", response_model=ProfileResponse)
async def create_profile(
    who_am_i: str = Form(...),
    looking_for: str = Form(...),
    gender: str = Form(...),
    profile_file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not who_am_i.strip() or not looking_for.strip():
        raise HTTPException(status_code=400, detail="who_am_i and looking_for are required")

    # 1. Save + read file
    pdf_path = save_upload_file(profile_file)
    pdf_text = extract_text_from_file(pdf_path)

    # 2. Feature extraction + embeddings
    feat = extract_features_from_pdf_text(pdf_text)
    canonical = feat.get("canonical", {})
    dynamic = feat.get("dynamic_features", {})

    self_text = build_self_text(who_am_i, pdf_text, canonical, dynamic)
    pref_text = build_pref_text(looking_for)

    self_emb = get_embedding(self_text)
    pref_emb = get_embedding(pref_text)

    # 3. Persist
    profile = Profile(
        id=str(uuid4()),
        pdf_path=pdf_path,
        pdf_text=pdf_text,
        who_am_i=who_am_i,
        looking_for=looking_for,
        gender=gender,
        canonical=canonical,
        dynamic_features=dynamic,
        self_embedding=self_emb,
        pref_embedding=pref_emb,
    )
    db.add(profile)
    db.commit()

    return ProfileResponse(
        profile_id=profile.id,
        canonical=canonical,
        dynamic_features=dynamic,
    )


@router.get("/matches/{profile_id}", response_model=list[ProfileResponse])
def get_matches(profile_id: str, db: Session = Depends(get_db)):
    matches = top_matches(db, source_profile_id=profile_id, limit=20)
    return [ProfileResponse(**m) for m in matches]
