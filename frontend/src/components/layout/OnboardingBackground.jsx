export default function OnboardingBackground() {
  const rainDrops = Array.from({ length: 40 }, (_, i) => ({
    id: i, left: `${(i * 7.3 + 3) % 100}%`, height: `${14 + (i * 3.7) % 18}px`,
    duration: `${0.4 + (i * 0.031) % 0.5}s`, delay: `${(i * 0.137) % 2}s`, opacity: 0.25 + ((i * 0.019) % 0.35)
  }))

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none', background: 'linear-gradient(170deg, #d3e4f0 0%, #b4ccdd 30%, #90aebf 100%)' }}>
      
      {/* CONSTANT RAIN */}
      <div className="lp-rain-layer">
        {rainDrops.map(d => (
          <div key={d.id} className="lp-raindrop" style={{
            left: d.left, height: d.height, animationDuration: d.duration,
            animationDelay: d.delay, opacity: d.opacity, backgroundColor: 'rgba(90,140,200,0.55)'
          }} />
        ))}
      </div>

      {/* CLOUDS */}
      <div className="lp-cloud lp-cloud-3" style={{ top: '5%', left: '30%', transform: 'scale(1.5)', opacity: 0.8 }}>
        <svg width="260" height="80" viewBox="0 0 260 80" fill="none">
          <ellipse cx="80" cy="50" rx="60" ry="28" fill="white" fillOpacity="0.5" />
          <ellipse cx="130" cy="38" rx="80" ry="35" fill="white" fillOpacity="0.6" />
          <ellipse cx="190" cy="48" rx="55" ry="26" fill="white" fillOpacity="0.45" />
          <ellipse cx="130" cy="45" rx="70" ry="28" fill="rgba(180,200,220,0.4)" />
        </svg>
      </div>
      <div className="lp-cloud lp-cloud-1" style={{ top: '15%', left: '60%', transform: 'scale(2)' }}>
        <svg width="140" height="55" viewBox="0 0 140 55" fill="none">
          <ellipse cx="45" cy="32" rx="35" ry="18" fill="white" />
          <ellipse cx="75" cy="25" rx="40" ry="22" fill="white" />
          <ellipse cx="105" cy="32" rx="28" ry="16" fill="white" />
        </svg>
      </div>
      <div className="lp-cloud lp-cloud-2" style={{ top: '25%', left: '10%', transform: 'scale(1.8)' }}>
        <svg width="120" height="48" viewBox="0 0 120 48" fill="none">
          <ellipse cx="38" cy="28" rx="30" ry="16" fill="white" fillOpacity="0.8" />
          <ellipse cx="68" cy="22" rx="36" ry="20" fill="white" fillOpacity="0.9" />
          <ellipse cx="96" cy="28" rx="22" ry="13" fill="white" fillOpacity="0.75" />
        </svg>
      </div>

      {/* Rain splash particles at bottom */}
      <div className="lp-rain-splashes">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="lp-splash" style={{
            left: `${(i * 10.3 + 5) % 96}%`, animationDelay: `${(i * 0.21) % 1.5}s`,
            animationDuration: `${0.6 + (i * 0.07) % 0.4}s`,
          }} />
        ))}
      </div>

      {/* DELIVERY RIDER */}
      <div style={{ position: 'absolute', bottom: '5%', left: 0, animation: 'driveAcross 8s linear infinite', zIndex: 10 }}>
        <div style={{ animation: 'riderBounce 0.5s ease-in-out infinite', transformOrigin: 'bottom center' }}>
          <svg width="120" height="100" viewBox="0 0 72 60" fill="none">
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
  )
}
