/**
 * Admin Dashboard — KPI Cards
 * Polls /api/v1/admin/stats every 30 seconds.
 */
export default function KPICards({ stats, loading }) {
  const cards = [
    {
      label:   'Active Policies',
      value:   stats?.active_policies ?? 0,
      delta:   stats?.policies_delta  ?? '—',
      icon:    '🛡️',
      color:   'var(--lime)',
      bg:      'rgba(184,255,0,0.08)',
      border:  'rgba(184,255,0,0.2)',
    },
    {
      label:   'Claims Today',
      value:   stats?.claims_today ?? 0,
      delta:   `+${stats?.claims_delta ?? 0}`,
      icon:    '📋',
      color:   'var(--info)',
      bg:      'rgba(59,130,246,0.08)',
      border:  'rgba(59,130,246,0.2)',
    },
    {
      label:   'Loss Ratio',
      value:   stats?.loss_ratio != null ? `${stats.loss_ratio}%` : '—',
      delta:   stats?.loss_ratio != null ? 'Live' : '—',
      icon:    '📊',
      color:   'var(--success)',
      bg:      'rgba(74,222,128,0.08)',
      border:  'rgba(74,222,128,0.2)',
    },
    {
      label:   'Fraud Rate',
      value:   stats?.fraud_rate != null ? `${stats.fraud_rate}%` : '—',
      delta:   stats?.fraud_rate != null ? 'Live' : '—',
      icon:    '🔬',
      color:   'var(--success)',
      bg:      'rgba(74,222,128,0.08)',
      border:  'rgba(74,222,128,0.2)',
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
      {cards.map((c, i) => (
        <div key={i} style={{
          background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 24, padding: '20px 22px',
          transition: 'all 0.2s',
          cursor: 'default',
          opacity: loading ? 0.6 : 1,
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${c.border}` }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{c.label}</span>
            <span style={{ fontSize: '1.3rem' }}>{c.icon}</span>
          </div>
          <div style={{ fontFamily: 'Space Grotesk', fontSize: '2rem', fontWeight: 700, color: c.color, lineHeight: 1, marginBottom: 6, letterSpacing: '-0.5px' }}>
            {loading ? <Skeleton w={80} h={32} /> : c.value.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: c.color, fontWeight: 600, opacity: 0.8 }}>{c.delta}</div>
        </div>
      ))}
    </div>
  )
}

function Skeleton({ w, h }) {
  return <div style={{ width: w, height: h, borderRadius: 6, background: 'var(--bg-700)', animation: 'shimmer 1.8s infinite', backgroundSize: '1000px 100%' }} />
}
