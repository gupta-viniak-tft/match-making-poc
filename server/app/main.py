from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy import text

from .db import Base, engine
from .routers import profiles

app = FastAPI(
    title="AI Match Maker Backend",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def init_db():
    # Ensure pgvector extension exists before creating tables
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    # Create tables if they do not exist (use migrations for production)
    Base.metadata.create_all(bind=engine)


app.include_router(profiles.router)


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")
