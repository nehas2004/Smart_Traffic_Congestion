'use client'
import { useEffect, useState } from 'react'
import { Nav } from '@/components/shared/nav'
import { AlertTriangle, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react'

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    fetch('/data/traffic_predictions.json').then(r => r.json()).then(setData).catch(() => {})
  }, [])

  const metrics = data?.metrics
  const forecast = data?.forecast?.slice(0, 10) || []
  const bottlenecks = data?.bottlenecks || []
  const maxDelay = Math.max(...forecast.map((d: any) => d.delay_mins), 1)

  return (
    <div style={{ minHeight:'100vh', background:'#faf8f5' }}>
      <Nav />
      <main style={{ maxWidth:1200, margin:'0 auto', padding:'48px 24px 80px' }}>
        <div style={{ marginBottom:40 }}>
          <h1 style={{ fontSize:28, fontWeight:900, color:'#2c2825', letterSpacing:'-0.5px' }}>
            Analytics Dashboard
          </h1>
          <p style={{ color:'#9e9189', fontSize:14, marginTop:4 }}>
            ML model metrics · delay forecast · active bottlenecks · {data?.total_records_used || '--'} real data points trained
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20, marginBottom:24 }}>
          {/* ML Metrics: Linear Regression */}
          <div style={{ background:'white', borderRadius:16, border:'1px solid #e8e0d5', padding:24 }}>
            <div style={{ fontSize:11, color:'#9e9189', fontWeight:700, textTransform:'uppercase',
              letterSpacing:'0.08em', marginBottom:16 }}>Linear Regression</div>
            {[['MSE', metrics?.linear_regression?.mse], ['RMSE', metrics?.linear_regression?.rmse], ['MAE', metrics?.linear_regression?.mae]].map(([k, v]) => (
              <div key={k as string} style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                <span style={{ fontSize:13, color:'#9e9189' }}>{k}</span>
                <span style={{ fontSize:15, fontWeight:800, color:'#2c2825' }}>{v ?? '—'}</span>
              </div>
            ))}
          </div>

          {/* ML Metrics: Gradient Boosting */}
          <div style={{ background:'white', borderRadius:16, border:'2px solid #a67c52', padding:24,
            boxShadow:'0 4px 20px rgba(166,124,82,0.12)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontSize:11, color:'#9e9189', fontWeight:700, textTransform:'uppercase',
                letterSpacing:'0.08em' }}>Gradient Boosting</div>
              <span style={{ background:'#a67c52', color:'white', borderRadius:20, padding:'2px 10px',
                fontSize:10, fontWeight:800 }}>WINNER</span>
            </div>
            {[['MSE', metrics?.gradient_boosting?.mse], ['RMSE', metrics?.gradient_boosting?.rmse], ['MAE', metrics?.gradient_boosting?.mae]].map(([k, v]) => (
              <div key={k as string} style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                <span style={{ fontSize:13, color:'#9e9189' }}>{k}</span>
                <span style={{ fontSize:15, fontWeight:800, color:'#2c2825' }}>{v ?? '—'}</span>
              </div>
            ))}
          </div>

          {/* Coverage Info */}
          <div style={{ background:'#2c2825', borderRadius:16, padding:24, color:'white' }}>
            <div style={{ fontSize:11, color:'#c8a97e', fontWeight:700, textTransform:'uppercase',
              letterSpacing:'0.08em', marginBottom:16 }}>Trained Sensors</div>
            {['Central Junction', 'MC Road Segment', 'Market Area'].map((s, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:'#c8a97e', flexShrink:0, display:'inline-block' }} />
                <span style={{ fontSize:12, color:'#e8e0d5' }}>{s}</span>
              </div>
            ))}
            <div style={{ marginTop:16, fontSize:11, color:'#c8a97e90' }}>
              Coverage radius: 500m
            </div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20 }}>
          {/* Forecast Chart */}
          <div style={{ background:'white', borderRadius:16, border:'1px solid #e8e0d5', padding:24 }}>
            <div style={{ fontWeight:700, color:'#2c2825', marginBottom:4 }}>Delay Forecast</div>
            <div style={{ fontSize:12, color:'#9e9189', marginBottom:24 }}>
              ML gradient boosting · next {forecast.length} hours · Kothamangalam
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:160 }}>
              {forecast.map((item: any, i: number) => {
                const h = Math.max((item.delay_mins / maxDelay) * 130, 4)
                const hot = item.delay_mins > 5
                return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                    <div title={item.delay_mins + ' min delay'} style={{
                      width:'100%', height:h, borderRadius:6,
                      background: hot ? '#a67c52' : '#e8e0d5',
                      transition:'height 0.5s ease' }} />
                    <span style={{ fontSize:10, color:'#9e9189', fontWeight:500 }}>
                      {item.time.split(' ')[0]}
                    </span>
                  </div>
                )
              })}
              {forecast.length === 0 && <p style={{ color:'#9e9189', fontSize:13, margin:'auto' }}>Loading...</p>}
            </div>
          </div>

          {/* Bottlenecks */}
          <div style={{ background:'white', borderRadius:16, border:'1px solid #e8e0d5', padding:24 }}>
            <div style={{ fontWeight:700, color:'#2c2825', marginBottom:16 }}>Active Bottlenecks</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {bottlenecks.map((item: any, i: number) => (
                <div key={i} style={{ display:'flex', gap:12, padding:12, borderRadius:12,
                  background:'#f5f2ee', border:'1px solid #e8e0d5' }}>
                  <div style={{ width:34, height:34, borderRadius:10, background:'white',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                    boxShadow:'0 1px 4px rgba(44,40,37,0.08)' }}>
                    <AlertTriangle size={14} color={item.severity==='High' ? '#ef4444' : '#a67c52'} />
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:'#2c2825', lineHeight:1.3 }}>{item.location}</div>
                    <div style={{ fontSize:11, color:'#9e9189', marginTop:4, display:'flex', alignItems:'center', gap:6 }}>
                      +{item.delay} min
                      {item.trend === 'worsening'
                        ? <TrendingUp size={10} color="#ef4444" />
                        : <TrendingDown size={10} color="#16a34a" />}
                      {item.trend}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
