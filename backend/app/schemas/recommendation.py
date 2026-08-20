from __future__ import annotations
from typing import Any, Literal, Optional, List
from pydantic import BaseModel, field_validator
from datetime import datetime


# ── Multi-Option Scenario Strategy Schema ───────────────────────────────────────

class RecommendationOption(BaseModel):
    id: str                                  # e.g. "opt-1", "opt-2", "opt-3"
    strategy_type: Literal["signal_timing", "dynamic_reroute", "officer_dispatch"]
    title: str
    action: str
    reason: str
    expected_impact: str                    # e.g. "-18% main corridor queue"
    side_effect_tradeoff: str               # e.g. "+4% cross-street delay"
    confidence: Literal["low", "medium", "high"]
    is_recommended: bool = False


# ── LLM output schema — validated against every API response ─────────────────

class RecommendationOutput(BaseModel):
    """
    Schema containing top action summary + 3 strategy options.
    """
    action: str
    reason: str
    expected_effect: str
    confidence: Literal["low", "medium", "high"]
    options: List[RecommendationOption] = []


# ── Recommendation with ID — returned to frontend ────────────────────────────

class RecommendationWithId(RecommendationOutput):
    id: str                              # UUID string, generated per pipeline run
    corridor_name: str
    predicted_congestion: int
    severity: str
    generated_at: str                    # ISO timestamp


# ── Co-Pilot Assistant Schemas ───────────────────────────────────────────────

class CopilotMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str

class CopilotChatInput(BaseModel):
    messages: List[CopilotMessage]
    lat: Optional[float] = 10.0601
    lon: Optional[float] = 76.6214
    city: Optional[str] = None


# ── Input context — built server-side, never from raw client input ────────────

class RecommendationContext(BaseModel):
    corridor_name: str
    current_congestion: int
    predicted_congestion: int
    severity: str
    prediction_confidence: float
    event_related: bool
    event_name: Optional[str] = None
    event_status: Optional[str] = None
    baseline_congestion_without_event: Optional[int] = None
    congestion_increase_from_event: Optional[int] = None
    event_risk: Optional[str] = None
    top_factors: List[str] = []


# ── Admin decision schemas ────────────────────────────────────────────────────

class AdminDecisionInput(BaseModel):
    recommendation_id: str              # UUID from the GET /recommendations response
    decision: Literal["accepted", "modified", "rejected"]
    recommendation_text: str           # The action text being decided on
    location_id: Optional[int] = None
    event_id: Optional[int] = None
    assigned_team: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    notes: Optional[str] = None


class AdminDecisionOut(BaseModel):
    id: int
    location_id: Optional[int]
    event_id: Optional[int]
    recommendation: str
    decision: str
    assigned_team: Optional[str]
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    notes: Optional[str]
    outcome: Optional[str]
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ── Shared API envelope — all endpoints use this shape ────────────────────────

class APIEnvelope(BaseModel):
    success: bool
    data: Any = None
    message: Optional[str] = None
    error: Optional[str] = None
