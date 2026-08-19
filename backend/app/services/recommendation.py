"""
AI Recommendation Service
=========================
Closed pipeline: upstream data → context → fixed prompt → OpenAI → Pydantic validation.
Malformed LLM output is NEVER passed to the client — always falls back silently.
"""
from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import ValidationError

from ..schemas.recommendation import (
    RecommendationContext,
    RecommendationOutput,
    RecommendationWithId,
)

load_dotenv()

logger = logging.getLogger(__name__)

# ── OpenAI client — key comes from env, never hardcoded ──────────────────────
_client: Optional[OpenAI] = None

def _get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY not set in environment")
        _client = OpenAI(api_key=api_key)
    return _client


# ── In-memory store of pending recommendations (keyed by UUID) ───────────────
# In production: persist to DB and add TTL. Fine for hackathon scope.
_pending: dict[str, RecommendationWithId] = {}


# ── Mock upstream data — swap fetch functions below for real endpoints ────────
# Frozen shapes match Section 4 of the spec exactly.
# To use real endpoints: replace the return value with an HTTP call to
# Shadeed's /traffic/forecast and Sankhana's /events/{id}/impact.

def _fetch_traffic_forecast() -> dict:
    """
    PLACEHOLDER: returns mock matching Shadeed's /traffic/forecast frozen shape.
    One-line swap: replace with requests.get(TRAFFIC_FORECAST_URL).json()
    """
    return {
        "corridor_id": 12,
        "corridor_name": "Kaloor",
        "timestamp": "2026-08-20T17:30:00",
        "current_congestion": 72,
        "predicted_congestion": 91,
        "severity": "critical",
        "confidence": 0.87,
    }


def _fetch_event_impact() -> dict:
    """
    PLACEHOLDER: returns mock matching Sankhana's /events/{id}/impact frozen shape
    plus the event metadata fields needed to build the context object.
    One-line swap: replace with requests.get(EVENT_IMPACT_URL).json()
    """
    return {
        "baseline_congestion": 70,
        "event_congestion": 90,
        "difference": 20,
        "risk": "high",
        # These fields would come from the parent event object in the real system:
        "event_name": "Kochi Music Festival",
        "event_status": "confirmed",
    }


# ── Server-side factor derivation — LLM never guesses this ───────────────────

def _derive_top_factors(traffic: dict, event: dict) -> list[str]:
    """
    PLACEHOLDER heuristic — replace with Shadeed's real feature-importance output
    when that becomes available. Currently uses simple threshold rules.
    Returns factors ordered by estimated weight, highest first.
    """
    factors: list[tuple[str, float]] = []

    # Event overlap: weight proportional to congestion increase from event
    event_delta = event.get("difference", 0)
    if event_delta > 0:
        weight = min(event_delta / 30.0, 0.70)   # cap at 0.70
        factors.append(("event_overlap", round(weight, 2)))

    # Peak hour: simple time-of-day bucket (7–10 AM or 4–8 PM)
    hour = datetime.now().hour
    if 7 <= hour <= 10 or 16 <= hour <= 20:
        factors.append(("peak_hour", 0.24))
    else:
        factors.append(("off_peak", 0.10))

    # Weather placeholder — will use real condition once weather context is piped in
    factors.append(("weather", 0.14))

    # Sort by weight, return names only
    factors.sort(key=lambda x: x[1], reverse=True)
    return [f[0] for f in factors[:3]]


# ── Build structured context object ──────────────────────────────────────────

def build_context(traffic: dict, event: dict, top_factors: list[str]) -> RecommendationContext:
    event_related = event.get("difference", 0) > 5
    return RecommendationContext(
        corridor_name=traffic["corridor_name"],
        current_congestion=traffic["current_congestion"],
        predicted_congestion=traffic["predicted_congestion"],
        severity=traffic["severity"],
        prediction_confidence=traffic["confidence"],
        event_related=event_related,
        event_name=event.get("event_name") if event_related else None,
        event_status=event.get("event_status") if event_related else None,
        baseline_congestion_without_event=event.get("baseline_congestion") if event_related else None,
        congestion_increase_from_event=event.get("difference") if event_related else None,
        event_risk=event.get("risk") if event_related else None,
        top_factors=top_factors,
    )


# ── Fixed prompt template — varies only in injected context values ────────────

