'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Waypoints,
  LayoutDashboard,
  Map,
  TrendingUp,
  AlertTriangle,
  Route,
  Settings,
  Database,
} from 'lucide-react'

type Role = 'commuter' | 'planner'

const NAV: Record<Role, { icon: typeof Map; label: string; active?: boolean; badge?: string }[]> = {
  commuter: [
    { icon: LayoutDashboard, label: 'Overview', active: true },
    { icon: Route, label: 'My routes' },
    { icon: Map, label: 'Live heat map' },
    { icon: TrendingUp, label: 'Travel forecast' },
    { icon: AlertTriangle, label: 'Alerts', badge: '3' },
  ],
  planner: [
    { icon: LayoutDashboard, label: 'Overview', active: true },
    { icon: Map, label: 'Network heat map' },
    { icon: AlertTriangle, label: 'Bottlenecks', badge: '5' },
    { icon: TrendingUp, label: 'Corridor forecast' },
    { icon: Database, label: 'Model & data' },
  ],
}

export function Sidebar({ role }: { role: Role }) {
  const items = NAV[role]
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Waypoints className="size-5" aria-hidden="true" />
        </div>
        <span className="text-base font-semibold tracking-tight">Flowcast</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        <p className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {role === 'planner' ? 'Planning' : 'Navigation'}
        </p>
        {items.map((item) => (
          <a
            key={item.label}
            href="#"
            aria-current={item.active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              item.active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
            )}
          >
            <item.icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {item.badge}
              </Badge>
            )}
          </a>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <a
          href="#"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
        >
          <Settings className="size-4" aria-hidden="true" />
          Settings
        </a>
      </div>
    </aside>
  )
}
