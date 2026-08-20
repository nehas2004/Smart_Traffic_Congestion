import {
  BottleneckItem,
  CorridorDetail,
  DecisionAction,
  DecisionRecord,
  EventImpact,
  SeverityLevel,
  SharedTrafficData,
  TrafficRecommendation,
} from '@/types/traffic'

export type TrafficDataSource = 'api' | 'mock'
export type ForecastHorizon = '1h' | '3h' | '6h'
export interface TrafficDataResult<T> {
  data: T
  source: TrafficDataSource
  error?: string
}
export interface CurrentTrafficReading {
  corridor_id: string
  corridor_name: string
  timestamp: string
  current_congestion: number
  congestion_unit: 'tti_ratio'
  severity: SeverityLevel
  severity_config: string
}
export interface TrafficForecastPoint {
  timestamp: string
  predicted_congestion: number
  congestion_unit: 'tti_ratio'
}
export interface TrafficForecast {
  corridor_id: string
  corridor_name: string
  generated_at: string
  source_timestamp: string
  horizon: ForecastHorizon
  horizon_minutes: number
  model_name: string
  model_version: string
  congestion_unit: 'tti_ratio'
  predicted_congestion: number
  severity: SeverityLevel
  severity_config: string
  confidence: null
  points: TrafficForecastPoint[]
}
export interface ModelEvaluationRecord {
  model_name: string
  horizon: ForecastHorizon
  mae: number
  rmse: number
  evaluation_start: string
  evaluation_end: string
  test_rows: number
  model_version: string
}
export interface TrafficBottleneck {
  id: string
  corridor_id: string
  corridor_name: string
  window: string
  days: string
  severity: SeverityLevel
  avg_delay_mins: number
  trend_percent: number
  confidence: null
  congestion_unit: 'tti_ratio'
  current_congestion: number
  predicted_congestion: number
  forecast_horizon: ForecastHorizon
}
interface APIEnvelope<T> {
  success: boolean
  data: T
}

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_AI_BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  ''
).replace(/\/$/, '')
const apiUrl = (path: string) => `${apiBaseUrl}${path}`
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
const isSeverity = (value: unknown): value is SeverityLevel =>
  ['low', 'moderate', 'heavy', 'severe', 'critical'].includes(String(value))
const isEnvelope = <T>(
  value: unknown,
  validate: (data: unknown) => data is T
): value is APIEnvelope<T> =>
  isRecord(value) && value.success === true && validate(value.data)

function isCurrentTraffic(value: unknown): value is CurrentTrafficReading[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.corridor_id === 'string' &&
        typeof item.corridor_name === 'string' &&
        typeof item.timestamp === 'string' &&
        typeof item.current_congestion === 'number' &&
        item.congestion_unit === 'tti_ratio' &&
        isSeverity(item.severity) &&
        typeof item.severity_config === 'string'
    )
  )
}
function isForecast(value: unknown): value is TrafficForecast {
  return (
    isRecord(value) &&
    typeof value.corridor_id === 'string' &&
    typeof value.corridor_name === 'string' &&
    typeof value.generated_at === 'string' &&
    typeof value.source_timestamp === 'string' &&
    (value.horizon === '1h' || value.horizon === '3h' || value.horizon === '6h') &&
    typeof value.horizon_minutes === 'number' &&
    typeof value.model_name === 'string' &&
    typeof value.model_version === 'string' &&
    value.congestion_unit === 'tti_ratio' &&
    typeof value.predicted_congestion === 'number' &&
    isSeverity(value.severity) &&
    typeof value.severity_config === 'string' &&
    value.confidence === null &&
    Array.isArray(value.points)
  )
}
function isBottlenecks(value: unknown): value is TrafficBottleneck[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === 'string' &&
        typeof item.corridor_id === 'string' &&
        typeof item.corridor_name === 'string' &&
        typeof item.avg_delay_mins === 'number' &&
        typeof item.trend_percent === 'number' &&
        item.confidence === null &&
        item.congestion_unit === 'tti_ratio' &&
        typeof item.predicted_congestion === 'number' &&
        (item.forecast_horizon === '1h' ||
          item.forecast_horizon === '3h' ||
          item.forecast_horizon === '6h')
    )
  )
}
function isModelEvaluations(value: unknown): value is ModelEvaluationRecord[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.model_name === 'string' &&
        (item.horizon === '1h' || item.horizon === '3h' || item.horizon === '6h') &&
        typeof item.mae === 'number' &&
        typeof item.rmse === 'number' &&
        typeof item.evaluation_start === 'string' &&
        typeof item.evaluation_end === 'string' &&
        typeof item.test_rows === 'number' &&
        typeof item.model_version === 'string'
    )
  )
}
async function requestData<T>(
  path: string,
  validate: (value: unknown) => value is T,
  fallback: T
): Promise<TrafficDataResult<T>> {
  try {
    const response = await fetch(apiUrl(path), { cache: 'no-store' })
    if (!response.ok)
      return {
        data: fallback,
        source: 'mock',
        error: `Traffic service returned HTTP ${response.status}.`,
      }
    const payload: unknown = await response.json()
    if (!isEnvelope(payload, validate))
      return {
        data: fallback,
        source: 'mock',
        error: 'Traffic service returned an invalid response.',
      }
    return { data: payload.data, source: 'api' }
  } catch {
    return {
      data: fallback,
      source: 'mock',
      error: 'Traffic service is unavailable.',
    }
  }
}

