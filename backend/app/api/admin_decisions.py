from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from ..db import get_db
from ..models import AdminDecision
from ..schemas.recommendation import AdminDecisionInput, AdminDecisionOut, APIEnvelope

router = APIRouter(prefix="/admin/decisions", tags=["admin"])


@router.get("", response_model=APIEnvelope)
def list_decisions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    """List decision history, newest first."""
    rows = (
        db.query(AdminDecision)
        .order_by(AdminDecision.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    total = db.query(AdminDecision).count()
    return APIEnvelope(
        success=True,
        data={
            "decisions": [AdminDecisionOut.model_validate(r).model_dump() for r in rows],
            "total": total,
            "skip": skip,
            "limit": limit,
        },
    )


@router.post("", response_model=APIEnvelope)
def create_manual_decision(body: AdminDecisionInput, db: Session = Depends(get_db)):
    """Record a manual (non-AI-originated) decision directly."""
    valid_decisions = {"accepted", "modified", "rejected"}
    if body.decision not in valid_decisions:
        return APIEnvelope(
            success=False,
            data=None,
            message=f"Invalid decision. Must be one of: {valid_decisions}",
            error="INVALID_DECISION",
        )

    row = AdminDecision(
        location_id=body.location_id,
        event_id=body.event_id,
        recommendation=body.recommendation_text,
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
        data=AdminDecisionOut.model_validate(row).model_dump(),
        message="Manual decision recorded.",
    )
