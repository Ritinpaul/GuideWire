import { Link } from 'react-router-dom'
import { Shield, Zap, MapPin, Users, ChevronDown, CheckCircle, ArrowRight, ArrowUpRight, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import GigShieldLogo from '../components/layout/GigShieldLogo.jsx'

const STATS = [
  { value: '12M+',   label: 'Gig workers at risk' },
  { value: '<3min', label: 'Payout speed' },
  { value: '\u20B915',    label: 'Starting premium' },
  { value: '25',     label: 'DSI zones online' },
]

const FEATURES = [
  {
    icon: '\uD83E\uDDE0',
    title: 'Shield-SAC Pricing',
    desc: 'XGBoost model with SHAP explainability. Premium personalized & always capped at 5% of weekly earnings.',
    tag: 'Fairness Guaranteed',
  },
  {
    icon: '\uD83D\uDD2C',
    title: 'PADS Fraud Detection',
    desc: 'Physics-based 5-layer fraud pipeline using IMU kinematics, GPS, and Isolation Forest.',
    tag: '5-Layer Pipeline',
  },
  {
    icon: '\uD83C\uDF26\uFE0F',
    title: 'DSI Weather Index',
    desc: 'Composite Disruption Severity Index combining rain, AQI, traffic, and order-drop signals.',
    tag: 'Real-time',
  },
  {
    icon: '\uD83D\uDCAC',
    title: 'WhatsApp Onboarding',
    desc: 'Register in 90 seconds via WhatsApp. No app download. Works on any smartphone.',
    tag: 'Zero Friction',
  },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Register in 90s', desc: 'Phone OTP \u2192 Platform \u2192 Daily earnings \u2192 UPI ID. Done.', emoji: '\uD83D\uDCF1' },
  { step: '02', title: 'DSI fires a trigger', desc: 'Weather sensors cross the DSI threshold for your zone.', emoji: '\u26A1' },
  { step: '03', title: 'Payout in < 3 min', desc: 'PADS validates. Razorpay sends money to your UPI.', emoji: '\uD83D\uDCB8' },
]

const PLANS = [
  { name: 'Basic Shield', price: 15, coverage: 1500, color: '#60A5FA', features: ['Rain & flood coverage', 'WhatsApp alerts', 'Auto claim'] },
  { name: 'Pro Shield',   price: 30, coverage: 3000, color: '#B8FF00', features: ['All Basic features', 'Air quality coverage', 'SHAP explanation', 'Pool discount'], popular: true },
  { name: 'Elite Shield', price: 45, coverage: 5000, color: '#FBBF24', features: ['All Pro features', 'Heat & drought', 'Priority payout', 'Dedicated support'] },
]

const TESTIMONIALS = [
  { name: 'Raju K.', city: 'Mumbai', platform: 'Blinkit', quote: 'Monsoon mein \u20B9612 mila. Bina kuch kiye. Seedha UPI pe.', avatar: '\uD83D\uDC68' },
  { name: 'Priya S.', city: 'Delhi',  platform: 'Zepto',   quote: 'AQI 350 tha, delivery nahi kar sakti thi. 2 minute mein paisa aa gaya.', avatar: '\uD83D\uDC69' },
  { name: 'Vikram M.',city: 'Bangalore', platform: 'Swiggy', quote: 'Ab baarish se darna band. GigShield hai toh tension nahi.', avatar: '\uD83E\uDDD1' },
]

const TRUST_LOGOS = ['Guidewire', 'Razorpay', 'OpenWeatherMap', 'WhatsApp Business', 'PyTorch', 'FastAPI']

/* ═══════════════════════════════════════════════════════════════════════════
   DELIVERY PIN ANIMATION — Large lime pin, pro rider, constant heavy rain
   ═══════════════════════════════════════════════════════════════════════════ */
function DeliveryPinAnimation() {
  const rainDrops = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${(i * 7.3 + 3) % 100}%`,
    height: `${14 + (i * 3.7) % 18}px`,
    duration: `${0.4 + (i * 0.031) % 0.5}s`,
    delay: `${(i * 0.137) % 2}s`,
    opacity: 0.25 + ((i * 0.019) % 0.35),
  }))

  return (
    <div className="lp-pin-scene">
      {/* Map grid background */}
      <svg className="lp-map-grid" viewBox="0 0 500 500" preserveAspectRatio="none">
        {Array.from({ length: 16 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 33} y1="0" x2={i * 33} y2="500"
            stroke="rgba(140,175,200,0.18)" strokeWidth="1" />
        ))}
        {Array.from({ length: 16 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 33} x2="500" y2={i * 33}
            stroke="rgba(140,175,200,0.18)" strokeWidth="1" />
        ))}
      </svg>

      {/* CONSTANT RAIN */}
      <div className="lp-rain-layer">
        {rainDrops.map(d => (
          <div key={d.id} className="lp-raindrop" style={{
            left: d.left,
            height: d.height,
            animationDuration: d.duration,
            animationDelay: d.delay,
            opacity: d.opacity,
          }} />
        ))}
      </div>

      {/* Dark rain cloud top-center */}
      <div className="lp-cloud lp-cloud-3">
        <svg width="260" height="80" viewBox="0 0 260 80" fill="none">
          <ellipse cx="80" cy="50" rx="60" ry="28" fill="white" fillOpacity="0.5" />
          <ellipse cx="130" cy="38" rx="80" ry="35" fill="white" fillOpacity="0.6" />
          <ellipse cx="190" cy="48" rx="55" ry="26" fill="white" fillOpacity="0.45" />
          <ellipse cx="130" cy="45" rx="70" ry="28" fill="rgba(180,200,220,0.4)" />
        </svg>
      </div>

      {/* Floating cloud left */}
      <div className="lp-cloud lp-cloud-1">
        <svg width="140" height="55" viewBox="0 0 140 55" fill="none">
          <ellipse cx="45" cy="32" rx="35" ry="18" fill="white" fillOpacity="0.85" />
          <ellipse cx="75" cy="25" rx="40" ry="22" fill="white" fillOpacity="0.9" />
          <ellipse cx="105" cy="32" rx="28" ry="16" fill="white" fillOpacity="0.8" />
        </svg>
      </div>

      {/* Floating cloud right */}
      <div className="lp-cloud lp-cloud-2">
        <svg width="120" height="48" viewBox="0 0 120 48" fill="none">
          <ellipse cx="38" cy="28" rx="30" ry="16" fill="white" fillOpacity="0.8" />
          <ellipse cx="68" cy="22" rx="36" ry="20" fill="white" fillOpacity="0.9" />
          <ellipse cx="96" cy="28" rx="22" ry="13" fill="white" fillOpacity="0.75" />
        </svg>
      </div>

      {/* THE PIN */}
      <div className="lp-pin-wrapper">
        <svg viewBox="0 0 300 400" className="lp-pin-svg">
          <defs>
            <linearGradient id="pinGradient" x1="150" y1="40" x2="150" y2="360" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#CDFA50" />
              <stop offset="40%" stopColor="#B8F000" />
              <stop offset="70%" stopColor="#8BC34A" />
              <stop offset="100%" stopColor="#689F38" />
            </linearGradient>
            <radialGradient id="pinShadow">
              <stop offset="0%" stopColor="rgba(0,0,0,0.18)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
          </defs>

          <ellipse cx="150" cy="370" rx="55" ry="12" fill="url(#pinShadow)">
            <animate attributeName="rx" values="55;50;55" dur="2.5s" repeatCount="indefinite" />
          </ellipse>

          <path d="M150 355 C150 355 42 230 42 145 C42 85.35 85.35 42 145 42 L155 42 C214.65 42 258 85.35 258 145 C258 230 150 355 150 355Z"
            fill="url(#pinGradient)" />
          <path d="M150 355 C150 355 42 230 42 145 C42 85.35 85.35 42 145 42 L155 42 C214.65 42 258 85.35 258 145 C258 230 150 355 150 355Z"
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />

          <path d="M150 345 C150 345 50 225 50 145 C50 89.77 94.77 45 150 45 C205.23 45 250 89.77 250 145 C250 225 150 345 150 345Z"
            fill="none" stroke="white" strokeWidth="3" strokeDasharray="10 10" opacity="0.45">
            <animate attributeName="stroke-dashoffset" from="0" to="40" dur="2s" repeatCount="indefinite" />
          </path>

          <circle cx="150" cy="140" r="58" fill="white" />

          <text x="150" y="125" textAnchor="middle" fontSize="13" fontWeight="700"
            fill="#1a1a1a" fontFamily="Space Grotesk, sans-serif">GIGASHIELD</text>
          <g transform="translate(130, 135) scale(0.65)">
            <defs>
              <linearGradient id="pinLogoGrad" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#CDFA50" />
                <stop offset="50%" stopColor="#B8FF00" />
                <stop offset="100%" stopColor="#7CB342" />
              </linearGradient>
            </defs>
            <path d="M32 2 L58 14 L58 36 C58 50 46 58 32 62 C18 58 6 50 6 36 L6 14 Z" fill="url(#pinLogoGrad)" />
            <path d="M32 8 L52 18 L52 35 C52 46 42 53 32 56 C22 53 12 46 12 35 L12 18 Z" fill="#1a1a1a" />
            <path d="M38 24 L38 20 L24 20 C20.7 20 18 22.7 18 26 L18 38 C18 41.3 20.7 44 24 44 L40 44 C43.3 44 46 41.3 46 38 L46 32 L34 32 L34 36 L42 36 L42 38 C42 39.1 41.1 40 40 40 L24 40 C22.9 40 22 39.1 22 38 L22 26 C22 24.9 22.9 24 24 24 L38 24Z" fill="url(#pinLogoGrad)" />
          </g>
        </svg>

        {/* PRO DELIVERY RIDER on scooter */}
        <div className="lp-rider-orbit">
          <div className="lp-rider">
            <svg width="72" height="60" viewBox="0 0 72 60" fill="none">
              {/* Scooter body */}
              <path d="M16 38 Q20 30 38 30 L52 30 Q58 30 60 34 L62 38" fill="#555" stroke="#444" strokeWidth="1" />
              <rect x="28" y="27" width="18" height="4" rx="2" fill="#333" />
              <path d="M56 34 Q62 30 64 34" stroke="#555" strokeWidth="2" fill="none" />
              <path d="M16 36 Q12 34 14 38" stroke="#555" strokeWidth="1.5" fill="none" />
              <rect x="26" y="36" width="20" height="3" rx="1.5" fill="#666" />
              <line x1="54" y1="22" x2="56" y2="30" stroke="#666" strokeWidth="2" strokeLinecap="round" />
              <line x1="52" y1="20" x2="58" y2="20" stroke="#555" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="52" cy="19" r="1.5" fill="#999" />
              <path d="M18 37 L12 39 L11 38" stroke="#888" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <circle cx="9" cy="37" r="2" fill="rgba(200,200,200,0.3)">
                <animate attributeName="r" values="1;4;1" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0;0.4" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="cx" values="9;5;9" dur="1.2s" repeatCount="indefinite" />
              </circle>

              {/* Wheels */}
              <circle cx="18" cy="44" r="8" fill="#2a2a2a" />
              <circle cx="18" cy="44" r="6.5" fill="none" stroke="#444" strokeWidth="1" />
              <circle cx="18" cy="44" r="2" fill="#777">
                <animateTransform attributeName="transform" type="rotate" from="0 18 44" to="360 18 44" dur="0.3s" repeatCount="indefinite" />
              </circle>
              <circle cx="18" cy="44" r="7" fill="none" stroke="#3a3a3a" strokeWidth="0.8" strokeDasharray="2 2">
                <animateTransform attributeName="transform" type="rotate" from="0 18 44" to="360 18 44" dur="0.3s" repeatCount="indefinite" />
              </circle>

              <circle cx="58" cy="44" r="8" fill="#2a2a2a" />
              <circle cx="58" cy="44" r="6.5" fill="none" stroke="#444" strokeWidth="1" />
              <circle cx="58" cy="44" r="2" fill="#777">
                <animateTransform attributeName="transform" type="rotate" from="0 58 44" to="360 58 44" dur="0.3s" repeatCount="indefinite" />
              </circle>
              <circle cx="58" cy="44" r="7" fill="none" stroke="#3a3a3a" strokeWidth="0.8" strokeDasharray="2 2">
                <animateTransform attributeName="transform" type="rotate" from="0 58 44" to="360 58 44" dur="0.3s" repeatCount="indefinite" />
              </circle>

              {/* Lights */}
              <ellipse cx="64" cy="33" rx="2" ry="2.5" fill="#FFF3CD" />
              <ellipse cx="64" cy="33" rx="1" ry="1.5" fill="#FBBF24">
                <animate attributeName="opacity" values="0.7;1;0.7" dur="0.8s" repeatCount="indefinite" />
              </ellipse>
              <path d="M66 32 L72 30 L72 36 L66 34 Z" fill="rgba(251,191,36,0.15)">
                <animate attributeName="opacity" values="0.1;0.25;0.1" dur="0.8s" repeatCount="indefinite" />
              </path>
              <rect x="10" y="36" width="3" height="2" rx="1" fill="#EF4444" opacity="0.8" />

              {/* Rider */}
              <path d="M34 28 L32 36" stroke="#2D5016" strokeWidth="3" strokeLinecap="round" />
              <path d="M40 28 L42 36" stroke="#2D5016" strokeWidth="3" strokeLinecap="round" />
              <rect x="30" y="12" width="14" height="16" rx="4" fill="#B8FF00" />
              <path d="M32 12 L37 14 L42 12" stroke="#8BC34A" strokeWidth="1" fill="none" />
              <path d="M30 16 Q24 20 26 28" stroke="#B8FF00" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              <path d="M44 16 Q50 18 54 22" stroke="#B8FF00" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              <circle cx="26" cy="28" r="2" fill="#333" />
              <circle cx="54" cy="22" r="2" fill="#333" />
              <circle cx="37" cy="8" r="6.5" fill="#FFD3A8" />
              <ellipse cx="37" cy="5" rx="8" ry="6" fill="#E53E3E" />
              <rect x="29" y="5" width="16" height="3" rx="1.5" fill="#C53030" />
              <path d="M30 7 Q37 10 44 7" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" fill="rgba(0,0,0,0.08)" />
              <line x1="37" y1="0" x2="37" y2="8" stroke="white" strokeWidth="1.5" opacity="0.6" />

              {/* Delivery bag */}
              <rect x="22" y="4" width="12" height="10" rx="2" fill="#FF6B35" />
              <rect x="23" y="5" width="10" height="8" rx="1.5" fill="#FF8C5A" />
              <text x="25" y="12" fontSize="5" fill="white" fontWeight="bold">GS</text>
              <line x1="26" y1="14" x2="32" y2="14" stroke="#E55B20" strokeWidth="1" />
              <line x1="26" y1="14" x2="30" y2="18" stroke="#CC5522" strokeWidth="1" />

              {/* Water splash from wheels */}
              <g opacity="0.5">
                <circle cx="10" cy="48" r="1.5" fill="rgba(100,180,255,0.5)">
                  <animate attributeName="r" values="0.5;3;0.5" dur="0.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="0.6s" repeatCount="indefinite" />
                </circle>
                <circle cx="14" cy="50" r="1" fill="rgba(100,180,255,0.4)">
                  <animate attributeName="r" values="0.5;2.5;0.5" dur="0.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0;0.4" dur="0.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="52" cy="49" r="1" fill="rgba(100,180,255,0.4)">
                  <animate attributeName="r" values="0.5;2;0.5" dur="0.7s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0;0.3" dur="0.7s" repeatCount="indefinite" />
                </circle>
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* Rain splash particles at bottom */}
      <div className="lp-rain-splashes">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="lp-splash" style={{
            left: `${(i * 10.3 + 5) % 96}%`,
            animationDelay: `${(i * 0.21) % 1.5}s`,
            animationDuration: `${0.6 + (i * 0.07) % 0.4}s`,
          }} />
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    document.title = 'GIGASHIELD | Protecting India\'s Gig Workers'

    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible')
          e.target.style.animation = `revealUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards`
          e.target.style.animationDelay = e.target.dataset.delay || '0s'
        }
      }),
      { threshold: 0.08 }
    )
    document.querySelectorAll('.section-reveal').forEach(el => observer.observe(el))

    const handleScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <div className="lp-root">

      {/* Navbar */}
      <nav className={`lp-nav ${scrolled ? 'lp-nav--scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="lp-nav-logo"><GigShieldLogo size={28} /></div>
            <span className="lp-nav-brand">GIGASHIELD</span>
          </div>
          <div className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#plans">Plans</a>
            <Link to="/login" className="lp-nav-login">Login</Link>
            <Link to="/onboard" className="lp-nav-cta">
              Get Started <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-hero-content">
          <div className="lp-hero-tag">
            <span className="lp-hero-tag-dot" />
            Crafting Protection that Inspires
          </div>

          <div className="lp-floating-badge" style={{ position: 'absolute', top: '18%', right: '12%' }}>
            <MapPin size={13} /> <span>25 DSI Zones</span> <span style={{ color: '#B8FF00', fontWeight: 700 }}>Live</span>
          </div>

          <h1 className="lp-hero-title">
            Elevate Your{' '}
            <span className="lp-hero-highlight-circle"><GigShieldLogo size={36} /></span>{' '}
            Gig Work<br />
            with Our <span className="lp-hero-highlight">Income Shield</span> Magic
          </h1>

          <p className="lp-hero-subtitle">
            AI-powered parametric micro-insurance with instant payouts, zero paperwork,
            and automatic claim settlement starting at just {'\u20B9'}15/week.
          </p>

          <div style={{ display: 'flex', gap: 14, marginTop: 40, flexWrap: 'wrap' }}>
            <Link to="/onboard" className="lp-btn-primary">
              <GigShieldLogo size={22} /> Get Protected Now <ArrowRight size={18} />
            </Link>
            <a href="#how-it-works" className="lp-btn-outline">
              See How It Works <ChevronDown size={16} />
            </a>
          </div>

          <p className="lp-hero-scroll-hint">Scroll down {'\u2193'}</p>
        </div>

        <div className="lp-hero-visual">
          <DeliveryPinAnimation />
        </div>
      </section>

      {/* Trust Bar */}
      <section className="lp-trust">
        <p className="lp-trust-label">Powered by industry leaders</p>
        <div className="marquee-wrapper">
          <div className="marquee-track">
            {[...TRUST_LOGOS, ...TRUST_LOGOS].map((logo, i) => (
              <span key={i} className="lp-trust-logo">{logo}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="lp-stats section-reveal">
        {STATS.map((s, i) => (
          <div key={s.label} className="lp-stat-item">
            <div className="lp-stat-value">{s.value}</div>
            <div className="lp-stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section id="features" className="lp-features">
        <div className="lp-section-header section-reveal">
          <span className="lp-tag">Our Expertise</span>
          <h2 className="lp-section-title">
            Why GIGASHIELD <span className="lp-highlight-text">wins</span>
          </h2>
          <p className="lp-section-sub">Transform risk into reality by combining AI, strategy, and expertise.</p>
        </div>

        <div className="lp-features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="lp-feature-card section-reveal" data-delay={`${i * 0.1}s`}>
              <div className="lp-feature-card-top">
                <h3>{f.title}</h3>
                <div className="lp-feature-arrow"><ArrowUpRight size={18} /></div>
              </div>
              <p>{f.desc}</p>
              <div className="lp-feature-icon-big">{f.icon}</div>
              <div className="lp-feature-tag-pill">{f.tag}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="lp-how">
        <div className="lp-section-header section-reveal">
          <h2 className="lp-section-title lp-section-title--light">
            Zero to protected in <span className="lp-highlight-text">90 seconds</span>
          </h2>
        </div>
        <div className="lp-how-grid">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={i} className="lp-how-card section-reveal" data-delay={`${i * 0.15}s`}>
              <div className="lp-how-emoji">{step.emoji}</div>
              <div className="lp-how-step-num">{step.step}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="lp-plans">
        <div className="lp-section-header section-reveal">
          <h2 className="lp-section-title">
            Simple, <span className="lp-highlight-text">fair pricing</span>
          </h2>
          <p className="lp-section-sub">AI-personalized. Never more than 5% of your weekly earnings.</p>
        </div>
        <div className="lp-plans-grid">
          {PLANS.map((plan, i) => (
            <div key={i} className={`lp-plan-card section-reveal ${plan.popular ? 'lp-plan-card--popular' : ''}`} data-delay={`${i * 0.1}s`}>
              {plan.popular && <div className="lp-plan-badge">{'\u2B50'} MOST POPULAR</div>}
              <div className="lp-plan-name" style={{ color: plan.color }}>{plan.name}</div>
              <div className="lp-plan-price">
                <span className="lp-plan-amount">{'\u20B9'}{plan.price}</span>
                <span className="lp-plan-period">/week</span>
              </div>
              <div className="lp-plan-coverage">{'\u20B9'}{plan.coverage.toLocaleString()} coverage</div>
              <ul className="lp-plan-features">
                {plan.features.map((f, j) => (
                  <li key={j}><CheckCircle size={14} style={{ color: plan.color, flexShrink: 0 }} /> {f}</li>
                ))}
              </ul>
              <Link to="/onboard" className={`lp-plan-cta ${plan.popular ? 'lp-plan-cta--primary' : ''}`}>
                Start Free Trial <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="lp-testimonials">
        <div className="lp-section-header section-reveal">
          <h2 className="lp-section-title lp-section-title--light">
            Workers trust <span className="lp-highlight-text">GigShield</span>
          </h2>
        </div>
        <div className="lp-testimonials-grid">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="lp-testimonial-card section-reveal" data-delay={`${i * 0.12}s`}>
              <div className="lp-testimonial-stars">{'\u2605\u2605\u2605\u2605\u2605'}</div>
              <p>"{t.quote}"</p>
              <div className="lp-testimonial-author">
                <div className="lp-testimonial-avatar">{t.avatar}</div>
                <div>
                  <div className="lp-testimonial-name">{t.name}</div>
                  <div className="lp-testimonial-meta">{t.platform} {'\u00B7'} {t.city}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="lp-footer-cta">
        <div className="section-reveal" style={{ position: 'relative', zIndex: 2 }}>

          <div className="lp-footer-cta-emoji animate-float"><GigShieldLogo size={72} /></div>
          <h2 className="lp-section-title">
            Ready to get <span className="lp-highlight-text">protected?</span>
          </h2>
          <p className="lp-section-sub" style={{ marginBottom: 36 }}>
            Join 12M+ gig workers. Register in 90 seconds. Cancel anytime.
          </p>
          <Link to="/onboard" className="lp-btn-primary lp-btn-primary--large">
            <GigShieldLogo size={24} /> Activate My Shield Now <ArrowRight size={20} />
          </Link>
          <div className="lp-footer-hindi">
            {'\u0022'}{'\u092C\u093E\u0930\u093F\u0936 \u0939\u094B \u092F\u093E \u0906\u0902\u0927\u0940, \u0906\u092A\u0915\u0940 \u0915\u092E\u093E\u0908 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0939\u0948\u0964'}{'\u0022'}
            <br /><span>Rain or storm, your earnings are protected.</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
          <div className="lp-nav-logo" style={{ width: 28, height: 28 }}><GigShieldLogo size={24} /></div>
          <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, color: '#B8FF00' }}>GIGASHIELD NEXUS</span>
        </div>
        <p>Built natively on Guidewire Cloud Platform {'\u00B7'} Guidewire DevTrails 2026</p>
        <p style={{ marginTop: 8, opacity: 0.5 }}>Built with {'\u2764\uFE0F'} by Team Recursive Minds</p>
      </footer>
    </div>
  )
}
