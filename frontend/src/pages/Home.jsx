import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, MapPin, Users, ChevronRight, Zap, Shield, CloudRain, FileText, Wallet, CloudLightning, ArrowUpRight } from 'lucide-react'
import { getWorkerDashboard, getZoneDSI, getErrorMsg } from '../services/api.js'
import { getLocale, getStoredLanguage } from '../services/language.js'
import BottomNav from '../components/BottomNav.jsx'
import useWebSocket from '../hooks/useWebSocket.js'
import GigShieldLogo from '../components/layout/GigShieldLogo.jsx'

const DSI_LEVEL_META = {
  NORMAL:    { labelKey: 'dsiClear',    color: '#16A34A', emoji: '☀️',  bg: 'rgba(22,163,74,0.08)', barBg: '#DCFCE7'  },
  ELEVATED:  { labelKey: 'dsiElevated', color: '#D97706', emoji: '🌤️', bg: 'rgba(217,119,6,0.08)', barBg: '#FEF3C7'  },
  HIGH:      { labelKey: 'dsiHighRisk', color: '#EA580C', emoji: '⛈️', bg: 'rgba(234,88,12,0.08)', barBg: '#FFEDD5'  },
  CRITICAL:  { labelKey: 'dsiStorm',    color: '#DC2626', emoji: '🌪️', bg: 'rgba(220,38,38,0.1)', barBg: '#FEE2E2'  },
}

const DSI_LEVEL_ALIASES = {
  LOW: 'NORMAL',
  MODERATE: 'ELEVATED',
  MEDIUM: 'ELEVATED',
  SEVERE: 'HIGH',
}

const PLAN_COVER = { LOW: 1500, MEDIUM: 3000, HIGH: 5000 }
const PLAN_LABELS = {
  en: { LOW: 'Basic Shield', MEDIUM: 'Pro Shield', HIGH: 'Elite Shield' },
  hi: { LOW: 'बेसिक कवच', MEDIUM: 'प्रो कवच', HIGH: 'एलीट कवच' },
}

// 7-day forecast labels starting from today's actual day
function getForecastLabels(language) {
  const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayNamesHi = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि']
  const todayLabel = language === 'hi' ? 'आज' : 'Today'
  const dayNames = language === 'hi' ? dayNamesHi : dayNamesEn
  const todayIdx = new Date().getDay() // 0=Sun, 1=Mon, ...
  return [todayLabel, ...Array.from({ length: 6 }, (_, i) => dayNames[(todayIdx + 1 + i) % 7])]
}

const COPY = {
  en: {
    good: 'Good',
    live: 'Live',
    weeklyCoverage: 'Weekly coverage',
    active: 'ACTIVE',
    inactive: 'INACTIVE',
    plan: 'Plan',
    weeklyPremium: 'Weekly premium',
    expires: 'Expires',
    totalReceived: 'Total received',
    zoneWeatherRisk: 'Zone Weather Risk',
    dsiScore: 'DSI Score / 100',
    forecastTitle: '7-Day DSI Forecast',
    totalClaims: 'Total claims',
    shieldPoolActive: 'Shield Pool Active',
    membersDiscount: '{members} members · {discount}% premium discount',
    autoProtection: 'Auto-protection ON',
    autoProtectionDesc: 'Claims auto-trigger when DSI > threshold',
    quickRoutes: 'Quick Routes',
    claims: 'Claims',
    stormMode: 'Storm Mode',
    payout: 'Payout',
    admin: 'Admin',
    dsiClear: 'Clear',
    dsiElevated: 'Elevated',
    dsiHighRisk: 'High Risk',
    dsiStorm: 'STORM',
  },
  hi: {
    good: 'शुभ',
    live: 'लाइव',
    weeklyCoverage: 'साप्ताहिक कवरेज',
    active: 'सक्रिय',
    inactive: 'निष्क्रिय',
    plan: 'प्लान',
    weeklyPremium: 'साप्ताहिक प्रीमियम',
    expires: 'समाप्ति',
    totalReceived: 'कुल प्राप्त',
    zoneWeatherRisk: 'ज़ोन मौसम जोखिम',
    dsiScore: 'DSI स्कोर / 100',
    forecastTitle: '7-दिन DSI पूर्वानुमान',
    totalClaims: 'कुल दावे',
    shieldPoolActive: 'शील्ड पूल सक्रिय',
    membersDiscount: '{members} सदस्य · {discount}% प्रीमियम छूट',
    autoProtection: 'ऑटो-प्रोटेक्शन चालू',
    autoProtectionDesc: 'DSI सीमा पार होने पर दावे स्वतः ट्रिगर होते हैं',
    quickRoutes: 'त्वरित मार्ग',
    claims: 'दावे',
    stormMode: 'तूफान मोड',
    payout: 'भुगतान',
    admin: 'एडमिन',
    dsiClear: 'सामान्य',
    dsiElevated: 'बढ़ा हुआ',
    dsiHighRisk: 'उच्च जोखिम',
    dsiStorm: 'तूफान',
  },
}

