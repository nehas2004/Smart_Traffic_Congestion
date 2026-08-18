'use client'

import { useEffect, useRef } from 'react'

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

const W = 600, H = 520
const COLS = 7, ROWS = 6
const PX = 28, PY = 28
const CW = (W - PX * 2) / COLS
const CH = (H - PY * 2) / ROWS
const xs = Array.from({ length: COLS + 1 }, (_, i) => PX + i * CW)
const ys = Array.from({ length: ROWS + 1 }, (_, i) => PY + i * CH)

// City blocks — very dark warm fills
const BLOCK_COLORS = ['#221e1a', '#201c18', '#231f1b', '#1f1b17', '#242019']
const r0 = seeded(77)
const blocks = []
for (let r = 0; r < ROWS; r++)
  for (let c = 0; c < COLS; c++)
    blocks.push({ x: xs[c]+1, y: ys[r]+1, w: CW-2, h: CH-2, color: BLOCK_COLORS[Math.floor(r0() * BLOCK_COLORS.length)] })

// Cars — warm muted dots only (cream/tan shades, no bright red/green)
type Car = { axis:'h'|'v'; ri:number; offset:number; speed:number; dir:1|-1; alpha:number }
const r1 = seeded(42)
const INIT_CARS: Car[] = []

ys.forEach((_, ri) => {
  const n = 2 + Math.floor(r1() * 4)
  for (let i = 0; i < n; i++) {
    INIT_CARS.push({
      axis: 'h', ri,
      offset: r1(),
      speed: 0.025 + r1() * 0.05,
      dir: r1() > 0.5 ? 1 : -1,
      alpha: 0.4 + r1() * 0.5,
    })
  }
})
xs.forEach((_, ci) => {
  const n = 1 + Math.floor(r1() * 3)
  for (let i = 0; i < n; i++) {
    INIT_CARS.push({
      axis: 'v', ri: ci,
      offset: r1(),
      speed: 0.02 + r1() * 0.045,
      dir: r1() > 0.5 ? 1 : -1,
      alpha: 0.3 + r1() * 0.45,
    })
  }
})

export function CityScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const carsRef   = useRef<Car[]>(INIT_CARS.map(c => ({ ...c })))
  const rafRef    = useRef<number>(0)
  const lastRef   = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      canvas!.width  = rect.width  * devicePixelRatio
      canvas!.height = rect.height * devicePixelRatio
      ctx.scale(devicePixelRatio, devicePixelRatio)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    function draw(ts: number) {
      const dt = Math.min((ts - (lastRef.current || ts)) / 1000, 0.05)
      lastRef.current = ts

      const { width: cw, height: ch } = canvas!.getBoundingClientRect()
      const sx = cw / W, sy = ch / H

      ctx.clearRect(0, 0, cw, ch)

      // Transparent background — shows panel color behind
      ctx.clearRect(0, 0, cw, ch)

      // City blocks
      blocks.forEach(b => {
        ctx.globalAlpha = 0.55
        ctx.fillStyle = b.color
        ctx.fillRect(b.x*sx, b.y*sy, b.w*sx, b.h*sy)
      })
      ctx.globalAlpha = 1

      // Roads — warm dark lines
      ctx.strokeStyle = '#2e2820'
      ctx.lineWidth = 7 * Math.min(sx, sy)
      ys.forEach(y => { ctx.beginPath(); ctx.moveTo(0, y*sy); ctx.lineTo(cw, y*sy); ctx.stroke() })
      xs.forEach(x => { ctx.beginPath(); ctx.moveTo(x*sx, 0); ctx.lineTo(x*sx, ch); ctx.stroke() })

      // Road center line — very faint warm stripe
      ctx.strokeStyle = '#3a3028'
      ctx.lineWidth = 1 * Math.min(sx, sy)
      ctx.setLineDash([7*sx, 9*sx])
      ys.forEach(y => { ctx.beginPath(); ctx.moveTo(0, y*sy); ctx.lineTo(cw, y*sy); ctx.stroke() })
      xs.forEach(x => { ctx.beginPath(); ctx.moveTo(x*sx, 0); ctx.lineTo(x*sx, ch); ctx.stroke() })
      ctx.setLineDash([])

      // Intersection dots — tiny warm cream
      ctx.fillStyle = '#3d3328'
      xs.forEach(x => ys.forEach(y => {
        ctx.beginPath()
        ctx.arc(x*sx, y*sy, 2.5*Math.min(sx,sy), 0, Math.PI*2)
        ctx.fill()
      }))

      // Animated car dots — warm cream, variable opacity
      carsRef.current.forEach(car => {
        car.offset = ((car.offset + car.speed * dt * car.dir) + 1) % 1
        const along = car.axis === 'h' ? car.offset * W : car.offset * H
        const perp  = car.axis === 'h' ? ys[car.ri] : xs[car.ri]
        const cx = (car.axis === 'h' ? along : perp) * sx
        const cy = (car.axis === 'h' ? perp  : along) * sy
        const r  = 2.2 * Math.min(sx, sy)

        // Soft glow
        ctx.globalAlpha = car.alpha * 0.3
        ctx.fillStyle = '#c8a97e'
        ctx.beginPath()
        ctx.arc(cx, cy, r * 3, 0, Math.PI * 2)
        ctx.fill()

        // Dot
        ctx.globalAlpha = car.alpha
        ctx.fillStyle = '#c8a97e'
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()

        ctx.globalAlpha = 1
      })

      // Dark gradient overlay at edges so text stays readable
      const fade = (x0:number,y0:number,x1:number,y1:number, stops:[number,string][]) => {
        const g = ctx.createLinearGradient(x0,y0,x1,y1)
        stops.forEach(([t,c]) => g.addColorStop(t,c))
        ctx.fillStyle = g
        ctx.fillRect(0, 0, cw, ch)
      }
      // Top: stronger fade so headline text is sharp
      fade(0,0,0,ch*0.45, [[0,'rgba(30,27,24,0.75)'],[1,'rgba(30,27,24,0)']])
      // Bottom
      fade(0,ch*0.6,0,ch,  [[0,'rgba(30,27,24,0)'],[1,'rgba(30,27,24,0.7)']])

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect() }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ display: 'block' }}
      aria-hidden="true"
    />
  )
}
