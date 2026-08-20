"""Generate and validate the canonical synthetic traffic history.

This intentionally produces a documented synthetic dataset.  It does not call
the live /predict service and does not claim model-derived forecasts.
"""

from __future__ import annotations

import csv
import math
import random
from collections import deque
from datetime import datetime, timedelta, timezone
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parent
CORRIDOR_PATH = DATA_DIR / "corridors.csv"
OUTPUT_PATH = DATA_DIR / "synthetic_traffic_history.csv"
START = datetime(2026, 7, 29, tzinfo=timezone.utc)
DAYS = 21
INTERVAL_MINUTES = 15
SEED = 20260819

FIELDNAMES = [
    "timestamp",
    "corridor_id",
    "actual_speed_kmph",
    "free_flow_speed_kmph",
    "actual_travel_time_sec",
    "free_flow_travel_time_sec",
    "congestion_index",
    "rainfall_mm",
    "temperature_c",
    "day_of_week",
    "is_weekend",
    "is_holiday",
    "road_type",
    "wind_speed_mps",
    "weather_code",
    "functional_class",
    "lanes",
    "capacity_total",
    "lag_15",
    "lag_30",
    "lag_60",
    "rolling_1h_avg",
]


def read_corridors() -> list[dict[str, str]]:
    with CORRIDOR_PATH.open(newline="", encoding="utf-8") as source:
        corridors = list(csv.DictReader(source))
    if len(corridors) != 6:
        raise ValueError(f"Expected exactly six canonical corridors, found {len(corridors)}")
    return corridors


def weather_at(timestamp: datetime) -> tuple[float, float, float, int]:
    """Return deterministic weather-like context for reproducible synthetic data.

    rainfall_mm and temperature_c mirror the Open-Meteo variables required by
    the project contract.  This generator is explicitly synthetic; a future
    ingestion job may replace this function with cached Open-Meteo history.
    """
    day_index = (timestamp.date() - START.date()).days
    hour = timestamp.hour + timestamp.minute / 60
    wet_day = day_index % 7 in {2, 5}
    afternoon_shower = wet_day and 13 <= hour <= 19
    rainfall = 0.0
    if afternoon_shower:
        rainfall = round(1.2 + ((day_index + timestamp.hour) % 4) * 0.8, 2)
    elif wet_day and 7 <= hour <= 9:
        rainfall = 0.4

    temperature = round(28.0 + 3.6 * math.sin((hour - 7) * math.pi / 12) - rainfall * 0.25, 2)
    wind_speed = round(1.2 + ((day_index * 3 + timestamp.hour) % 8) * 0.32, 2)
    weather_code = 61 if rainfall > 0 else 0
    return rainfall, temperature, wind_speed, weather_code


def peak_load(hour: float, is_weekend: bool) -> float:
    morning = math.exp(-((hour - 8.75) ** 2) / 2.3)
    evening = math.exp(-((hour - 17.75) ** 2) / 3.0)
    base = 0.08 + 0.48 * morning + 0.54 * evening
    return base * (0.72 if is_weekend else 1.0)


def corridor_metadata(road_type: str) -> tuple[int, int, int]:
    if road_type == "arterial":
        return 2, 2, 2400
    if road_type == "collector":
        return 3, 2, 1800
    return 4, 1, 850


