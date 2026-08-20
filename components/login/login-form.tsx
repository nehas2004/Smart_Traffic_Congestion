'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Car, Building2, Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
  const [isSignUp, setIsSignUp]         = useState(false)
  const [successMsg, setSuccessMsg]     = useState<string | null>(null)
  const [error, setError]               = useState<string | null>(
    supabase 
      ? null 
      : 'Supabase is not configured. Please replace the placeholder values in .env.local with your actual Supabase URL and Anon Key.'
  )

  const toggleMode = () => {
    setIsSignUp(s => !s)
    setError(null)
    setSuccessMsg(null)
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    if (!supabase) {
      setError('Supabase is not configured. Please replace the placeholder values in .env.local with your actual Supabase URL and Anon Key.')
      setLoading(false)
      return
    }

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      if (isSignUp) {
        // Register User
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: role,
            },
          },
        })

        if (authError) {
          setError(authError.message)
          setLoading(false)
          return
        }

        if (data.session) {
          // If auto-confirm is enabled and we get a session immediately
          router.push(role === 'commuter' ? '/routes' : '/admin/traffic')
        } else {
          setSuccessMsg('Account created successfully! Please check your email to verify and activate your account.')
          setLoading(false)
        }
      } else {
        // Sign In
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (authError) {
          setError(authError.message)
          setLoading(false)
          return
        }

        // Verify role alignment
        const userRole = data.user?.user_metadata?.role
        if (userRole && userRole !== role) {
          // Sign out immediately to prevent saving session for incorrect role
          await supabase.auth.signOut()
          setError('Access denied.')
          setLoading(false)
          return
        }

        // Check user role from metadata or default to form state role
        const finalRole = (userRole || role) as 'commuter' | 'planner'
        if (data.user) {
          const metaName = data.user.user_metadata?.name || data.user.user_metadata?.full_name
          const parsedName = metaName || email.split('@')[0]
          const formattedName = parsedName
            .split(/[\._-]/)
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')

          const userObj = {
            id: data.user.id,
            email: data.user.email || email,
            role: finalRole,
            name: formattedName || (finalRole === 'planner' ? 'City Planner' : 'Commuter User'),
          }
          try {
            localStorage.setItem('flowcast_auth_user', JSON.stringify(userObj))
          } catch (_) {}
        }
        router.push(finalRole === 'commuter' ? '/routes' : '/admin/traffic')
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  const isPlanner = role === 'planner'

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Heading */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h2 style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-0.5px', color: C.text, margin: 0 }}>
          {isSignUp ? 'Create account' : 'Sign in'}
        </h2>
        <p style={{ fontSize: '14px', color: C.muted, margin: 0 }}>
          {isSignUp ? 'Choose your role and register below.' : 'Welcome back. Choose your role to continue.'}
        </p>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: '#fdf0ed',
          border: '1px solid #f5c2b7',
          color: '#c53030',
          fontSize: '13px',
          lineHeight: '1.4',
        }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: '#edfaf1',
          border: '1px solid #c2f5d0',
          color: '#22543d',
          fontSize: '13px',
          lineHeight: '1.4',
        }}>
          {successMsg}
        </div>
      )}

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
            name="email"
            type="email"
            required
            autoComplete="email"
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
            {!isSignUp && (
              <button type="button" style={{ fontSize: '12px', color: C.accent, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
                Forgot password?
              </button>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
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
            {isSignUp ? 'Creating account...' : 'Signing in...'}
          </>
        ) : (
          <>
            {isSignUp ? 'Register' : `Enter ${isPlanner ? 'Planner' : 'Commuter'} Dashboard`}
            <ArrowRight style={{ width: '16px', height: '16px' }} />
          </>
        )}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
        <button
          type="button"
          onClick={toggleMode}
          style={{
            background: 'none',
            border: 'none',
            color: C.accent,
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: '11px', color: C.muted, margin: 0 }}>
        Secure authentication powered by Supabase
      </p>

    </form>
  )
}
