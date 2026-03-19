import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Listas from './pages/Listas.jsx'
import Leads from './pages/Leads.jsx'
import Campanhas from './pages/Campanhas.jsx'
import Agentes from './pages/Agentes.jsx'
import Conteudo from './pages/Conteudo.jsx'
import Comentarios from './pages/Comentarios.jsx'
import Login from './pages/Login.jsx'
import { SB_URL, SB_KEY } from './config.js'

const PAGES = {
  dashboard: Dashboard, listas: Listas, leads: Leads,
  campanhas: Campanhas, agentes: Agentes, conteudo: Conteudo, comentarios: Comentarios
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Verifica sessão salva
    const stored = localStorage.getItem('pa_session')
    if (stored) {
      try {
        const s = JSON.parse(stored)
        // Valida se o token ainda é válido
        fetch(`${SB_URL}/auth/v1/user`, {
          headers: { apikey: SB_KEY, Authorization: `Bearer ${s.access_token}` }
        }).then(r => {
          if (r.ok) setSession(s)
          else localStorage.removeItem('pa_session')
          setChecking(false)
        }).catch(() => { localStorage.removeItem('pa_session'); setChecking(false) })
      } catch { localStorage.removeItem('pa_session'); setChecking(false) }
    } else {
      setChecking(false)
    }
  }, [])

  const handleLogin = (data) => setSession(data)

  const handleLogout = () => {
    localStorage.removeItem('pa_session')
    setSession(null)
  }

  // Loading
  if (checking) {
    return (
      <div style={{ height: '100vh', background: '#080d09', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🌱</div>
          <div style={{ fontSize: 13, color: '#2d5a3d' }}>Carregando ProspectAgro...</div>
        </div>
      </div>
    )
  }

  // Login
  if (!session) return <Login onLogin={handleLogin} />

  // App
  const Page = PAGES[page] || Dashboard
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar page={page} setPage={setPage} user={session.user} onLogout={handleLogout} />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Page />
      </div>
    </div>
  )
}
