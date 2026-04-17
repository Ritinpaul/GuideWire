import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader, LogIn } from 'lucide-react'
import GigShieldLogo from '../components/layout/GigShieldLogo.jsx'
import { loginWorker, getErrorMsg } from '../services/api.js'
import { getStoredLanguage, normalizeLanguage, setStoredLanguage } from '../services/language.js'
import OnboardingBackground from '../components/layout/OnboardingBackground.jsx'

const COPY = {
  en: {
    title: 'Welcome back',
    subtitle: 'Sign in with your phone number. No re-registration needed.',
    phoneLabel: 'Phone Number',
    phonePlaceholder: 'Enter 10-digit number',
    signingIn: 'Signing in...',
    login: 'Login',
    newUser: 'New to GIGASHIELD?',
    registerOnce: 'Register once',
  },
  hi: {
    title: 'वापसी पर स्वागत है',
    subtitle: 'अपने फोन नंबर से साइन इन करें। दोबारा रजिस्ट्रेशन की जरूरत नहीं।',
    phoneLabel: 'फोन नंबर',
    phonePlaceholder: '10 अंकों का नंबर दर्ज करें',
    signingIn: 'साइन इन हो रहा है...',
    login: 'लॉगिन',
    newUser: 'GIGASHIELD में नए हैं?',
    registerOnce: 'एक बार रजिस्टर करें',
  },
}

export default function WorkerLogin() {
  const navigate = useNavigate()
  const language = getStoredLanguage()
  const copy = COPY[language] ?? COPY.en
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isValid = phone.length === 10

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isValid || loading) return

    setLoading(true)
    setError('')
    try {
      const payload = { phone: `+91${phone}` }
      const res = await loginWorker(payload)

      const worker = res.data?.worker
      const policy = res.data?.policy
      const normalizedLanguage = normalizeLanguage(worker?.language_pref)

      localStorage.setItem('gs_worker_id', worker.id)
      localStorage.setItem('gs_worker_name', worker.name ?? '')
      setStoredLanguage(normalizedLanguage)
      if (policy?.id) {
        localStorage.setItem('gs_policy_id', policy.id)
      }

      navigate('/home')
    } catch (err) {
      setError(getErrorMsg(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lp-root" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: 20 }}>
      <OnboardingBackground />

      <div style={{
        width: '100%', maxWidth: 460, padding: 40,
        background: '#1a1a1a', 
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 24, position: 'relative', zIndex: 2,
        boxShadow: '0 24px 48px rgba(0,0,0,0.1)',
        color: '#F5F5F0', overflow: 'hidden'
      }}>
        <div className="noise-overlay" />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <GigShieldLogo size={48} />
          </div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.8rem', marginBottom: 10, letterSpacing: '-0.5px', color: '#fff' }}>
            {copy.title}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.92rem' }}>
            {copy.subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
            {copy.phoneLabel}
          </label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 24 }}>
            <div style={{
              padding: '14px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, color: '#B8FF00',
            }}>
              +91
            </div>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder={copy.phonePlaceholder}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              style={{ 
                flex: 1, padding: '14px 16px', background: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, 
                color: '#fff', outline: 'none', transition: 'border 0.2s' 
              }}
              onFocus={(e) => e.target.style.borderColor = '#B8FF00'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          {error && (
            <div style={{
              marginBottom: 16, padding: 14, borderRadius: 14,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#FCA5A5', fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}

          <button className="lp-btn-primary" disabled={!isValid || loading} type="submit"
            style={{ width: '100%', padding: '16px', display: 'flex', justifyContent: 'center', gap: 8, opacity: (!isValid || loading) ? 0.6 : 1 }}>
            {loading ? <Loader size={18} className="animate-spin" /> : <LogIn size={18} />}
            {loading ? copy.signingIn : copy.login}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
          {copy.newUser} <Link to="/onboard" style={{ color: '#B8FF00', fontWeight: 700 }}>{copy.registerOnce}</Link>
        </div>
        </div>
      </div>
    </div>
  )
}
