import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check, Loader, Globe, Smartphone, User, Wallet, ShieldCheck, Shield, Zap } from 'lucide-react'
import { registerWorker, subscribePlan, getErrorMsg } from '../services/api.js'
import ShapWaterfall from '../components/ShapWaterfall.jsx'
import { getLocale, getStoredLanguage, setStoredLanguage } from '../services/language.js'
import OnboardingBackground from '../components/layout/OnboardingBackground.jsx'

const CITIES = [
  { value: 'Mumbai', label: { en: 'Mumbai', hi: 'मुंबई' } },
  { value: 'Delhi', label: { en: 'Delhi', hi: 'दिल्ली' } },
  { value: 'Bangalore', label: { en: 'Bangalore', hi: 'बैंगलोर' } },
  { value: 'Hyderabad', label: { en: 'Hyderabad', hi: 'हैदराबाद' } },
  { value: 'Chennai', label: { en: 'Chennai', hi: 'चेन्नई' } },
]



const PLATFORMS = [
  { value: 'Blinkit', label: { en: 'Blinkit', hi: 'ब्लिंकिट' } },
  { value: 'Zepto', label: { en: 'Zepto', hi: 'ज़ेप्टो' } },
  { value: 'Swiggy Instamart', label: { en: 'Swiggy Instamart', hi: 'स्विगी इंस्टामार्ट' } },
  { value: 'Other', label: { en: 'Other', hi: 'अन्य' } },
]
const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', symbol: 'Aa' },
  { code: 'hi', label: 'Hindi',   native: 'हिन्दी',   symbol: 'अ' },
]

const TOTAL_STEPS = 7

const PLAN_LABELS = {
  en: { LOW: 'Basic Shield', MEDIUM: 'Pro Shield', HIGH: 'Elite Shield' },
  hi: { LOW: 'बेसिक कवच', MEDIUM: 'प्रो कवच', HIGH: 'एलीट कवच' },
}
const PLAN_COVER  = { LOW: 1500, MEDIUM: 3000, HIGH: 5000 }
const PLAN_COLORS = { LOW: '#60A5FA', MEDIUM: '#C8E64A', HIGH: '#FBBF24' }

