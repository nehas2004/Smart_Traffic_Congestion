"""Read-only service layer for the canonical synthetic traffic foundation."""

from __future__ import annotations

import csv
import json
import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib

from .traffic_contract import CONGESTION_UNIT, SEVERITY_CONFIG_VERSION, severity_for_tti


APP_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = APP_DIR / "data"
ML_DIR = APP_DIR / "ml_models"
CORRIDORS_PATH = DATA_DIR / "corridors.csv"
HISTORY_PATH = DATA_DIR / "synthetic_traffic_history.csv"
EVALUATION_PATH = ML_DIR / "tti_models" / "model_evaluation.json"
HORIZON_MINUTES = {"1h": 60, "3h": 180, "6h": 360}
SEASONAL_PERIOD = timedelta(days=7)


class TrafficDataError(RuntimeError):
    """Raised when canonical traffic data or artifacts are unavailable/invalid."""


@lru_cache(maxsize=1)
def corridors() -> dict[str, dict[str, Any]]:
    try:
        with CORRIDORS_PATH.open(newline="", encoding="utf-8") as source:
            values = list(csv.DictReader(source))
    except OSError as exc:
        raise TrafficDataError("Canonical corridor registry is unavailable") from exc
    result = {row["corridor_id"]: row for row in values}
    if len(result) != len(values) or not result:
        raise TrafficDataError("Canonical corridor registry has missing or duplicate IDs")
    return result


@lru_cache(maxsize=1)
def history_by_corridor() -> dict[str, list[dict[str, Any]]]:
    try:
        with HISTORY_PATH.open(newline="", encoding="utf-8") as source:
            raw_rows = list(csv.DictReader(source))
    except OSError as exc:
        raise TrafficDataError("Canonical traffic history is unavailable") from exc

    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for raw in raw_rows:
        timestamp = datetime.fromisoformat(raw["timestamp"].replace("Z", "+00:00"))
        row = {
            "timestamp": timestamp,
            "congestion_index": float(raw["congestion_index"]),
            "actual_travel_time_sec": float(raw["actual_travel_time_sec"]),
            "free_flow_travel_time_sec": float(raw["free_flow_travel_time_sec"]),
        }
        if not all(math.isfinite(value) for key, value in row.items() if key != "timestamp"):
            raise TrafficDataError("Canonical traffic history contains non-finite values")
        grouped[raw["corridor_id"]].append(row)

    for corridor_id, values in grouped.items():
        values.sort(key=lambda row: row["timestamp"])
        if corridor_id not in corridors():
            raise TrafficDataError(f"Traffic history references unknown corridor '{corridor_id}'")
    return dict(grouped)


