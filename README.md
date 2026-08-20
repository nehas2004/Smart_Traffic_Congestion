# 🚦 Smart Traffic Congestion Management & AI Decision Support System

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-ML%20Ensemble-EE4C2C?logo=pytorch)](https://pytorch.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

> An intelligent, end-to-end urban mobility management platform combining real-time sensor streams, ML traffic forecasting, interactive commuter dashboards, and an AI-driven Traffic Control Room with closed-loop decision support.

---

## 🌟 Key Highlights

- 🧠 **Hybrid ML Forecasting Engine:** Combines deep learning (PyTorch) and ensemble regression models to forecast speed, congestion indices, and queue lengths in real time.
- 🤖 **AI Decision Support & Copilot:** Automated policy recommendation pipeline (e.g., adaptive signal retiming, lane reversals, incident rerouting) with human-in-the-loop decision queues.
- 🗺️ **Interactive Multi-Sector Map:** Live geo-spatial congestion heatmaps, bottleneck tracing, and route optimization across major urban sectors.
- 📊 **Executive Control Room Analytics:** Dynamic KPI tracking (congestion index, avg vehicle speed, active bottlenecks, incident impact, throughput) linked dynamically to city filters.
- 📱 **Citizen Commuter Portal:** Route suggestions, public transit event advisories, and estimated travel time predictions for everyday commuters.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Data Layer & Models
        A1[Live GPS & Sensor Feeds] --> B[ML Inference Engine]
        A2[Historical Traffic Data] --> B
        B -->|PyTorch & Scikit-Learn| C[Traffic Prediction API]
    end

    subgraph Backend Services [FastAPI Server - Port 8000]
        C --> D[AI Recommendation Engine]
        D --> E[Decision Support Pipeline]
        E --> F[Copilot / LLM Router]
        F --> G[(SQLite / Postgres DB)]
    end

    subgraph Frontend Application [Next.js 16 - Port 3000]
        H[Admin Control Room] <-->|REST / SWR| Backend Services
        I[Live Congestion Map] <-->|GeoJSON| Backend Services
        J[Bottleneck & Analytics Panels] <--> Backend Services
        K[Public Commuter Portal] <--> Backend Services
    end
```

---

## 🚀 Features

### 🏛️ 1. Traffic Admin & Control Center
- **Dynamic KPI Dashboard:** Real-time visibility into city-wide congestion metrics, peak delays, and active bottleneck counts.
- **Bottleneck Graph & Flow Analytics:** Interactive charts showing flow volume vs. speed drops over 24-hour cycles.
- **Location Intelligence & Sector Switching:** Granular drill-down into specific corridors, arterial junctions, and transit corridors.
- **Decision Queue (Human-in-the-Loop):** Review, accept, or modify AI-generated intervention proposals (signal time modulation, dynamic diversions, emergency green corridors).

### 🚗 2. Public & Commuter Experience
- **Interactive Journey Planner:** Optimal route discovery factoring in real-time road incidents and predictive congestion trends.
- **Event & Hazard Alerts:** Proactive notifications regarding road works, weather disruptions, or high-traffic civic events.
- **Live City Heatmap:** Visual green/amber/red corridor status with road-by-road congestion breakdowns.

---

## 📁 Repository Structure

```
smart-traffic-congestion/
├── app/                         # Next.js App Router
│   ├── admin/                   # Traffic management control center
│   │   ├── analytics/           # Deep-dive analytics & bottleneck graphs
│   │   ├── bottlenecks/         # Real-time incident & bottleneck queues
│   │   └── page.tsx             # Decision support dashboard
│   ├── api/                     # Next.js serverless API routes
│   │   └── admin/               # Forecasting & prediction proxy routes
│   ├── dashboard/               # Commuter overview & metrics
│   ├── map/                     # Full-screen interactive map
│   ├── journey/                 # Route planning & commute optimization
│   ├── events/                  # Traffic incidents and events feed
│   ├── layout.tsx               # Root layout & navigation shell
│   └── page.tsx                 # Landing page
├── backend/                     # Python FastAPI Backend
│   ├── app/
│   │   ├── api/                 # FastAPI routers (recommendations, copilot, decisions)
│   │   ├── models/              # SQLAlchemy database schemas
│   │   ├── services/            # ML inference & predictive models
│   │   └── db.py                # Database connector
│   ├── main.py                  # FastAPI application entrypoint
│   └── requirements.txt         # Python dependencies
├── components/                  # Reusable UI components (Shadcn + Custom)
│   ├── admin/                   # Admin KPIs, Bottleneck Graph, Congestion Map
│   └── ui/                      # Base UI design system
├── lib/                         # Client utilities, helper functions, auth guards
└── public/                      # Static assets and icons
```

---

## ⚡ Getting Started

### Prerequisites
- **Node.js**: `v18.17+` or `v20+` (LTS recommended)
- **Package Manager**: `npm`, `pnpm`, or `yarn`
- **Python**: `3.10+` (for ML backend)

---

### 1. Frontend Setup (Next.js)

```bash
# Clone the repository
git clone https://github.com/nehas2004/Smart_Traffic_Congestion.git
cd Smart_Traffic_Congestion

# Install frontend dependencies
npm install
# or
pnpm install

# Configure environment variables
cp .env.example .env.local

# Run the development server
npm run dev
```

The web application will be available at [http://localhost:3000](http://localhost:3000).

---

### 2. Backend Setup (FastAPI + ML Engine)

```bash
# Navigate to backend directory
cd backend

# Create and activate a Python virtual environment
# On Windows:
python -m venv venv
venv\Scripts\activate

# On Linux/macOS:
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```

The API documentation and Swagger UI will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health status check |
| `GET` | `/predict?lat={lat}&lon={lon}` | ML-driven real-time traffic prediction for coordinate |
| `GET` | `/api/recommendations` | Active AI decision recommendations queue |
| `POST` | `/api/decisions/action` | Apply, reject, or postpone an automated traffic policy |
| `POST` | `/api/copilot/chat` | Traffic Controller AI conversational assistant |

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Recharts, Radix / Base UI.
- **Backend:** FastAPI, Uvicorn, Pydantic, SQLAlchemy.
- **Machine Learning & Data:** PyTorch, Scikit-Learn, Pandas, NumPy, Joblib.
- **Database:** SQLite (local development) / PostgreSQL ready.

---

## 👥 Authors & Acknowledgments

- Developed for Smart Urban Mobility & AI-driven Traffic Control.
- Repository: [Smart_Traffic_Congestion](https://github.com/nehas2004/Smart_Traffic_Congestion)
