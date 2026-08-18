// Mock data for the Flowcast dashboard shell (UI-only session).
// Replace with model output + real feeds once the Python service is wired.

export type FlowLevel = 'free' | 'moderate' | 'heavy' | 'severe'

export const FLOW_META: Record<
  FlowLevel,
  { label: string; token: string; range: string }
> = {
  free:     { label: 'Free flow', token: 'var(--flow-free)',     range: '0-8 min delay' },
  moderate: { label: 'Moderate',  token: 'var(--flow-moderate)', range: '8-15 min delay' },
  heavy:    { label: 'Heavy',     token: 'var(--flow-heavy)',    range: '15-25 min delay' },
  severe:   { label: 'Severe',    token: 'var(--flow-severe)',   range: '25+ min delay' },
}

export function levelFromScore(score: number): FlowLevel {
  if (score < 0.35) return 'free'
  if (score < 0.6)  return 'moderate'
  if (score < 0.8)  return 'heavy'
  return 'severe'
}

export const ZONE_COLS = 10
export const ZONE_ROWS = 6

function seeded(i: number) {
  const x = Math.sin(i * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

export const heatmapZones = Array.from({ length: ZONE_ROWS * ZONE_COLS }, (_, i) => {
  const row = Math.floor(i / ZONE_COLS)
  const col = i % ZONE_COLS
  const cx = ZONE_COLS / 2
  const cy = ZONE_ROWS / 2
  const dist = Math.hypot(col - cx, row - cy) / Math.hypot(cx, cy)
  const corridor = row === 2 || col === 6 ? 0.28 : 0
  const score = Math.min(1, Math.max(0, 0.9 - dist * 0.85 + corridor + (seeded(i) - 0.5) * 0.25))
  return {
    id: i,
    row,
    col,
    score,
    level: levelFromScore(score),
    name: `Zone ${String.fromCharCode(65 + row)}${col + 1}`,
  }
})

export const forecastSeries = Array.from({ length: 24 }, (_, h) => {
  const morning = Math.exp(-((h - 8) ** 2) / 6) * 18
  const evening = Math.exp(-((h - 18) ** 2) / 8) * 22
  const base = 12 + morning + evening
  const predicted = Math.round(base * 10) / 10
  const band = 2 + (morning + evening) * 0.12
  return {
    hour:      `${String(h).padStart(2, '0')}:00`,
    predicted,
    lower: Math.round((predicted - band) * 10) / 10,
    upper: Math.round((predicted + band) * 10) / 10,
    actual: h <= 13 ? Math.round((base + (seeded(h) - 0.5) * 4) * 10) / 10 : null,
  }
})

export type Bottleneck = {
  id: string
  corridor: string
  window: string
  days: string
  level: FlowLevel
  avgDelay: number
  trend: number
  confidence: number
}

export const bottlenecks: Bottleneck[] = [
  {
    id: 'bn-1',
    corridor: 'I-280 N @ Exit 12 Interchange',
    window: '07:30 - 09:15',
    days: 'Mon-Fri',
    level: 'severe',
    avgDelay: 27,
    trend: 8,
    confidence: 0.93,
  },
  {
    id: 'bn-2',
    corridor: 'Market St & 4th Ave',
    window: '17:00 - 18:45',
    days: 'Mon-Thu',
    level: 'heavy',
    avgDelay: 19,
    trend: 3,
    confidence: 0.88,
  },
  {
    id: 'bn-3',
    corridor: 'Harbor Bridge Approach',
    window: '08:00 - 09:00',
    days: 'Weekdays',
    level: 'heavy',
    avgDelay: 21,
    trend: -4,
    confidence: 0.85,
  },
  {
    id: 'bn-4',
    corridor: 'Riverside Pkwy @ Stadium',
    window: '18:30 - 20:00',
    days: 'Event days',
    level: 'severe',
    avgDelay: 31,
    trend: 12,
    confidence: 0.79,
  },
  {
    id: 'bn-5',
    corridor: 'Elm St Corridor (School Zone)',
    window: '15:00 - 15:45',
    days: 'Mon-Fri',
    level: 'moderate',
    avgDelay: 11,
    trend: -2,
    confidence: 0.82,
  },
]

export const modelMetrics = {
  mae: 3.42,
  rmse: 5.18,
  r2: 0.89,
  horizon: '60 min',
  lastTrained: '2h ago',
  samples: '1.2M',
}