import { Card } from '@/components/ui/card'
import { Gauge, CloudRain, TriangleAlert, Timer, type LucideIcon } from 'lucide-react'

type Tile = {
  icon: LucideIcon
  label: string
  value: string
  sub: string
  tone?: 'default' | 'warn' | 'bad'
}

const TILES: Tile[] = [
  { icon: Gauge, label: 'Network avg speed', value: '31 mph', sub: '↓ 6% vs typical' },
  { icon: Timer, label: 'Predicted peak delay', value: '+27 min', sub: 'I-280 N · 08:10', tone: 'bad' },
  { icon: TriangleAlert, label: 'Active incidents', value: '4', sub: '2 clearing', tone: 'warn' },
  { icon: CloudRain, label: 'Weather factor', value: 'Light rain', sub: '+12% congestion' },
]

const toneColor: Record<NonNullable<Tile['tone']>, string> = {
  default: 'var(--muted-foreground)',
  warn: 'var(--flow-moderate)',
  bad: 'var(--flow-severe)',
}

export function StatTiles() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {TILES.map((tile) => (
        <Card key={tile.label} className="gap-0 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{tile.label}</span>
            <tile.icon
              className="size-4"
              style={{ color: toneColor[tile.tone ?? 'default'] }}
              aria-hidden="true"
            />
          </div>
          <p className="mt-3 font-mono text-2xl font-semibold tracking-tight">{tile.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{tile.sub}</p>
        </Card>
      ))}
    </div>
  )
}