/**
 * Deterministic 7-day DSI forecast seeded by zone + date.
 * Same zone on same day always renders the same forecast bars.
 * Today's value will be overridden by the live DSI score when available.
 */
function seededForecast(zoneId, todayDsi) {
  const dateKey = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const month = new Date().getMonth() // 0-indexed
  const isMonsoon = month >= 5 && month <= 9 // Jun-Oct
  const baseBias = isMonsoon ? 55 : 30

  const days = []
  for (let i = 0; i < 7; i++) {
    if (i === 0 && todayDsi != null) {
      days.push(Math.round(todayDsi))
      continue
    }
    // Simple hash: zone + date + day-offset → deterministic int
    let hash = 0
    const seed = `${zoneId}:${dateKey}:${i}`
    for (let c = 0; c < seed.length; c++) {
      hash = ((hash << 5) - hash + seed.charCodeAt(c)) | 0
    }
    const seeded = Math.abs(hash) % 40 // 0–39 range of variance
    days.push(Math.max(10, Math.min(95, baseBias + seeded - 15)))
  }
  return days
}

function resolveDsiLevel(level) {
  const normalized = String(level ?? '').trim().toUpperCase()
  if (DSI_LEVEL_META[normalized]) return normalized
  if (DSI_LEVEL_ALIASES[normalized]) return DSI_LEVEL_ALIASES[normalized]
  return 'NORMAL'
}

/* ═══════════════════════════════════════════════════════════════════
   STYLES — Landing Page Design Language
   Background: #F5F5F0 · Cards: #fff or #1a1a1a · Accent: #B8FF00
   ═══════════════════════════════════════════════════════════════════ */

const S = {
  root: {
    minHeight: '100vh',
    background: '#F5F5F0',
    color: '#1a1a1a',
    fontFamily: "'Inter', system-ui, sans-serif",
    paddingBottom: 80,
    position: 'relative',
  },
  topBar: {
    padding: '48px 40px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    maxWidth: 1280,
    margin: '0 auto',
  },
  greeting: {
    fontSize: '0.78rem',
    color: '#999',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  name: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '1.6rem',
    fontWeight: 700,
    marginTop: 4,
    letterSpacing: '-0.5px',
    color: '#1a1a1a',
  },
  liveBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: '#DCFCE7',
    padding: '6px 14px',
    borderRadius: 99,
    border: '1px solid rgba(22,163,74,0.15)',
  },
  liveDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: '#16A34A',
    animation: 'pulse 2s infinite',
  },
  liveText: {
    fontSize: '0.72rem', color: '#16A34A', fontWeight: 700,
  },
  refreshBtn: {
    display: 'flex', padding: 8, borderRadius: 12,
    background: '#fff', border: '1px solid rgba(0,0,0,0.08)',
    color: '#999', cursor: 'pointer',
    transition: 'all 0.2s',
  },
  body: {
    padding: '0 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    maxWidth: 1280,
    margin: '0 auto',
  },
  // Shield Card — dark card like LP feature cards
  shieldCard: (active) => ({
    borderRadius: 28, padding: '28px 24px',
    background: '#1a1a1a',
    color: '#F5F5F0',
    position: 'relative', overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    transition: 'all 0.35s',
  }),
  // White card for secondary sections
  whiteCard: {
    background: '#fff',
    border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 24, padding: 20,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    transition: 'all 0.3s',
  },
  // Stat card (darker, smaller)
  statCard: {
    background: '#fff',
    border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 24, padding: 20,
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
  },
  sectionLabel: {
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 14,
  },
  quickLinkBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '14px 16px',
    borderRadius: 16,
    fontWeight: 600,
    fontSize: '0.88rem',
    transition: 'all 0.3s',
    textDecoration: 'none',
    cursor: 'pointer',
  },
}

