import { NavLink, useNavigate } from 'react-router-dom'
import { Home, FileText, LogOut, CloudLightning, Wallet } from 'lucide-react'
import { getStoredLanguage } from '../services/language.js'

const COPY = {
  en: {
    leavePrompt: 'Leave GigShield?',
    shield: 'Shield',
    claims: 'Claims',
    storm: 'Storm',
    payout: 'Payout',
    exit: 'Exit',
  },
  hi: {
    leavePrompt: 'GigShield छोड़ें?',
    shield: 'कवच',
    claims: 'दावे',
    storm: 'तूफान',
    payout: 'भुगतान',
    exit: 'बाहर',
  },
}

export default function BottomNav() {
  const navigate = useNavigate()
  const language = getStoredLanguage()
  const copy = COPY[language] ?? COPY.en

  const logout = () => {
    if (confirm(copy.leavePrompt)) {
      localStorage.clear()
      sessionStorage.clear()
      navigate('/')
    }
  }

  const baseStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    padding: '8px 12px',
    borderRadius: 14,
    color: '#999',
    transition: 'all 0.2s',
    flex: 1,
    textDecoration: 'none',
    fontSize: '0.65rem',
    fontWeight: 600,
    letterSpacing: '0.04em',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  }

  const activeStyle = {
    ...baseStyle,
    color: '#1a1a1a',
  }

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      width: '100%',
      height: 70,
      background: 'rgba(245, 245, 240, 0.92)',
      borderTop: '1px solid rgba(0,0,0,0.06)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0,
      padding: '0 8px',
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', width: '100%', maxWidth: 600 }}>
        <NavLink to="/home" style={({ isActive }) => isActive ? activeStyle : baseStyle}>
          <Home size={22} />
          <span>{copy.shield}</span>
        </NavLink>

        <NavLink to="/claims" style={({ isActive }) => isActive ? activeStyle : baseStyle}>
          <FileText size={22} />
          <span>{copy.claims}</span>
        </NavLink>

        <NavLink to="/storm" style={({ isActive }) => isActive ? activeStyle : baseStyle}>
          <CloudLightning size={22} />
          <span>{copy.storm}</span>
        </NavLink>

        <NavLink to="/payout" style={({ isActive }) => isActive ? activeStyle : baseStyle}>
          <Wallet size={22} />
          <span>{copy.payout}</span>
        </NavLink>

        <button style={baseStyle} onClick={logout}>
          <LogOut size={22} />
          <span>{copy.exit}</span>
        </button>
      </div>
    </nav>
  )
}
