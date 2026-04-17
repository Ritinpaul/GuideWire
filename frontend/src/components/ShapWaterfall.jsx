/**
 * SHAP Waterfall — visual breakdown of premium factors.
 * Shows how each feature pushes the premium up (red) or down (green).
 */
export default function ShapWaterfall({ explanation, premium }) {
  if (!explanation || !explanation.top_factors) return null
  const factors = explanation.top_factors.slice(0, 6)
  const maxImpact = Math.max(...factors.map(f => Math.abs(f.impact_inr)), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {factors.map((f, i) => {
        const pct  = (Math.abs(f.impact_inr) / maxImpact) * 100
        const isUp = f.direction === 'increases_premium'
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {f.label}
              </span>
              <span style={{
                fontSize: '0.78rem', fontWeight: 700,
                color: isUp ? 'var(--danger)' : 'var(--success)',
              }}>
                {isUp ? '+' : '-'}₹{Math.abs(f.impact_inr).toFixed(0)}
              </span>
            </div>
            <div style={{
              height: 6, borderRadius: 99,
              background: 'var(--bg-700)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: isUp
                  ? 'linear-gradient(90deg, #B91C1C, #EF4444)'
                  : 'linear-gradient(90deg, #059669, #10B981)',
                borderRadius: 99,
                transition: 'width 0.8s ease',
                animationDelay: `${i * 0.1}s`,
              }} />
            </div>
          </div>
        )
      })}

      <div style={{
        marginTop: 12, paddingTop: 12,
        borderTop: '1px solid rgba(184,255,0,0.08)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Your fair premium</span>
        <span style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'Space Grotesk', color: 'var(--lime)' }}>
          ₹{premium}/week
        </span>
      </div>
    </div>
  )
}
