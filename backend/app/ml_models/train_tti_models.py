"""Train and evaluate TTI models on the canonical synthetic traffic history.

This module is deliberately separate from realtime_traffic_predictor.py.  The
existing /predict endpoint remains a travel-time predictor; these artifacts
model the documented dimensionless Travel Time Index (TTI) for later traffic
API work.
"""

from __future__ import annotations

import csv
import json
import math
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.preprocessing import StandardScaler


ML_DIR = Path(__file__).resolve().parent
DATA_PATH = ML_DIR.parent / "data" / "synthetic_traffic_history.csv"
ARTIFACT_DIR = ML_DIR / "tti_models"
EVALUATION_PATH = ARTIFACT_DIR / "model_evaluation.json"
MODEL_VERSION = "tti-synthetic-v1"
INTERVAL_MINUTES = 15
SEASONAL_PERIOD_STEPS = 7 * 24 * 60 // INTERVAL_MINUTES
HORIZONS = {"1h": 60, "3h": 180, "6h": 360}

# All fields below are known at the source timestamp.  In particular, this
# excludes actual speed, travel time and the target TTI from model inputs.
FEATURE_NAMES = [
    "free_flow_speed_kmph",
    "segment_length_m",
    "functional_class",
    "lanes",
    "capacity_total",
    "hour_sin",
    "hour_cos",
    "dow_sin",
    "dow_cos",
    "is_weekend",
    "is_holiday",
    "rainfall_mm",
    "temperature_c",
    "wind_speed_mps",
    "weather_code",
    "lag_15",
    "lag_30",
    "lag_60",
    "rolling_1h_avg",
    "road_type_arterial",
    "road_type_collector",
    "road_type_local",
]


@dataclass(frozen=True)
class Metric:
    model_name: str
    horizon: str
    mae: float
    rmse: float
    evaluation_start: str
    evaluation_end: str
    test_rows: int
    model_version: str


def load_rows() -> list[dict[str, Any]]:
    with DATA_PATH.open(newline="", encoding="utf-8") as source:
        raw_rows = list(csv.DictReader(source))
    if not raw_rows:
        raise ValueError("Canonical traffic history is empty")

    rows: list[dict[str, Any]] = []
    for raw in raw_rows:
        timestamp = datetime.fromisoformat(raw["timestamp"].replace("Z", "+00:00"))
        row: dict[str, Any] = {
            "timestamp": timestamp,
            "corridor_id": raw["corridor_id"],
            "congestion_index": float(raw["congestion_index"]),
            "free_flow_speed_kmph": float(raw["free_flow_speed_kmph"]),
            "segment_length_m": float(raw["free_flow_travel_time_sec"]) * float(raw["free_flow_speed_kmph"]) / 3.6,
            "functional_class": float(raw["functional_class"]),
            "lanes": float(raw["lanes"]),
            "capacity_total": float(raw["capacity_total"]),
            "is_weekend": float(raw["is_weekend"].lower() == "true"),
            "is_holiday": float(raw["is_holiday"].lower() == "true"),
            "rainfall_mm": float(raw["rainfall_mm"]),
            "temperature_c": float(raw["temperature_c"]),
            "wind_speed_mps": float(raw["wind_speed_mps"]),
            "weather_code": float(raw["weather_code"]),
            "lag_15": float(raw["lag_15"]),
            "lag_30": float(raw["lag_30"]),
            "lag_60": float(raw["lag_60"]),
            "rolling_1h_avg": float(raw["rolling_1h_avg"]),
        }
        hour = timestamp.hour + timestamp.minute / 60
        day_of_week = timestamp.weekday()
        row["hour_sin"] = math.sin(2 * math.pi * hour / 24)
        row["hour_cos"] = math.cos(2 * math.pi * hour / 24)
        row["dow_sin"] = math.sin(2 * math.pi * day_of_week / 7)
        row["dow_cos"] = math.cos(2 * math.pi * day_of_week / 7)
        road_type = raw["road_type"]
        for kind in ("arterial", "collector", "local"):
            row[f"road_type_{kind}"] = float(road_type == kind)
        rows.append(row)

    rows.sort(key=lambda row: (row["corridor_id"], row["timestamp"]))
    return rows


