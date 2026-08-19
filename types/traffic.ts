export type SeverityLevel = 'low' | 'moderate' | 'heavy' | 'severe' | 'critical'

export interface SharedTrafficData {
  corridor_id: string
  corridor_name: string
  timestamp: string
  current_congestion: number // 0-100 or index
  predicted_congestion: number // 0-100 or index
  severity: SeverityLevel
  confidence: number // 0.0 - 1.0 (e.g. 0.92)
}

export interface CorridorDetail extends SharedTrafficData {
  length_km?: number
  current_speed_kmh?: number
  free_flow_speed_kmh?: number
  historical_avg_delay?: number
  coordinates?: [number, number][] // [lat, lng] array
  active_incidents?: number
}

export interface BottleneckItem {
  id: string
  corridor_id: string
  corridor_name: string
  window: string
  days: string
  severity: SeverityLevel
  avg_delay_mins: number
  trend_percent: number
  confidence: number
  coordinates?: [number, number]
}

export interface EventImpact {
  event_id: string
  event_name: string
  venue: string
  expected_attendance: number
  peak_window: string
  congestion_multiplier: number
  affected_corridors: string[]
  radius_meters: number
  severity_increase: SeverityLevel
}

export interface TrafficRecommendation {
  id: string
  corridor_id: string
  corridor_name: string
  created_at: string
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action_type: 'signal_retiming' | 'dynamic_reroute' | 'lane_reversal' | 'incident_dispatch' | 'speed_limit_adjustment'
  expected_delay_reduction_mins: number
  confidence: number
  current_congestion: number
  predicted_congestion: number
  severity: SeverityLevel
  bottleneck?: BottleneckItem
  event_impact?: EventImpact
}

export type DecisionAction = 'accept' | 'modify' | 'reject'

export interface DecisionRecord {
  id: string
  recommendation_id: string
  corridor_id: string
  corridor_name: string
  action: DecisionAction
  operator: string
  timestamp: string
  reason_or_notes?: string
  modified_parameters?: {
    custom_delay_adjustment?: number
    custom_timing_seconds?: number
    reroute_percentage?: number
    custom_action_scope?: string
  }
}
