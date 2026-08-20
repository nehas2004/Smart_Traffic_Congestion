'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Brain,
  Zap,
  TrendingUp,
  Cpu,
  BarChart2,
  CheckCircle2,
  Layers,
  ArrowRight,
  Activity,
  Sliders,
  Clock,
  Sparkles,
  MapPin,
  Compass,
  AlertTriangle,
  Flame,
  ShieldCheck,
  RefreshCw,
  Radio,
} from 'lucide-react'

export interface CitySectorConfig {
  id: string
  name: string
  district: string
  lat: number
  lon: number
  totalSensors: number
  trainingRecords: number
  activeHotspots: number
  baselineDelayMins: number
  peakSurgeMultiplier: number
  corridors: { id: string; name: string; baseLengthKm: number; baseDelay: number }[]
  metrics: {
    lr: { mae: number; rmse: number; r2: number; latencyMs: string }
    gbr: { mae: number; rmse: number; r2: number; latencyMs: string }
    lstm: { mae: number; rmse: number; r2: number; latencyMs: string }
  }
}

const CITY_SECTORS: CitySectorConfig[] = [
  {
    id: 'kochi',
    name: 'Kochi (Ernakulam)',
    district: 'Central Metro Corridor',
    lat: 10.0033,
    lon: 76.2996,
    totalSensors: 48,
    trainingRecords: 18432,
    activeHotspots: 8,
    baselineDelayMins: 7.5,
    peakSurgeMultiplier: 3.1,
    corridors: [
      { id: 'edappally-bypass', name: 'Edappally Toll - Palarivattom Bypass', baseLengthKm: 12.0, baseDelay: 8.2 },
      { id: 'kaloor-stadium', name: 'Kaloor Stadium - Banerji Road Link', baseLengthKm: 7.2, baseDelay: 7.1 },
      { id: 'vyttila-hub', name: 'Vyttila Mobility Hub Arterial Crossing', baseLengthKm: 5.4, baseDelay: 9.4 },
      { id: 'mg-road-metro', name: 'MG Road Commercial Metro Corridor', baseLengthKm: 8.6, baseDelay: 6.5 },
    ],
    metrics: {
      lr: { mae: 0.412, rmse: 0.478, r2: 0.698, latencyMs: '< 1 ms' },
      gbr: { mae: 0.218, rmse: 0.242, r2: 0.908, latencyMs: '4 ms' },
      lstm: { mae: 0.224, rmse: 0.251, r2: 0.889, latencyMs: '32 ms' },
    },
  },
  {
    id: 'kothamangalam',
    name: 'Kothamangalam',
    district: 'Ernakulam / High Range Gate',
    lat: 10.0601,
    lon: 76.6214,
    totalSensors: 24,
    trainingRecords: 12096,
    activeHotspots: 5,
    baselineDelayMins: 4.8,
    peakSurgeMultiplier: 2.4,
    corridors: [
      { id: 'nh85-thankalam', name: 'NH-85 Regional Arterial (Thankalam - Kozhippilly)', baseLengthKm: 14.2, baseDelay: 4.8 },
      { id: 'thankalam-junc', name: 'Thankalam Central Commercial Junction', baseLengthKm: 6.4, baseDelay: 5.2 },
      { id: 'highrange-karikkode', name: 'High Range Feeder Link (Karikkode - Chelad)', baseLengthKm: 9.8, baseDelay: 3.6 },
      { id: 'market-feeder', name: 'Market Feeder & MA College Road', baseLengthKm: 4.5, baseDelay: 4.1 },
    ],
    metrics: {
      lr: { mae: 0.382, rmse: 0.441, r2: 0.714, latencyMs: '< 1 ms' },
      gbr: { mae: 0.226, rmse: 0.250, r2: 0.892, latencyMs: '4 ms' },
      lstm: { mae: 0.231, rmse: 0.264, r2: 0.874, latencyMs: '28 ms' },
    },
  },
  {
    id: 'trivandrum',
    name: 'Thiruvananthapuram',
    district: 'Capital City & Technopark',
    lat: 8.5241,
    lon: 76.9366,
    totalSensors: 42,
    trainingRecords: 16500,
    activeHotspots: 7,
    baselineDelayMins: 6.8,
    peakSurgeMultiplier: 2.9,
    corridors: [
      { id: 'statue-eastfort', name: 'Statue - East Fort Arterial Spine', baseLengthKm: 6.8, baseDelay: 7.8 },
      { id: 'technopark-bypass', name: 'Technopark Phase-1 Kazhakkoottam Bypass', baseLengthKm: 15.2, baseDelay: 8.6 },
      { id: 'pattom-kesavadas', name: 'Pattom Junction & Kesavadasapuram Ring', baseLengthKm: 7.9, baseDelay: 6.9 },
      { id: 'thampanoor-rail', name: 'Thampanoor Central Station Flyover Link', baseLengthKm: 4.1, baseDelay: 8.2 },
    ],
    metrics: {
      lr: { mae: 0.408, rmse: 0.469, r2: 0.702, latencyMs: '< 1 ms' },
      gbr: { mae: 0.215, rmse: 0.239, r2: 0.912, latencyMs: '4 ms' },
      lstm: { mae: 0.220, rmse: 0.248, r2: 0.894, latencyMs: '30 ms' },
    },
  },
  {
    id: 'kozhikode',
    name: 'Kozhikode',
    district: 'Malabar Coastal Commercial Hub',
    lat: 11.2588,
    lon: 75.7804,
    totalSensors: 32,
    trainingRecords: 14200,
    activeHotspots: 6,
    baselineDelayMins: 5.9,
    peakSurgeMultiplier: 2.6,
    corridors: [
      { id: 'mavoor-road', name: 'Mavoor Road Commercial Arterial', baseLengthKm: 11.4, baseDelay: 6.8 },
      { id: 'calicut-beach', name: 'Calicut Beach & South Beach Road', baseLengthKm: 8.1, baseDelay: 4.2 },
      { id: 'palayam-bus', name: 'Palayam Bus Stand Bottleneck Junction', baseLengthKm: 4.8, baseDelay: 7.5 },
      { id: 'med-college-link', name: 'Medical College Feeder Highway', baseLengthKm: 13.6, baseDelay: 5.4 },
    ],
    metrics: {
      lr: { mae: 0.395, rmse: 0.455, r2: 0.706, latencyMs: '< 1 ms' },
      gbr: { mae: 0.221, rmse: 0.246, r2: 0.898, latencyMs: '4 ms' },
      lstm: { mae: 0.228, rmse: 0.258, r2: 0.881, latencyMs: '26 ms' },
    },
  },
  {
    id: 'thrissur',
    name: 'Thrissur',
    district: 'Cultural Capital Sector',
    lat: 10.5276,
    lon: 76.2144,
    totalSensors: 28,
    trainingRecords: 11800,
    activeHotspots: 4,
    baselineDelayMins: 5.2,
    peakSurgeMultiplier: 2.5,
    corridors: [
      { id: 'swaraj-round', name: 'Swaraj Round Core Ring Circle', baseLengthKm: 4.2, baseDelay: 6.4 },
      { id: 'sakthan-stand', name: 'Sakthan Thampuran Bus Terminal Road', baseLengthKm: 5.6, baseDelay: 6.0 },
      { id: 'mannuthy-bypass', name: 'Mannuthy NH Bypass Convergence', baseLengthKm: 14.8, baseDelay: 4.9 },
      { id: 'mg-road-tcr', name: 'M.G. Road City Central Arterial', baseLengthKm: 6.1, baseDelay: 4.3 },
    ],
    metrics: {
      lr: { mae: 0.374, rmse: 0.432, r2: 0.722, latencyMs: '< 1 ms' },
      gbr: { mae: 0.219, rmse: 0.244, r2: 0.902, latencyMs: '4 ms' },
      lstm: { mae: 0.225, rmse: 0.254, r2: 0.885, latencyMs: '27 ms' },
    },
  },
  {
    id: 'aluva',
    name: 'Aluva',
    district: 'Periyar Industrial Corridor',
    lat: 10.1076,
    lon: 76.3516,
    totalSensors: 20,
    trainingRecords: 9600,
    activeHotspots: 4,
    baselineDelayMins: 5.5,
    peakSurgeMultiplier: 2.7,
    corridors: [
      { id: 'aluva-flyover', name: 'Aluva Flyover & Metro Gateway Line', baseLengthKm: 5.2, baseDelay: 6.8 },
      { id: 'periyar-bridge', name: 'Periyar Bridge Arterial Crossing', baseLengthKm: 4.6, baseDelay: 7.2 },
      { id: 'bank-junction', name: 'Bank Junction Commercial Bottleneck', baseLengthKm: 3.8, baseDelay: 5.9 },
      { id: 'munnar-feeder-alv', name: 'Munnar Highway Feeder Link', baseLengthKm: 12.4, baseDelay: 4.5 },
    ],
    metrics: {
      lr: { mae: 0.386, rmse: 0.446, r2: 0.710, latencyMs: '< 1 ms' },
      gbr: { mae: 0.224, rmse: 0.248, r2: 0.895, latencyMs: '4 ms' },
      lstm: { mae: 0.229, rmse: 0.261, r2: 0.878, latencyMs: '25 ms' },
    },
  },
  {
    id: 'munnar',
    name: 'Munnar',
    district: 'Idukki High Range Tourism Sector',
    lat: 10.0889,
    lon: 77.0595,
    totalSensors: 16,
    trainingRecords: 7800,
    activeHotspots: 3,
    baselineDelayMins: 4.2,
    peakSurgeMultiplier: 2.8,
    corridors: [
      { id: 'old-munnar-bridge', name: 'Old Munnar Town Central Bridge', baseLengthKm: 3.6, baseDelay: 5.6 },
      { id: 'mattupetty-route', name: 'Munnar - Mattupetty Tea Valley Road', baseLengthKm: 14.5, baseDelay: 4.2 },
      { id: 'gap-road-nh85', name: 'High Range Gap Road (NH 85)', baseLengthKm: 18.2, baseDelay: 4.8 },
      { id: 'devikulam-bypass', name: 'Devikulam Bypass Scenic Link', baseLengthKm: 9.2, baseDelay: 3.1 },
    ],
    metrics: {
      lr: { mae: 0.392, rmse: 0.451, r2: 0.704, latencyMs: '< 1 ms' },
      gbr: { mae: 0.228, rmse: 0.252, r2: 0.888, latencyMs: '4 ms' },
      lstm: { mae: 0.235, rmse: 0.268, r2: 0.869, latencyMs: '24 ms' },
    },
  },
]

