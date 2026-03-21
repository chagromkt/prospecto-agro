import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import BuscaLinkedIn from './pages/BuscaLinkedIn.jsx'
import Listas from './pages/Listas.jsx'
import Leads from './pages/Leads.jsx'
import Campanhas from './pages/Campanhas.jsx'
import Agentes from './pages/Agentes.jsx'
import Conteudo from './pages/Conteudo.jsx'
import Comentarios from './pages/Comentarios.jsx'
import Mensagens from './pages/Mensagens.jsx'
import Configuracoes from './pages/Configuracoes.jsx'
import CadenciasRD from './pages/CadenciasRD.jsx'
import Login from './pages/Login.jsx'
import { SB_URL, SB_KEY, setSession } from './config.js'

const PAGES = {
  dashboard: Dashboard, busca: BuscaLinkedIn, listas: Listas, leads: Leads,
  campanhas: Campanhas, agentes: Agentes, conteudo: Conteudo, comentarios: Comentarios, mensagens: Mensagens, cadencias: CadenciasRD, configuracoes: Configuracoes
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [session, setSessionState] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('pa_session')
    if (stored) {
      try {
        const s = JSON.parse(stored)
        // Valida o token com o Supabase
        fetch(`${SB_URL}/auth/v1/user`, {
          headers: { apikey: SB_KEY, Authorization: `Bearer ${s.access_token}` }
        }).then(async r => {
          if (r.ok) {
            const user = await r.json()
            const validSession = { ...s, user }
            setSession(validSession)
            setSessionState(validSession)
            // Garante que profile existe para esse usuário
            await ensureProfile(validSession)
          } else {
            localStorage.removeItem('pa_session')
          }
          setChecking(false)
        }).catch(() => {
          localStorage.removeItem('pa_session')
          setChecking(false)
        })
      } catch {
        localStorage.removeItem('pa_session')
        setChecking(false)
      }
    } else {
      setChecking(false)
    }
  }, [])

  const ensureProfile = async (s) => {
    try {
      // Verifica se profile existe
      const r = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${s.user.id}`, {
        headers: { apikey: SB_KEY, Authorization: `Bearer ${s.access_token}` }
      })
      const profiles = await r.json()
      if (!profiles?.length) {
        // Cria profile se não existir
        await fetch(`${SB_URL}/rest/v1/profiles`, {
          method: 'POST',
          headers: {
            apikey: SB_KEY,
            Authorization: `Bearer ${s.access_token}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation'
          },
          body: JSON.stringify({
            id: s.user.id,
            full_name: s.user.user_metadata?.full_name || s.user.email?.split('@')[0],
            email: s.user.email,
            role: 'owner'
          })
        })
      }
    } catch (e) {
      console.log('Erro ao verificar profile:', e)
    }
  }

  const handleLogin = async (data) => {
    localStorage.setItem('pa_session', JSON.stringify(data))
    setSession(data)
    setSessionState(data)
    await ensureProfile(data)
  }

  const handleLogout = () => {
    localStorage.removeItem('pa_session')
    setSession(null)
    setSessionState(null)
  }

  if (checking) {
    return (
      <div style={{ height: '100vh', background: '#f5f5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🌱</div>
          <div style={{ fontSize: 13, color: '#9a9ab0' }}>Carregando ProspectAgro...</div>
        </div>
      </div>
    )
  }

  if (!session) return <Login onLogin={handleLogin} />

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
