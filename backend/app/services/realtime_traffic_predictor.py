#!/usr/bin/env python3
"""
Smart Traffic Congestion — Real-Time Weather & TomTom Traffic API Predictor
Entry Point: realtime_traffic_predictor.py

Usage:
  python realtime_traffic_predictor.py --lat 10.05 --lon 76.62 --tomtom_key YOUR_KEY
"""

import os
import sys
import json
import joblib # pyrefly: ignore [missing-import]
import random
import urllib.request
import pandas as pd # pyrefly: ignore [missing-import]
import numpy as np # pyrefly: ignore [missing-import]
try:
    import torch # pyrefly: ignore [missing-import]
    import torch.nn as nn # pyrefly: ignore [missing-import]
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
    torch = None
    nn = None

# Setup
WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.dirname(WORKSPACE_DIR)
MODELS_DIR = os.path.join(APP_DIR, 'ml_models', 'models')

FEATURE_COLS = [
    'functional_class', 'lanes', 'segment_length_m', 'free_flow_speed_kmh', 'capacity_total',
    'hour', 'day_of_week', 'month', 'day_of_year', 'is_weekend', 'is_holiday',
    'temperature_2m', 'precipitation', 'wind_speed', 'weather_code',
    'weather_capacity_factor', 'effective_capacity', 'volume_capacity_ratio',
    'current_speed', 'current_travel_time', 'current_congestion_index',
    'lag_speed_15min', 'lag_speed_30min', 'lag_congestion_15min', 'lag_congestion_30min',
    'rolling_mean_speed_1h', 'rolling_mean_congestion_1h'
]

if HAS_TORCH:
    class TrafficLSTM(nn.Module):
        def __init__(self, input_dim=27, hidden_dim=64, num_layers=2):
            super(TrafficLSTM, self).__init__()
            self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers, batch_first=True)
            self.fc1 = nn.Linear(hidden_dim, 32)
            self.relu = nn.ReLU()
            self.fc2 = nn.Linear(32, 1)

        def forward(self, x):
            out, _ = self.lstm(x)
            out = self.fc1(out[:, -1, :])
            out = self.relu(out)
            out = self.fc2(out)
            return out
else:
    TrafficLSTM = None


# =====================================================================
# 1. LIVE WEATHER API FETCH (OPEN-METEO)
# =====================================================================

def fetch_live_weather(lat=10.05, lon=76.62):
    """
    Fetches real-time current weather from Open-Meteo Forecast API.
    """
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,precipitation,wind_speed_10m,weather_code&timezone=auto"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode())
        curr = res.get('current', {})
        return {
            'temperature_2m': curr.get('temperature_2m', 25.0),
            'precipitation': curr.get('precipitation', 0.0),
            'wind_speed': round(curr.get('wind_speed_10m', 5.0) / 3.6, 2), # km/h to m/s
            'weather_code': curr.get('weather_code', 0)
        }
    except Exception as e:
        print(f"[WEATHER API NOTICE] Could not fetch live Open-Meteo: {e}. Using location default.")
        return {'temperature_2m': 27.5, 'precipitation': 0.0, 'wind_speed': 1.8, 'weather_code': 0}


# =====================================================================
# 2. LIVE TOMTOM TRAFFIC FLOW API FETCH
# =====================================================================

def fetch_live_tomtom_flow(lat=10.05, lon=76.62, api_key=None):
    """
    Fetches live segment flow data from TomTom Traffic Flow Segment API.
    Uses realistic mock data if API key is not provided.
    """
    if api_key and api_key != 'YOUR_KEY':
        url = f"https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/14/json?key={api_key}&point={lat},{lon}"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as resp:
                res = json.loads(resp.read().decode())
            flow = res.get('flowSegmentData', {})
            cur_s = flow.get('currentSpeed', 45.0)
            ff_s = flow.get('freeFlowSpeed', 48.0)
            cur_tt = flow.get('currentTravelTime', 60.0)
            ff_tt = flow.get('freeFlowTravelTime', 55.0)
            frc_str = flow.get('frc', 'FRC3')
            frc_num = int(frc_str.replace('FRC', '')) if 'FRC' in frc_str else 3
            len_m = int((ff_tt * ff_s) / 3.6) if ff_s > 0 else 750

            return {
                'functional_class': frc_num,
                'current_speed': float(cur_s),
                'free_flow_speed_kmh': float(ff_s),
                'current_travel_time': float(cur_tt),
                'segment_length_m': len_m,
                'source': 'TomTom Live API'
            }
        except Exception as e:
            print(f"[TOMTOM API NOTICE] TomTom API call error: {e}. Falling back to dynamic mock segment.")

    # Dynamic Mock Telemetry (Secondary Arterial Baseline)
    ff_s = 48.0
    cur_s = round(random.uniform(32.0, 48.0), 2)
    len_m = 800
    cur_tt = round(len_m / (cur_s / 3.6), 2)
    return {
        'functional_class': 3,
        'current_speed': cur_s,
        'free_flow_speed_kmh': ff_s,
        'current_travel_time': cur_tt,
        'segment_length_m': len_m,
        'source': 'TomTom Simulator / Mock Feed'
    }


# =====================================================================
# 3. FEATURE VECTOR BUILDER & REAL-TIME PREDICTOR
# =====================================================================

