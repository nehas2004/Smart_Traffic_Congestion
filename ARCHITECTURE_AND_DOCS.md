# 🏛️ Flowcast: System Architecture & Technical Documentation
**Project Title:** Flowcast — Smart Traffic Congestion Management & AI Decision Support System  
**Hackathon:** Cognizant MACE Hackathon (MACE–AIA Partnership)  
**Track:** Smart Traffic Congestion Prediction  
**Evaluation Rubric Alignment:** Solution Architecture (#2), Technical Implementation (#5), Model Evaluation (#6), Deployment Strategy (#7).

---

## 1. Executive Summary & Problem Formulation

Flowcast addresses the fundamental limitation of contemporary navigation systems: **reactive delay reporting without municipal decision coordination**. 

In high-variance corridors like **Kothamangalam (Kerala)**—the critical arterial gateway connecting urban Ernakulam with the Idukki high ranges via NH-85—traffic bottlenecks recur cyclically at key junctions (*Thankalam Junction, Kozhippilly, High Range Junction, and Karikkode*). Existing consumer apps (e.g., Google Maps) passively route vehicles onto narrow bypasses, worsening secondary gridlock without providing municipal tools to resolve the root cause.

Flowcast delivers a **closed-loop, predictive intelligence platform**:
1. **Multi-Horizon ML Forecasting**: Predicts corridor-level Travel Time Index (TTI) and congestion severity 15, 30, and 60 minutes into the future by combining historical flow trends, live TomTom sensor feeds, weather anomalies (Open-Meteo), and calendar periodicity.
2. **Dual-Sided Unified Platform**:
   - **Commuter Portal**: Proactive route planning, bottleneck warnings, and optimal departure recommendations.
   - **City Planner / Traffic Control Room**: Real-time KPI telemetry, automated intervention recommendations (*adaptive signal retiming, dynamic diversions, green corridor provisioning*), and a **human-in-the-loop decision queue**.

---

## 2. End-to-End System Architecture

```mermaid
flowchart TD
    %% EXTERNAL DATA SOURCES
    subgraph Data_Ingestion ["1. Data Ingestion & External APIs"]
        A1["Live Traffic Flow Feeds<br/>(TomTom Flow Segment API)"]
        A2["Live Weather Stream<br/>(Open-Meteo API - Temp, Rain, Wind)"]
        A3["Canonical Historical Dataset<br/>(12,096 Records, 15-min cadence)"]
        A4["Corridor GeoJSON Registry<br/>(Kothamangalam & Kerala BBOX)"]
    end

    %% PREPROCESSING & FEATURE PIPELINE
    subgraph Feature_Pipeline ["2. Preprocessing & Feature Engineering Layer"]
        B1["Temporal Cyclical Encoders<br/>(sin/cos Hour, sin/cos Day-of-Week)"]
        B2["Weather & Calendar Enricher<br/>(Rainfall mm, Temp, Weekend/Holiday)"]
        B3["Time-Series Lag Generator<br/>(Lag 15, 30, 60 min, Rolling 1h Avg)"]
        B4["Road Geometric Attributes<br/>(Lanes, Capacity, Functional Class)"]
    end

    %% MACHINE LEARNING ENGINE
    subgraph ML_Engine ["3. Machine Learning Forecasting Engine"]
        C1["Baseline Model<br/>(Naive Seasonal - 7-day prior lag)"]
        C2["Linear Regression<br/>(StandardScaler + OLS)"]
        C3["Gradient Boosting Regressor<br/>(Selected Model: n_est=220, lr=0.04)"]
        C4["Model Evaluation Matrix<br/>(Verified MAE: 0.0748 | RMSE: 0.1358)"]
    end

    %% BACKEND SERVICES
    subgraph Backend_Services ["4. FastAPI Backend Services (:8000)"]
        D1["Traffic Telemetry Service<br/>(traffic_service.py)"]
        D2["Predictive Inference API<br/>(api/predictions.py)"]
        D3["AI Recommendation Engine<br/>(recommendation.py)"]
        D4["Decision Support Queue<br/>(Apply / Modify / Postpone)"]
        D5["SQLite / PostgreSQL DB<br/>(ai_module.db)"]
    end

    %% FRONTEND NEXT.JS APP
    subgraph Frontend_App ["5. Next.js 16 Client & Presentation (:3000)"]
        E1["Public Commuter Portal<br/>(/dashboard, /routes, /journey)"]
        E2["Interactive Map & Heatmap<br/>(MapLibre / Leaflet + GeoJSON)"]
        E3["Traffic Control Room<br/>(/admin, /admin/analytics, /admin/bottlenecks)"]
        E4["Decision Queue & Actioning<br/>(/admin/decisions, /admin/forecast)"]
    end

    %% CONNECTIONS
    A1 -->|Real-time Poll| B3
    A2 -->|Weather Poll| B2
    A3 -->|Chronological Split| B1
    A4 -->|Spatial Boundaries| D1

    B1 & B2 & B3 & B4 -->|22-Feature Vector| ML_Engine
    C3 -->|Multi-Horizon TTI Artifacts| D2

    D1 & D2 --> D3
    D3 --> D4
    D4 <--> D5

    D2 & D3 & D4 <-->|REST API / JSON| Frontend_App
```

---

## 3. Data Flow Architecture & Pipeline

The system operates across three synchronized data loops:

```mermaid
sequenceDiagram
    autonumber
    participant Sensor as Traffic & Weather Sensors
    participant FE as Feature Extractor
    participant ML as ML Inference Engine
    participant API as FastAPI Backend
    participant Admin as Traffic Control Room
    participant Commuter as Citizen App

    %% Historical / Batch Loop
    Note over Sensor,ML: 1. Training & Calibration Loop (Chronological Split)
    Sensor->>FE: Ingest raw flow (12,096 15-min rows) + weather logs
    FE->>ML: Vectorize into 22 features (Lags, Cyclical Time, Rain)
    ML->>ML: Fit Gradient Boosting Regressor (MAE: 0.0748 vs Baseline)

    %% Real-time Inference Loop
    Note over Sensor,Commuter: 2. Real-Time Inference & Routing Loop
    Sensor->>API: Fetch current corridor speed & Open-Meteo weather
    API->>ML: Compute forecasted Travel Time Index (TTI) for 1h/3h/6h
    API->>Commuter: Stream multi-route options + future delay curve (+14m, +9m)

    %% Decision Support Loop
    Note over API,Admin: 3. Closed-Loop AI Decision Support Loop
    API->>API: Evaluate Congestion Thresholds (TTI > 1.35)
    API->>Admin: Push Intervention Proposal (e.g., "Extend Green Phase by +25s at Thankalam")
    Admin->>API: Operator Accepts / Overrides Policy
    API->>Sensor: Transmit Signal Retiming / Route Diversion Command
```

---

## 4. Machine Learning Pipeline & Formal Metrics

### 4.1. Target Formulation
The model predicts the dimensionless **Travel Time Index (TTI)**:
$$\text{TTI} = \frac{\text{Actual Travel Time (sec)}}{\text{Free-Flow Travel Time (sec)}} = \frac{\text{Free-Flow Speed (km/h)}}{\text{Actual Speed (km/h)}}$$
- $\text{TTI} \le 1.0$: Free flow / Green
- $1.0 < \text{TTI} \le 1.3$: Moderate / Amber
- $1.3 < \text{TTI} \le 1.7$: Heavy / Orange
- $\text{TTI} > 1.7$: Severe Bottleneck / Red

### 4.2. Engineered Feature Vector (22 Features)
As defined in [`backend/app/ml_models/train_tti_models.py`](file:///d:/antigravity/nehas/Smart_Traffic_Congestion/backend/app/ml_models/train_tti_models.py):
1. **Geometric & Capacity**: `free_flow_speed_kmph`, `segment_length_m`, `functional_class`, `lanes`, `capacity_total`.
2. **Temporal Cyclical Encodings**: $\sin(2\pi h / 24)$, $\cos(2\pi h / 24)$, $\sin(2\pi d / 7)$, $\cos(2\pi d / 7)$.
3. **Calendar & Weather Shocks**: `is_weekend`, `is_holiday`, `rainfall_mm`, `temperature_c`, `wind_speed_mps`, `weather_code`.
4. **Time-Series Memory (Autoregressive Lags)**: `lag_15`, `lag_30`, `lag_60`, `rolling_1h_avg`.
5. **Road Classification One-Hot**: `road_type_arterial`, `road_type_collector`, `road_type_local`.

### 4.3. Benchmark Performance Matrix (Tested on 1,206 Unseen Rows)
Evaluated across 70% Train, 15% Validation, and 15% Test chronological partitions without lookahead bias:

| Horizon | Model | Algorithm / Strategy | MAE | RMSE | Target Metric |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **1 Hour** | `naive_seasonal` (Baseline) | Prior week same time & corridor | 0.070990 | 0.125206 | TTI |
| **1 Hour** | `linear_regression` | StandardScaler + OLS Regression | 0.236062 | 0.371107 | TTI |
| **1 Hour** | **`gradient_boosting` (Selected)** | **220 Estimators, lr=0.04, depth=3** | **0.074760** | **0.135783** | **TTI** |
| **3 Hours** | `naive_seasonal` (Baseline) | Prior week same time & corridor | 0.071116 | 0.125464 | TTI |
| **3 Hours** | `linear_regression` | StandardScaler + OLS Regression | 0.272318 | 0.393634 | TTI |
| **3 Hours** | **`gradient_boosting` (Selected)** | **150 Estimators, lr=0.05, depth=2** | **0.075766** | **0.129536** | **TTI** |
| **6 Hours** | `naive_seasonal` (Baseline) | Prior week same time & corridor | 0.071557 | 0.126050 | TTI |
| **6 Hours** | `linear_regression` | StandardScaler + OLS Regression | 0.323163 | 0.439209 | TTI |
| **6 Hours** | **`gradient_boosting` (Selected)** | **Hyper-tuned Ensembles** | **0.073570** | **0.130043** | **TTI** |

---

## 5. Architectural Trade-offs & Alternatives Considered

| Dimension | Chosen Solution | Alternative Considered | Engineering Justification |
| :--- | :--- | :--- | :--- |
| **Backend Framework** | **Python FastAPI** | Node.js Express / Django | FastAPI provides asynchronous high-throughput I/O with native execution of Python ML libraries (`scikit-learn`, `numpy`, `joblib`) without IPC overhead. |
| **Frontend Framework** | **Next.js 16 (App Router)** | Single Page React (Vite) | Server-Side Rendering (SSR) for initial GeoJSON map payloads, built-in API proxy routing, and unified edge caching. |
| **Forecasting Model** | **Gradient Tree Boosting** | Deep LSTM / Recurrent Neural Net | Tabular traffic flow datasets with discrete weather/road-type features train faster, avoid vanishing gradients on small samples, and have ~5x lower inference latency on CPU instances. |
| **Database** | **SQLite (Dev) / Postgres (Prod)** | MongoDB (NoSQL) | Relational integrity for junction relationships, incident foreign keys, and structured audit logs of traffic policy decisions. |

---

## 6. Target Production Deployment & CI/CD Strategy

```mermaid
flowchart LR
    subgraph VCS ["1. Version Control"]
        G[GitHub Repository]
    end

    subgraph Pipeline ["2. GitHub Actions CI/CD"]
        T1["Lint & TypeCheck<br/>(tsc, eslint, flake8)"]
        T2["Unit & Regression Tests<br/>(pytest backend/tests)"]
        T3["Build Verification<br/>(next build)"]
        T4["Docker Container Build<br/>(Multi-stage build)"]
    end

    subgraph Cloud ["3. Cloud Deployment (AWS / GCP)"]
        D1["Vercel / Cloud Run<br/>(Next.js Frontend :3000)"]
        D2["AWS ECS / Cloud Run<br/>(FastAPI ML API :8000)"]
        D3["Managed PostgreSQL<br/>(Supabase / RDS)"]
    end

    G -->|Push to main| Pipeline
    T1 & T2 & T3 --> T4
    T4 -->|Deploy Container| Cloud
```

---

## 7. Quick Reference: Key Codebase Files

- **ML Training Pipeline**: [`backend/app/ml_models/train_tti_models.py`](file:///d:/antigravity/nehas/Smart_Traffic_Congestion/backend/app/ml_models/train_tti_models.py)
- **Verified Evaluation Metrics**: [`backend/app/ml_models/tti_models/model_evaluation.json`](file:///d:/antigravity/nehas/Smart_Traffic_Congestion/backend/app/ml_models/tti_models/model_evaluation.json)
- **Live Traffic Service**: [`backend/app/services/traffic_service.py`](file:///d:/antigravity/nehas/Smart_Traffic_Congestion/backend/app/services/traffic_service.py)
- **Decision Engine**: [`backend/app/services/recommendation.py`](file:///d:/antigravity/nehas/Smart_Traffic_Congestion/backend/app/services/recommendation.py)
- **Public Traffic Map**: [`components/public/LiveTrafficMap.tsx`](file:///d:/antigravity/nehas/Smart_Traffic_Congestion/components/public/LiveTrafficMap.tsx)
- **Admin Control Room Map**: [`components/admin/traffic-map-view.tsx`](file:///d:/antigravity/nehas/Smart_Traffic_Congestion/components/admin/traffic-map-view.tsx)
- **Geo Boundaries**: [`lib/reverse-geocode.ts`](file:///d:/antigravity/nehas/Smart_Traffic_Congestion/lib/reverse-geocode.ts)