const COPY = {
  en: {
    alreadyRegistered: 'Already registered?',
    login: 'Login',
    stepOf: 'Step {step} of {total}',
    chooseLanguage: 'Choose your language',
    chooseLanguageDesc: "Select the language you're most comfortable in",
    phoneTitle: 'Your phone number',
    phoneDesc: "We'll send OTP alerts on this number",
    mobileNumber: 'Mobile Number',
    phonePlaceholder: 'Enter 10-digit number',
    phoneHelp: '📱 Your number is only used for payout alerts and claim notifications.',
    profileTitle: 'Your delivery profile',
    profileDesc: 'We use this to customise your shield',
    fullName: 'Full Name',
    fullNamePlaceholder: 'e.g. Raju Kumar',
    cityLabel: 'Your City',
    platformLabel: 'Platform',
    earningsTitle: 'Your daily earnings',
    earningsDesc: 'This helps us guarantee your premium is always fair',
    perDayAvg: 'per day on average',
    verificationTitle: 'Quick verification',
    verificationDesc: 'Required for KYC compliance (last 4 digits only)',
    aadhaarLabel: 'Aadhaar — Last 4 digits',
    aadhaarPlaceholder: 'e.g. 7892',
    aadhaarHelp: '🔒 We store only the last 4 digits, encrypted. We are DPDPA-2023 compliant.',
    shieldTitle: 'Your personalised shield 🛡️',
    shieldDesc: 'AI-calculated. Fairness guaranteed.',
    recommended: 'RECOMMENDED',
    coverageSuffix: 'coverage',
    premiumWhy: 'Why this premium? (AI explanation)',
    activateTitle: 'Activate your shield ⚡',
    activateDesc: 'Enter your UPI ID to receive instant payouts',
    upiLabel: 'UPI ID',
    upiPlaceholder: 'e.g. raju@okaxis',
    summaryTitle: '📋 Your Shield Summary',
    summaryPlan: 'Plan',
    summaryCoverage: 'Coverage',
    summaryPremium: 'Weekly Premium',
    summaryCity: 'City',
    summaryPlatform: 'Platform',
    terms: 'By activating, you agree to our Terms of Service. Cancel anytime. No hidden fees.',
    processing: 'Processing…',
    activateButton: '⚡ Activate My Shield',
    calculatePremium: 'Calculate My Premium',
    next: 'Next',
    aadhaarError: 'Enter the last 4 digits of Aadhaar',
    upiError: 'Enter a valid UPI ID',
    fairnessShield: '🛡️ Fairness Shield active',
    fairnessRule: 'Your premium will never exceed ₹{cap}/week (5% of weekly earnings = ₹{weekly})',
  },
  hi: {
    alreadyRegistered: 'पहले से रजिस्टर्ड हैं?',
    login: 'लॉगिन',
    stepOf: 'चरण {step} / {total}',
    chooseLanguage: 'अपनी भाषा चुनें',
    chooseLanguageDesc: 'जिस भाषा में आप सहज हों, उसे चुनें',
    phoneTitle: 'आपका फोन नंबर',
    phoneDesc: 'हम इसी नंबर पर OTP और अलर्ट भेजेंगे',
    mobileNumber: 'मोबाइल नंबर',
    phonePlaceholder: '10 अंकों का नंबर दर्ज करें',
    phoneHelp: '📱 आपका नंबर केवल भुगतान और क्लेम अलर्ट के लिए उपयोग होगा।',
    profileTitle: 'आपकी डिलीवरी प्रोफाइल',
    profileDesc: 'इसी आधार पर हम आपका कवच कस्टमाइज़ करते हैं',
    fullName: 'पूरा नाम',
    fullNamePlaceholder: 'उदा. राजू कुमार',
    cityLabel: 'आपका शहर',
    platformLabel: 'प्लेटफॉर्म',
    earningsTitle: 'आपकी दैनिक कमाई',
    earningsDesc: 'इससे आपका प्रीमियम हमेशा निष्पक्ष रहता है',
    perDayAvg: 'प्रतिदिन औसतन',
    verificationTitle: 'त्वरित सत्यापन',
    verificationDesc: 'KYC अनुपालन हेतु (केवल अंतिम 4 अंक)',
    aadhaarLabel: 'आधार — अंतिम 4 अंक',
    aadhaarPlaceholder: 'उदा. 7892',
    aadhaarHelp: '🔒 हम केवल अंतिम 4 अंक एन्क्रिप्ट करके रखते हैं। हम DPDPA-2023 compliant हैं।',
    shieldTitle: 'आपका व्यक्तिगत कवच 🛡️',
    shieldDesc: 'AI द्वारा गणना। निष्पक्षता सुनिश्चित।',
    recommended: 'सुझावित',
    coverageSuffix: 'कवरेज',
    premiumWhy: 'यह प्रीमियम क्यों? (AI व्याख्या)',
    activateTitle: 'अपना कवच सक्रिय करें ⚡',
    activateDesc: 'तुरंत भुगतान पाने के लिए UPI ID दर्ज करें',
    upiLabel: 'UPI आईडी',
    upiPlaceholder: 'उदा. raju@okaxis',
    summaryTitle: '📋 आपका कवच सारांश',
    summaryPlan: 'प्लान',
    summaryCoverage: 'कवरेज',
    summaryPremium: 'साप्ताहिक प्रीमियम',
    summaryCity: 'शहर',
    summaryPlatform: 'प्लेटफॉर्म',
    terms: 'सक्रिय करते ही आप हमारी Terms of Service से सहमत होते हैं। कभी भी रद्द करें, कोई छुपा शुल्क नहीं।',
    processing: 'प्रोसेस हो रहा है…',
    activateButton: '⚡ मेरा कवच सक्रिय करें',
    calculatePremium: 'मेरा प्रीमियम निकालें',
    next: 'आगे',
    aadhaarError: 'आधार के अंतिम 4 अंक दर्ज करें',
    upiError: 'मान्य UPI आईडी दर्ज करें',
    fairnessShield: '🛡️ फेयरनेस शील्ड सक्रिय',
    fairnessRule: 'आपका प्रीमियम ₹{cap}/सप्ताह से अधिक नहीं होगा (साप्ताहिक कमाई का 5% = ₹{weekly})',
  },
}

const tierMultiplier = (tier) => (tier === 'LOW' ? 0.7 : tier === 'HIGH' ? 1.4 : 1)
const tierPremium = (basePremium, tier) => Math.round(basePremium * tierMultiplier(tier))

