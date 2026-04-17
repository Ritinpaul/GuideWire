/**
 * Admin Dashboard — /admin
 *
 * The "war room" screen for judges.
 * Layout: KPI row → Map + Demo Panel → XAI + Fraud Monitor + Trigger Timeline
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { RefreshCw, Wifi, WifiOff, ExternalLink, LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import KPICards         from '../components/admin/KPICards.jsx'
import DSIHeatmap       from '../components/admin/DSIHeatmap.jsx'
import DemoControlPanel from '../components/admin/DemoControlPanel.jsx'
import FraudMonitor     from '../components/admin/FraudMonitor.jsx'
import PADSComparison   from '../components/admin/PADSComparison.jsx'
import TriggerTimeline  from '../components/admin/TriggerTimeline.jsx'
import XAIPanel         from '../components/admin/XAIPanel.jsx'
import api              from '../services/api.js'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats,       setStats]       = useState(null)
  const [zones,       setZones]       = useState([])
  const [triggerZones, setTriggerZones] = useState([])
  const [wsConnected, setWsConnected] = useState(false)
  const [liveEvents,  setLiveEvents]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [loadError,   setLoadError]   = useState('')
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const wsRef  = useRef(null)
  const timer  = useRef(null)

  // Remove the 480px mobile cap for the admin war room
  useEffect(() => {
    const root = document.getElementById('root')
    if (root) { root.style.maxWidth = '100%'; root.dataset.page = 'admin' }
    document.body.style.overflowX = 'auto'
    return () => {
      if (root) { root.style.maxWidth = ''; delete root.dataset.page }
      document.body.style.overflowX = ''
    }
  }, [])

  // ── Load initial data ──────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setLoadError('')
    try {
      const [statsRes, zonesRes, adminZonesRes] = await Promise.allSettled([
        api.get('/admin/stats'),
        api.get('/triggers/dsi/heatmap'),
        api.get('/admin/zones'),
      ])

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data)
      } else if (statsRes.reason?.response?.status === 401) {
        sessionStorage.removeItem('gs_admin_token')
        navigate('/admin/login', { replace: true })
        return
      } else {
        setLoadError('Unable to load admin KPIs from backend.')
      }

      if (zonesRes.status === 'fulfilled') {
        const z = zonesRes.value.data?.zones ?? zonesRes.value.data ?? []
        const heatmapZones = Array.isArray(z) ? z : []
        const dbZones = adminZonesRes.status === 'fulfilled'
          ? (adminZonesRes.value.data?.zones ?? [])
          : []

        if (heatmapZones.length > 0) {
          setZones(heatmapZones)
          setTriggerZones(Array.isArray(dbZones) && dbZones.length > 0 ? dbZones : heatmapZones)
        } else {
          // DB-backed fallback when DSI service has no zones.
          const fallbackZones = dbZones
          setZones(Array.isArray(fallbackZones) ? fallbackZones : [])
          setTriggerZones(Array.isArray(fallbackZones) ? fallbackZones : [])
        }
      } else {
        setLoadError((prev) => prev || 'Unable to load DSI zones.');
        if (adminZonesRes.status === 'fulfilled') {
          const fallbackZones = adminZonesRes.value.data?.zones ?? []
          setZones(Array.isArray(fallbackZones) ? fallbackZones : [])
          setTriggerZones(Array.isArray(fallbackZones) ? fallbackZones : [])
        }
      }

      if (adminZonesRes.status === 'rejected') {
        setLoadError((prev) => prev || 'Unable to load trigger zones from backend.');
      }
    } catch {
      setLoadError((prev) => prev || 'Admin panel is not synced with backend right now.')
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }, [navigate])

  useEffect(() => {
    loadStats()
    timer.current = setInterval(loadStats, 30_000)
    return () => clearInterval(timer.current)
  }, [loadStats])

  // ── WebSocket (admin role) ─────────────────────────────────────
  useEffect(() => {
    const token = sessionStorage.getItem('gs_admin_token')
    if (!token) {
      setWsConnected(false)
      return undefined
    }

    function connect() {
      const ws = new WebSocket(`${WS_URL}/ws?role=admin&token=${encodeURIComponent(token)}`)
      ws.onopen  = () => setWsConnected(true)
      ws.onclose = () => { setWsConnected(false); setTimeout(connect, 5000) }
      ws.onerror = () => ws.close()
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          setLiveEvents(prev => [msg, ...prev].slice(0, 50))
          // Bump KPI on trigger
          if (msg.type === 'TRIGGER_FIRED') {
            setStats(s => ({ ...s, claims_today: (s.claims_today ?? 0) + (msg.payload?.claims_created ?? 1) }))
          }
        } catch {}
      }
      wsRef.current = ws
    }
    connect()
    return () => wsRef.current?.close()
  }, [])

  const onTriggerFired = (result) => {
    setStats(s => ({
      ...s,
      claims_today: (s.claims_today ?? 0) + (result.claims_created ?? 0),
    }))
    loadStats()
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-900)', maxWidth: '100%', position: 'relative' }}>
      <div className="noise-overlay" />

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: 'rgba(17,17,17,0.94)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(184,255,0,0.08)',
        padding: '0 28px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--lime), var(--lime-light))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
            boxShadow: '0 0 16px rgba(184,255,0,0.25)',
          }}>🛡️</div>
          <div>
            <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1rem', color: 'var(--lime)' }}>GIGASHIELD</span>
            <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>ADMIN WAR ROOM</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', padding: '5px 12px', borderRadius: 99, background: wsConnected ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${wsConnected ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)'}` }}>
            {wsConnected
              ? <><Wifi size={13} style={{ color: 'var(--success)' }} /><span style={{ color: 'var(--success)' }}>Live</span></>
              : <><WifiOff size={13} style={{ color: 'var(--danger)' }} /><span style={{ color: 'var(--danger)' }}>Offline</span></>
            }
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Updated {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button onClick={() => { setLoading(true); loadStats() }}
            style={{ color: 'var(--text-muted)', display: 'flex', padding: 6, borderRadius: 8, background: 'var(--bg-700)', border: '1px solid var(--border-dark)' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => {
              sessionStorage.removeItem('gs_admin_token')
              navigate('/admin/login', { replace: true })
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: 99, border: '1px solid var(--border-dark)', background: 'var(--bg-700)' }}
          >
            <LogOut size={13} /> Logout
          </button>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: 99, border: '1px solid var(--border-dark)', background: 'var(--bg-700)' }}>
            <ExternalLink size={13} /> Worker App
          </Link>
        </div>
      </div>

      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24, position: 'relative', zIndex: 1 }}>

        {/* ── KPI row ─────────────────────────────────────────────── */}
        <KPICards stats={stats ?? {}} loading={loading} />

        {loadError && (
          <div style={{ padding: '12px 16px', borderRadius: 16, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#FCA5A5', fontSize: '0.82rem' }}>
            ⚠️ {loadError}
          </div>
        )}

        {/* ── Main grid: Map (wide) + Demo Panel ──────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, height: 520 }}>

          {/* DSI Heatmap */}
          <div style={{ background: 'var(--bg-800)', border: '1.5px solid rgba(184,255,0,0.08)', borderRadius: 24, overflow: 'hidden', height: '100%' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(184,255,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>DSI Heatmap — 25 Zones Live</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: 'rgba(74,222,128,0.08)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: '0.68rem', color: 'var(--success)' }}>Auto-refresh 60s</span>
              </div>
            </div>
            <div style={{ height: 'calc(100% - 50px)' }}>
              <DSIHeatmap zones={zones} />
            </div>
          </div>

          {/* Demo Control Panel */}
          <div style={{
            borderRadius: 24, height: '100%', overflowY: 'auto',
            background: 'linear-gradient(135deg, rgba(239,68,68,0.04), var(--bg-800))',
            border: '1.5px solid rgba(239,68,68,0.12)', padding: 20,
          }}>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '0.95rem', color: 'var(--danger)', marginBottom: 4 }}>
              🎛 Demo Control Panel
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Fire trigger → claim → PADS → payout in one click
            </div>
            <DemoControlPanel zones={triggerZones} onTriggerFired={onTriggerFired} />
          </div>
        </div>

        {/* ── Innovation row: XAI + PADS Physics Demo ─────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, minHeight: 520 }}>

          {/* XAI Panel */}
          <div style={{
            borderRadius: 24, display: 'flex', flexDirection: 'column',
            background: 'var(--bg-800)', border: '1.5px solid rgba(184,255,0,0.08)', padding: 20,
          }}>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '0.9rem', color: 'var(--lime)', marginBottom: 16 }}>
              🧠 Shield-SAC XAI
            </div>
            <div style={{ flex: 1 }}>
              <XAIPanel />
            </div>
          </div>

          {/* PADS Physics Comparison */}
          <div style={{
            borderRadius: 24, display: 'flex', flexDirection: 'column',
            background: 'var(--bg-800)', border: '1.5px solid rgba(184,255,0,0.08)', padding: 20,
          }}>
            <PADSComparison />
          </div>
        </div>

        {/* ── Operations row: Fraud Monitor + Timeline ─────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, minHeight: 380 }}>

          {/* Fraud Monitor */}
          <div style={{
            borderRadius: 24, display: 'flex', flexDirection: 'column',
            background: 'var(--bg-800)', border: '1.5px solid rgba(184,255,0,0.08)', padding: 20,
          }}>
            <FraudMonitor liveEvents={liveEvents} />
          </div>

          {/* Trigger Timeline */}
          <div style={{
            borderRadius: 24, display: 'flex', flexDirection: 'column',
            background: 'var(--bg-800)', border: '1.5px solid rgba(184,255,0,0.08)', padding: 20,
          }}>
            <TriggerTimeline liveEvents={liveEvents} />
          </div>
        </div>

        {/* ── Live event log (collapsible) ──────────────────────── */}
        {liveEvents.length > 0 && (
          <details style={{ background: 'var(--bg-800)', border: '1.5px solid rgba(184,255,0,0.08)', borderRadius: 20, padding: '14px 20px' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              WebSocket Event Log ({liveEvents.length})
            </summary>
            <div style={{ marginTop: 12, fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-secondary)', maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {liveEvents.slice(0, 20).map((e, i) => (
                <div key={i} style={{ padding: '5px 10px', borderRadius: 8, background: 'var(--bg-700)', border: '1px solid var(--border-dark)' }}>
                  [{new Date().toLocaleTimeString()}] {e.type} — {JSON.stringify(e.payload ?? {}).slice(0, 80)}…
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
