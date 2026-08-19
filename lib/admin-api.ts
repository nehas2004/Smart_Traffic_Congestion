import { BottleneckItem, CorridorDetail, DecisionAction, DecisionRecord, EventImpact, SeverityLevel, SharedTrafficData, TrafficRecommendation } from '@/types/traffic'

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

interface APIEnvelope<T> { success: boolean; data: T; message?: string | null; error?: string | null }

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_AI_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/$/, '')
const apiUrl = (path: string) => `${apiBaseUrl}${path}`

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null }
function isSeverity(value: unknown): value is SeverityLevel { return ['low', 'moderate', 'heavy', 'severe', 'critical'].includes(String(value)) }
function isEnvelope<T>(value: unknown, validate: (data: unknown) => data is T): value is APIEnvelope<T> { return isRecord(value) && value.success === true && validate(value.data) }

function isCurrentTraffic(value: unknown): value is CurrentTrafficReading[] {
  return Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.corridor_id === 'string' && typeof item.corridor_name === 'string' && typeof item.timestamp === 'string' && typeof item.current_congestion === 'number' && item.congestion_unit === 'tti_ratio' && isSeverity(item.severity) && typeof item.severity_config === 'string')
}

function isForecast(value: unknown): value is TrafficForecast {
  return isRecord(value) && typeof value.corridor_id === 'string' && typeof value.corridor_name === 'string' && typeof value.generated_at === 'string' && typeof value.source_timestamp === 'string' && (value.horizon === '1h' || value.horizon === '3h' || value.horizon === '6h') && typeof value.horizon_minutes === 'number' && typeof value.model_name === 'string' && typeof value.model_version === 'string' && value.congestion_unit === 'tti_ratio' && typeof value.predicted_congestion === 'number' && isSeverity(value.severity) && typeof value.severity_config === 'string' && value.confidence === null && Array.isArray(value.points) && value.points.every((point) => isRecord(point) && typeof point.timestamp === 'string' && typeof point.predicted_congestion === 'number' && point.congestion_unit === 'tti_ratio')
}

function isBottlenecks(value: unknown): value is TrafficBottleneck[] {
  return Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.id === 'string' && typeof item.corridor_id === 'string' && typeof item.corridor_name === 'string' && typeof item.window === 'string' && typeof item.days === 'string' && isSeverity(item.severity) && typeof item.avg_delay_mins === 'number' && typeof item.trend_percent === 'number' && item.confidence === null && item.congestion_unit === 'tti_ratio' && typeof item.current_congestion === 'number' && typeof item.predicted_congestion === 'number' && (item.forecast_horizon === '1h' || item.forecast_horizon === '3h' || item.forecast_horizon === '6h'))
}

function isModelEvaluations(value: unknown): value is ModelEvaluationRecord[] {
  return Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.model_name === 'string' && (item.horizon === '1h' || item.horizon === '3h' || item.horizon === '6h') && typeof item.mae === 'number' && typeof item.rmse === 'number' && typeof item.evaluation_start === 'string' && typeof item.evaluation_end === 'string' && typeof item.test_rows === 'number' && typeof item.model_version === 'string')
}

async function requestData<T>(path: string, validate: (value: unknown) => value is T, fallback: T): Promise<TrafficDataResult<T>> {
  try {
    const response = await fetch(apiUrl(path), { cache: 'no-store' })
    if (!response.ok) return { data: fallback, source: 'mock', error: `Traffic service returned HTTP ${response.status}.` }
    const payload: unknown = await response.json()
    if (!isEnvelope(payload, validate)) return { data: fallback, source: 'mock', error: 'Traffic service returned an invalid response.' }
    return { data: payload.data, source: 'api' }
  } catch { return { data: fallback, source: 'mock', error: 'Traffic service is unavailable.' } }
}

