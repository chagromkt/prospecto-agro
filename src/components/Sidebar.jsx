import { NAV } from '../config.js'

export default function Sidebar({ page, setPage, user, onLogout }) {
  const initials = user?.email?.[0]?.toUpperCase() || 'U'
  const emailShort = user?.email?.split('@')[0] || 'Usuário'

  return (
    <div style={{ width: 220, background: '#f0f0f5', borderRight: '1px solid #e0e0ea', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid #e0e0ea' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#1e6b3a,#2d9e4f)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🌱</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', letterSpacing: '-0.01em' }}>ProspectAgro</div>
            <div style={{ fontSize: 9, color: '#7a8a9a', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 1 }}>S.A.F.R.A.™</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px' }}>
        {NAV.map(item => (
          <button key={item.id} onClick={() => setPage(item.id)} style={{
            width: '100%', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 10,
            background: page === item.id ? '#ffffff' : 'transparent',
            border: page === item.id ? '1px solid #e0e0ea' : '1px solid transparent',
            borderRadius: 8, marginBottom: 2, textAlign: 'left',
            boxShadow: page === item.id ? '0 1px 3px rgba(0,0,0,0.07)' : 'none',
            transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 14, color: page === item.id ? '#1e6b3a' : '#8a8a9a', width: 18, textAlign: 'center' }}>{item.icon}</span>
            <span style={{ fontSize: 13, color: page === item.id ? '#1a1a2e' : '#6a6a7a', fontWeight: page === item.id ? 600 : 400 }}>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: 12, borderTop: '1px solid #e0e0ea' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#1e6b3a,#2d9e4f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 700, flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 12, color: '#2a2a3e', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emailShort}</div>
            <div style={{ fontSize: 10, color: '#9a9ab0' }}>CHA Agromkt</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ width: '100%', background: 'transparent', border: '1px solid #e0e0ea', borderRadius: 6, color: '#9a9ab0', padding: '6px', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#f0a0a0'; e.currentTarget.style.color = '#cc4444' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0e0ea'; e.currentTarget.style.color = '#9a9ab0' }}>
          ↩ Sair
        </button>
      </div>
    </div>
  )
}