export const MOCK_CORRIDORS: CurrentTrafficReading[] = [
  {
    corridor_id: 'corr-01',
    corridor_name: 'MC Road Junction (Kothamangalam)',
    timestamp: new Date().toISOString(),
    current_congestion: 1.42,
    congestion_unit: 'tti_ratio',
    severity: 'heavy',
    severity_config: 'development_mock',
  },
  {
    corridor_id: 'corr-02',
    corridor_name: 'Aluva-Munnar Highway (NH 85 Central)',
    timestamp: new Date().toISOString(),
    current_congestion: 1.31,
    congestion_unit: 'tti_ratio',
    severity: 'heavy',
    severity_config: 'development_mock',
  },
  {
    corridor_id: 'corr-03',
    corridor_name: 'Market Feeder & College Road',
    timestamp: new Date().toISOString(),
    current_congestion: 1.18,
    congestion_unit: 'tti_ratio',
    severity: 'moderate',
    severity_config: 'development_mock',
  },
]

export const MOCK_BOTTLENECKS: TrafficBottleneck[] = [
  {
    id: 'bn-01',
    corridor_id: 'corr-01',
    corridor_name: 'MC Road Junction (Kothamangalam)',
    window: '08:00 - 10:15',
    days: 'Mon - Fri',
    severity: 'severe',
    avg_delay_mins: 24.5,
    trend_percent: 14,
    confidence: null,
    congestion_unit: 'tti_ratio',
    current_congestion: 1.42,
    predicted_congestion: 1.57,
    forecast_horizon: '1h',
  },
  {
    id: 'bn-02',
    corridor_id: 'corr-02',
    corridor_name: 'Aluva-Munnar Highway (NH 85 Central)',
    window: '17:30 - 19:45',
    days: 'Mon - Sat',
    severity: 'heavy',
    avg_delay_mins: 17.2,
    trend_percent: 6,
    confidence: null,
    congestion_unit: 'tti_ratio',
    current_congestion: 1.31,
    predicted_congestion: 1.39,
    forecast_horizon: '1h',
  },
]

function mockForecast(corridorId: string, horizon: ForecastHorizon): TrafficForecast {
  const corridor =
    MOCK_CORRIDORS.find((item) => item.corridor_id === corridorId) || MOCK_CORRIDORS[0]
  const minutes = { '1h': 60, '3h': 180, '6h': 360 }[horizon]
  const predicted = Number((corridor.current_congestion + 0.04).toFixed(2))
  return {
    corridor_id: corridor.corridor_id,
    corridor_name: corridor.corridor_name,
    generated_at: new Date().toISOString(),
    source_timestamp: corridor.timestamp,
    horizon,
    horizon_minutes: minutes,
    model_name: 'Development mock',
    model_version: 'development_mock',
    congestion_unit: 'tti_ratio',
    predicted_congestion: predicted,
    severity: corridor.severity,
    severity_config: 'development_mock',
    confidence: null,
    points: [
      {
        timestamp: new Date(Date.now() + minutes * 60_000).toISOString(),
        predicted_congestion: predicted,
        congestion_unit: 'tti_ratio',
      },
    ],
  }
}

