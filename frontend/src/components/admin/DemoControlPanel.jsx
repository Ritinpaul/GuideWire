/**
 * Demo Control Panel — ⚡ THE MAGIC BUTTON
 * Fires trigger → claim → PADS → payout pipeline with one click.
 */
import { useEffect, useState } from 'react'
import { Zap, Loader, CheckCircle, AlertTriangle } from 'lucide-react'
import api from '../../services/api.js'
import { getAdminZoneDisplayName } from '../../services/zoneNames.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const isUuid = (value) => UUID_PATTERN.test(String(value ?? '').trim())

const TRIGGER_TYPES = [
  { id: 'HEAVY_RAIN',    emoji: '🌧️', label: 'Heavy Rain',      dsi: 72 },
  { id: 'FLOOD',         emoji: '🌊', label: 'Flood',            dsi: 91 },
  { id: 'HEATWAVE',      emoji: '🔥', label: 'Heatwave',         dsi: 68 },
  { id: 'POLLUTION',     emoji: '🌫️', label: 'High AQI',        dsi: 61 },
  { id: 'CURFEW',        emoji: '🚧', label: 'Civic Disruption', dsi: 55 },
  { id: 'COMPOSITE_DSI', emoji: '⚡', label: 'Composite DSI',    dsi: 82 },
]

