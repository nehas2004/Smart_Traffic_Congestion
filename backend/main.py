"""
FastAPI entry point for the AI Recommendation module.
Runs on port 8000. Next.js frontend calls http://localhost:8000.
"""
import sys
from pathlib import Path

# Ensure backend root is in sys.path for local module resolution
_BACKEND_DIR = Path(__file__).resolve().parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.db import engine, Base
from app.api.recommendations import router as rec_router
from app.api.admin_decisions import router as decisions_router
from app.api.copilot import router as copilot_router
from app.api.traffic import router as traffic_router

# Create all tables on startup (SQLite auto-creates the file)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Traffic — AI Recommendation API",
    description="Closed LLM pipeline: traffic forecast → GPT-4o-mini → validated JSON → human decision",
    version="1.0.0",
)

# Allow Next.js frontend (local and deployed) to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rec_router)
app.include_router(decisions_router)
app.include_router(traffic_router)
app.include_router(copilot_router)


@app.get("/health")
def health():
    return {"status": "ok", "module": "ai-recommendation"}


@app.get("/predict")
def predict_traffic(lat: float = 10.05, lon: float = 76.62):
    try:
        from app.services.realtime_traffic_predictor import RealTimeTrafficPredictor
        predictor = RealTimeTrafficPredictor()
        return predictor.predict(lat=lat, lon=lon)
    except Exception as e:
        return {
            "error": str(e),
            "message": "Make sure PyTorch (torch) and scikit-learn/joblib are installed in backend env",
        }
