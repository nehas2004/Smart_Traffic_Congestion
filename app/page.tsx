import { SceneLoader } from '@/components/login/scene-loader'
import { LoginForm } from '@/components/login/login-form'

export default function HomePage() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
      {/* LEFT — animated 2D map background */}
      <div style={{
        flex: '0 0 50%',
        position: 'relative',
        background: '#1e1b18',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      }}>
        <SceneLoader />
        {/* Brand overlay */}
        <div style={{
          position: 'absolute', bottom: 40, left: 0, right: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: '#2c2825',
            border: '1px solid #c8a97e40',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c8a97e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/>
            </svg>
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#faf8f5', letterSpacing: '-0.5px' }}>Flowcast</span>
          <span style={{ fontSize: 13, color: '#c8a97e', opacity: 0.8 }}>ML-powered traffic intelligence</span>
        </div>
      </div>

      {/* RIGHT — login form */}
      <div style={{
        flex: '0 0 50%',
        background: '#faf8f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
