import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle, Share2, Home } from 'lucide-react'
import confetti from 'canvas-confetti'
import { getLocale, getStoredLanguage } from '../services/language.js'

const COPY = {
  en: {
    payoutReceived: '💸 Payout Received',
    claimSettled: '{trigger} claim settled',
    transactionRef: 'Transaction Ref',
    settledOn: 'Settled on',
    zone: 'Zone',
    source: 'Source',
    status: 'Status',
    completed: '🟢 COMPLETED',
    shareReceipt: 'Share Receipt',
    backToShield: 'Back to Shield',
    tagLine: '🛡️ GIGASHIELD NEXUS · Powered by Guidewire Cloud',
  },
  hi: {
    payoutReceived: '💸 भुगतान प्राप्त',
    claimSettled: '{trigger} दावा निपट गया',
    transactionRef: 'ट्रांजैक्शन रेफ',
    settledOn: 'निपटान समय',
    zone: 'ज़ोन',
    source: 'स्रोत',
    status: 'स्थिति',
    completed: '🟢 पूर्ण',
    shareReceipt: 'रसीद साझा करें',
    backToShield: 'कवच पर वापस',
    tagLine: '🛡️ GIGASHIELD NEXUS · Guidewire Cloud द्वारा संचालित',
  },
}

export default function PayoutConfirm() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const language = getStoredLanguage()
  const locale = getLocale(language)
  const copy = COPY[language] ?? COPY.en
  const [visible, setVisible] = useState(false)

  const rawData = location.state ?? JSON.parse(sessionStorage.getItem('gs_payout') ?? '{}')
  const payout  = {
    amount:       rawData.amount        ?? rawData.claim_amount ?? 420,
    razorpay_ref: rawData.razorpay_ref  ?? `pay_DEMO_${Date.now()}`,
    trigger_type: rawData.trigger_type  ?? sessionStorage.getItem('gs_last_trigger') ?? 'HEAVY_RAIN',
    zone_name:    rawData.zone_name     ?? localStorage.getItem('gs_zone_name') ?? localStorage.getItem('gs_city') ?? 'Your zone',
    payout_id:    rawData.payout_id     ?? '—',
  }

  const TRIGGER_EMOJI = {
    HEAVY_RAIN: '🌧️', FLOOD: '🌊', HEATWAVE: '🔥',
    POLLUTION: '🌫️', CURFEW: '🚧', COMPOSITE_DSI: '⚡',
  }

  useEffect(() => {
    // Short delay then trigger confetti
    setTimeout(() => {
      setVisible(true)
      fireConfetti()
    }, 200)
  }, [])

  const fireConfetti = () => {
    const colors = ['#C8E64A', '#DCF587', '#4ADE80', '#FBBF24', '#fff']
    confetti({
      particleCount: 160,
      spread: 90,
      origin: { y: 0.55 },
      colors,
      ticks: 300,
    })
    setTimeout(() => confetti({ particleCount: 80, spread: 60, origin: { y: 0.5, x: 0.2 }, colors }), 500)
    setTimeout(() => confetti({ particleCount: 80, spread: 60, origin: { y: 0.5, x: 0.8 }, colors }), 700)
  }

  const shareText = `I just received ₹${payout.amount} from GIGASHIELD for ${payout.trigger_type.replace(/_/g,' ')} disruption! 🛡️`
  const share = () => {
    if (navigator.share) {
      navigator.share({ title: 'GigShield Payout', text: shareText, url: 'https://gigashield.io' })
    } else {
      navigator.clipboard?.writeText(shareText)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, rgba(184,255,0,0.06) 0%, var(--bg-900) 40%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(74,222,128,0.08), transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div className="noise-overlay" />

      {/* Check animation */}
      <div style={{
        width: 96, height: 96, borderRadius: '50%',
        background: 'rgba(74,222,128,0.1)',
        border: '3px solid var(--success)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 32, position: 'relative', zIndex: 2,
        animation: visible ? 'fadeInUp 0.6s ease' : 'none',
        boxShadow: '0 0 50px rgba(74,222,128,0.25)',
      }}>
        <CheckCircle size={48} style={{ color: 'var(--success)' }} />
      </div>

      {/* Amount */}
      <div style={{ textAlign: 'center', marginBottom: 40, animation: visible ? 'fadeInUp 0.7s ease' : 'none', position: 'relative', zIndex: 2 }}>
        <div style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
          {copy.payoutReceived}
        </div>
        <div style={{ fontFamily: 'Space Grotesk', fontSize: '4.2rem', fontWeight: 700, lineHeight: 1, color: '#fff', marginBottom: 8 }}>
          ₹{Number(payout.amount).toLocaleString(locale)}
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          {TRIGGER_EMOJI[payout.trigger_type] ?? '⚡'} {copy.claimSettled.replace('{trigger}', payout.trigger_type.replace(/_/g,' '))}
        </div>
      </div>

      {/* Details card */}
      <div style={{
        width: '100%', maxWidth: 420, marginBottom: 28,
        animation: visible ? 'fadeInUp 0.8s ease' : 'none',
        background: 'var(--bg-800)', border: '1.5px solid var(--border-dark)',
        borderRadius: 24, padding: 24, position: 'relative', zIndex: 2,
      }}>
        {[
          [copy.transactionRef, payout.razorpay_ref.slice(0, 20) + (payout.razorpay_ref.length > 20 ? '…' : '')],
          [copy.settledOn, new Date().toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })],
          [copy.zone, payout.zone_name],
          [copy.source, 'Razorpay → UPI'],
          [copy.status, copy.completed],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(184,255,0,0.06)' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{k}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 420, animation: visible ? 'fadeInUp 0.9s ease' : 'none', position: 'relative', zIndex: 2 }}>
        <button className="btn btn-success btn-full" onClick={share} style={{ borderRadius: 99, padding: 16 }}>
          <Share2 size={18} /> {copy.shareReceipt}
        </button>
        <button className="btn btn-ghost btn-full" onClick={() => navigate('/home')} style={{ borderRadius: 99, padding: 16 }}>
          <Home size={18} /> {copy.backToShield}
        </button>
      </div>

      <div style={{ marginTop: 36, fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        {copy.tagLine}
      </div>
    </div>
  )
}
