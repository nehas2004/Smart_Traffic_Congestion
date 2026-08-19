from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from ..db import get_db
from ..models import AdminDecision
from ..schemas.recommendation import AdminDecisionInput, APIEnvelope
from ..services import recommendation as svc

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("", response_model=APIEnvelope)
def get_recommendation():
    """
    Runs the full pipeline and returns a validated recommendation.
    If the LLM fails or output is invalid, returns RECOMMENDATION_UNAVAILABLE.
    The LLM output is NEVER passed through without Pydantic validation.
    """
    rec = svc.run_pipeline()
    if rec is None:
        return APIEnvelope(
            success=False,
            data=None,
            message="No recommendation available",
            error="RECOMMENDATION_UNAVAILABLE",
        )
    return APIEnvelope(success=True, data=rec.model_dump())


@router.post("/{rec_id}/decision", response_model=APIEnvelope)
def record_decision(rec_id: str, body: AdminDecisionInput, db: Session = Depends(get_db)):
    """
    Records the human planner's Accept / Modify / Reject decision.
    The decision (not the LLM output) is what gets persisted.
    """
    valid_decisions = {"accepted", "modified", "rejected"}
    if body.decision not in valid_decisions:
        return APIEnvelope(
            success=False,
            data=None,
            message=f"Invalid decision value. Must be one of: {valid_decisions}",
            error="INVALID_DECISION",
        )

    # Look up the recommendation to confirm it exists
    rec = svc.get_pending(rec_id)
    recommendation_text = rec.action if rec else body.recommendation_text

    row = AdminDecision(
        location_id=body.location_id,
        event_id=body.event_id,
        recommendation=recommendation_text,
        decision=body.decision,
        assigned_team=body.assigned_team,
        start_time=body.start_time,
        end_time=body.end_time,
        notes=body.notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return APIEnvelope(
        success=True,
        data={"decision_id": row.id, "decision": row.decision},
        message=f"Decision '{body.decision}' recorded successfully.",
    )