const getOptionLabel = (option, language) => {
  return option?.label?.[language] ?? option?.label?.en ?? option?.value ?? ''
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [language, setLanguage] = useState(getStoredLanguage())
  const locale = getLocale(language)
  const copy = COPY[language] ?? COPY.en
  const planLabels = PLAN_LABELS[language] ?? PLAN_LABELS.en
  const [step, setStep]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [slideDir, setSlideDir] = useState('right')

  // Form state
  const [phone, setPhone]                 = useState('')
  const [name, setName]                   = useState('')
  const [city, setCity]                   = useState('')
  const [platform, setPlatform]           = useState('')
  const [earnings, setEarnings]           = useState(400)
  const [aadhaarLast4, setAadhaarLast4]   = useState('')
  const [upiId, setUpiId]                 = useState('')
  const [chosenTier, setChosenTier]       = useState('MEDIUM')

  const selectedCity = CITIES.find((c) => c.value === city)
  const selectedPlatform = PLATFORMS.find((p) => p.value === platform)
  const selectedCityLabel = selectedCity ? getOptionLabel(selectedCity, language) : city
  const selectedPlatformLabel = selectedPlatform ? getOptionLabel(selectedPlatform, language) : platform

  // API results
  const [workerId, setWorkerId]           = useState(null)
  const [zoneId, setZoneId]               = useState(null)
  const [premiumData, setPremiumData]     = useState(null)

  const progressPct = ((step - 1) / (TOTAL_STEPS - 1)) * 100

  const goNext = async () => {
    setError('')
    if (step === 5) {
      // Step 5 → Step 6: call backend to register + get premium
      await doRegister()
      return
    }
    if (step === 7) {
      await doSubscribe()
      return
    }
    animateStep('right')
    setStep(s => s + 1)
  }

  const goPrev = () => {
    if (step === 1) return
    animateStep('left')
    setStep(s => s - 1)
  }

  const animateStep = (dir) => {
    setSlideDir(dir)
  }

  const doRegister = async () => {
    if (!aadhaarLast4 || aadhaarLast4.length !== 4) {
      setError(copy.aadhaarError)
      return
    }
    setLoading(true)
    try {
      const res = await registerWorker({
        name,
        phone:              `+91${phone.replace(/\D/g,'')}`,
        city,
        platform:           platform.toUpperCase().replace(/ /g,'_'),
        avg_daily_earnings: earnings,
        language_pref:      language,
        aadhaar_last4:      aadhaarLast4,
      })
      const { worker, recommended_plan } = res.data
      setWorkerId(worker.id)
      setZoneId(worker.zone_id ?? null)
      setPremiumData(recommended_plan)
      animateStep('right')
      setStep(6)
    } catch (err) {
      setError(getErrorMsg(err))
    } finally {
      setLoading(false)
    }
  }

  const doSubscribe = async () => {
    if (!upiId || upiId.length < 5) { setError(copy.upiError); return }
    setLoading(true)
    try {
      const res = await subscribePlan({
        worker_id: workerId,
        plan_tier: chosenTier,
        upi_id:    upiId,
        language,
      })
      localStorage.setItem('gs_worker_id', workerId)
      localStorage.setItem('gs_policy_id', res.data.policy.id)
      localStorage.setItem('gs_worker_name', name)
      setStoredLanguage(language)
      localStorage.setItem('gs_city', city)
      localStorage.setItem('gs_zone_name', city)          // city is the readable zone label
      if (zoneId) localStorage.setItem('gs_zone_id', zoneId)
      navigate('/home')
    } catch (err) {
      setError(getErrorMsg(err))
    } finally {
      setLoading(false)
    }
  }

  const canProceed = () => {
    if (step === 1) return !!language
    if (step === 2) return phone.replace(/\D/,'').length === 10
    if (step === 3) return name.length >= 2 && city && platform
    if (step === 4) return earnings >= 100
    if (step === 5) return aadhaarLast4.length === 4
    if (step === 6) return !!chosenTier
    if (step === 7) return upiId.length >= 5
    return true
  }

  const basePremium = Number(premiumData?.premium_inr ?? 0)
  const selectedPremium = premiumData ? tierPremium(basePremium, chosenTier) : 0
  const scaledExplanation = premiumData?.shap_explanation
    ? {
        ...premiumData.shap_explanation,
        base_premium_inr: tierPremium(basePremium, chosenTier),
        final_premium_inr: selectedPremium,
        top_factors: (premiumData.shap_explanation.top_factors ?? []).map((f) => ({
          ...f,
          impact_inr: Number((f.impact_inr * tierMultiplier(chosenTier)).toFixed(2)),
        })),
      }
    : null

  return (
    <div className="lp-root" style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', position: 'relative' }}>
      <OnboardingBackground />
      <div className="wizard-card">
        <div className="noise-overlay" />

        {/* Header */}
        <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 2 }}>
          {step > 1 ? (
            <button onClick={goPrev} style={{ color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <ChevronLeft size={20} />
            </button>
          ) : (
            <div style={{ width: 36 }} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {Math.round(progressPct)}% • {copy.stepOf.replace('{step}', step).replace('{total}', TOTAL_STEPS)}
              </span>
            </div>
            <div className="progress-bar-track" style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 10 }}>
              <div className="progress-bar-fill" style={{ width: `${progressPct}%`, background: '#B8FF00', height: '100%', borderRadius: 10 }} />
            </div>
          </div>
          <div style={{ width: 36 }} />
        </div>

        {/* Step content */}
        <div className={`animate-${slideDir === 'right' ? 'slideInRight' : 'slideInLeft'}`}
          key={step}
          style={{ flex: 1, padding: '12px 24px 24px', display: 'flex', flexDirection: 'column', gap: 24, position: 'relative', zIndex: 2, overflowY: 'auto', minHeight: 0 }}>

          {step <= 2 && (
            <div style={{ textAlign: 'right', fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>
              {copy.alreadyRegistered} <Link to="/login" style={{ color: '#B8FF00', fontWeight: 700 }}>{copy.login}</Link>
            </div>
          )}

        {/* ── Step 1: Language ── */}
        {step === 1 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ display: 'inline-flex', padding: 16, borderRadius: 20, background: 'rgba(184,255,0,0.1)', color: '#B8FF00', marginBottom: 16 }}>
                <Globe size={32} />
              </div>
              <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.8rem', marginBottom: 8, letterSpacing: '-0.5px' }}>{copy.chooseLanguage}</h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>{copy.chooseLanguageDesc}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => setLanguage(l.code)}
                  style={{
                    padding: '16px 20px', borderRadius: 20,
                    background: language === l.code ? 'rgba(184,255,0,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `2px solid ${language === l.code ? '#B8FF00' : 'rgba(255,255,255,0.1)'}`,
                    display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left',
                    transition: 'all 0.2s',
                  }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: language === l.code ? '#B8FF00' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: language === l.code ? '#1a1a1a' : '#fff', fontWeight: 700, fontSize: '1.2rem', fontFamily: 'Space Grotesk, sans-serif' }}>
                    {l.symbol}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff', marginBottom: 2 }}>{l.native}</div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>{l.label}</div>
                  </div>
                  {language === l.code && <Check size={20} style={{ color: '#B8FF00', marginLeft: 'auto' }} />}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 2: Phone ── */}
        {step === 2 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ display: 'inline-flex', padding: 16, borderRadius: 20, background: 'rgba(184,255,0,0.1)', color: '#B8FF00', marginBottom: 16 }}>
                <Smartphone size={32} />
              </div>
              <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.8rem', marginBottom: 8, letterSpacing: '-0.5px' }}>{copy.phoneTitle}</h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>{copy.phoneDesc}</p>
            </div>
            <div className="input-group">
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{copy.mobileNumber}</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.06)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, color: '#B8FF00', fontSize: '1rem', whiteSpace: 'nowrap' }}>
                  +91
                </div>
                <input type="tel" inputMode="numeric" maxLength={10}
                  placeholder={copy.phonePlaceholder}
                  value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,''))} 
                  style={{ flex: 1, padding: '14px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#fff', outline: 'none' }}
                />
              </div>
            </div>
            <div style={{ padding: 16, borderRadius: 12, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(59,130,246,0.2)', fontSize: '0.82rem', color: '#93C5FD' }}>
              {copy.phoneHelp}
            </div>
          </>
        )}

        {/* ── Step 3: Profile ── */}
        {step === 3 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ display: 'inline-flex', padding: 16, borderRadius: 20, background: 'rgba(184,255,0,0.1)', color: '#B8FF00', marginBottom: 16 }}>
                <User size={32} />
              </div>
              <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.8rem', marginBottom: 8, letterSpacing: '-0.5px' }}>{copy.profileTitle}</h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>{copy.profileDesc}</p>
            </div>
            <div className="input-group">
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{copy.fullName}</label>
              <input type="text" placeholder={copy.fullNamePlaceholder}
                value={name} onChange={e => setName(e.target.value)}
                style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#fff', outline: 'none' }} />
            </div>
            <div className="input-group">
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{copy.cityLabel}</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {CITIES.map((c) => {
                  const label = getOptionLabel(c, language)
                  return (
                  <button key={c.value} onClick={() => setCity(c.value)}
                    style={{
                      padding: '11px 8px', borderRadius: 12, fontSize: '0.82rem', fontWeight: 600,
                      background: city === c.value ? 'rgba(184,255,0,0.1)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${city === c.value ? '#B8FF00' : 'rgba(255,255,255,0.1)'}`,
                      color: city === c.value ? '#B8FF00' : 'rgba(255,255,255,0.6)',
                      transition: 'all 0.15s',
                    }}>{label}</button>
                  )
                })}
              </div>
            </div>
            <div className="input-group">
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{copy.platformLabel}</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PLATFORMS.map((p) => {
                  const label = getOptionLabel(p, language)
                  return (
                  <button key={p.value} onClick={() => setPlatform(p.value)}
                    style={{
                      padding: '12px 16px', borderRadius: 14, textAlign: 'left', fontWeight: 600, fontSize: '0.9rem',
                      background: platform === p.value ? 'rgba(184,255,0,0.08)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${platform === p.value ? '#B8FF00' : 'rgba(255,255,255,0.1)'}`,
                      color: platform === p.value ? '#B8FF00' : 'rgba(255,255,255,0.6)',
                      transition: 'all 0.15s',
                    }}>{label}</button>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* ── Step 4: Daily Earnings ── */}
        {step === 4 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <div style={{ display: 'inline-flex', padding: 16, borderRadius: 20, background: 'rgba(184,255,0,0.1)', color: '#B8FF00', marginBottom: 16 }}>
                <Wallet size={32} />
              </div>
              <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.8rem', marginBottom: 8, letterSpacing: '-0.5px' }}>{copy.earningsTitle}</h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>{copy.earningsDesc}</p>
            </div>
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '3.5rem', fontWeight: 700, color: '#B8FF00', animation: 'countUp 0.3s ease' }}>
                ₹{earnings}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: 4 }}>{copy.perDayAvg}</div>
            </div>
            <div>
              <input type="range" min={100} max={1500} step={50} value={earnings}
                onChange={e => setEarnings(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--amber)', height: 6, cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>₹100</span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>₹1,500</span>
              </div>
            </div>
            <div style={{ background: 'rgba(74,222,128,0.06)', borderColor: 'rgba(74,222,128,0.15)', border: '1.5px solid rgba(74,222,128,0.15)', borderRadius: 20, padding: 20 }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--success)', lineHeight: 1.6 }}>
                <strong>{copy.fairnessShield}</strong><br />
                {copy.fairnessRule
                  .replace('{cap}', Math.round(earnings * 7 * 0.05))
                  .replace('{weekly}', (earnings * 7).toLocaleString(locale))}
              </div>
            </div>
          </>
        )}

        {/* ── Step 5: Verification ── */}
        {step === 5 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ display: 'inline-flex', padding: 16, borderRadius: 20, background: 'rgba(184,255,0,0.1)', color: '#B8FF00', marginBottom: 16 }}>
                <ShieldCheck size={32} />
              </div>
              <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.8rem', marginBottom: 8, letterSpacing: '-0.5px' }}>{copy.verificationTitle}</h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>{copy.verificationDesc}</p>
            </div>
            <div className="input-group">
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{copy.aadhaarLabel}</label>
              <input type="text" inputMode="numeric" maxLength={4}
                placeholder={copy.aadhaarPlaceholder}
                value={aadhaarLast4} onChange={e => setAadhaarLast4(e.target.value.replace(/\D/g,''))}
                style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#fff', outline: 'none', fontSize: '1.5rem', letterSpacing: '0.5em', textAlign: 'center', fontWeight: 700 }} />
            </div>
            <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
              {copy.aadhaarHelp}
            </div>
          </>
        )}

        {/* ── Step 6: Your Shield (SHAP premium) ── */}
        {step === 6 && premiumData && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ display: 'inline-flex', padding: 16, borderRadius: 20, background: 'rgba(184,255,0,0.1)', color: '#B8FF00', marginBottom: 16 }}>
                <Shield size={32} />
              </div>
              <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.8rem', marginBottom: 4, letterSpacing: '-0.5px' }}>{copy.shieldTitle}</h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>{copy.shieldDesc}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(planLabels).map(([tier, label]) => {
                const isRec = tier === premiumData.plan_tier
                const color = PLAN_COLORS[tier]
                const baseP = tierPremium(basePremium, tier)
                return (
                  <button key={tier} onClick={() => setChosenTier(tier)} style={{
                    padding: '18px 20px', borderRadius: 20, textAlign: 'left',
                    background: chosenTier === tier ? `rgba(${color === '#C8E64A' ? '184,255,0' : color === '#60A5FA' ? '96,165,250' : '251,191,36'},0.08)` : 'rgba(255,255,255,0.03)',
                    border: `2px solid ${chosenTier === tier ? color : 'rgba(255,255,255,0.1)'}`,
                    transition: 'all 0.25s', cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: 3 }}>
                          {label} {isRec && <span style={{ marginLeft: 6, fontSize: '0.68rem', background: color, color: '#1a1a1a', padding: '2px 7px', borderRadius: 99, fontWeight: 800 }}>{copy.recommended}</span>}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>₹{PLAN_COVER[tier].toLocaleString(locale)} {copy.coverageSuffix}</div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: 70 }}>
                        <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '1.4rem', color }}> ₹{baseP}</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>/week</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* SHAP waterfall */}
            {scaledExplanation?.top_factors?.length > 0 && (
              <div className="card">
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                  {copy.premiumWhy}
                </div>
                <ShapWaterfall explanation={scaledExplanation} premium={selectedPremium} />
              </div>
            )}
          </>
        )}

        {/* ── Step 7: Activate ── */}
        {step === 7 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ display: 'inline-flex', padding: 16, borderRadius: 20, background: 'rgba(184,255,0,0.1)', color: '#B8FF00', marginBottom: 16 }}>
                <Zap size={32} />
              </div>
              <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.8rem', marginBottom: 8, letterSpacing: '-0.5px' }}>{copy.activateTitle}</h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>{copy.activateDesc}</p>
            </div>
            <div className="input-group">
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{copy.upiLabel}</label>
              <input type="text" placeholder={copy.upiPlaceholder}
                value={upiId} onChange={e => setUpiId(e.target.value)} 
                style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#fff', outline: 'none' }} />
            </div>

            {/* Summary card */}
            <div style={{ background: 'rgba(184,255,0,0.04)', border: '1.5px solid rgba(184,255,0,0.12)', borderRadius: 20, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#B8FF00', marginBottom: 14 }}>{copy.summaryTitle}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  [copy.summaryPlan, planLabels[chosenTier]],
                  [copy.summaryCoverage, `₹${PLAN_COVER[chosenTier].toLocaleString(locale)}`],
                  [copy.summaryPremium, `₹${premiumData ? selectedPremium : '—'}`],
                  [copy.summaryCity, selectedCityLabel],
                  [copy.summaryPlatform, selectedPlatformLabel],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>{k}</span>
                    <span style={{ fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.6 }}>
              {copy.terms}
            </div>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ margin: '12px 20px 0', padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', fontSize: '0.85rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* CTA button */}
      <div style={{ padding: '0 20px 20px', marginTop: 'auto' }}>
        <button className="lp-btn-primary"
          onClick={goNext}
          disabled={!canProceed() || loading}
          style={{ width: '100%', fontSize: '1.05rem', padding: '16px 24px', display: 'flex', justifyContent: 'center', gap: 8, opacity: (!canProceed() || loading) ? 0.6 : 1, transition: 'all 0.2s' }}>
          {loading
            ? <><Loader size={18} className="animate-spin" /> {copy.processing}</>
            : step === 7 ? copy.activateButton
            : step === 5 ? copy.calculatePremium
            : step === TOTAL_STEPS ? 'Finish'
            : <>{copy.next} <ChevronRight size={18} /></>
          }
        </button>
      </div>
    </div>
    </div>
  )
}
