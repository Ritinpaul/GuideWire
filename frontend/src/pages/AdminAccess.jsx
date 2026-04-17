import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api.js'
import { getErrorMsg } from '../services/api.js'

export default function AdminAccess() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const verifyAndEnter = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Enter username and password')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/admin/login', {
        username: username.trim(),
        password,
      })
      sessionStorage.setItem('gs_admin_token', res.data.token)
      navigate('/admin', { replace: true })
    } catch (err) {
      sessionStorage.removeItem('gs_admin_token')
      setError(getErrorMsg(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(200,230,74,0.06), transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div className="noise-overlay" />

      <div style={{
        width: '100%', maxWidth: 460,
        background: 'var(--bg-800)', border: '1.5px solid rgba(200,230,74,0.1)',
        borderRadius: 28, padding: 36, position: 'relative', zIndex: 2,
        boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(249,115,22,0.15))',
          border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem', marginBottom: 16,
        }}>🔐</div>

        <div style={{ fontFamily: 'Space Grotesk', fontSize: '1.6rem', fontWeight: 700, marginBottom: 8, letterSpacing: '-0.5px' }}>Admin Access</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
          Sign in with admin credentials to open the dashboard.
        </div>

        <div className="input-group" style={{ marginBottom: 16 }}>
          <label className="input-label">Username</label>
          <input
            className="input"
            type="text"
            placeholder="Enter admin username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ borderRadius: 14 }}
          />
        </div>

        <div className="input-group" style={{ marginBottom: 16 }}>
          <label className="input-label">Password</label>
          <input
            className="input"
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ borderRadius: 14 }}
          />
        </div>

        {error && (
          <div style={{ marginBottom: 14, padding: 12, borderRadius: 14, background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '0.85rem', border: '1px solid rgba(239,68,68,0.15)' }}>
            {error}
          </div>
        )}

        <button className="btn btn-primary btn-full" onClick={verifyAndEnter} disabled={loading}
          style={{ borderRadius: 99, padding: 16, fontSize: '0.95rem' }}>
          {loading ? 'Verifying...' : 'Open Admin Panel'}
        </button>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link to="/home" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Back to Worker App</Link>
        </div>
      </div>
    </div>
  )
}
