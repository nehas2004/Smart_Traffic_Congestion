"""
FastAPI entry point for the AI Recommendation module.
Runs on port 8000. Next.js frontend calls http://localhost:8000.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.db import engine, Base
from app.api.recommendations import router as rec_router
from app.api.admin_decisions import router as decisions_router

# Create all tables on startup (SQLite auto-creates the file)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Traffic — AI Recommendation API",
    description="Closed LLM pipeline: traffic forecast → GPT-4o-mini → validated JSON → human decision",
    version="1.0.0",
)

# Allow Next.js dev server to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rec_router)
app.include_router(decisions_router)


@app.get("/health")
def health():
    return {"status": "ok", "module": "ai-recommendation"}