export default function Home() {
  const workerId    = localStorage.getItem('gs_worker_id')
  const workerName  = localStorage.getItem('gs_worker_name') ?? 'Partner'
  const language = getStoredLanguage()
  const locale = getLocale(language)
  const copy = COPY[language] ?? COPY.en
  const forecastLabels = getForecastLabels(language)
  const { connected } = useWebSocket()

  const [data, setData]         = useState(null)
  const [dsi, setDsi]           = useState(null)
  const [forecast, setForecast] = useState([30, 28, 35, 25, 40, 32, 27])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]       = useState('')

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      const res = await getWorkerDashboard(workerId)
      setData(res.data)
      if (res.data.worker?.zone_id) {
        const dsiRes = await getZoneDSI(res.data.worker.zone_id)
        setDsi(dsiRes.data)
      }
    } catch (err) {
      setError(getErrorMsg(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  // Recompute deterministic forecast when zone + DSI data arrive
  useEffect(() => {
    const zoneId = data?.worker?.zone_id
    if (zoneId) {
      setForecast(seededForecast(zoneId, dsi?.dsi_score))
    }
  }, [data?.worker?.zone_id, dsi?.dsi_score])

  if (loading) return <LoadingState />

  const policy = data?.active_policy
  const worker = data?.worker
  const claims = data?.claims_summary
  const payouts= data?.payout_summary
  const tier   = policy?.plan_tier ?? 'MEDIUM'
  const coverage = PLAN_COVER[tier] ?? 3000
  const premium  = parseFloat(policy?.premium_amount ?? 30)
  const planLabels = PLAN_LABELS[language] ?? PLAN_LABELS.en
  const planDisplayLabel = planLabels[tier] ?? `${tier} Shield`

  const dsiLevel = resolveDsiLevel(dsi?.level)
  const dsiMeta  = DSI_LEVEL_META[dsiLevel] ?? DSI_LEVEL_META.NORMAL
  const dsiLabel = copy[dsiMeta.labelKey] ?? COPY.en[dsiMeta.labelKey] ?? dsiMeta.labelKey
  const dsiScore = dsi?.dsi_score ?? 32

  const maxBar = Math.max(...forecast, 1)

  return (
    <div style={S.root}>
      {/* ── Top bar ── */}
      <div style={S.topBar}>
        <div>
          <div style={S.greeting}>
            {copy.good} {getGreeting(language)}
          </div>
          <div style={S.name}>
            {workerName.split(' ')[0]} 👋
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {connected && (
            <div style={S.liveBadge}>
              <div style={S.liveDot} />
              <span style={S.liveText}>{copy.live}</span>
            </div>
          )}
          <button onClick={() => load(true)} style={S.refreshBtn}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div style={S.body}>

        {/* ═══ Shield Status — Dark Hero Card (like LP feature cards) ═══ */}
        <div style={S.shieldCard(!!policy)}>
          {/* Subtle noise overlay like LP */}
          <div className="noise-overlay" />
          {/* Watermark */}
          <div style={{ position: 'absolute', top: -20, right: -20, fontSize: '7rem', opacity: 0.04, pointerEvents: 'none' }}>🛡️</div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
            <div>
              <div style={{ marginBottom: 10 }}>
                <GigShieldLogo size={36} />
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 700, letterSpacing: '-1px' }}>
                ₹{coverage.toLocaleString(locale)}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{copy.weeklyCoverage}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', borderRadius: 99,
                background: policy ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)',
                border: `1px solid ${policy ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.25)'}`,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: policy ? '#4ADE80' : '#EF4444', animation: policy ? 'pulse 2s infinite' : 'none' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: policy ? '#4ADE80' : '#EF4444' }}>
                  {policy ? copy.active : copy.inactive}
                </span>
              </div>
              {policy && (
                <div style={{ marginTop: 14, textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{copy.plan}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#B8FF00' }}>{planDisplayLabel}</div>
                </div>
              )}
            </div>
          </div>

          {/* Policy details row */}
          {policy && (
            <div style={{
              marginTop: 22, paddingTop: 18,
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', justifyContent: 'space-between',
              position: 'relative', zIndex: 2,
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{copy.weeklyPremium}</div>
                <div style={{ fontWeight: 700, color: '#FBBF24' }}>₹{premium}/wk</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{copy.expires}</div>
                <div style={{ fontWeight: 700, color: '#F5F5F0' }}>{policy.end_date ? new Date(policy.end_date).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{copy.totalReceived}</div>
                <div style={{ fontWeight: 700, color: '#4ADE80' }}>₹{(payouts?.total_received ?? 0).toLocaleString(locale)}</div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ DSI Zone Risk — White Card ═══ */}
        <div style={{
          ...S.whiteCard,
          borderLeft: `4px solid ${dsiMeta.color}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={S.sectionLabel}>{copy.zoneWeatherRisk}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.8rem' }}>{dsiMeta.emoji}</span>
                <div>
                  <div style={{ fontWeight: 700, color: dsiMeta.color, fontSize: '1.1rem' }}>{dsiLabel}</div>
                  {worker?.zone_name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#999' }}>
                      <MapPin size={12} /> {worker.zone_name}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2.4rem', fontWeight: 700, color: dsiMeta.color }}>{dsiScore}</div>
              <div style={{ fontSize: '0.68rem', color: '#aaa' }}>{copy.dsiScore}</div>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height: 6, borderRadius: 99, background: dsiMeta.barBg, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${dsiScore}%`,
              background: `linear-gradient(90deg, ${dsiMeta.color}99, ${dsiMeta.color})`,
              borderRadius: 99, transition: 'width 1s ease',
            }} />
          </div>
        </div>

        {/* ═══ 7-day DSI Forecast — White Card ═══ */}
        <div style={S.whiteCard}>
          <div style={S.sectionLabel}>{copy.forecastTitle}</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }}>
            {forecast.map((val, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: '100%',
                  height: `${(val / maxBar) * 64}px`,
                  borderRadius: '8px 8px 4px 4px',
                  background: i === 0
                    ? `linear-gradient(to top, ${dsiMeta.color}cc, ${dsiMeta.color})`
                    : 'rgba(0,0,0,0.06)',
                  transition: 'height 0.6s ease',
                  minHeight: 4,
                }} />
                <span style={{
                  fontSize: '0.6rem',
                  color: i === 0 ? dsiMeta.color : '#aaa',
                  fontWeight: i === 0 ? 700 : 500,
                }}>
                  {forecastLabels[i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ Stats Grid ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={S.statCard}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 700, color: '#D97706' }}>
              {claims?.total_claims ?? 0}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#aaa', marginTop: 4 }}>{copy.totalClaims}</div>
          </div>
          <div style={S.statCard}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 700, color: '#16A34A' }}>
              ₹{(payouts?.total_received ?? 0).toLocaleString(locale)}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#aaa', marginTop: 4 }}>{copy.totalReceived}</div>
          </div>
        </div>

        {/* ═══ Shield Pool ═══ */}
        {policy?.pool_id && (
          <div style={{
            ...S.whiteCard,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14,
              background: 'rgba(96,165,250,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users size={22} style={{ color: '#3B82F6' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1a1a1a' }}>{copy.shieldPoolActive}</div>
              <div style={{ fontSize: '0.78rem', color: '#999' }}>
                {copy.membersDiscount
                  .replace('{members}', policy?.member_count ?? 0)
                  .replace('{discount}', policy?.premium_discount_pct ?? 10)}
              </div>
            </div>
            <ChevronRight size={18} style={{ color: '#ccc' }} />
          </div>
        )}

        {/* ═══ Auto-protection banner — lime accent like LP ═══ */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: 'rgba(184,255,0,0.08)',
          border: '1.5px solid rgba(184,255,0,0.2)',
          borderRadius: 24, padding: '18px 20px',
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: '#B8FF00',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={20} style={{ color: '#1a1a1a' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1a1a1a' }}>{copy.autoProtection}</div>
            <div style={{ fontSize: '0.78rem', color: '#777' }}>{copy.autoProtectionDesc}</div>
          </div>
        </div>

        {/* ═══ Quick Routes — Dark card section like LP features ═══ */}
        <div style={{
          background: '#1a1a1a',
          borderRadius: 24,
          padding: '24px 20px',
          boxShadow: '0 6px 24px rgba(0,0,0,0.1)',
        }}>
          <div style={{
            fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16,
          }}>
            {copy.quickRoutes}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { to: '/claims', label: copy.claims, icon: <FileText size={18} />, color: '#60A5FA' },
              { to: '/storm',  label: copy.stormMode, icon: <CloudLightning size={18} />, color: '#F97316' },
              { to: '/payout', label: copy.payout, icon: <Wallet size={18} />, color: '#4ADE80' },
              { to: '/admin',  label: copy.admin, icon: <Shield size={18} />, color: '#FBBF24' },
            ].map((item) => (
              <Link key={item.to} to={item.to} style={{
                ...S.quickLinkBtn,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#F5F5F0',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = item.color
                e.currentTarget.style.color = item.color
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.color = '#F5F5F0'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
              >
                <span style={{ color: item.color }}>{item.icon}</span>
                {item.label}
                <ArrowUpRight size={14} style={{ marginLeft: 'auto', opacity: 0.4 }} />
              </Link>
            ))}
          </div>
        </div>

      </div>

      {error && (
        <div style={{
          margin: '12px auto', padding: '12px 16px', borderRadius: 14,
          background: '#FEE2E2', color: '#DC2626', fontSize: '0.85rem',
          border: '1px solid rgba(220,38,38,0.15)',
          maxWidth: 1280, width: 'calc(100% - 80px)',
        }}>
          ⚠️ {error}
        </div>
      )}

      <BottomNav />
    </div>
  )
}

function getGreeting(language) {
  const h = new Date().getHours()
  if (language === 'hi') {
    if (h < 12) return 'सुबह'
    if (h < 17) return 'दोपहर'
    return 'शाम'
  }
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function LoadingState() {
  return (
    <div style={{ ...S.root, padding: '52px 20px 0' }}>
      <div style={{ height: 40, borderRadius: 12, marginBottom: 24, background: 'rgba(0,0,0,0.06)', animation: 'shimmer 1.5s infinite' }} />
      <div style={{ height: 180, borderRadius: 28, marginBottom: 14, background: 'rgba(0,0,0,0.04)', animation: 'shimmer 1.5s infinite' }} />
      <div style={{ height: 110, borderRadius: 24, marginBottom: 14, background: 'rgba(0,0,0,0.04)', animation: 'shimmer 1.5s infinite' }} />
      <div style={{ height: 90, borderRadius: 24, background: 'rgba(0,0,0,0.04)', animation: 'shimmer 1.5s infinite' }} />
      <BottomNav />
    </div>
  )
}