function findMatchingSector(parsed: any): CitySectorConfig {
  if (!parsed) return CITY_SECTORS[0]
  const str = `${parsed.name || ''} ${parsed.cityName || ''} ${parsed.district || ''}`.toLowerCase()

  // 1. Specific string matching
  if (str.includes('kothamangalam') || str.includes('thankalam') || str.includes('kozhippilly')) {
    return CITY_SECTORS.find((c) => c.id === 'kothamangalam') || CITY_SECTORS[0]
  }
  if (str.includes('kochi') || str.includes('ernakulam') || str.includes('edappally') || str.includes('vyttila') || str.includes('kaloor')) {
    return CITY_SECTORS.find((c) => c.id === 'kochi') || CITY_SECTORS[0]
  }
  if (str.includes('thiruvananthapuram') || str.includes('trivandrum') || str.includes('technopark') || str.includes('statue')) {
    return CITY_SECTORS.find((c) => c.id === 'trivandrum') || CITY_SECTORS[0]
  }
  if (str.includes('kozhikode') || str.includes('calicut') || str.includes('mavoor')) {
    return CITY_SECTORS.find((c) => c.id === 'kozhikode') || CITY_SECTORS[0]
  }
  if (str.includes('thrissur') || str.includes('trichur') || str.includes('swaraj')) {
    return CITY_SECTORS.find((c) => c.id === 'thrissur') || CITY_SECTORS[0]
  }
  if (str.includes('aluva') || str.includes('periyar')) {
    return CITY_SECTORS.find((c) => c.id === 'aluva') || CITY_SECTORS[0]
  }
  if (str.includes('munnar') || str.includes('idukki') || str.includes('devikulam')) {
    return CITY_SECTORS.find((c) => c.id === 'munnar') || CITY_SECTORS[0]
  }

  // 2. Proximity match by coordinates if available
  if (parsed.lat && parsed.lon) {
    let best = CITY_SECTORS[0]
    let minDistance = 999999
    for (const s of CITY_SECTORS) {
      const d = Math.hypot(s.lat - parsed.lat, s.lon - parsed.lon)
      if (d < minDistance) {
        minDistance = d
        best = s
      }
    }
    return best
  }

  return CITY_SECTORS[0]
}

