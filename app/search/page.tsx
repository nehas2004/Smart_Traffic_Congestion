'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Nav } from '@/components/shared/nav'
import { Search, MapPin, ArrowRight, Cloud, Clock } from 'lucide-react'

export default function SearchPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [fromSuggestions, setFromSuggestions] = useState<any[]>([])
  const [toSuggestions, setToSuggestions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [weather, setWeather] = useState({ desc: 'Loading...', temp: '--' })
  const [time, setTime] = useState('')
  const router = useRouter()
  const KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || ''

  useEffect(() => {
    // Restore last search values
    try {
      const saved = localStorage.getItem('flowcast_route')
      if (saved) {
        const p = JSON.parse(saved)
        if (p.fromName && p.fromName !== 'Origin') setFrom(p.fromName)
        if (p.toName && p.toName !== 'Destination') setTo(p.toName)
      }
    } catch (_) {}
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
    tick(); const t = setInterval(tick, 10000); return () => clearInterval(t)
  }, [])

  useEffect(() => {
    fetch('/api/live-context').then(r => r.json()).then(d => {
      if(d?.weather) setWeather({ desc: d.weather.desc, temp: d.weather.temp })
    }).catch(() => {})
  }, [])

  const geocode = async (query: string) => {
    if(query.length < 3) return []
    const r = await fetch(
      `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${KEY}&countrySet=IN&limit=5`
    )
    const d = await r.json()
    return d.results || []
  }

  useEffect(() => {
    const t = setTimeout(async () => {
      setFromSuggestions(await geocode(from))
    }, 350)
    return () => clearTimeout(t)
  }, [from])

  useEffect(() => {
    const t = setTimeout(async () => {
      setToSuggestions(await geocode(to))
    }, 350)
    return () => clearTimeout(t)
  }, [to])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if(!from || !to) return
    setLoading(true)
    const [fr, tr] = await Promise.all([
      fetch(`https://api.tomtom.com/search/2/search/${encodeURIComponent(from)}.json?key=${KEY}&limit=1`).then(r=>r.json()),
      fetch(`https://api.tomtom.com/search/2/search/${encodeURIComponent(to)}.json?key=${KEY}&limit=1`).then(r=>r.json()),
    ])
    const fp = fr.results?.[0]?.position
    const tp = tr.results?.[0]?.position
    if(!fp || !tp) { setLoading(false); alert('Could not find one of the locations. Try being more specific.'); return }
    const routeUrl = `/routes?fromLat=${fp.lat}&fromLon=${fp.lon}&toLat=${tp.lat}&toLon=${tp.lon}&fromName=${encodeURIComponent(from)}&toName=${encodeURIComponent(to)}`
    router.push(routeUrl)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#faf8f5' }}>
      <Nav />
      <main style={{ maxWidth:640, margin:'0 auto', padding:'80px 24px 40px' }}>
        {/* Context strip */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:16, marginBottom:40,
          fontSize:13, color:'#9e9189' }}>
          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
            <Cloud size={13}/> {weather.desc} · {weather.temp}°C
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
            <Clock size={13}/> {time}
          </span>
        </div>

        <h1 style={{ fontSize:36, fontWeight:900, color:'#2c2825', marginBottom:8, letterSpacing:'-1px' }}>
          Where are you going?
        </h1>
        <p style={{ color:'#9e9189', marginBottom:48, fontSize:15 }}>
          Get ML-powered congestion forecasts for Kothamangalam routes.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ background:'white', borderRadius:20, border:'1px solid #e8e0d5',
            boxShadow:'0 4px 24px rgba(44,40,37,0.08)', overflow:'visible' }}>
            {/* FROM */}
            <div style={{ padding:'20px 24px', borderBottom:'1px solid #f0ebe4', position:'relative' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:'#f5f2ee',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', border:'2px solid #a67c52' }} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:'#9e9189', fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.08em', marginBottom:4 }}>From</div>
                  <input
                    value={from}
                    onChange={e => setFrom(e.target.value)}
                    placeholder="Enter origin, e.g. Kothamangalam"
                    style={{ width:'100%', border:'none', outline:'none', fontSize:15,
                      color:'#2c2825', background:'transparent', fontWeight:500 }}
                    autoFocus
                  />
                </div>
              </div>
              {fromSuggestions.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:100,
                  background:'white', border:'1px solid #e8e0d5', borderTop:'none',
                  borderRadius:'0 0 12px 12px', boxShadow:'0 8px 24px rgba(44,40,37,0.1)' }}>
                  {fromSuggestions.map((s, i) => (
                    <div key={i} onClick={() => { setFrom(s.address?.freeformAddress || s.poi?.name || ''); setFromSuggestions([]) }}
                      style={{ padding:'12px 20px', cursor:'pointer', fontSize:13, color:'#2c2825',
                        borderBottom: i < fromSuggestions.length-1 ? '1px solid #f5f2ee' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background='#faf8f5')}
                      onMouseLeave={e => (e.currentTarget.style.background='white')}>
                      <MapPin size={12} style={{ marginRight:8, color:'#a67c52' }} />
                      {s.address?.freeformAddress || s.poi?.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TO */}
            <div style={{ padding:'20px 24px', position:'relative' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:'#2c2825',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <MapPin size={14} color="#c8a97e" />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:'#9e9189', fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.08em', marginBottom:4 }}>To</div>
                  <input
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    placeholder="Enter destination"
                    style={{ width:'100%', border:'none', outline:'none', fontSize:15,
                      color:'#2c2825', background:'transparent', fontWeight:500 }}
                  />
                </div>
              </div>
              {toSuggestions.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:100,
                  background:'white', border:'1px solid #e8e0d5', borderTop:'none',
                  borderRadius:'0 0 12px 12px', boxShadow:'0 8px 24px rgba(44,40,37,0.1)' }}>
                  {toSuggestions.map((s, i) => (
                    <div key={i} onClick={() => { setTo(s.address?.freeformAddress || s.poi?.name || ''); setToSuggestions([]) }}
                      style={{ padding:'12px 20px', cursor:'pointer', fontSize:13, color:'#2c2825',
                        borderBottom: i < toSuggestions.length-1 ? '1px solid #f5f2ee' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background='#faf8f5')}
                      onMouseLeave={e => (e.currentTarget.style.background='white')}>
                      <MapPin size={12} style={{ marginRight:8, color:'#a67c52' }} />
                      {s.address?.freeformAddress || s.poi?.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button type="submit" disabled={!from || !to || loading}
            style={{ marginTop:16, width:'100%', padding:'16px 24px',
              background: from && to ? '#2c2825' : '#e8e0d5',
              color: from && to ? '#c8a97e' : '#9e9189',
              border:'none', borderRadius:14, fontSize:15, fontWeight:700,
              cursor: from && to ? 'pointer' : 'not-allowed',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              transition:'all 0.2s' }}>
            {loading ? 'Finding routes...' : <><Search size={16} /> Get Route Options <ArrowRight size={16} /></>}
          </button>
        </form>

        <p style={{ marginTop:24, fontSize:12, color:'#9e9189', textAlign:'center' }}>
          Coverage: Central Junction · MC Road Segment · Market Area (Kothamangalam)
        </p>
      </main>
    </div>
  )
}
