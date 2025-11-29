-- Initialize database schema for match-maker

-- Ensure pgvector is available for embedding columns
CREATE EXTENSION IF NOT EXISTS vector;
-- Optional: enable trigram matching if needed later
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id                 VARCHAR PRIMARY KEY,
    gender             VARCHAR NOT NULL,
    pdf_path           VARCHAR,
    pdf_text           TEXT,
    location_lat       DOUBLE PRECISION,
    location_lon       DOUBLE PRECISION,
    who_am_i           TEXT NOT NULL,
    looking_for        TEXT NOT NULL,
    canonical          JSONB,
    dynamic_features   JSONB,
    self_embedding     vector(1536),
    pref_embedding     vector(1536),
    created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Vector indexes for faster ANN search (tune lists based on dataset size)
CREATE INDEX IF NOT EXISTS idx_profiles_self_ivfflat
    ON profiles
    USING ivfflat (self_embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_profiles_pref_ivfflat
    ON profiles
    USING ivfflat (pref_embedding vector_cosine_ops)
    WITH (lists = 100);