export const getCurrentTrafficData = () =>
  requestData('/traffic/current', isCurrentTraffic, MOCK_CORRIDORS)
export const getTrafficForecastData = (corridorId: string, horizon: ForecastHorizon) =>
  requestData(
    `/traffic/forecast?corridor_id=${encodeURIComponent(corridorId)}&horizon=${horizon}`,
    isForecast,
    mockForecast(corridorId, horizon)
  )
export const getBottleneckData = () =>
  requestData('/bottlenecks', isBottlenecks, MOCK_BOTTLENECKS)
export const getModelEvaluationData = () =>
  requestData('/analytics/model-evaluation', isModelEvaluations, [] as ModelEvaluationRecord[])

export const MOCK_EVENT_IMPACTS: EventImpact[] = [
  {
    event_id: 'evt-101',
    event_name: 'Town Hall Regional Conference',
    venue: 'Kothamangalam Municipal Auditorium',
    expected_attendance: 1400,
    peak_window: '09:30 - 11:30',
    congestion_multiplier: 1.45,
    affected_corridors: ['corr-01', 'corr-03'],
    radius_meters: 800,
    severity_increase: 'severe',
  },
  {
    event_id: 'evt-102',
    event_name: 'Weekly Agricultural Market Day',
    venue: 'Central Market Square',
    expected_attendance: 3200,
    peak_window: '07:00 - 13:00',
    congestion_multiplier: 1.6,
    affected_corridors: ['corr-01', 'corr-02'],
    radius_meters: 1200,
    severity_increase: 'heavy',
  },
]

export const MOCK_RECOMMENDATIONS: TrafficRecommendation[] = [
  {
    id: 'rec-01',
    corridor_id: 'corr-01',
    corridor_name: 'MC Road Junction (Kothamangalam)',
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    priority: 'high',
    title: 'Adaptive Signal Phase Extension (+30s East-West)',
    description:
      'Current surge of +24.5 min delay driven by inbound conference attendees. Allocate +30s green time to MC Road mainline to drain queue before peak gridlock.',
    action_type: 'signal_retiming',
    expected_delay_reduction_mins: 11.5,
    confidence: 0.94,
    current_congestion: 78,
    predicted_congestion: 89,
    severity: 'severe',
    bottleneck: MOCK_BOTTLENECKS[0],
    event_impact: MOCK_EVENT_IMPACTS[0],
  },
  {
    id: 'rec-02',
    corridor_id: 'corr-02',
    corridor_name: 'Aluva-Munnar Highway (NH 85 Central)',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    priority: 'medium',
    title: 'Dynamic Variable Message Reroute via Bypass Ring North',
    description:
      'Divert 25% of commercial through-traffic onto Bypass Ring North to mitigate 17.2m delay at central intersection.',
    action_type: 'dynamic_reroute',
    expected_delay_reduction_mins: 7.8,
    confidence: 0.88,
    current_congestion: 64,
    predicted_congestion: 75,
    severity: 'heavy',
    bottleneck: MOCK_BOTTLENECKS[1],
    event_impact: MOCK_EVENT_IMPACTS[1],
  },
  {
    id: 'rec-03',
    corridor_id: 'corr-03',
    corridor_name: 'Market Feeder & College Road',
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    priority: 'low',
    title: 'On-Demand Traffic Marshal Dispatch',
    description:
      'Deploy 2 field officers to clear illegal curb parking during afternoon school bell discharge.',
    action_type: 'incident_dispatch',
    expected_delay_reduction_mins: 4.2,
    confidence: 0.85,
    current_congestion: 45,
    predicted_congestion: 58,
    severity: 'moderate',
  },
]