class RealTimeTrafficPredictor:
    def __init__ (self):
        self.lr_model = joblib.load(os.path.join(MODELS_DIR, 'linear_regression.joblib'))
        self.gb_model = joblib.load(os.path.join(MODELS_DIR, 'gradient_boosting.joblib'))
        self.scaler = joblib.load(os.path.join(MODELS_DIR, 'model_scaler.joblib'))
        
        self.lstm_model = None
        if HAS_TORCH:
            try:
                self.lstm_model = TrafficLSTM()
                self.lstm_model.load_state_dict(torch.load(os.path.join(MODELS_DIR, 'lstm_model.pt')))
                self.lstm_model.eval()
            except Exception as e:
                print(f"[LSTM MODEL NOTICE] Could not load lstm_model.pt: {e}")

    def build_feature_vector(self, weather_data, traffic_data, timestamp=None):
        ts = pd.to_datetime(timestamp) if timestamp else pd.Timestamp.now()
        
        frc = traffic_data['functional_class']
        v0 = traffic_data['free_flow_speed_kmh']
        cur_s = traffic_data['current_speed']
        cur_tt = traffic_data['current_travel_time']
        len_m = traffic_data['segment_length_m']

        lanes = 2 if frc >= 3 else 3
        cap_vphpl = 1200 if frc == 3 else (2000 if frc == 1 else 800)
        cap_total = lanes * cap_vphpl

        precip = weather_data['precipitation']
        if precip == 0.0: w_cap_factor = 1.00
        elif precip < 2.5: w_cap_factor = 0.95
        elif precip < 7.6: w_cap_factor = 0.88
        elif precip < 50.0: w_cap_factor = 0.75
        else: w_cap_factor = 0.55

        eff_capacity = cap_total * w_cap_factor
        ci = round(max(0.0, (v0 - cur_s) / v0), 4)

        # Estimate V/C from current speed BPR inverse
        speed_ratio = v0 / max(cur_s, 5.0)
        vc_ratio = round(max(0.0, ((speed_ratio - 1.0) / 0.15) ** 0.25), 4)

        row_dict = {
            'functional_class': frc,
            'lanes': lanes,
            'segment_length_m': len_m,
            'free_flow_speed_kmh': v0,
            'capacity_total': cap_total,
            'hour': ts.hour,
            'day_of_week': ts.dayofweek,
            'month': ts.month,
            'day_of_year': ts.dayofyear,
            'is_weekend': 1 if ts.dayofweek >= 5 else 0,
            'is_holiday': 0,
            'temperature_2m': weather_data['temperature_2m'],
            'precipitation': precip,
            'wind_speed': weather_data['wind_speed'],
            'weather_code': weather_data['weather_code'],
            'weather_capacity_factor': round(w_cap_factor, 2),
            'effective_capacity': round(eff_capacity, 1),
            'volume_capacity_ratio': vc_ratio,
            'current_speed': cur_s,
            'current_travel_time': cur_tt,
            'current_congestion_index': ci,
            'lag_speed_15min': cur_s,
            'lag_speed_30min': cur_s,
            'lag_congestion_15min': ci,
            'lag_congestion_30min': ci,
            'rolling_mean_speed_1h': cur_s,
            'rolling_mean_congestion_1h': ci
        }
        return pd.DataFrame([row_dict])[FEATURE_COLS]

    def predict(self, lat=10.05, lon=76.62, tomtom_key=None):
        if not tomtom_key:
            tomtom_key = os.environ.get("NEXT_PUBLIC_TOMTOM_API_KEY") or os.environ.get("TOMTOM_API_KEY") or "QonqKFs3CHNI0GUCu7NhJ4tM9vuzE1yq"
        weather = fetch_live_weather(lat, lon)
        traffic = fetch_live_tomtom_flow(lat, lon, tomtom_key)
        
        df_feat = self.build_feature_vector(weather, traffic)
        X_raw = df_feat.values
        X_scaled = self.scaler.transform(X_raw)

        pred_lr = float(self.lr_model.predict(X_scaled)[0])
        pred_gb = float(self.gb_model.predict(X_raw)[0])
        
        if HAS_TORCH and self.lstm_model is not None:
            try:
                with torch.no_grad():
                    X_tensor = torch.tensor(X_scaled, dtype=torch.float32).unsqueeze(1)
                    pred_lstm = float(self.lstm_model(X_tensor).numpy().squeeze())
            except Exception:
                pred_lstm = pred_gb
        else:
            pred_lstm = pred_gb

        cur_tt = traffic['current_travel_time']
        delay_sec = round(pred_gb - cur_tt, 2)
        
        if delay_sec > 15.0: risk = "HIGH CONGESTION RISK"
        elif delay_sec > 5.0: risk = "MODERATE DELAY"
        else: risk = "FREE FLOW / MINIMAL DELAY"

        return {
            'coordinates': {'lat': lat, 'lon': lon},
            'weather': weather,
            'traffic_live': traffic,
            'predictions_15min_ahead': {
                'linear_regression_sec': round(pred_lr, 2),
                'gradient_boosting_sec': round(pred_gb, 2),
                'lstm_sec': round(pred_lstm, 2),
                'linear_regression_min': round(pred_lr / 60.0, 2),
                'gradient_boosting_min': round(pred_gb / 60.0, 2),
                'lstm_min': round(pred_lstm / 60.0, 2),
            },
            'projected_delay_sec': delay_sec,
            'risk_level': risk
        }


def main():
    print("=======================================================")
    print("  LIVE WEATHER & TOMTOM TRAFFIC REAL-TIME PREDICTOR")
    print("=======================================================")

    predictor = RealTimeTrafficPredictor()
    result = predictor.predict(lat=10.05, lon=76.62)
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