@lru_cache(maxsize=1)
def evaluation_payload() -> dict[str, Any]:
    try:
        payload = json.loads(EVALUATION_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise TrafficDataError("Verified model evaluation is unavailable") from exc
    evaluations = payload.get("evaluations")
    if not isinstance(evaluations, list) or not evaluations:
        raise TrafficDataError("Verified model evaluation has no metric records")
    return payload


def iso(timestamp: datetime) -> str:
    return timestamp.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def latest_reading(corridor_id: str) -> dict[str, Any]:
    rows = history_by_corridor().get(corridor_id)
    if not rows:
        raise KeyError(corridor_id)
    return rows[-1]


def current_traffic() -> list[dict[str, Any]]:
    result = []
    for corridor_id, corridor in corridors().items():
        reading = latest_reading(corridor_id)
        result.append({
            "corridor_id": corridor_id,
            "corridor_name": corridor["corridor_name"],
            "timestamp": iso(reading["timestamp"]),
            "current_congestion": round(reading["congestion_index"], 6),
            "congestion_unit": CONGESTION_UNIT,
            "severity": severity_for_tti(reading["congestion_index"]),
            "severity_config": SEVERITY_CONFIG_VERSION,
        })
    return result


def best_evaluation_for_horizon(horizon: str) -> dict[str, Any]:
    evaluations = [
        row for row in evaluation_payload()["evaluations"]
        if row.get("horizon") == horizon and isinstance(row.get("mae"), (int, float))
    ]
    if not evaluations:
        raise TrafficDataError(f"No verified evaluation exists for horizon '{horizon}'")
    return min(evaluations, key=lambda row: row["mae"])


def forecast_for_corridor(corridor_id: str, horizon: str) -> dict[str, Any]:
    if horizon not in HORIZON_MINUTES:
        raise ValueError(horizon)
    corridor = corridors().get(corridor_id)
    if corridor is None:
        raise KeyError(corridor_id)

    source = latest_reading(corridor_id)
    prediction_time = source["timestamp"] + timedelta(minutes=HORIZON_MINUTES[horizon])
    selected_evaluation = best_evaluation_for_horizon(horizon)

    # The verified winner is Naive Seasonal.  Its prediction is the TTI seen at
    # this corridor and target time one week earlier; that row precedes the
    # forecast source time, so it is available without future leakage.
    if selected_evaluation["model_name"] != "naive_seasonal":
        raise TrafficDataError(
            "The selected model requires a serving adapter that has not been implemented"
        )
    seasonal_timestamp = prediction_time - SEASONAL_PERIOD
    seasonal_rows = {row["timestamp"]: row for row in history_by_corridor()[corridor_id]}
    seasonal_reading = seasonal_rows.get(seasonal_timestamp)
    if seasonal_reading is None:
        raise TrafficDataError("Insufficient canonical history for seasonal forecast")

    predicted_tti = seasonal_reading["congestion_index"]
    return {
        "corridor_id": corridor_id,
        "corridor_name": corridor["corridor_name"],
        "generated_at": iso(datetime.now(timezone.utc)),
        "source_timestamp": iso(source["timestamp"]),
        "horizon": horizon,
        "horizon_minutes": HORIZON_MINUTES[horizon],
        "model_name": selected_evaluation["model_name"],
        "model_version": selected_evaluation["model_version"],
        "congestion_unit": CONGESTION_UNIT,
        "predicted_congestion": round(predicted_tti, 6),
        "severity": severity_for_tti(predicted_tti),
        "severity_config": SEVERITY_CONFIG_VERSION,
        "confidence": None,
        "points": [{
            "timestamp": iso(prediction_time),
            "predicted_congestion": round(predicted_tti, 6),
            "congestion_unit": CONGESTION_UNIT,
        }],
    }


def bottlenecks() -> list[dict[str, Any]]:
    items = []
    for corridor_id, corridor in corridors().items():
        rows = history_by_corridor()[corridor_id]
        latest = rows[-1]
        one_hour_ago = rows[-5]
        recent_day = rows[-96:]
        average_delay_minutes = sum(
            (row["actual_travel_time_sec"] - row["free_flow_travel_time_sec"]) / 60
            for row in recent_day
        ) / len(recent_day)
        trend_percent = (
            (latest["congestion_index"] - one_hour_ago["congestion_index"])
            / one_hour_ago["congestion_index"]
        ) * 100
        forecast = forecast_for_corridor(corridor_id, "1h")
        items.append({
            "id": f"bn-{corridor_id}",
            "corridor_id": corridor_id,
            "corridor_name": corridor["corridor_name"],
            "window": "Latest 24h canonical history",
            "days": latest["timestamp"].date().isoformat(),
            "severity": forecast["severity"],
            "avg_delay_mins": round(average_delay_minutes, 3),
            "trend_percent": round(trend_percent, 3),
            "confidence": None,
            "congestion_unit": CONGESTION_UNIT,
            "current_congestion": round(latest["congestion_index"], 6),
            "predicted_congestion": forecast["predicted_congestion"],
            "forecast_horizon": "1h",
        })
    return sorted(items, key=lambda item: item["predicted_congestion"], reverse=True)


def model_evaluations() -> list[dict[str, Any]]:
    required = {
        "model_name", "horizon", "mae", "rmse", "evaluation_start",
        "evaluation_end", "test_rows", "model_version",
    }
    evaluations = evaluation_payload()["evaluations"]
    if any(not required.issubset(row) for row in evaluations):
        raise TrafficDataError("Verified model evaluation is missing required fields")
    return evaluations


def validate_model_artifacts() -> int:
    """Load each saved regression artifact for executable validation only."""
    paths = list((ML_DIR / "tti_models").glob("*.joblib"))
    if len(paths) != 9:
        raise TrafficDataError("Expected nine saved TTI model/scaler artifacts")
    for path in paths:
        joblib.load(path)
    return len(paths)
