import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Shield, Clock, CheckCircle, Loader, MapPin } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import useWebSocket from '../hooks/useWebSocket.js'
import { getLocale, getStoredLanguage } from '../services/language.js'

// Fix default Leaflet marker icons (webpack/vite asset issue)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const STEPS = {
  en: [
    { id: 1, label: 'Trigger detected',   sublabel: 'DSI threshold crossed' },
    { id: 2, label: 'Claim auto-created', sublabel: 'Policy matched to zone' },
    { id: 3, label: 'PADS validation',    sublabel: 'Physics-based fraud check' },
    { id: 4, label: 'Payout initiated',   sublabel: 'Razorpay → UPI transfer' },
  ],
  hi: [
    { id: 1, label: 'ट्रिगर मिला',            sublabel: 'DSI सीमा पार हुई' },
    { id: 2, label: 'दावा स्वतः बना',         sublabel: 'पॉलिसी ज़ोन से मैच हुई' },
    { id: 3, label: 'PADS सत्यापन',           sublabel: 'फिजिक्स-आधारित धोखाधड़ी जाँच' },
    { id: 4, label: 'भुगतान शुरू',            sublabel: 'Razorpay → UPI ट्रांसफर' },
  ],
}

const COPY = {
  en: {
    stormModeActive: 'STORM MODE ACTIVE',
    home: 'Home',
    admin: 'Admin',
    detected: 'Detected',
    incoming: 'incoming to your UPI',
    affectedZone: 'Affected Zone',
    eta: 'estimated ETA',
    popupRisk: 'Risk',
    payoutInitiated: 'Payout Initiated!',
    payoutOnWay: 'Money on its way to your UPI account',
    padsActive: 'PADS physics-based fraud check active',
  },
  hi: {
    stormModeActive: 'तूफान मोड सक्रिय',
    home: 'होम',
    admin: 'एडमिन',
    detected: 'पता चला',
    incoming: 'आपके UPI पर आ रहा है',
    affectedZone: 'प्रभावित ज़ोन',
    eta: 'अनुमानित समय',
    popupRisk: 'जोखिम',
    payoutInitiated: 'भुगतान शुरू हो गया!',
    payoutOnWay: 'राशि आपके UPI खाते में भेजी जा रही है',
    padsActive: 'PADS फिजिक्स-आधारित धोखाधड़ी जाँच सक्रिय',
  },
}

// Real zone coordinates for Indian cities
const ZONE_COORDS = {
  // Mumbai zones
  'mumbai_andheri':     { lat: 19.1136, lng: 72.8697, label: 'Andheri, Mumbai' },
  'mumbai_bandra':      { lat: 19.0596, lng: 72.8295, label: 'Bandra, Mumbai' },
  'mumbai_kurla':       { lat: 19.0659, lng: 72.8854, label: 'Kurla, Mumbai' },
  'mumbai_thane':       { lat: 19.2183, lng: 72.9781, label: 'Thane, Mumbai' },
  'mumbai_borivali':    { lat: 19.2317, lng: 72.8565, label: 'Borivali, Mumbai' },
  // Default Mumbai if zone unknown
  'mumbai':             { lat: 19.0760, lng: 72.8777, label: 'Mumbai' },
  // Bangalore zones
  'bangalore_koramangala': { lat: 12.9352, lng: 77.6245, label: 'Koramangala, Bangalore' },
  'bangalore_indiranagar':  { lat: 12.9716, lng: 77.6408, label: 'Indiranagar, Bangalore' },
  'bangalore':              { lat: 12.9716, lng: 77.5946, label: 'Bangalore' },
  // Delhi
  'delhi_connaught':    { lat: 28.6315, lng: 77.2167, label: 'Connaught Place, Delhi' },
  'delhi':              { lat: 28.7041, lng: 77.1025, label: 'Delhi' },
  // Chennai
  'chennai_t_nagar':    { lat: 13.0418, lng: 80.2341, label: 'T. Nagar, Chennai' },
  'chennai':            { lat: 13.0827, lng: 80.2707, label: 'Chennai' },
  // Hyderabad
  'hyderabad_hitech':   { lat: 17.4435, lng: 78.3772, label: 'Hi-Tech City, Hyderabad' },
  'hyderabad':          { lat: 17.3850, lng: 78.4867, label: 'Hyderabad' },
}

function resolveZoneCoords(zoneId, zoneName) {
  if (!zoneId && !zoneName) return ZONE_COORDS['mumbai']
  // Try exact zone_id match first
  const key = (zoneId ?? '').toLowerCase().replace(/\s+/g, '_')
  if (ZONE_COORDS[key]) return ZONE_COORDS[key]
  // Try zone_name partial match
  const nameKey = Object.keys(ZONE_COORDS).find(k =>
    (zoneName ?? '').toLowerCase().includes(k.split('_')[0])
  )
  return ZONE_COORDS[nameKey] ?? ZONE_COORDS['mumbai']
}

