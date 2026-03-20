import { useState } from 'react'
import { SB_URL, SB_KEY } from '../config.js'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
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
      } else {
        await authFetch('recover', { email })
        setSuccess('Email de recuperação enviado!')
      }
    } catch (e) {
      setError(e.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : e.message)
    }
    setLoading(false)
  }

  const inp = { width: '100%', background: '#f8f8fc', border: '1px solid #e0e0ea', borderRadius: 8, padding: '12px 14px', color: '#1a1a2e', fontSize: 14, marginBottom: 12, display: 'block' }

  return (
    <div style={{ height: '100vh', background: '#f5f5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif' }}>
      <div style={{ width: 400, animation: 'fadeIn 0.4s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg,#1e6b3a,#2d9e4f)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 14px' }}>🌱</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>ProspectAgro</div>
          <div style={{ fontSize: 11, color: '#9a9ab0', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Método S.A.F.R.A.™</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e0e0ea', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: 16, color: '#1a1a2e', fontWeight: 700, marginBottom: 6 }}>
            {mode === 'login' ? 'Entrar na plataforma' : mode === 'signup' ? 'Criar conta' : 'Recuperar senha'}
          </h2>
          <p style={{ fontSize: 12, color: '#9a9ab0', marginBottom: 24 }}>
            {mode === 'login' ? 'Sua central de prospecção no agronegócio' : mode === 'signup' ? 'Comece sua safra de clientes hoje' : 'Enviaremos um link para seu email'}
          </p>

          <div style={{ fontSize: 11, color: '#6a6a7a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com.br" onKeyDown={e => e.key === 'Enter' && handle()} style={inp} />

          {mode !== 'forgot' && (
            <>
              <div style={{ fontSize: 11, color: '#6a6a7a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Senha</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handle()} style={inp} />
            </>
          )}

          {error && <div style={{ background: '#fff5f5', border: '1px solid #ffd0d0', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#cc3333' }}>{error}</div>}
          {success && <div style={{ background: '#f0fff4', border: '1px solid #b0e8c0', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#1e7a3a' }}>{success}</div>}

          <button onClick={handle} disabled={loading} style={{ width: '100%', background: loading ? '#e0e0ea' : 'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border: 'none', borderRadius: 10, color: loading ? '#9a9ab0' : '#ffffff', padding: '13px', fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading ? <><div style={{ width: 16, height: 16, border: '2px solid #9a9ab0', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Aguarde...</> : mode === 'login' ? '🌱 Entrar' : mode === 'signup' ? 'Criar minha conta' : 'Enviar link'}
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            {mode === 'login' && <>
              <button onClick={() => { setMode('forgot'); setError('') }} style={{ background: 'none', border: 'none', color: '#7a9a8a', fontSize: 12, cursor: 'pointer' }}>Esqueci minha senha</button>
              <button onClick={() => { setMode('signup'); setError('') }} style={{ background: 'none', border: 'none', color: '#9a9ab0', fontSize: 12, cursor: 'pointer' }}>Não tenho conta — criar uma</button>
            </>}
            {(mode === 'signup' || mode === 'forgot') && <button onClick={() => { setMode('login'); setError('') }} style={{ background: 'none', border: 'none', color: '#7a9a8a', fontSize: 12, cursor: 'pointer' }}>← Voltar para o login</button>}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#c0c0d0', marginTop: 24 }}>CHA Agromkt · Método S.A.F.R.A.™</p>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}} input:focus{border-color:#2d9e4f!important;}`}</style>
    </div>
  )
}