export const MOCK_CORRIDORS: CurrentTrafficReading[] = [
  { corridor_id: 'corr-01', corridor_name: 'MC Road Junction (Kothamangalam)', timestamp: new Date().toISOString(), current_congestion: 1.42, congestion_unit: 'tti_ratio', severity: 'heavy', severity_config: 'development_mock' },
  { corridor_id: 'corr-02', corridor_name: 'Aluva-Munnar Highway (NH 85 Central)', timestamp: new Date().toISOString(), current_congestion: 1.31, congestion_unit: 'tti_ratio', severity: 'heavy', severity_config: 'development_mock' },
  { corridor_id: 'corr-03', corridor_name: 'Market Feeder & College Road', timestamp: new Date().toISOString(), current_congestion: 1.18, congestion_unit: 'tti_ratio', severity: 'moderate', severity_config: 'development_mock' },
]

export const MOCK_BOTTLENECKS: TrafficBottleneck[] = [
  { id: 'bn-01', corridor_id: 'corr-01', corridor_name: 'MC Road Junction (Kothamangalam)', window: '08:00 - 10:15', days: 'Mon - Fri', severity: 'severe', avg_delay_mins: 24.5, trend_percent: 14, confidence: null, congestion_unit: 'tti_ratio', current_congestion: 1.42, predicted_congestion: 1.57, forecast_horizon: '1h' },
  { id: 'bn-02', corridor_id: 'corr-02', corridor_name: 'Aluva-Munnar Highway (NH 85 Central)', window: '17:30 - 19:45', days: 'Mon - Sat', severity: 'heavy', avg_delay_mins: 17.2, trend_percent: 6, confidence: null, congestion_unit: 'tti_ratio', current_congestion: 1.31, predicted_congestion: 1.39, forecast_horizon: '1h' },
]

function mockForecast(corridorId: string, horizon: ForecastHorizon): TrafficForecast {
  const corridor = MOCK_CORRIDORS.find((item) => item.corridor_id === corridorId) || MOCK_CORRIDORS[0]
  const minutes = { '1h': 60, '3h': 180, '6h': 360 }[horizon]
  const predicted = Number((corridor.current_congestion + 0.04).toFixed(2))
  return { corridor_id: corridor.corridor_id, corridor_name: corridor.corridor_name, generated_at: new Date().toISOString(), source_timestamp: corridor.timestamp, horizon, horizon_minutes: minutes, model_name: 'Development mock', model_version: 'development_mock', congestion_unit: 'tti_ratio', predicted_congestion: predicted, severity: corridor.severity, severity_config: 'development_mock', confidence: null, points: [{ timestamp: new Date(Date.now() + minutes * 60_000).toISOString(), predicted_congestion: predicted, congestion_unit: 'tti_ratio' }] }
}

export const getCurrentTrafficData = () => requestData('/traffic/current', isCurrentTraffic, MOCK_CORRIDORS)
export const getTrafficForecastData = (corridorId: string, horizon: ForecastHorizon) => requestData(`/traffic/forecast?corridor_id=${encodeURIComponent(corridorId)}&horizon=${horizon}`, isForecast, mockForecast(corridorId, horizon))
export const getBottleneckData = () => requestData('/bottlenecks', isBottlenecks, MOCK_BOTTLENECKS)
export const getModelEvaluationData = () => requestData('/analytics/model-evaluation', isModelEvaluations, [] as ModelEvaluationRecord[])