export default function DemoControlPanel({ zones, onTriggerFired }) {
  const cityCounters = new Map()
  const zoneOptions = Array.isArray(zones)
    ? zones
        .map((z, idx) => ({
          id: z?.id ? String(z.id) : z?.zone_id ? String(z.zone_id) : `zone-${idx}`,
          label: getAdminZoneDisplayName(z, cityCounters),
          valid: isUuid(z?.id ?? z?.zone_id),
        }))
        .filter((z) => z.valid)
    : []

  const [selectedZone,    setSelectedZone]    = useState(zoneOptions[0]?.id ?? '')
  const [selectedTrigger, setSelectedTrigger] = useState('HEAVY_RAIN')
  const [dsiOverride,     setDsiOverride]     = useState(72)
  const [loading,         setLoading]         = useState(false)
  const [lastResult,      setLastResult]      = useState(null)
  const [error,           setError]           = useState('')

  // Live Weather Scan state
  const [scanLoading, setScanLoading] = useState(false)
  const [scanResult,  setScanResult]  = useState(null)
  const [scanError,   setScanError]   = useState('')

  useEffect(() => {
    if (!zoneOptions.length) return
    const isValidSelection = zoneOptions.some((z) => z.id === selectedZone)
    if (!isValidSelection) {
      setSelectedZone(zoneOptions[0].id)
    }
  }, [zoneOptions, selectedZone])

  const runLiveScan = async () => {
    setScanLoading(true); setScanError(''); setScanResult(null)
    try {
      const res = await api.post('/triggers/live-scan')
      setScanResult(res.data)
      if (res.data?.triggered?.length > 0) {
        onTriggerFired?.({ claims_created: res.data.triggered.reduce((s, t) => s + (t.claims_created ?? 0), 0) })
      }
    } catch (err) {
      setScanError(err?.response?.data?.message ?? err.message ?? 'Live scan failed')
    } finally {
      setScanLoading(false)
    }
  }

  const fire = async () => {
    if (!selectedZone) { setError('Select a zone first'); return }
    setLoading(true); setError(''); setLastResult(null)
    try {
      const trigMeta = TRIGGER_TYPES.find(t => t.id === selectedTrigger)
      const res = await api.post('/triggers/inject', {
        zone_id:        selectedZone,
        type:           selectedTrigger,
        severity_value: dsiOverride / 10,
        dsi_score:      dsiOverride,
        source:         'DEMO_CONTROL_PANEL',
        raw_data:       { injected_by: 'admin', trigger_label: trigMeta?.label },
      })
      setLastResult(res.data)
      onTriggerFired?.(res.data)
    } catch (err) {
      setError(err?.response?.data?.message ?? err.message ?? 'Injection failed')
    } finally {
      setLoading(false)
    }
  }

  const selTrig = TRIGGER_TYPES.find(t => t.id === selectedTrigger)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── LIVE WEATHER SCAN ────────────────────────────────── */}
      <div style={{
        padding: 16, borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(251,191,36,0.04))',
        border: '1.5px solid rgba(239,68,68,0.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              🔴 Live Weather Scan
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Scan all 25 zones with real weather data
            </div>
          </div>
        </div>
        <button
          onClick={runLiveScan} disabled={scanLoading}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, fontSize: '0.95rem', fontWeight: 800,
            background: scanLoading ? 'var(--bg-700)' : 'linear-gradient(135deg, #DC2626, #B91C1C)',
            color: '#fff', border: 'none', cursor: scanLoading ? 'wait' : 'pointer',
            boxShadow: scanLoading ? 'none' : '0 0 24px rgba(239,68,68,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            letterSpacing: '0.04em', transition: 'all 0.2s',
          }}
        >
          {scanLoading
            ? <><Loader size={18} className="animate-spin" /> Scanning 25 zones…</>
            : <>🛰️ SCAN LIVE WEATHER → AUTO-TRIGGER</>
          }
        </button>

        {scanError && (
          <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '0.78rem', display: 'flex', gap: 6, alignItems: 'center' }}>
            <AlertTriangle size={13} /> {scanError}
          </div>
        )}

        {scanResult && (
          <div style={{ marginTop: 12, animation: 'fadeIn 0.3s ease' }}>
            <div style={{
              padding: '10px 14px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 600,
              background: scanResult.triggered?.length > 0 ? 'rgba(239,68,68,0.06)' : 'rgba(74,222,128,0.06)',
              color: scanResult.triggered?.length > 0 ? '#FCA5A5' : 'var(--success)',
              border: `1px solid ${scanResult.triggered?.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(74,222,128,0.15)'}`,
            }}>
              {scanResult.message}
            </div>

            {scanResult.triggered?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {scanResult.triggered.map((t, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', borderRadius: 10,
                    background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{t.name}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{t.city} · {t.type?.replace(/_/g, ' ')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1rem', color: '#EF4444' }}>DSI {t.dsi_score}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--success)' }}>{t.claims_created} claims</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border-dark)' }} />
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>or manual inject</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border-dark)' }} />
      </div>

      {/* Zone selector */}
      <div>
        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Target Zone
        </label>
        <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)}
          className="input" style={{ fontSize: '0.9rem' }}>
          <option value="">— Select zone —</option>
          {zoneOptions.map((z) => (
            <option key={`zone-opt-${z.id}`} value={z.id}>{z.label}</option>
          ))}
        </select>
        {zoneOptions.length === 0 && (
          <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--warning)' }}>
            No valid backend zones found. Refresh the dashboard.
          </div>
        )}
      </div>

      {/* Trigger type grid */}
      <div>
        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Trigger Type
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {TRIGGER_TYPES.map(t => (
            <button key={t.id} onClick={() => { setSelectedTrigger(t.id); setDsiOverride(t.dsi) }}
              style={{
                padding: '10px 8px', borderRadius: 10, fontSize: '0.78rem', fontWeight: 600,
                background: selectedTrigger === t.id ? 'rgba(245,158,11,0.15)' : 'var(--bg-700)',
                border:     `1.5px solid ${selectedTrigger === t.id ? 'var(--amber)' : 'var(--border)'}`,
                color:      selectedTrigger === t.id ? 'var(--amber)' : 'var(--text-secondary)',
                transition: 'all 0.15s', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
              <span style={{ fontSize: '1.3rem' }}>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* DSI severity slider */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            DSI Severity
          </label>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: dsiOverride >= 70 ? 'var(--danger)' : dsiOverride >= 50 ? 'var(--warning)' : 'var(--success)' }}>
            {dsiOverride}/100
          </span>
        </div>
        <input type="range" min={20} max={100} step={1} value={dsiOverride}
          onChange={e => setDsiOverride(Number(e.target.value))}
          style={{ width: '100%', accentColor: dsiOverride >= 70 ? '#EF4444' : dsiOverride >= 50 ? '#F59E0B' : '#10B981', height: 6 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          <span>🟢 Normal</span><span>🟡 Elevated</span><span>🔴 Critical</span>
        </div>
      </div>

      {/* Fire button */}
      <button className="btn btn-danger btn-full" onClick={fire} disabled={loading || !selectedZone}
        style={{ padding: '16px', fontSize: '1.05rem', letterSpacing: '0.02em', boxShadow: '0 0 30px rgba(239,68,68,0.3)' }}>
        {loading
          ? <><Loader size={20} className="animate-spin" /> Injecting…</>
          : <><Zap size={20} /> ⚡ INJECT TRIGGER</>
        }
      </button>

      {/* Error */}
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', fontSize: '0.82rem', display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* Success result */}
      {lastResult && (
        <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <CheckCircle size={18} style={{ color: 'var(--success)' }} />
            <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.9rem' }}>Trigger fired successfully!</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Trigger ID</span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{lastResult.trigger?.id?.slice(0, 18)}…</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Policies affected</span>
              <span style={{ fontWeight: 700, color: 'var(--amber)' }}>{lastResult.policies_affected}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Claims created</span>
              <span style={{ fontWeight: 700, color: 'var(--success)' }}>{lastResult.claims_created}</span>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {selTrig && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-700)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {selTrig.emoji} <strong style={{ color: 'var(--text-secondary)' }}>{selTrig.label}</strong> — DSI {dsiOverride} → pipeline: trigger → claims → PADS → payout
        </div>
      )}
    </div>
  )
}
