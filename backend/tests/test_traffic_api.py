import math
import sys
import unittest
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.api.traffic import router  # noqa: E402
from app.services import traffic_service  # noqa: E402


app = FastAPI()
app.include_router(router)
client = TestClient(app)


class TrafficApiTests(unittest.TestCase):
    def test_current_traffic(self):
        response = client.get("/traffic/current")
        self.assertEqual(response.status_code, 200)
        rows = response.json()["data"]
        self.assertEqual(len(rows), 6)
        self.assertTrue(all(row["congestion_unit"] == "tti_ratio" for row in rows))
        self.assertTrue(all(math.isfinite(row["current_congestion"]) for row in rows))

    def test_forecast_for_each_horizon(self):
        for horizon in ("1h", "3h", "6h"):
            response = client.get("/traffic/forecast", params={"corridor_id": "koth-001", "horizon": horizon})
            self.assertEqual(response.status_code, 200)
            forecast = response.json()["data"]
            self.assertEqual(forecast["corridor_id"], "koth-001")
            self.assertEqual(forecast["horizon"], horizon)
            self.assertEqual(forecast["model_name"], "naive_seasonal")
            self.assertIsNone(forecast["confidence"])
            self.assertTrue(math.isfinite(forecast["predicted_congestion"]))

    def test_invalid_forecast_parameters(self):
        self.assertEqual(client.get("/traffic/forecast", params={"corridor_id": "koth-001", "horizon": "15m"}).status_code, 400)
        self.assertEqual(client.get("/traffic/forecast", params={"corridor_id": "unknown", "horizon": "1h"}).status_code, 404)

    def test_bottlenecks_are_ranked(self):
        response = client.get("/bottlenecks")
        self.assertEqual(response.status_code, 200)
        rows = response.json()["data"]
        self.assertEqual(len(rows), 6)
        self.assertEqual(rows, sorted(rows, key=lambda row: row["predicted_congestion"], reverse=True))
        self.assertTrue(all(row["confidence"] is None for row in rows))

    def test_evaluations_match_verified_file(self):
        response = client.get("/analytics/model-evaluation")
        self.assertEqual(response.status_code, 200)
        rows = response.json()["data"]
        self.assertEqual(len(rows), 9)
        self.assertTrue(all(math.isfinite(row["mae"]) and math.isfinite(row["rmse"]) for row in rows))

    def test_artifacts_load(self):
        self.assertEqual(traffic_service.validate_model_artifacts(), 9)


if __name__ == "__main__":
    unittest.main()