// Legacy admin consumers are intentionally retained until their separate API contracts are migrated.
const legacyTraffic: SharedTrafficData[] = MOCK_CORRIDORS.map((item) => ({ ...item, predicted_congestion: item.current_congestion, confidence: 0 }))
const legacyBottlenecks: BottleneckItem[] = MOCK_BOTTLENECKS.map(({ congestion_unit: _congestionUnit, current_congestion: _currentCongestion, predicted_congestion: _predictedCongestion, forecast_horizon: _forecastHorizon, ...item }) => ({ ...item, confidence: 0.8 }))
const legacyEvents: EventImpact[] = [
  { event_id: 'evt-101', event_name: 'Town Hall Regional Conference', venue: 'Kothamangalam Municipal Auditorium', expected_attendance: 1400, peak_window: '09:30 - 11:30', congestion_multiplier: 1.45, affected_corridors: ['corr-01', 'corr-03'], radius_meters: 800, severity_increase: 'severe' },
  { event_id: 'evt-102', event_name: 'Weekly Agricultural Market Day', venue: 'Central Market Square', expected_attendance: 3200, peak_window: '07:00 - 13:00', congestion_multiplier: 1.6, affected_corridors: ['corr-01', 'corr-02'], radius_meters: 1200, severity_increase: 'heavy' },
]
const legacyRecommendations: TrafficRecommendation[] = [
  { id: 'rec-01', corridor_id: 'corr-01', corridor_name: 'MC Road Junction (Kothamangalam)', created_at: new Date(Date.now() - 12 * 60_000).toISOString(), priority: 'high', title: 'Adaptive Signal Phase Extension (+30s East-West)', description: 'Current traffic conditions require an operator review before signal retiming.', action_type: 'signal_retiming', expected_delay_reduction_mins: 11.5, confidence: 0.94, current_congestion: 78, predicted_congestion: 89, severity: 'severe', bottleneck: legacyBottlenecks[0], event_impact: legacyEvents[0] },
  { id: 'rec-02', corridor_id: 'corr-02', corridor_name: 'Aluva-Munnar Highway (NH 85 Central)', created_at: new Date(Date.now() - 45 * 60_000).toISOString(), priority: 'medium', title: 'Dynamic Variable Message Reroute', description: 'Review the suggested diversion before applying a reroute action.', action_type: 'dynamic_reroute', expected_delay_reduction_mins: 7.2, confidence: 0.88, current_congestion: 64, predicted_congestion: 75, severity: 'heavy', bottleneck: legacyBottlenecks[1], event_impact: legacyEvents[1] },
]
let localDecisions: DecisionRecord[] = [
  { id: 'dec-1001', recommendation_id: 'rec-arch-00', corridor_id: 'corr-01', corridor_name: 'MC Road Junction (Kothamangalam)', action: 'accept', operator: 'Arshad (Admin)', timestamp: new Date(Date.now() - 180 * 60_000).toISOString(), reason_or_notes: 'Applied standard morning green-wave signal timing offset.', modified_parameters: { custom_timing_seconds: 25 } },
]

export async function fetchCurrentTraffic(): Promise<SharedTrafficData[]> { return legacyTraffic }
export async function fetchBottlenecks(): Promise<BottleneckItem[]> { return legacyBottlenecks }
export async function fetchCorridorDetails(id: string): Promise<CorridorDetail | undefined> { return legacyTraffic.find((item) => item.corridor_id === id) || legacyTraffic[0] }
export async function fetchEventImpact(eventId: string): Promise<EventImpact | undefined> { return legacyEvents.find((item) => item.event_id === eventId) || legacyEvents[0] }
export async function fetchRecommendations(): Promise<TrafficRecommendation[]> { return legacyRecommendations }
export async function fetchDecisionHistory(): Promise<DecisionRecord[]> { return localDecisions }
export async function submitDecision(payload: { recommendation_id: string; corridor_id: string; corridor_name: string; action: DecisionAction; operator?: string; reason_or_notes?: string; modified_parameters?: DecisionRecord['modified_parameters'] }): Promise<{ success: boolean; record: DecisionRecord }> {
  const record: DecisionRecord = { id: `dec-${Date.now()}`, recommendation_id: payload.recommendation_id, corridor_id: payload.corridor_id, corridor_name: payload.corridor_name, action: payload.action, operator: payload.operator || 'Admin', timestamp: new Date().toISOString(), reason_or_notes: payload.reason_or_notes, modified_parameters: payload.modified_parameters }
  localDecisions = [record, ...localDecisions]
  return { success: true, record }
}
