'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Car, Building2, Eye, EyeOff, Loader2 } from 'lucide-react'

// Palette
const C = {
  bg:        '#faf8f5',
  inputBg:   '#f5f2ee',
  border:    '#e8e0d5',
  text:      '#2c2825',
  muted:     '#9e9189',
  accent:    '#a67c52',   // warm tan/brown for links
  btnBg:     '#2c2825',   // dark brown button
  btnHover:  '#1e1b18',
  focus:     '#a67c52',
}

export function LoginForm() {
  const router = useRouter()
  const [role, setRole]                 = useState<'commuter' | 'planner'>('commuter')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => router.push(role === 'commuter' ? '/search' : '/admin'), 700)
  }

  const isPlanner = role === 'planner'

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Heading */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h2 style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-0.5px', color: C.text, margin: 0 }}>
          Sign in
        </h2>
        <p style={{ fontSize: '14px', color: C.muted, margin: 0 }}>
          Welcome back. Choose your role to continue.
        </p>
      </div>

      {/* Role switcher */}
      <div style={{
        display: 'flex',
        borderRadius: '10px',
        border: `1px solid ${C.border}`,
        padding: '4px',
        backgroundColor: '#f0ece7',
        gap: '4px',
      }}>
        {(['commuter', 'planner'] as const).map(r => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px',
              borderRadius: '7px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
              backgroundColor: role === r ? '#2c2825' : 'transparent',
              color: role === r ? '#faf8f5' : C.muted,
            }}
          >
            {r === 'commuter'
              ? <Car style={{ width: '14px', height: '14px' }} />
              : <Building2 style={{ width: '14px', height: '14px' }} />
            }
            {r === 'commuter' ? 'Commuter' : 'City Planner'}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Email */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="email" style={{ fontSize: '13px', fontWeight: 500, color: C.text }}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={isPlanner ? 'planner@cityofmetro.gov' : 'you@example.com'}
            placeholder="you@example.com"
            style={{
              height: '44px',
              width: '100%',
              borderRadius: '8px',
              border: `1px solid ${C.border}`,
              backgroundColor: C.inputBg,
              padding: '0 14px',
              fontSize: '14px',
              color: C.text,
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border 0.15s',
            }}
            onFocus={e => { e.target.style.borderColor = C.focus; e.target.style.boxShadow = `0 0 0 3px ${C.focus}20` }}
            onBlur={e  => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none' }}
          />
        </div>

        {/* Password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="password" style={{ fontSize: '13px', fontWeight: 500, color: C.text }}>
              Password
            </label>
            <button type="button" style={{ fontSize: '12px', color: C.accent, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
              Forgot password?
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              defaultValue="demo-access"
              style={{
                height: '44px',
                width: '100%',
                borderRadius: '8px',
                border: `1px solid ${C.border}`,
                backgroundColor: C.inputBg,
                padding: '0 44px 0 14px',
                fontSize: '14px',
                color: C.text,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = C.focus; e.target.style.boxShadow = `0 0 0 3px ${C.focus}20` }}
              onBlur={e  => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              aria-label={showPassword ? 'Hide' : 'Show'}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: C.muted,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {showPassword
                ? <EyeOff style={{ width: '16px', height: '16px' }} />
                : <Eye    style={{ width: '16px', height: '16px' }} />
              }
            </button>
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        style={{
          height: '44px',
          width: '100%',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: C.btnBg,
          color: '#faf8f5',
          fontSize: '14px',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = C.btnHover }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = C.btnBg }}
      >
        {loading ? (
          <>
            <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
            Signing in...
          </>
        ) : (
          <>
            Enter {isPlanner ? 'Planner' : 'Commuter'} Dashboard
            <ArrowRight style={{ width: '16px', height: '16px' }} />
          </>
        )}
      </button>

      <p style={{ textAlign: 'center', fontSize: '11px', color: C.muted, margin: 0 }}>
        Demo mode &mdash; any credentials will work
      </p>

    </form>
  )
}
