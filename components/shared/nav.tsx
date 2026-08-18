'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Waypoints, MapPin, Map, BarChart2, Upload } from 'lucide-react'

const links = [
  { href: '/search',    label: 'Plan Route',   icon: MapPin },
  { href: '/routes',    label: 'Route Options', icon: Waypoints },
  { href: '/map',       label: 'Live Map',      icon: Map },
  { href: '/dashboard', label: 'Analytics',     icon: BarChart2 },
  { href: '/data',      label: 'Data Upload',   icon: Upload },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(250,248,245,0.9)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #e8e0d5',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: '#2c2825',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Waypoints size={16} color="#c8a97e" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, color: '#2c2825', letterSpacing: '-0.3px' }}>
            Flowcast
          </span>
        </div>
        <nav style={{ display: 'flex', gap: 4 }}>
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                textDecoration: 'none',
                background: active ? '#2c2825' : 'transparent',
                color: active ? '#c8a97e' : '#9e9189',
                transition: 'all 0.15s',
              }}>
                <Icon size={14} />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
