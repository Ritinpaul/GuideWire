import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Search, Filter } from 'lucide-react'
import { getWorkerClaims, getErrorMsg } from '../services/api.js'
import { getLocale, getStoredLanguage } from '../services/language.js'
import BottomNav from '../components/BottomNav.jsx'

const STATUS_META = {
  INITIATED: { className: 'badge-info',    emoji: '⏳' },
  APPROVED:  { className: 'badge-warning', emoji: '✅' },
  PAID:      { className: 'badge-success', emoji: '💸' },
  REJECTED:  { className: 'badge-danger',  emoji: '❌' },
  FLAGGED:   { className: 'badge-warning', emoji: '🚩' },
}

const COPY = {
  en: {
    pageTitle: 'Claims History',
    totalClaimsSuffix: 'total claims',
    searchPlaceholder: 'Search trigger or zone…',
    noClaims: 'No claims yet',
    noClaimsDesc: 'Claims auto-appear when a weather trigger fires',
    fraudScore: 'PADS Fraud Score',
    zone: 'Zone',
    dsiScore: 'DSI Score',
    checkResults: 'PADS Check Results',
    claimId: 'ID',
    adjudicationAuto: 'AUTO',
    statuses: {
      ALL: 'ALL',
      INITIATED: 'Initiated',
      APPROVED: 'Approved',
      PAID: 'Paid',
      REJECTED: 'Rejected',
      FLAGGED: 'Flagged',
    },
  },
  hi: {
    pageTitle: 'दावों का इतिहास',
    totalClaimsSuffix: 'कुल दावे',
    searchPlaceholder: 'ट्रिगर या ज़ोन खोजें…',
    noClaims: 'अभी कोई दावा नहीं',
    noClaimsDesc: 'मौसम ट्रिगर होने पर दावे अपने आप दिखाई देंगे',
    fraudScore: 'PADS धोखाधड़ी स्कोर',
    zone: 'ज़ोन',
    dsiScore: 'DSI स्कोर',
    checkResults: 'PADS जाँच परिणाम',
    claimId: 'आईडी',
    adjudicationAuto: 'ऑटो',
    statuses: {
      ALL: 'सभी',
      INITIATED: 'आरंभ',
      APPROVED: 'स्वीकृत',
      PAID: 'भुगतान',
      REJECTED: 'अस्वीकृत',
      FLAGGED: 'फ्लैग्ड',
    },
  },
}

const TRIGGER_EMOJI = {
  HEAVY_RAIN: '🌧️', FLOOD: '🌊', HEATWAVE: '🔥',
  POLLUTION:  '🌫️', CURFEW: '🚧', COMPOSITE_DSI: '⚡',
}

function FraudScore({ score }) {
  const pct   = Math.round((score ?? 0) * 100)
  const color = pct < 30 ? 'var(--success)' : pct < 60 ? 'var(--warning)' : 'var(--danger)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color, minWidth: 32 }}>{pct}%</span>
    </div>
  )
}