// In-memory or session persistent decisions
let localDecisions: DecisionRecord[] = [
  {
    id: 'dec-1001',
    recommendation_id: 'rec-arch-00',
    corridor_id: 'corr-01',
    corridor_name: 'MC Road Junction (Kothamangalam)',
    action: 'accept',
    operator: 'Arshad (Admin)',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    reason_or_notes: 'Applied standard morning green-wave signal timing offset.',
    modified_parameters: { custom_timing_seconds: 25 },
  },
  {
    id: 'dec-1002',
    recommendation_id: 'rec-arch-01',
    corridor_id: 'corr-02',
    corridor_name: 'Aluva-Munnar Highway (NH 85 Central)',
    action: 'modify',
    operator: 'Arshad (Admin)',
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    reason_or_notes:
      'Adjusted diversion quota from 35% down to 20% due to narrow bypass feeder bridge.',
    modified_parameters: { reroute_percentage: 20 },
  },
  {
    id: 'dec-1003',
    recommendation_id: 'rec-arch-02',
    corridor_id: 'corr-04',
    corridor_name: 'Bypass Bypass Ring North',
    action: 'reject',
    operator: 'Arshad (Admin)',
    timestamp: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
    reason_or_notes:
      'Road surface maintenance underway on northern shoulder; diversion rejected.',
  },
]

// ==========================================
// SHARED API CLIENT CONSUMER FUNCTIONS
// ==========================================

function getStoredSectorQuery(sector?: { lat: number; lon: number; name: string }) {
  if (sector) {
    return `lat=${sector.lat}&lon=${sector.lon}&city=${encodeURIComponent(sector.name)}`
  }
  try {
    const s = localStorage.getItem('planner_active_city')
    if (s) {
      const parsed = JSON.parse(s)
      return `lat=${parsed.lat}&lon=${parsed.lon}&city=${encodeURIComponent(parsed.name)}`
    }
  } catch (_) {}
  return `lat=10.0601&lon=76.6214&city=Kothamangalam`
}

export async function fetchCurrentTraffic(sector?: {
  lat: number
  lon: number
  name: string
}): Promise<SharedTrafficData[]> {
  try {
    const query = getStoredSectorQuery(sector)
    const res = await fetch(`/api/admin/corridors?${query}`, { cache: 'no-store' })
    if (res.ok) {
      return await res.json()
    }
  } catch {}
  return MOCK_CORRIDORS.map((item) => ({
    ...item,
    predicted_congestion: item.current_congestion,
    confidence: 0,
  }))
}

export async function fetchCorridorDetails(
  id: string,
  sector?: { lat: number; lon: number; name: string }
): Promise<CorridorDetail | undefined> {
  try {
    const query = getStoredSectorQuery(sector)
    const res = await fetch(`/api/admin/corridors?${query}`, { cache: 'no-store' })
    if (res.ok) {
      const corridors: CorridorDetail[] = await res.json()
      return corridors.find((c) => c.corridor_id === id) || corridors[0]
    }
  } catch {}
  const list = await fetchCurrentTraffic(sector)
  return list.find((c) => c.corridor_id === id) || (list[0] as unknown as CorridorDetail)
}

export async function fetchTrafficForecast(
  corridorId?: string
): Promise<
  { hour: string; predicted_congestion: number; lower: number; upper: number; actual?: number }[]
> {
  try {
    const url = corridorId ? `/api/admin/forecast?corridor_id=${corridorId}` : '/api/admin/forecast'
    const res = await fetch(url, { cache: 'no-store' })
    if (res.ok) {
      return await res.json()
    }
  } catch {}

  // Fallback 12-hour forecast based on gradient boosting trend
  return Array.from({ length: 12 }, (_, idx) => {
    const hourNum = (new Date().getHours() + idx) % 24
    const isPeak = (hourNum >= 8 && hourNum <= 10) || (hourNum >= 17 && hourNum <= 20)
    const base = isPeak ? 72 + Math.sin(idx) * 12 : 38 + Math.cos(idx) * 8
    const predicted = Math.min(100, Math.max(10, Math.round(base)))
    return {
      hour: `${String(hourNum).padStart(2, '0')}:00`,
      predicted_congestion: predicted,
      lower: Math.max(0, predicted - 7),
      upper: Math.min(100, predicted + 8),
      actual: idx === 0 ? Math.round(predicted - 2) : undefined,
    }
  })
}