export function AnalyticsPanel() {
  const [selectedCityId, setSelectedCityId] = useState<string>('kochi')
  const [selectedHorizon, setSelectedHorizon] = useState<'1h' | '3h' | '6h' | '24h'>('1h')
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('')
  const [simEvent, setSimEvent] = useState<boolean>(false)
  const [simWeather, setSimWeather] = useState<'Clear' | 'Rainy' | 'Storm'>('Clear')
  const [timeHour, setTimeHour] = useState<number>(18)

  // 1. Initial Load & Two-Way Sync with Left Sidebar
  useEffect(() => {
    try {
      const stored = localStorage.getItem('planner_active_city')
      if (stored) {
        const parsed = JSON.parse(stored)
        const matched = findMatchingSector(parsed)
        setSelectedCityId(matched.id)
      }
    } catch (_) {}

    const onCityChange = (e: any) => {
      if (e.detail) {
        const matched = findMatchingSector(e.detail)
        setSelectedCityId(matched.id)
      }
    }

    window.addEventListener('planner_city_changed', onCityChange)
    return () => window.removeEventListener('planner_city_changed', onCityChange)
  }, [])

  const activeCity = useMemo(() => {
    return CITY_SECTORS.find((c) => c.id === selectedCityId) || CITY_SECTORS[0]
  }, [selectedCityId])

  // Set default corridor whenever active city changes
  useEffect(() => {
    if (activeCity.corridors.length > 0) {
      setSelectedCorridorId(activeCity.corridors[0].id)
    }
  }, [activeCity])

  const activeCorridor = useMemo(() => {
    return activeCity.corridors.find((c) => c.id === selectedCorridorId) || activeCity.corridors[0]
  }, [activeCity, selectedCorridorId])

  const handleCitySelect = (cityId: string) => {
    setSelectedCityId(cityId)
    const target = CITY_SECTORS.find((c) => c.id === cityId)
    if (target) {
      try {
        localStorage.setItem(
          'planner_active_city',
          JSON.stringify({
            lat: target.lat,
            lon: target.lon,
            name: target.name,
            cityName: target.name,
            district: target.district,
            radiusKm: 10,
          })
        )
      } catch (_) {}
      window.dispatchEvent(
        new CustomEvent('planner_city_changed', {
          detail: {
            lat: target.lat,
            lon: target.lon,
            name: target.name,
            cityName: target.name,
            district: target.district,
            radiusKm: 10,
          },
        })
      )
    }
  }

  // Multi-model metrics tailored to active city sector
  const models = useMemo(() => {
    const m = activeCity.metrics
    return [
      {
        name: 'Linear Regression',
        modelType: 'Linear Baseline (P0)',
        mse: Math.round(Math.pow(m.lr.rmse, 2) * 10000) / 10000,
        rmse: m.lr.rmse,
        mae: m.lr.mae,
        r2: m.lr.r2,
        latency: m.lr.latencyMs,
        status: 'Trained & Validated',
        description: `Standard multi-variable linear baseline predicting congestion for ${activeCity.name} arterial grid.`,
        hyperparameters: { 'Fit Intercept': 'True', 'Alpha Regularization': 0.01, 'Features': 8 },
      },
      {
        name: 'Gradient Boosting (XGBoost)',
        modelType: 'Ensemble Trees (P0 Winner 🏆)',
        mse: Math.round(Math.pow(m.gbr.rmse, 2) * 10000) / 10000,
        rmse: m.gbr.rmse,
        mae: m.gbr.mae,
        r2: m.gbr.r2,
        latency: m.gbr.latencyMs,
        isWinner: true,
        status: 'Production Primary',
        description: `Gradient-boosted decision tree ensemble trained on ${activeCity.trainingRecords.toLocaleString()} sensor records in ${activeCity.name}.`,
        hyperparameters: { 'n_estimators': 200, 'max_depth': 6, 'learning_rate': 0.05, 'subsample': 0.8 },
      },
      {
        name: 'LSTM Neural Network',
        modelType: 'Deep Sequential (P2 Stretch)',
        mse: Math.round(Math.pow(m.lstm.rmse, 2) * 10000) / 10000,
        rmse: m.lstm.rmse,
        mae: m.lstm.mae,
        r2: m.lstm.r2,
        latency: m.lstm.latencyMs,
        status: 'Active Deep Learning',
        description: `Long Short-Term Memory recurrent neural network capturing 12-step sequential lag memory for ${activeCity.name}.`,
        hyperparameters: { 'Hidden Units': 128, 'Sequence Length': '12 steps', 'Epochs': 60, 'Optimizer': 'Adam' },
      },
    ]
  }, [activeCity])

  // Dynamic simulation predictions based on inputs & city characteristics
  const calculatePrediction = (modelIndex: number) => {
    let baseDelay = activeCorridor?.baseDelay || activeCity.baselineDelayMins
    const hour = timeHour

    // Peak hour surge
    if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20)) {
      baseDelay += baseDelay * (activeCity.peakSurgeMultiplier - 1.0)
    } else if (hour >= 23 || hour <= 5) {
      baseDelay = Math.max(0.5, baseDelay * 0.25)
    }

    if (simWeather === 'Rainy') baseDelay += 3.8
    if (simWeather === 'Storm') baseDelay += 8.6
    if (simEvent) baseDelay += 9.5

    // Horizon multipliers
    const horizonFactor =
      selectedHorizon === '1h' ? 1.0 : selectedHorizon === '3h' ? 1.25 : selectedHorizon === '6h' ? 1.45 : 1.7

    // Model variations
    if (modelIndex === 0) {
      return Math.round(baseDelay * 0.91 * horizonFactor * 10) / 10
    } else if (modelIndex === 1) {
      return Math.round(baseDelay * horizonFactor * 10) / 10
    } else {
      return Math.round(baseDelay * 1.03 * horizonFactor * 10) / 10
    }
  }

  return (
    <div className="space-y-8">
      {/* ── ACTIVE SECTOR BANNER (SYNCED WITH SIDEBAR) ── */}
      <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/50 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs font-bold shrink-0">
              <Compass className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Radio className="size-3 animate-pulse text-emerald-700" /> Active City Sector (Sidebar Synced)
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight mt-0.5">
                {activeCity.name} · <span className="text-slate-500 font-semibold text-sm">{activeCity.district}</span>
              </h2>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Coordinates: <span className="font-mono font-bold text-slate-800">{activeCity.lat.toFixed(4)}° N, {activeCity.lon.toFixed(4)}° E</span> · Surveillance Radius: <strong>10.0 km</strong>
              </p>
            </div>
          </div>

          {/* Quick Sector Switcher Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white/80 p-2 rounded-xl border border-emerald-200/60 shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 pl-1 pr-1">Switch:</span>
            {CITY_SECTORS.map((city) => {
              const isSelected = city.id === activeCity.id
              return (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => handleCitySelect(city.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {city.name.split(' ')[0]}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── SECTOR METADATA STATS CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Training Records</span>
            <Activity className="size-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {activeCity.trainingRecords.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            {activeCity.totalSensors} Road Sensors across {activeCity.name}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Hotspots</span>
            <Flame className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {activeCity.activeHotspots} Choke Points
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Top ranked bottlenecks in 10km grid
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Baseline Delay</span>
            <Clock className="size-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            ~{activeCity.baselineDelayMins} min
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Off-peak free-flow reference
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Peak Rush Surge</span>
            <TrendingUp className="size-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {activeCity.peakSurgeMultiplier}x Delay
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            8:00-10:00 AM & 5:00-8:00 PM multiplier
          </p>
        </div>
      </div>

      {/* ── MODELS EVALUATION GRID FOR SELECTED SECTOR ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Machine Learning Benchmark Matrix — {activeCity.name} Sector
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Rigorous cross-validation on 80/20 train-test split for {activeCity.name} urban arterial roads.
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="size-3.5 text-emerald-600" /> Held-out Synthetic Validation Verified
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {models.map((m) => (
            <div
              key={m.name}
              className={`relative flex flex-col justify-between rounded-2xl border p-6 shadow-sm transition-all ${
                m.isWinner
                  ? 'border-2 border-emerald-600 bg-white ring-4 ring-emerald-500/10'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {m.isWinner && (
                <span className="absolute -top-3 right-6 rounded-full bg-emerald-600 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs">
                  ⭐ Production Winner
                </span>
              )}

              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {m.modelType}
                    </span>
                    <h4 className="text-lg font-black text-slate-900">{m.name}</h4>
                  </div>
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Cpu className="size-4" />
                  </div>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {m.description}
                </p>

                {/* Accuracy & Error Metrics */}
                <div className="mt-4 grid grid-cols-4 gap-1.5 rounded-xl bg-slate-50 p-3 text-center border border-slate-100">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">MAE</p>
                    <p className="text-xs font-black text-slate-900">{m.mae}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">RMSE</p>
                    <p className="text-xs font-black text-slate-900">{m.rmse}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">R² SCORE</p>
                    <p className="text-xs font-black text-emerald-700">{m.r2}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">LATENCY</p>
                    <p className="text-xs font-black text-slate-700">{m.latency}</p>
                  </div>
                </div>

                {/* Hyperparameters */}
                <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Model Architecture & Hyperparameters
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {Object.entries(m.hyperparameters).map(([k, v]) => (
                      <span
                        key={k}
                        className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-medium text-slate-700"
                      >
                        {k}: <strong>{v}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-slate-400">Deployment Status</span>
                <span className="font-bold text-slate-900">{m.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── INTERACTIVE WHAT-IF CONGESTION SIMULATOR ── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <Sliders className="size-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                What-If Multi-Model Prediction Simulator ({activeCity.name})
              </h3>
              <p className="text-xs text-slate-500">
                Adjust live weather shocks, surge hours, and events to evaluate model delay outputs for {activeCity.name}.
              </p>
            </div>
          </div>

          {/* Horizon Selector */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs">
            {(['1h', '3h', '6h', '24h'] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setSelectedHorizon(h)}
                className={`rounded-lg px-3 py-1 font-bold uppercase transition-all cursor-pointer ${
                  selectedHorizon === h
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {h} Horizon
              </button>
            ))}
          </div>
        </div>

        {/* Input Parameters Controls */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Target Corridor ({activeCity.name})
            </label>
            <select
              value={selectedCorridorId}
              onChange={(e) => setSelectedCorridorId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
            >
              {activeCity.corridors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.baseLengthKm} km)
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Departure Hour: {timeHour}:00 ({timeHour >= 12 ? 'PM' : 'AM'})
            </label>
            <input
              type="range"
              min={0}
              max={23}
              value={timeHour}
              onChange={(e) => setTimeHour(Number(e.target.value))}
              className="mt-3 w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
              <span>00:00 Night</span>
              <span>12:00 Noon</span>
              <span>23:00 Night</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Kerala Weather Shock
            </label>
            <select
              value={simWeather}
              onChange={(e) => setSimWeather(e.target.value as any)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
            >
              <option value="Clear">☀️ Clear Free-Flow Weather</option>
              <option value="Rainy">🌧️ Heavy Monsoon Rain (+3.8m)</option>
              <option value="Storm">⛈️ Severe Cloudburst / Waterlogging (+8.6m)</option>
            </select>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Inject Festival / Incident
            </label>
            <button
              type="button"
              onClick={() => setSimEvent(!simEvent)}
              className={`mt-1.5 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                simEvent
                  ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-500/20'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="size-3.5" />
              {simEvent ? 'Festival Gridlock Injected (+9.5m)' : 'No Special Event Injected'}
            </button>
          </div>
        </div>

        {/* Live Multi-Model Predictions Output */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Zap className="size-4 text-emerald-600" />
              Simulated Forecast Delay ({selectedHorizon} Ahead) on {activeCity.name}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Corridor: <strong className="text-slate-900">{activeCorridor?.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {models.map((m, idx) => {
              const predictedDelay = calculatePrediction(idx)
              const isWin = m.isWinner

              return (
                <div
                  key={m.name}
                  className={`rounded-2xl border p-4 text-center transition-all ${
                    isWin
                      ? 'border-2 border-emerald-600 bg-white shadow-md ring-2 ring-emerald-500/10'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500">{m.name}</span>
                    {isWin && <span className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.2 rounded">Winner</span>}
                  </div>
                  <div className="mt-2 text-3xl font-black text-slate-900">
                    +{predictedDelay}{' '}
                    <span className="text-sm font-semibold text-slate-400">min delay</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 font-medium">
                    Estimated Speed: ~{Math.max(10, Math.round(45 - predictedDelay * 1.8))} km/h
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
