from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from pgvector.sqlalchemy import Vector

from .session import Base
from ..config import settings


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String, primary_key=True)
    gender = Column(String, nullable=False)

    # Raw
    pdf_path = Column(String, nullable=True)
    pdf_text = Column(Text, nullable=True)

    who_am_i = Column(Text, nullable=False)
    looking_for = Column(Text, nullable=False)

    # Canonical + dynamic features from LLM
    canonical = Column(JSONB, nullable=True)         # standard fields (age, city, etc.)
    dynamic_features = Column(JSONB, nullable=True)  # free-form traits

    # Embeddings
    self_embedding = Column(Vector(settings.embedding_dim), nullable=True)
    pref_embedding = Column(Vector(settings.embedding_dim), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
