'use client'
import Link from 'next/link'
import { Nav } from '@/components/shared/nav'
import { Navigation, ArrowRight, MapPin, Search } from 'lucide-react'

export default function JourneyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Nav />
      <main style={{ maxWidth: 700, margin: '0 auto', padding: '60px 20px 80px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: '#2c2825',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Navigation size={28} color="#c8a97e" />
        </div>
        <h1 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, color: '#2c2825', margin: '0 0 12px', letterSpacing: '-0.5px' }}>
          Journey Planner
        </h1>
        <p style={{ fontSize: 15, color: '#9e9189', marginBottom: 36, lineHeight: 1.6 }}>
          The full journey planner lets you find the fastest route around congestion, with live travel time estimates.
          Use <strong style={{ color: '#2c2825' }}>Plan Route</strong> in the top navigation to get started.
        </p>
        <Link href="/search" style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '14px 28px', borderRadius: 12, background: '#2c2825', color: '#c8a97e',
          fontWeight: 800, fontSize: 15, textDecoration: 'none',
        }}>
          <Search size={16} /> Open Route Planner <ArrowRight size={16} />
        </Link>
        <div style={{ marginTop: 24 }}>
          <Link href="/public" style={{ fontSize: 13, color: '#a67c52', textDecoration: 'none', fontWeight: 600 }}>
            ← Back to Public Home
          </Link>
        </div>
      </main>
    </div>
  )
}
