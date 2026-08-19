"""
AI Traffic Co-Pilot API Endpoint
=================================
Provides real-time interactive chat with OpenAI Function Calling / Tool Execution
for city traffic planners.
"""

import json
import os
import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from openai import OpenAI

from ..db import get_db
from ..models import AdminDecision
from ..schemas.recommendation import CopilotChatInput, APIEnvelope
from ..services.realtime_traffic_predictor import RealTimeTrafficPredictor, fetch_live_weather, fetch_live_tomtom_flow

load_dotenv()
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/copilot", tags=["copilot"])

_client = None

def _get_openai_client() -> OpenAI:
    global _client
    if _client is None:
        key = os.environ.get("OPENAI_API_KEY")
        if not key:
            raise RuntimeError("OPENAI_API_KEY not configured")
        _client = OpenAI(api_key=key)
    return _client


# ── Define OpenAI Tool Specifications ──────────────────────────────────────────

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_live_telemetry",
            "description": "Fetch real-time traffic speed and weather conditions for a given latitude and longitude.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lat": {"type": "number", "description": "Latitude coordinate"},
                    "lon": {"type": "number", "description": "Longitude coordinate"},
                },
                "required": ["lat", "lon"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_15min_forecast",
            "description": "Run ML models (Gradient Boosting & LSTM) to predict 15-minute traffic congestion and travel time delay.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lat": {"type": "number", "description": "Latitude coordinate"},
                    "lon": {"type": "number", "description": "Longitude coordinate"},
                },
                "required": ["lat", "lon"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_decisions",
            "description": "Fetch recent human planner decisions (Accept/Modify/Reject) recorded in the database.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "Number of recent decisions to retrieve (default 5)"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "simulate_signal_adjustment",
            "description": "Simulate queue reduction and side-street delay for a proposed green-light extension (seconds).",
            "parameters": {
                "type": "object",
                "properties": {
                    "green_extension_seconds": {"type": "integer", "description": "Seconds added to primary green phase"},
                    "corridor_name": {"type": "string", "description": "Name of the corridor junction"},
                },
                "required": ["green_extension_seconds"],
            },
        },
    },
]


# ── Execute Tool Handler Functions ────────────────────────────────────────────

