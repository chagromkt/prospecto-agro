import { useState } from 'react'
import { SB_URL, SB_KEY } from '../config.js'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // login | signup | forgot
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const authFetch = async (endpoint, body) => {
    const res = await fetch(`${SB_URL}/auth/v1/${endpoint}`, {
      method: 'POST',
      headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error_description || data.msg || 'Erro desconhecido')
    return data
  }

  const handle = async () => {
    if (!email.trim() || (!password.trim() && mode !== 'forgot')) return
    setLoading(true); setError(''); setSuccess('')
    try {
      if (mode === 'login') {
        const data = await authFetch('token?grant_type=password', { email, password })
        localStorage.setItem('pa_session', JSON.stringify({ access_token: data.access_token, user: data.user }))
        onLogin(data)
      } else if (mode === 'signup') {
        await authFetch('signup', { email, password })
        setSuccess('Conta criada! Verifique seu email para confirmar.')
        setMode('login')
      } else if (mode === 'forgot') {
        await authFetch('recover', { email })
        setSuccess('Email de recuperação enviado!')
      }
    } catch (e) {
      setError(e.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : e.message)
    }
    setLoading(false)
  }

  const inp = {
    width: '100%', background: '#0a110b', border: '1px solid #1e3322',
    borderRadius: 8, padding: '12px 14px', color: '#c8d4c0', fontSize: 14,
    marginBottom: 12, display: 'block'
  }

  return (
    <div style={{ height: '100vh', background: '#080d09', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif' }}>
      {/* Background grain */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'radial-gradient(ellipse at 20% 50%, #0d2a1440 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #1a3a1a20 0%, transparent 50%)', pointerEvents: 'none' }} />

      <div style={{ width: 400, animation: 'fadeIn 0.4s ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg,#1e5c2c,#2d8a40)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px' }}>🌱</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#c8b76a', marginBottom: 4 }}>ProspectAgro</div>
          <div style={{ fontSize: 11, color: '#2d5a3d', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Método S.A.F.R.A.™</div>
        </div>

        {/* Card */}
        <div style={{ background: '#0d1a0f', border: '1px solid #1e3322', borderRadius: 16, padding: 32 }}>
          <h2 style={{ fontSize: 16, color: '#c8b76a', fontWeight: 700, marginBottom: 6 }}>
            {mode === 'login' ? 'Entrar na plataforma' : mode === 'signup' ? 'Criar conta' : 'Recuperar senha'}
          </h2>
          <p style={{ fontSize: 12, color: '#3d5a3d', marginBottom: 24 }}>
            {mode === 'login' ? 'Sua central de prospecção no agronegócio' : mode === 'signup' ? 'Comece sua safra de clientes hoje' : 'Enviaremos um link para seu email'}
          </p>

          <div>
            <div style={{ fontSize: 11, color: '#3d5a3d', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email</div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com.br" onKeyDown={e => e.key === 'Enter' && handle()} style={inp} />
          </div>

          {mode !== 'forgot' && (
            <div>
              <div style={{ fontSize: 11, color: '#3d5a3d', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Senha</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handle()} style={inp} />
            </div>
          )}

          {error && (
            <div style={{ background: '#1a0f0f', border: '1px solid #4a1a1a', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#f87171' }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ background: '#0f1a0f', border: '1px solid #1e4a28', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#4ade80' }}>
              {success}
            </div>
          )}

          <button onClick={handle} disabled={loading} style={{ width: '100%', background: loading ? '#0f2a18' : 'linear-gradient(135deg,#1e5c2c,#2d8a40)', border: 'none', borderRadius: 10, color: '#e8e4d9', padding: '13px', fontSize: 14, fontWeight: 700, marginBottom: 16, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading ? (
              <><div style={{ width: 16, height: 16, border: '2px solid #4a9e5c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Aguarde...</>
            ) : mode === 'login' ? '🌱 Entrar' : mode === 'signup' ? 'Criar minha conta' : 'Enviar link'}
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            {mode === 'login' && (
              <>
                <button onClick={() => { setMode('forgot'); setError('') }} style={{ background: 'none', border: 'none', color: '#3d6b4a', fontSize: 12, cursor: 'pointer' }}>Esqueci minha senha</button>
                <button onClick={() => { setMode('signup'); setError('') }} style={{ background: 'none', border: 'none', color: '#5a7a5a', fontSize: 12, cursor: 'pointer' }}>Não tenho conta — criar uma</button>
              </>
            )}
            {(mode === 'signup' || mode === 'forgot') && (
              <button onClick={() => { setMode('login'); setError('') }} style={{ background: 'none', border: 'none', color: '#3d6b4a', fontSize: 12, cursor: 'pointer' }}>← Voltar para o login</button>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#1e3322', marginTop: 24 }}>
          CHA Agromkt · Método S.A.F.R.A.™ · Todos os direitos reservados
        </p>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #2d4a2d; }
        input:focus { border-color: #2d6a3f !important; }
      `}</style>
    </div>
  )
}