def build_supervised_rows(rows: list[dict[str, Any]], horizon_minutes: int) -> list[dict[str, Any]]:
    horizon_steps = horizon_minutes // INTERVAL_MINUTES
    if horizon_minutes % INTERVAL_MINUTES:
        raise ValueError("Horizon must align with the 15-minute dataset cadence")

    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        grouped.setdefault(row["corridor_id"], []).append(row)

    samples: list[dict[str, Any]] = []
    for corridor_rows in grouped.values():
        for index in range(SEASONAL_PERIOD_STEPS, len(corridor_rows) - horizon_steps):
            source = corridor_rows[index]
            target = corridor_rows[index + horizon_steps]
            seasonal = corridor_rows[index + horizon_steps - SEASONAL_PERIOD_STEPS]
            samples.append({
                "source_timestamp": source["timestamp"],
                "target_timestamp": target["timestamp"],
                "features": [source[name] for name in FEATURE_NAMES],
                "target": target["congestion_index"],
                "naive_seasonal": seasonal["congestion_index"],
            })

    samples.sort(key=lambda sample: (sample["source_timestamp"], sample["target_timestamp"]))
    return samples


def chronological_split(samples: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    timestamps = sorted({sample["source_timestamp"] for sample in samples})
    train_cut = timestamps[int(len(timestamps) * 0.70) - 1]
    validation_cut = timestamps[int(len(timestamps) * 0.85) - 1]
    # Purge samples that would train on labels inside a later partition.  The
    # model sees no target after train_cut while fitting, and validation labels
    # finish before test sources begin.
    train = [sample for sample in samples if sample["target_timestamp"] <= train_cut]
    validation = [
        sample for sample in samples
        if sample["source_timestamp"] > train_cut and sample["target_timestamp"] <= validation_cut
    ]
    test = [sample for sample in samples if sample["source_timestamp"] > validation_cut]
    if not train or not validation or not test:
        raise ValueError("Chronological split produced an empty partition")
    if max(sample["target_timestamp"] for sample in train) >= min(sample["source_timestamp"] for sample in validation):
        raise ValueError("Training labels overlap validation sources")
    if max(sample["target_timestamp"] for sample in validation) >= min(sample["source_timestamp"] for sample in test):
        raise ValueError("Validation labels overlap test sources")
    return train, validation, test


def matrix(samples: list[dict[str, Any]]) -> tuple[np.ndarray, np.ndarray]:
    return np.asarray([sample["features"] for sample in samples], dtype=float), np.asarray([sample["target"] for sample in samples], dtype=float)


def metric(model_name: str, horizon: str, predictions: np.ndarray, test: list[dict[str, Any]]) -> Metric:
    actual = np.asarray([sample["target"] for sample in test], dtype=float)
    if not np.isfinite(predictions).all() or not np.isfinite(actual).all():
        raise ValueError(f"{model_name} produced non-finite predictions")
    return Metric(
        model_name=model_name,
        horizon=horizon,
        mae=round(float(mean_absolute_error(actual, predictions)), 6),
        rmse=round(float(mean_squared_error(actual, predictions) ** 0.5), 6),
        evaluation_start=min(sample["target_timestamp"] for sample in test).isoformat().replace("+00:00", "Z"),
        evaluation_end=max(sample["target_timestamp"] for sample in test).isoformat().replace("+00:00", "Z"),
        test_rows=len(test),
        model_version=MODEL_VERSION,
    )


def run_horizon(rows: list[dict[str, Any]], horizon: str, minutes: int) -> tuple[list[Metric], dict[str, Any]]:
    samples = build_supervised_rows(rows, minutes)
    train, validation, test = chronological_split(samples)
    x_train, y_train = matrix(train)
    x_validation, y_validation = matrix(validation)
    x_test, _ = matrix(test)

    naive_predictions = np.asarray([sample["naive_seasonal"] for sample in test], dtype=float)
    metrics = [metric("naive_seasonal", horizon, naive_predictions, test)]

    scaler = StandardScaler().fit(x_train)
    linear = LinearRegression().fit(scaler.transform(x_train), y_train)
    linear_predictions = linear.predict(scaler.transform(x_test))
    metrics.append(metric("linear_regression", horizon, linear_predictions, test))

    candidates = [
        {"n_estimators": 150, "learning_rate": 0.05, "max_depth": 2, "min_samples_leaf": 8, "random_state": 20260819},
        {"n_estimators": 220, "learning_rate": 0.04, "max_depth": 3, "min_samples_leaf": 10, "random_state": 20260819},
    ]
    selected_config = min(
        candidates,
        key=lambda config: mean_absolute_error(
            y_validation,
            GradientBoostingRegressor(**config).fit(x_train, y_train).predict(x_validation),
        ),
    )
    gradient_boosting = GradientBoostingRegressor(**selected_config).fit(x_train, y_train)
    gradient_predictions = gradient_boosting.predict(x_test)
    metrics.append(metric("gradient_boosting", horizon, gradient_predictions, test))

    artifact_prefix = ARTIFACT_DIR / horizon
    joblib.dump(linear, artifact_prefix.with_name(f"linear_regression_{horizon}.joblib"))
    joblib.dump(scaler, artifact_prefix.with_name(f"linear_regression_scaler_{horizon}.joblib"))
    joblib.dump(gradient_boosting, artifact_prefix.with_name(f"gradient_boosting_{horizon}.joblib"))
    metadata = {
        "model_version": MODEL_VERSION,
        "target": "congestion_index",
        "target_formula": "free_flow_speed_kmph / actual_speed_kmph",
        "horizon": horizon,
        "horizon_minutes": minutes,
        "feature_names": FEATURE_NAMES,
        "split": {"train": 0.70, "validation": 0.15, "test": 0.15, "strategy": "chronological by source_timestamp"},
        "seasonal_period_steps": SEASONAL_PERIOD_STEPS,
        "seasonal_period_description": "7 days at 15-minute cadence; same corridor, weekday, and time slot one week earlier",
        "gradient_boosting_config": selected_config,
        "validation_rows": len(validation),
        "train_rows": len(train),
    }
    (artifact_prefix.with_name(f"metadata_{horizon}.json")).write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")

    # Reload independently persisted models and make a small prediction pass.
    reloaded_scaler = joblib.load(artifact_prefix.with_name(f"linear_regression_scaler_{horizon}.joblib"))
    reloaded_linear = joblib.load(artifact_prefix.with_name(f"linear_regression_{horizon}.joblib"))
    reloaded_gradient_boosting = joblib.load(artifact_prefix.with_name(f"gradient_boosting_{horizon}.joblib"))
    probe_predictions = (
        reloaded_linear.predict(reloaded_scaler.transform(x_test[:1])),
        reloaded_gradient_boosting.predict(x_test[:1]),
    )
    if not all(np.isfinite(predictions).all() for predictions in probe_predictions):
        raise ValueError(f"Reloaded artifacts failed prediction check for {horizon}")

    return metrics, metadata


def main() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    rows = load_rows()
    all_metrics: list[Metric] = []
    metadata_by_horizon: dict[str, dict[str, Any]] = {}
    for horizon, minutes in HORIZONS.items():
        metrics, metadata = run_horizon(rows, horizon, minutes)
        all_metrics.extend(metrics)
        metadata_by_horizon[horizon] = metadata

    payload = {
        "model_version": MODEL_VERSION,
        "dataset": {
            "path": str(DATA_PATH.relative_to(ML_DIR.parent.parent.parent)),
            "rows": len(rows),
            "cadence_minutes": INTERVAL_MINUTES,
            "target": "congestion_index",
            "target_formula": "actual_travel_time_sec / free_flow_travel_time_sec = free_flow_speed_kmph / actual_speed_kmph",
        },
        "evaluations": [asdict(item) for item in all_metrics],
        "metadata_by_horizon": metadata_by_horizon,
    }
    EVALUATION_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    print("Model                 Horizon     MAE      RMSE")
    for item in all_metrics:
        print(f"{item.model_name:21} {item.horizon:>3} {item.mae:8.6f} {item.rmse:8.6f}")


if __name__ == "__main__":
    main()