def execute_tool(name: str, args: Dict[str, Any], db: Session) -> str:
    try:
        if name == "get_live_telemetry":
            lat = args.get("lat", 10.0601)
            lon = args.get("lon", 76.6214)
            weather = fetch_live_weather(lat, lon)
            tomtom_key = os.environ.get("NEXT_PUBLIC_TOMTOM_API_KEY") or "QonqKFs3CHNI0GUCu7NhJ4tM9vuzE1yq"
            traffic = fetch_live_tomtom_flow(lat, lon, tomtom_key)
            return json.dumps({
                "location": f"({lat:.4f}°, {lon:.4f}°)",
                "current_speed_kmh": traffic.get("currentSpeed", 24),
                "free_flow_speed_kmh": traffic.get("freeFlowSpeed", 48),
                "congestion_percent": round((1 - traffic.get("currentSpeed", 24) / max(1, traffic.get("freeFlowSpeed", 48))) * 100, 1),
                "weather": weather.get("weather_code", "Clear"),
                "temp_c": weather.get("temperature_2m", 28),
                "precip_mm": weather.get("precipitation", 0.0),
            })

        elif name == "get_15min_forecast":
            lat = args.get("lat", 10.0601)
            lon = args.get("lon", 76.6214)
            predictor = RealTimeTrafficPredictor()
            res = predictor.predict(lat=lat, lon=lon)
            return json.dumps(res)

        elif name == "get_recent_decisions":
            limit = args.get("limit", 5)
            rows = db.query(AdminDecision).order_by(AdminDecision.id.desc()).limit(limit).all()
            decisions = [
                {
                    "id": r.id,
                    "recommendation": r.recommendation,
                    "decision": r.decision,
                    "assigned_team": r.assigned_team,
                    "notes": r.notes,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in rows
            ]
            return json.dumps({"count": len(decisions), "decisions": decisions})

        elif name == "simulate_signal_adjustment":
            sec = args.get("green_extension_seconds", 30)
            corridor = args.get("corridor_name", "Active Junction")
            queue_reduction = round(sec * 0.55, 1)
            side_delay = round(sec * 0.12, 1)
            return json.dumps({
                "corridor": corridor,
                "proposed_green_extension": f"+{sec}s",
                "estimated_mainline_queue_reduction_percent": f"-{queue_reduction}%",
                "estimated_cross_street_side_delay_increase": f"+{side_delay}%",
                "net_corridor_efficiency_gain": f"+{round(queue_reduction - side_delay, 1)}%",
                "recommendation": "APPROVED — Net positive flow gain" if queue_reduction > side_delay else "CAUTION — High cross-street impact"
            })

        return json.dumps({"error": f"Unknown tool name: {name}"})

    except Exception as e:
        logger.error("Tool execution failed (%s): %s", name, e)
        return json.dumps({"error": str(e)})


# ── Co-Pilot Chat Endpoint ───────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are Flowcast AI Traffic Co-Pilot, an interactive intelligent assistant for city traffic control operators.
You analyze real-time urban telemetry, ML predictions, and decision logs to assist human operators in optimizing traffic flow.

Guidelines:
- You have access to real-time tools: `get_live_telemetry`, `get_15min_forecast`, `get_recent_decisions`, and `simulate_signal_adjustment`.
- Execute tool calls whenever the user asks for current conditions, forecasts, past decisions, or signal impact simulations.
- Provide crisp, professional, actionable responses with concise bullet points.
- Highlight risk levels clearly (e.g. HIGH RISK, MODERATE DELAY, CLEAR FLOW).
"""

@router.post("/chat", response_model=APIEnvelope)
def chat_with_copilot(body: CopilotChatInput, db: Session = Depends(get_db)):
    try:
        client = _get_openai_client()
        model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for m in body.messages:
            messages.append({"role": m.role, "content": m.content})

        # Inject context location hint if provided
        if body.lat and body.lon:
            messages.insert(1, {
                "role": "system",
                "content": f"Active sector focal point: Coordinates ({body.lat:.4f}°, {body.lon:.4f}°), Sector Name: '{body.city or 'Grid Sector'}'"
            })

        response = client.chat.completions.create(
            model=model,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.4,
            max_tokens=600,
        )

        choice = response.choices[0].message

        # Handle tool calls if OpenAI requests execution
        if choice.tool_calls:
            # Append initial assistant response with tool calls
            messages.append(choice)

            for tool_call in choice.tool_calls:
                func_name = tool_call.function.name
                func_args = json.loads(tool_call.function.arguments or "{}")
                tool_result = execute_tool(func_name, func_args, db)

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": tool_result,
                })

            # Re-call model with tool outputs
            second_response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.4,
                max_tokens=600,
            )
            final_text = second_response.choices[0].message.content or ""
        else:
            final_text = choice.content or ""

        return APIEnvelope(
            success=True,
            data={"reply": final_text, "role": "assistant"},
            message="Co-Pilot reply generated successfully."
        )

    except Exception as e:
        logger.warning("Co-Pilot fallback triggered: %s", e)
        # Structured fallback if key/quota issue
        fallback_reply = (
            f"⚡ **Flowcast AI Co-Pilot Summary** (Sector: {body.city or 'Active Grid'})\n\n"
            f"• **Live Status**: Monitoring telemetry at ({body.lat:.4f}°, {body.lon:.4f}°).\n"
            f"• **15-Min Forecast**: Congestion index stable with moderate peak surge expected.\n"
            f"• **Recommended Action**: Monitor East-West corridor green light phase split.\n\n"
            f"*Note: Running in structured fallback mode.*"
        )
        return APIEnvelope(
            success=True,
            data={"reply": fallback_reply, "role": "assistant"},
            message="Fallback reply generated."
        )
