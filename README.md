# Match Maker

Full-stack matchmaking app with a FastAPI backend (Postgres + pgvector + OpenAI) and a Vite/React frontend.

## Prerequisites
- Docker + Docker Compose
- Node.js 18+
- OpenAI API key (for embeddings/feature extraction)

## Quick Start
```bash
# Backend
cp server/.env.example server/.env   # set OPENAI_API_KEY, DB creds if needed
cd server
make up   # or: docker compose up --build

# Frontend (in a separate shell)
cd ../client
npm install
echo 'VITE_API_BASE=http://localhost:8000' > .env.local   # optional if not default
npm run dev  # http://localhost:5173
```

## Services
- API: http://localhost:8000 (Swagger at `/docs`)
- DB: Postgres with pgvector on localhost:5432

## Environment
`server/.env` (copied from `.env.example`):
- `DATABASE_URL` — connection string for Postgres
- `POSTGRES_*` — credentials for the db container
- `OPENAI_API_KEY` — required for real embeddings/feature extraction
- `UPLOAD_DIR` — where uploaded files are stored in the container
- `EMBEDDING_DIM` — currently 1536 (matches text-embedding-3-small)

Client env (optional): `client/.env.local` with `VITE_API_BASE=http://localhost:8000`

## API Endpoints
- `POST /profile`  
  Multipart form: `profile_file` (pdf/doc/docx), `who_am_i`, `looking_for`, `gender`.  
  Behavior: saves file, extracts text, builds canonical/dynamic features via OpenAI, generates `self_embedding` and `pref_embedding`, persists profile.
- `GET /profile/{profile_id}`  
  Returns the stored profile (canonical, dynamic_features, who_am_i, looking_for).
- `GET /profile/matches/{profile_id}`  
  Returns scored matches (opposite gender) with `score`, `canonical`, `dynamic_features`, and `looking_for`.
- `GET /profile/matches/ai/{profile_id}`  
  Re-ranks the match shortlist with an LLM for nuanced scoring (respects flexible prefs like “any location”).

## Matching Logic
- Retrieval: pref vs candidate self, self vs candidate pref (embeddings), canonical overlap, dynamic overlap; opposite gender filter; weights normalized by available signals.
- AI: LLM re-ranker incorporates stated flexibility (e.g., “any location”) to avoid penalizing flexible fields.

## Development Commands
From `server/`:
- `make build` — build images
- `make up` — start stack with build
- `make down` — stop stack
- `make logs` — tail logs
- `make ps` — service status
- `make shell` — psql into db
- `make restart` — down then up with build

From `client/`:
- `npm install`
- `npm run dev` / `npm run build`

## Data / Schema
- First run initializes pgvector and the `profiles` table via `server/migrations/init.sql`.
- Columns include `gender`, `who_am_i`, `looking_for`, `canonical`, `dynamic_features`, `self_embedding`, `pref_embedding`, plus raw file paths/text.

## Troubleshooting
- CORS: allowed for http://localhost:5173 by default.
- OpenAI errors/rate limits: embeddings/features fall back to zeros/empty; matching quality drops.
- Schema changes: reset the DB volume (`docker compose down -v && docker compose up --build`) or apply migrations manually.
- Vector errors (dimension mismatch): ensure `EMBEDDING_DIM` matches the table definition and the embedding model.
