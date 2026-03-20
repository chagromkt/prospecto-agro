import { NAV } from '../config.js'

export default function Sidebar({ page, setPage, user, onLogout }) {
  const initials = user?.email?.[0]?.toUpperCase() || 'U'
  const emailShort = user?.email?.split('@')[0] || 'Usuário'

  return (
    <div style={{ width: 220, background: '#0a110b', borderRight: '1px solid #162018', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '24px 20px', borderBottom: '1px solid #162018' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#1e5c2c,#2d8a40)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🌱</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#c8b76a' }}>ProspectAgro</div>
            <div style={{ fontSize: 9, color: '#2d5a3d', letterSpacing: '0.12em', textTransform: 'uppercase' }}>S.A.F.R.A.™</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {NAV.map(item => (
          <button key={item.id} onClick={() => setPage(item.id)} style={{
            width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
            background: page === item.id ? '#0f2a18' : 'transparent',
            border: page === item.id ? '1px solid #1e4a28' : '1px solid transparent',
            borderRadius: 8, marginBottom: 2, textAlign: 'left', transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 14, color: page === item.id ? '#4a9e5c' : '#2d5a3d', width: 18, textAlign: 'center' }}>{item.icon}</span>
            <span style={{ fontSize: 13, color: page === item.id ? '#c8b76a' : '#5a7a5a' }}>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: 12, borderTop: '1px solid #162018' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#1e5c2c,#2d8a40)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#e8e4d9', fontWeight: 700, flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 12, color: '#a89a6a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emailShort}</div>
            <div style={{ fontSize: 10, color: '#2d5a3d' }}>CHA Agromkt</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ width: '100%', background: 'transparent', border: '1px solid #162018', borderRadius: 6, color: '#3d5a3d', padding: '6px', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}
          onMouseEnter={e => { e.target.style.borderColor = '#4a1a1a'; e.target.style.color = '#f87171' }}
          onMouseLeave={e => { e.target.style.borderColor = '#162018'; e.target.style.color = '#3d5a3d' }}>
          ↩ Sair
        </button>
      </div>
    </div>
  )
}