def generate_rows(corridors: list[dict[str, str]]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    periods = DAYS * 24 * 60 // INTERVAL_MINUTES
    warmup_periods = 4

    for corridor_index, corridor in enumerate(corridors):
        rng = random.Random(SEED + corridor_index)
        free_flow_speed = float(corridor["free_flow_speed_kmph"])
        segment_length = float(corridor["segment_length_m"])
        functional_class, lanes, capacity_total = corridor_metadata(corridor["road_type"])
        recent_tti: deque[float] = deque(maxlen=4)

        for index in range(-warmup_periods, periods):
            timestamp = START + timedelta(minutes=index * INTERVAL_MINUTES)
            hour = timestamp.hour + timestamp.minute / 60
            is_weekend = timestamp.weekday() >= 5
            rainfall, temperature, wind_speed, weather_code = weather_at(timestamp)

            corridor_bias = (corridor_index - 2.5) * 0.018
            market_pressure = 0.12 if corridor_index == 3 and 8 <= hour <= 12 else 0.0
            school_pressure = 0.09 if corridor_index == 2 and (7.5 <= hour <= 9 or 15 <= hour <= 16.5) else 0.0
            rain_penalty = min(0.22, rainfall * 0.035)
            noise = rng.gauss(0, 0.027)
            load = peak_load(hour, is_weekend) + corridor_bias + market_pressure + school_pressure + rain_penalty + noise
            speed_factor = min(0.98, max(0.24, 1.0 - load))
            actual_speed = round(free_flow_speed * speed_factor, 3)
            free_flow_time = segment_length / (free_flow_speed / 3.6)
            actual_travel_time = segment_length / (actual_speed / 3.6)
            congestion_index = actual_travel_time / free_flow_time

            if len(recent_tti) < 4:
                recent_tti.append(congestion_index)
                if index < 0:
                    continue
                raise RuntimeError("Warm-up did not establish historical lag values")
            lag_15 = recent_tti[-1]
            lag_30 = recent_tti[-2]
            lag_60 = recent_tti[0]
            rolling_1h_avg = sum(recent_tti) / len(recent_tti)
            recent_tti.append(congestion_index)

            if index < 0:
                continue

            rows.append({
                "timestamp": timestamp.isoformat().replace("+00:00", "Z"),
                "corridor_id": corridor["corridor_id"],
                "actual_speed_kmph": f"{actual_speed:.3f}",
                "free_flow_speed_kmph": f"{free_flow_speed:.3f}",
                "actual_travel_time_sec": f"{actual_travel_time:.3f}",
                "free_flow_travel_time_sec": f"{free_flow_time:.3f}",
                "congestion_index": f"{congestion_index:.6f}",
                "rainfall_mm": f"{rainfall:.2f}",
                "temperature_c": f"{temperature:.2f}",
                "day_of_week": str(timestamp.weekday()),
                "is_weekend": str(is_weekend).lower(),
                "is_holiday": "false",
                "road_type": corridor["road_type"],
                "wind_speed_mps": f"{wind_speed:.2f}",
                "weather_code": str(weather_code),
                "functional_class": str(functional_class),
                "lanes": str(lanes),
                "capacity_total": str(capacity_total),
                "lag_15": f"{lag_15:.6f}",
                "lag_30": f"{lag_30:.6f}",
                "lag_60": f"{lag_60:.6f}",
                "rolling_1h_avg": f"{rolling_1h_avg:.6f}",
            })
    return rows


def validate_rows(rows: list[dict[str, str]], corridors: list[dict[str, str]]) -> None:
    expected_rows = len(corridors) * DAYS * 24 * 60 // INTERVAL_MINUTES
    if len(rows) != expected_rows:
        raise ValueError(f"Expected {expected_rows} rows, found {len(rows)}")

    seen: set[tuple[str, str]] = set()
    per_corridor: dict[str, list[datetime]] = {corridor["corridor_id"]: [] for corridor in corridors}
    for row in rows:
        pair = (row["corridor_id"], row["timestamp"])
        if pair in seen:
            raise ValueError(f"Duplicate corridor/timestamp pair: {pair}")
        seen.add(pair)

        numeric = {name: float(row[name]) for name in FIELDNAMES if name in {
            "actual_speed_kmph", "free_flow_speed_kmph", "actual_travel_time_sec",
            "free_flow_travel_time_sec", "congestion_index", "rainfall_mm", "temperature_c",
            "wind_speed_mps", "lag_15", "lag_30", "lag_60", "rolling_1h_avg",
        }}
        if not all(math.isfinite(value) for value in numeric.values()):
            raise ValueError(f"Non-finite numeric value for {pair}")
        if numeric["actual_speed_kmph"] <= 0 or numeric["free_flow_speed_kmph"] <= 0:
            raise ValueError(f"Non-positive speed for {pair}")
        if numeric["actual_travel_time_sec"] <= 0 or numeric["free_flow_travel_time_sec"] <= 0:
            raise ValueError(f"Impossible travel time for {pair}")
        expected_tti = numeric["free_flow_speed_kmph"] / numeric["actual_speed_kmph"]
        if not math.isclose(numeric["congestion_index"], expected_tti, rel_tol=1e-5, abs_tol=1e-5):
            raise ValueError(f"TTI formula mismatch for {pair}")
        per_corridor[row["corridor_id"]].append(datetime.fromisoformat(row["timestamp"].replace("Z", "+00:00")))

    for corridor_id, timestamps in per_corridor.items():
        if len(timestamps) != DAYS * 96:
            raise ValueError(f"Unexpected row count for {corridor_id}")
        if timestamps != sorted(timestamps):
            raise ValueError(f"Timestamps are not chronological for {corridor_id}")
        if any(later - earlier != timedelta(minutes=INTERVAL_MINUTES) for earlier, later in zip(timestamps, timestamps[1:])):
            raise ValueError(f"Incorrect timestamp frequency for {corridor_id}")


def write_rows(rows: list[dict[str, str]]) -> None:
    with OUTPUT_PATH.open("w", newline="", encoding="utf-8") as destination:
        writer = csv.DictWriter(destination, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    corridors = read_corridors()
    rows = generate_rows(corridors)
    validate_rows(rows, corridors)
    write_rows(rows)
    print(
        f"Synthetic traffic dataset validated: {len(corridors)} corridors, {len(rows)} rows, "
        f"{INTERVAL_MINUTES}-minute frequency, {DAYS} days, seed={SEED}."
    )
    print("Target formula: congestion_index = free_flow_speed_kmph / actual_speed_kmph (TTI ratio).")


if __name__ == "__main__":
    main()