function ClaimCard({ claim, copy, locale }) {
  const [expanded, setExpanded] = useState(false)
  const meta    = STATUS_META[claim.status] ?? STATUS_META['INITIATED']
  const emoji   = TRIGGER_EMOJI[claim.trigger_type] ?? '⚡'
  const dateStr = new Date(claim.created_at).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{
      overflow: 'hidden', background: 'var(--bg-800)',
      border: '1.5px solid var(--border-dark)', borderRadius: 24, padding: 20,
      transition: 'all 0.3s',
    }}>
      {/* Header row */}
      <button onClick={() => setExpanded(e => !e)} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, color: 'var(--text-primary)' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14, background: 'var(--bg-700)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem', flexShrink: 0, border: '1px solid var(--border-dark)',
        }}>
          {emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{claim.trigger_type?.replace(/_/g,' ')}</span>
            <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1rem', color: claim.status === 'PAID' ? 'var(--success)' : 'var(--text-primary)' }}>
              ₹{Number(claim.claim_amount).toLocaleString(locale)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`badge ${meta.className}`}>{meta.emoji} {copy.statuses[claim.status] ?? claim.status}</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{dateStr}</span>
          </div>
        </div>
        <div style={{ flexShrink: 0, color: 'var(--text-muted)', marginLeft: 6 }}>
          {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(200,230,74,0.06)', animation: 'fadeIn 0.25s ease', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Fraud score */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{copy.fraudScore}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{claim.adjudication_type ?? copy.adjudicationAuto}</span>
            </div>
            <FraudScore score={claim.fraud_score} />
          </div>

          {/* Zone + DSI */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: 'var(--bg-700)', borderRadius: 14, padding: '12px 14px', border: '1px solid var(--border-dark)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 2 }}>{copy.zone}</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{claim.zone_name ?? '—'}</div>
            </div>
            <div style={{ background: 'var(--bg-700)', borderRadius: 14, padding: '12px 14px', border: '1px solid var(--border-dark)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 2 }}>{copy.dsiScore}</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--lime)' }}>{Number(claim.dsi_score ?? 0).toFixed(0)}/100</div>
            </div>
          </div>

          {/* Fraud logs */}
          {Array.isArray(claim.fraud_logs) && claim.fraud_logs.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{copy.checkResults}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {claim.fraud_logs.map((log, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 10, background: 'var(--bg-700)', border: '1px solid var(--border-dark)' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{log.check_type?.replace(/_/g,' ')}</span>
                    <span className={`badge ${log.result === 'PASS' ? 'badge-success' : log.result === 'FAIL' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                      {log.result}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Claim ID */}
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {copy.claimId}: {String(claim.id).slice(0, 24)}…
          </div>
        </div>
      )}
    </div>
  )
}

export default function ClaimsHistory() {
  const workerId  = localStorage.getItem('gs_worker_id')
  const language = getStoredLanguage()
  const locale = getLocale(language)
  const copy = COPY[language] ?? COPY.en
  const [claims, setClaims]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [filter, setFilter]   = useState('ALL')
  const [search, setSearch]   = useState('')

  useEffect(() => {
    getWorkerClaims(workerId)
      .then(res => setClaims(res.data.claims ?? []))
      .catch(err => setError(getErrorMsg(err)))
      .finally(() => setLoading(false))
  }, [])

  const FILTERS = ['ALL', 'PAID', 'APPROVED', 'INITIATED', 'REJECTED', 'FLAGGED']

  const visible = claims.filter(c => {
    if (filter !== 'ALL' && c.status !== filter) return false
    if (search && !c.trigger_type?.toLowerCase().includes(search.toLowerCase()) && !c.zone_name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ padding: '52px 20px 16px' }}>
        <div style={{ fontFamily: 'Space Grotesk', fontSize: '1.6rem', fontWeight: 700, marginBottom: 4, letterSpacing: '-0.5px' }}>{copy.pageTitle}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{claims.length} {copy.totalClaimsSuffix}</div>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" placeholder={copy.searchPlaceholder}
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 38, fontSize: '0.88rem', borderRadius: 16 }} />
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '7px 16px', borderRadius: 99, whiteSpace: 'nowrap', fontSize: '0.78rem', fontWeight: 600,
                background: filter === f ? 'var(--lime)' : 'var(--bg-700)',
                color:      filter === f ? 'var(--olive-dark)' : 'var(--text-muted)',
                border:     filter === f ? '1.5px solid var(--lime)' : '1.5px solid var(--border-dark)',
                transition: 'all 0.2s',
              }}>{copy.statuses[f] ?? f}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && (
          [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 24 }} />)
        )}

        {!loading && visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: '52px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 14 }}>🛡️</div>
            <div style={{ fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Space Grotesk' }}>{copy.noClaims}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 6 }}>{copy.noClaimsDesc}</div>
          </div>
        )}

        {visible.map(c => <ClaimCard key={c.id} claim={c} copy={copy} locale={locale} />)}

        {error && (
          <div style={{ padding: 14, borderRadius: 14, background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '0.82rem', border: '1px solid rgba(239,68,68,0.15)' }}>⚠️ {error}</div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