export async function fetchBottlenecks(sector?: {
  lat: number
  lon: number
  name: string
}): Promise<BottleneckItem[]> {
  try {
    const query = getStoredSectorQuery(sector)
    const res = await fetch(`/api/admin/bottlenecks?${query}`, { cache: 'no-store' })
    if (res.ok) {
      return await res.json()
    }
  } catch {}
  return MOCK_BOTTLENECKS.map(
    ({
      congestion_unit: _unit,
      current_congestion: _current,
      predicted_congestion: _predicted,
      forecast_horizon: _horizon,
      ...item
    }) => ({ ...item, confidence: 0.8 })
  )
}

export async function fetchEventImpact(eventId: string): Promise<EventImpact | undefined> {
  try {
    const res = await fetch(`/events/${eventId}/impact`, { cache: 'no-store' })
    if (res.ok) {
      return await res.json()
    }
  } catch {}
  return MOCK_EVENT_IMPACTS.find((e) => e.event_id === eventId) || MOCK_EVENT_IMPACTS[0]
}

export async function fetchRecommendations(sector?: {
  lat: number
  lon: number
  name: string
}): Promise<TrafficRecommendation[]> {
  try {
    const query = getStoredSectorQuery(sector)
    const res = await fetch(`/api/admin/recommendations?${query}`, { cache: 'no-store' })
    if (res.ok) {
      return await res.json()
    }
  } catch {}
  return MOCK_RECOMMENDATIONS
}

export async function fetchDecisionHistory(): Promise<DecisionRecord[]> {
  try {
    const res = await fetch('/api/admin/decisions', { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) return data
    }
  } catch {}
  return localDecisions
}

export async function submitDecision(payload: {
  recommendation_id: string
  corridor_id: string
  corridor_name: string
  action: DecisionAction
  operator?: string
  reason_or_notes?: string
  modified_parameters?: Record<string, any>
}): Promise<{ success: boolean; record: DecisionRecord }> {
  const newRecord: DecisionRecord = {
    id: `dec-${Date.now()}`,
    recommendation_id: payload.recommendation_id,
    corridor_id: payload.corridor_id,
    corridor_name: payload.corridor_name,
    action: payload.action,
    operator: payload.operator || 'City Traffic Controller',
    timestamp: new Date().toISOString(),
    reason_or_notes: payload.reason_or_notes || `Decision ${payload.action.toUpperCase()} recorded.`,
    modified_parameters: payload.modified_parameters,
  }

  try {
    const res = await fetch('/api/admin/decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecord),
    })
    if (res.ok) {
      const data = await res.json()
      localDecisions = [data.record || newRecord, ...localDecisions]
      return { success: true, record: data.record || newRecord }
    }
  } catch {}

  // Save to local in-memory array
  localDecisions = [newRecord, ...localDecisions]
  return { success: true, record: newRecord }
}

export async function fetchReportedIncidents(sector?: { lat: number; lon: number }): Promise<any[]> {
  try {
    const url = sector
      ? `/api/incidents?lat=${sector.lat}&lon=${sector.lon}&radiusKm=20`
      : '/api/incidents'
    const res = await fetch(url, { cache: 'no-store' })
    if (res.ok) {
      return await res.json()
    }
  } catch {}
  return []
}

export async function cancelReportedIncident(incidentId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/incidents?id=${incidentId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      window.dispatchEvent(new CustomEvent('incident_resolved', { detail: { id: incidentId } }))
      return true
    }
  } catch {}
  return false
}

export interface DashboardMetrics {
  city_name: string
  coordinates: { lat: number; lon: number }
  city_congestion_index: number
  typical_baseline: number
  congestion_change: number
  peak_delay_forecast: number
  peak_corridor_name: string
  forecast_horizon_minutes: number
  critical_bottlenecks: number
  total_monitored_hotspots: number
  model_performance: {
    name: string
    trees: number
    mae: number
    rmse: number
    r2: number
    confidence_score: number
    horizon_minutes: number
    features_count: number
    evaluated_on: string
  }
  decision_queue: {
    active_recommendations: number
    requires_review: boolean
  }
  data_source: string
  timestamp: string
}

export async function fetchDashboardMetrics(sector?: {
  lat: number
  lon: number
  name: string
}): Promise<DashboardMetrics | null> {
  try {
    const query = getStoredSectorQuery(sector)
    const res = await fetch(`/api/admin/metrics?${query}`, { cache: 'no-store' })
    if (res.ok) {
      return await res.json()
    }
  } catch {}
  return null
}