SYSTEM_PROMPT = """\
You are a traffic-management advisory assistant for a city planning dashboard.
You analyze structured traffic and event data and produce ONE mitigation
recommendation for a human city planner to review.

You do not control any system. You do not take any action. Your output is
advisory only and will be shown to a human who can accept, modify, or reject it.

Respond with ONLY a single JSON object. No markdown formatting, no code fences,
no explanation text before or after the JSON. The JSON object must have exactly
these four keys and no others:

{
  "action": "<one short, concrete, actionable recommendation>",
  "reason": "<one short sentence citing the specific data that justifies it>",
  "expected_effect": "<one short sentence on the plausible outcome, phrased with uncertainty e.g. may, could>",
  "confidence": "<exactly one of: low, medium, high>"
}

Base your recommendation strictly on the data provided in the user message.
Do not invent corridor names, event names, or numbers that were not given to you.
Do not recommend anything outside the scope of traffic monitoring, signal timing,
rerouting suggestions, personnel deployment, or public alerts.
If the data does not clearly indicate a problem, recommend routine monitoring with
"low" confidence rather than inventing urgency.\
"""


def _build_user_prompt(ctx: RecommendationContext) -> str:
    event_section = ""
    if ctx.event_related:
        event_section = (
            f"\nEvent: {ctx.event_name} ({ctx.event_status})"
            f"\nBaseline congestion without event: {ctx.baseline_congestion_without_event}%"
            f"\nCongestion increase attributed to event: {ctx.congestion_increase_from_event} points"
            f"\nEvent risk level: {ctx.event_risk}"
        )

    return (
        f"Corridor: {ctx.corridor_name}\n"
        f"Current congestion: {ctx.current_congestion}%\n"
        f"Predicted congestion: {ctx.predicted_congestion}%\n"
        f"Severity: {ctx.severity}\n"
        f"Prediction confidence: {ctx.prediction_confidence}\n"
        f"\nEvent-related: {ctx.event_related}"
        f"{event_section}\n"
        f"\nTop contributing factors: {', '.join(ctx.top_factors)}\n"
        f"\nProduce your JSON recommendation now."
    )


# ── LLM call + validation ─────────────────────────────────────────────────────

def _call_llm(ctx: RecommendationContext) -> Optional[RecommendationOutput]:
    """
    Calls OpenAI, strips accidental markdown fences, validates output against
    RecommendationOutput schema. Returns None on ANY failure — never raises.
    """
    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    user_prompt = _build_user_prompt(ctx)

    try:
        response = _get_client().chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=300,
            top_p=0.9,
            response_format={"type": "json_object"},  # JSON mode — second safety layer
        )

        raw = response.choices[0].message.content or ""

        # Defensively strip markdown fences even though prompt forbids them
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[-2] if "```" in raw else raw
            raw = raw.removeprefix("json").strip()

        parsed = json.loads(raw)
        output = RecommendationOutput.model_validate(parsed)
        return output

    except (json.JSONDecodeError, ValidationError) as exc:
        logger.warning("LLM output failed validation — falling back silently. Raw: %r | Error: %s", raw if 'raw' in dir() else '<no output>', exc)
        return None
    except Exception as exc:
        logger.error("LLM call failed: %s", exc)
        return None


# ── Public pipeline entry point ───────────────────────────────────────────────

def run_pipeline() -> Optional[RecommendationWithId]:
    """
    Full pipeline: fetch upstream data → build context → call LLM → validate.
    Returns a RecommendationWithId on success, None on any failure.
    """
    traffic = _fetch_traffic_forecast()
    event = _fetch_event_impact()
    top_factors = _derive_top_factors(traffic, event)
    ctx = build_context(traffic, event, top_factors)
    output = _call_llm(ctx)

    if output is None:
        return None

    rec_id = str(uuid.uuid4())
    rec = RecommendationWithId(
        id=rec_id,
        corridor_name=ctx.corridor_name,
        predicted_congestion=ctx.predicted_congestion,
        severity=ctx.severity,
        generated_at=datetime.utcnow().isoformat() + "Z",
        **output.model_dump(),
    )
    _pending[rec_id] = rec
    return rec


def get_pending(rec_id: str) -> Optional[RecommendationWithId]:
    return _pending.get(rec_id)
