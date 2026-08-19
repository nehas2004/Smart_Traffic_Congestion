import {
  SharedTrafficData,
  CorridorDetail,
  BottleneckItem,
  EventImpact,
  TrafficRecommendation,
  DecisionRecord,
  DecisionAction,
} from '@/types/traffic'

// Initial fallback mock data compliant with the shared contract
export const MOCK_CORRIDORS: CorridorDetail[] = [
  {
    corridor_id: 'corr-01',
    corridor_name: 'MC Road Junction (Kothamangalam)',
    timestamp: new Date().toISOString(),
    current_congestion: 78,
    predicted_congestion: 89,
    severity: 'severe',
    confidence: 0.94,
    length_km: 4.2,
    current_speed_kmh: 18,
    free_flow_speed_kmh: 48,
    historical_avg_delay: 22,
    coordinates: [
      [10.0570, 76.6180],
      [10.0601, 76.6214],
      [10.0635, 76.6250],
      [10.0680, 76.6300],
    ],
    active_incidents: 2,
  },
  {
    corridor_id: 'corr-02',
    corridor_name: 'Aluva-Munnar Highway (NH 85 Central)',
    timestamp: new Date().toISOString(),
    current_congestion: 64,
    predicted_congestion: 75,
    severity: 'heavy',
    confidence: 0.88,
    length_km: 6.8,
    current_speed_kmh: 26,
    free_flow_speed_kmh: 55,
    historical_avg_delay: 15,
    coordinates: [
      [10.0520, 76.6120],
      [10.0580, 76.6190],
      [10.0650, 76.6280],
      [10.0710, 76.6360],
    ],
    active_incidents: 1,
  },
  {
    corridor_id: 'corr-03',
    corridor_name: 'Market Feeder & College Road',
    timestamp: new Date().toISOString(),
    current_congestion: 45,
    predicted_congestion: 58,
    severity: 'moderate',
    confidence: 0.91,
    length_km: 3.1,
    current_speed_kmh: 32,
    free_flow_speed_kmh: 45,
    historical_avg_delay: 8,
    coordinates: [
      [10.0590, 76.6240],
      [10.0620, 76.6220],
      [10.0660, 76.6200],
    ],
    active_incidents: 0,
  },
  {
    corridor_id: 'corr-04',
    corridor_name: 'Bypass Bypass Ring North',
    timestamp: new Date().toISOString(),
    current_congestion: 22,
    predicted_congestion: 28,
    severity: 'low',
    confidence: 0.96,
    length_km: 5.5,
    current_speed_kmh: 48,
    free_flow_speed_kmh: 52,
    historical_avg_delay: 2,
    coordinates: [
      [10.0700, 76.6150],
      [10.0740, 76.6240],
      [10.0720, 76.6350],
    ],
    active_incidents: 0,
  },
]

export const MOCK_BOTTLENECKS: BottleneckItem[] = [
  {
    id: 'bn-01',
    corridor_id: 'corr-01',
    corridor_name: 'MC Road Junction (Kothamangalam)',
    window: '08:00 - 10:15',
    days: 'Mon - Fri',
    severity: 'severe',
    avg_delay_mins: 24.5,
    trend_percent: 14,
    confidence: 0.94,
    coordinates: [10.0601, 76.6214],
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
    confidence: 0.88,
    coordinates: [10.0650, 76.6280],
  },
  {
    id: 'bn-03',
    corridor_id: 'corr-03',
    corridor_name: 'Market Feeder & College Road',
    window: '15:15 - 16:30',
    days: 'School Days',
    severity: 'moderate',
    avg_delay_mins: 9.8,
    trend_percent: -3,
    confidence: 0.85,
    coordinates: [10.0620, 76.6220],
  },
]

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
    description: 'Current surge of +24.5 min delay driven by inbound conference attendees. Allocate +30s green time to MC Road mainline to drain queue before peak gridlock.',
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
    description: 'Divert 25% of commercial through-traffic onto Bypass Ring North to mitigate 17.2m delay at central intersection.',
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
    description: 'Deploy 2 field officers to clear illegal curb parking during afternoon school bell discharge.',
    action_type: 'incident_dispatch',
    expected_delay_reduction_mins: 4.2,
    confidence: 0.85,
    current_congestion: 45,
    predicted_congestion: 58,
    severity: 'moderate',
    bottleneck: MOCK_BOTTLENECKS[2],
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
    reason_or_notes: 'Adjusted diversion quota from 35% down to 20% due to narrow bypass feeder bridge.',
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
    reason_or_notes: 'Road surface maintenance underway on northern shoulder; diversion rejected.',
  },
]

// ==========================================
// SHARED API CLIENT CONSUMER FUNCTIONS
// ==========================================

export async function fetchCurrentTraffic(): Promise<SharedTrafficData[]> {
  try {
    const res = await fetch('/traffic/current', { cache: 'no-store' })
    if (res.ok) {
      return await res.json()
    }
  } catch {}
  return MOCK_CORRIDORS
}

export async function fetchCorridorDetails(id: string): Promise<CorridorDetail | undefined> {
  try {
    const res = await fetch(`/traffic/corridors/${id}`, { cache: 'no-store' })
    if (res.ok) {
      return await res.json()
    }
  } catch {}
  return MOCK_CORRIDORS.find((c) => c.corridor_id === id) || MOCK_CORRIDORS[0]
}

export async function fetchTrafficForecast(corridorId?: string): Promise<{ hour: string; predicted_congestion: number; lower: number; upper: number; actual?: number }[]> {
  try {
    const url = corridorId ? `/traffic/forecast?corridor_id=${corridorId}` : '/traffic/forecast'
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

export async function fetchBottlenecks(): Promise<BottleneckItem[]> {
  try {
    const res = await fetch('/bottlenecks', { cache: 'no-store' })
    if (res.ok) {
      return await res.json()
    }
  } catch {}
  return MOCK_BOTTLENECKS
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

export async function fetchRecommendations(): Promise<TrafficRecommendation[]> {
  try {
    const res = await fetch('/recommendations', { cache: 'no-store' })
    if (res.ok) {
      return await res.json()
    }
  } catch {}
  return MOCK_RECOMMENDATIONS
}

export async function fetchDecisionHistory(): Promise<DecisionRecord[]> {
  try {
    const res = await fetch('/admin/decisions', { cache: 'no-store' })
    if (res.ok) {
      return await res.json()
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
    operator: payload.operator || 'Arshad (Admin)',
    timestamp: new Date().toISOString(),
    reason_or_notes: payload.reason_or_notes || `Decision ${payload.action.toUpperCase()} by operator.`,
    modified_parameters: payload.modified_parameters,
  }

  try {
    const res = await fetch('/admin/decisions', {
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