const TRIGGER_META = {
  HEAVY_RAIN:    { emoji: '🌧️', label: 'Heavy Rain',  label_hi: 'भारी बारिश', color: '#60A5FA', ringColor: 'rgba(96,165,250,0.25)' },
  FLOOD:         { emoji: '🌊', label: 'Flood Alert', label_hi: 'बाढ़ अलर्ट', color: '#3B82F6', ringColor: 'rgba(59,130,246,0.25)'  },
  HEATWAVE:      { emoji: '🔥', label: 'Heatwave',    label_hi: 'लू', color: '#EF4444', ringColor: 'rgba(239,68,68,0.25)'  },
  POLLUTION:     { emoji: '🌫️', label: 'High AQI',   label_hi: 'उच्च AQI', color: '#6B7280', ringColor: 'rgba(107,114,128,0.25)'},
  CURFEW:        { emoji: '🚧', label: 'Civic Event', label_hi: 'नागरिक घटना', color: '#FBBF24', ringColor: 'rgba(251,191,36,0.25)' },
  COMPOSITE_DSI: { emoji: '⚡', label: 'DSI Alert',   label_hi: 'DSI अलर्ट', color: '#F97316', ringColor: 'rgba(249,115,22,0.25)' },
}

export default function StormMode() {
  const location = useLocation()
  const language = getStoredLanguage()
  const locale = getLocale(language)
  const copy = COPY[language] ?? COPY.en
  const steps = STEPS[language] ?? STEPS.en
  const { connected } = useWebSocket()

  // Pull live data from navigation state OR sessionStorage
  const rawData   = location.state ?? JSON.parse(sessionStorage.getItem('gs_storm') ?? '{}')
  const stormData = {
    trigger_type: rawData.trigger_type ?? 'HEAVY_RAIN',
    dsi_score:    rawData.dsi_score    ?? 78,
    claim_amount: rawData.claim_amount ?? 420,
    claim_id:     rawData.claim_id,
    eta_seconds:  rawData.eta_seconds  ?? 180,
    zone_id:      rawData.zone_id      ?? localStorage.getItem('gs_zone_id')   ?? '',
    zone_name:    rawData.zone_name    ?? localStorage.getItem('gs_zone_name') ?? '',
  }

  const coords = resolveZoneCoords(stormData.zone_id, stormData.zone_name)
  const meta   = TRIGGER_META[stormData.trigger_type] ?? TRIGGER_META['COMPOSITE_DSI']
  const triggerLabel = language === 'hi' ? (meta.label_hi ?? meta.label) : meta.label
  const dsiPct = Math.min(100, stormData.dsi_score)

  const [currentStep, setCurrentStep] = useState(1)
  const [eta, setEta]                 = useState(stormData.eta_seconds)
  const [done, setDone]               = useState(false)
  const timerRef  = useRef(null)

  // Countdown ETA
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setEta(t => { if (t <= 1) { clearInterval(timerRef.current); return 0 } return t - 1 })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  // Step progression
  useEffect(() => {
    const delays = [0, 3000, 8000, 14000]
    delays.forEach((delay, idx) => setTimeout(() => setCurrentStep(idx + 1), delay))
    setTimeout(() => setDone(true), 28000)
  }, [])

  const fmtEta = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, var(--storm-1) 0%, var(--storm-2) 40%, var(--storm-3) 100%)`,
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
    }}>
      <div className="noise-overlay" />

      {/* Animated background rings */}
      {[1,2,3].map(i => (
        <div key={i} style={{
          position: 'absolute', top: '30%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: `${i * 180}px`, height: `${i * 180}px`,
          borderRadius: '50%',
          border: '1px solid rgba(239,68,68,0.12)',
          animation: `pulseDanger ${1.5 + i * 0.4}s infinite`,
          animationDelay: `${i * 0.3}s`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Rain drops */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${Math.random() * 100}%`,
          top: `-${Math.random() * 10}%`,
          width: 2,
          height: `${10 + Math.random() * 18}px`,
          background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.15))',
          borderRadius: '0 0 2px 2px',
          animation: `rainFall ${0.7 + Math.random() * 0.6}s linear infinite`,
          animationDelay: `${Math.random() * 2}s`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Header */}
      <div style={{ padding: '52px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FBBF24', animation: 'pulseDanger 1.5s infinite' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            {copy.stormModeActive}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/home" style={{ padding: '7px 14px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: 600, backdropFilter: 'blur(5px)' }}>
            {copy.home}
          </Link>
          <Link to="/admin/login" style={{ padding: '7px 14px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: 600, backdropFilter: 'blur(5px)' }}>
            {copy.admin}
          </Link>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>DSI: {dsiPct}/100</div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 24px 32px', position: 'relative', zIndex: 2, gap: 20 }}>

        {/* Icon + claim amount */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '5rem', marginBottom: 12, animation: 'heroFloat 2s ease-in-out infinite', display: 'inline-block' }}>
            {meta.emoji}
          </div>
          <div style={{ fontFamily: 'Space Grotesk', fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
            {triggerLabel} {copy.detected}
          </div>
          <div style={{ fontFamily: 'Space Grotesk', fontSize: '3.4rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
            ₹{Number(stormData.claim_amount).toLocaleString(locale)}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginTop: 6 }}>
            {copy.incoming}
          </div>
        </div>

        {/* Zone map pinpoint */}
        <div style={{ width: '100%', borderRadius: 22, overflow: 'hidden', border: `2px solid ${meta.color}40`, boxShadow: `0 0 40px ${meta.color}20` }}>
          <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={14} style={{ color: meta.color }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
              {copy.affectedZone}: {coords.label}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>
              {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </span>
          </div>
          <MapContainer
            center={[coords.lat, coords.lng]}
            zoom={13}
            style={{ height: 200, width: '100%' }}
            zoomControl={false}
            attributionControl={false}
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {/* Pulse circle showing affected radius */}
            <Circle
              center={[coords.lat, coords.lng]}
              radius={1800}
              pathOptions={{ color: meta.color, fillColor: meta.color, fillOpacity: 0.15, weight: 2 }}
            />
            <Marker position={[coords.lat, coords.lng]}>
              <Popup>
                <strong>{coords.label}</strong><br />
                DSI: {dsiPct}/100 — {triggerLabel}
              </Popup>
            </Marker>
          </MapContainer>
        </div>

        {/* ETA timer */}
        {!done && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)',
            padding: '14px 24px', borderRadius: 99,
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <Clock size={16} style={{ color: '#FBBF24' }} />
            <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.2rem', color: '#FBBF24' }}>
              {fmtEta(eta)}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>{copy.eta}</span>
          </div>
        )}

        {/* 4-step progress */}
        <div style={{ width: '100%', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(14px)', borderRadius: 24, padding: '22px', border: '1px solid rgba(255,255,255,0.08)' }}>
          {steps.map((s, i) => {
            const isComplete = currentStep > s.id
            const isActive   = currentStep === s.id
            return (
              <div key={s.id} style={{ display: 'flex', gap: 14, marginBottom: i < steps.length - 1 ? 18 : 0, alignItems: 'flex-start' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isComplete ? 'var(--success)' : isActive ? '#FCD34D' : 'rgba(255,255,255,0.08)',
                  border: `2px solid ${isComplete ? 'var(--success)' : isActive ? '#FCD34D' : 'rgba(255,255,255,0.15)'}`,
                  transition: 'all 0.4s',
                  boxShadow: isComplete ? '0 0 12px rgba(74,222,128,0.3)' : isActive ? '0 0 12px rgba(252,211,77,0.3)' : 'none',
                }}>
                  {isComplete
                    ? <CheckCircle size={16} style={{ color: '#fff' }} />
                    : isActive
                    ? <Loader size={15} style={{ color: '#000', animation: 'spin 1s linear infinite' }} />
                    : <span style={{ fontWeight: 800, fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{s.id}</span>
                  }
                </div>
                <div style={{ paddingTop: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isComplete ? '#fff' : isActive ? '#FCD34D' : 'rgba(255,255,255,0.35)' }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                    {s.sublabel}
                  </div>
                </div>
                {isActive && (
                  <div style={{ marginLeft: 'auto', paddingTop: 6 }}>
                    <Loader size={14} style={{ color: '#FCD34D', animation: 'spin 1s linear infinite' }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Done message */}
        {done && (
          <div style={{ textAlign: 'center', animation: 'fadeInUp 0.5s ease' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✅</div>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, color: '#fff', fontSize: '1.15rem' }}>
              {copy.payoutInitiated}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginTop: 4 }}>
              {copy.payoutOnWay}
            </div>
          </div>
        )}

        {/* PADS badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', padding: '9px 18px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.06)' }}>
          <Shield size={13} style={{ color: 'var(--success)' }} />
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>{copy.padsActive}</span>
        </div>
      </div>
    </div>
  )
}
