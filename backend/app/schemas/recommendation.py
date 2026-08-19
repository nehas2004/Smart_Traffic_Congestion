from __future__ import annotations
from typing import Any, Literal, Optional, List
from pydantic import BaseModel, field_validator
from datetime import datetime


# ── LLM output schema — validated against every API response ─────────────────

class RecommendationOutput(BaseModel):
    """
    Exact 4-field schema the LLM must return.
    Any deviation causes silent fallback — never surfaced to the client.
    """
    action: str
    reason: str
    expected_effect: str
    confidence: Literal["low", "medium", "high"]

    @field_validator("action", "reason", "expected_effect")
    @classmethod
    def no_empty_strings(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be empty")
        # Soft truncation guard — reject if suspiciously long (LLM hallucination)
        if len(v) > 500:
            raise ValueError(f"Field too long ({len(v)} chars), expected < 500")
        return v.strip()

    model_config = {"extra": "forbid"}   # Reject any extra keys the LLM adds


# ── Recommendation with ID — returned to frontend ────────────────────────────

class RecommendationWithId(RecommendationOutput):
    id: str                              # UUID string, generated per pipeline run
    corridor_name: str
    predicted_congestion: int
    severity: str
    generated_at: str                    # ISO timestamp


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
