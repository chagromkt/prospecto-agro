import { useState, useEffect } from 'react'
import { sb, PROFILE_ID } from '../config.js'

const MOCK_AGENTS = [
  { id: 'a1', name: 'Consultor Agro', objective: 'Marcar diagnóstico gratuito com gestores do agro', conversation_style: 'consultivo', tone_of_voice: 'direto e empático', is_active: true, max_messages_per_lead: 5 },
  { id: 'a2', name: 'Especialista Insumos', objective: 'Abordar diretores de marketing de insumos', conversation_style: 'formal', tone_of_voice: 'técnico e objetivo', is_active: false, max_messages_per_lead: 3 },
]

export default function Agentes() {
  const [agents, setAgents] = useState([])
  const [sel, setSel] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: '', objective: '', conversation_style: 'consultivo', tone_of_voice: '', system_prompt: '', max_messages_per_lead: 5, response_delay_minutes: 30 })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    sb(`agents?profile_id=eq.${PROFILE_ID}&order=created_at.desc`)
      .then(d => { setAgents(d); if (d.length) setSel(d[0]) })
      .catch(() => { setAgents(MOCK_AGENTS); setSel(MOCK_AGENTS[0]) })
  }, [])

  const save = async () => {
    if (!form.name || !form.objective) return
    setSaving(true)
    try {
      const data = await sb('agents', { method: 'POST', body: JSON.stringify({ ...form, profile_id: PROFILE_ID, system_prompt: form.system_prompt || generatePrompt(form) }) })
      const na = Array.isArray(data) ? data[0] : data
      setAgents(p => [na, ...p]); setSel(na)
    } catch {
      const na = { id: `a${Date.now()}`, ...form, is_active: true }
      setAgents(p => [na, ...p]); setSel(na)
    }
    setSaving(false); setShowNew(false); setForm({ name: '', objective: '', conversation_style: 'consultivo', tone_of_voice: '', system_prompt: '', max_messages_per_lead: 5, response_delay_minutes: 30 })
  }

  const generatePrompt = (f) => `Você é um especialista em marketing para o agronegócio brasileiro, representando a CHA Agromkt. Seu objetivo: ${f.objective}. Tom: ${f.tone_of_voice || f.conversation_style}. Método: S.A.F.R.A.™. Regras: nunca seja insistente, use linguagem do campo, CTA sempre suave (conversa de 15 min).`

  const toggleActive = async (agent) => {
    try { await sb(`agents?id=eq.${agent.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !agent.is_active }) }) } catch {}
    setAgents(p => p.map(a => a.id === agent.id ? { ...a, is_active: !a.is_active } : a))
    if (sel?.id === agent.id) setSel(prev => ({ ...prev, is_active: !prev.is_active }))
  }

  const F = ({ label, children }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: '#9a9ab0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
  const inp = { background: '#f8f8fc', border: '1px solid #e0e0ea', borderRadius: 8, padding: '10px 12px', color: '#2a2a3e', fontSize: 13, width: '100%' }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div style={{ width: 260, background: '#f8f8fc', borderRight: '1px solid #e8e8f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #e8e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#1e6b3a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Agentes</span>
          <button onClick={() => setShowNew(true)} style={{ background: '#b8e8c8', border: 'none', borderRadius: 6, color: '#1e6b3a', padding: '4px 10px', fontSize: 12 }}>+ Novo</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {agents.map(a => (
            <div key={a.id} onClick={() => setSel(a)} style={{ padding: 14, borderRadius: 8, marginBottom: 4, cursor: 'pointer', background: sel?.id === a.id ? '#f0f8f3' : 'transparent', border: `1px solid ${sel?.id === a.id ? '#b8e8c8' : 'transparent'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: sel?.id === a.id ? '#1e6b3a' : '#a09070', fontWeight: 600 }}>{a.name}</span>
                <span style={{ fontSize: 9, color: a.is_active ? '#059669' : '#9a9ab0', background: a.is_active ? '#05966915' : 'transparent', padding: '2px 6px', borderRadius: 8 }}>{a.is_active ? 'Ativo' : 'Inativo'}</span>
              </div>
              <div style={{ fontSize: 11, color: '#9a9ab0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.objective}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        {!sel ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9a9ab0' }}>Selecione um agente</div> : (<>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <h2 style={{ fontSize: 20, color: '#1e6b3a', fontWeight: 700, marginBottom: 4 }}>{sel.name}</h2>
              <p style={{ fontSize: 12, color: '#6a6a7a' }}>{sel.conversation_style} · {sel.tone_of_voice}</p>
            </div>
            <button onClick={() => toggleActive(sel)} style={{ background: sel.is_active ? 'transparent' : 'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border: sel.is_active ? '1px solid #ffd0d0' : 'none', borderRadius: 8, color: sel.is_active ? '#dc2626' : '#1a1a2e', padding: '8px 18px', fontSize: 13 }}>
              {sel.is_active ? 'Desativar' : 'Ativar'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {[['Objetivo', sel.objective],['Tom de Voz', sel.tone_of_voice || '—'],['Máx. Mensagens/Lead', sel.max_messages_per_lead],['Delay entre msgs', `${sel.response_delay_minutes} min`]].map(([l,v]) => (
              <div key={l} style={{ background: '#ffffff', border: '1px solid #e8e8f0', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 11, color: '#9a9ab0', marginBottom: 6, textTransform: 'uppercase' }}>{l}</div>
                <div style={{ fontSize: 13, color: '#4a4a5a' }}>{v}</div>
              </div>
            ))}
          </div>

          {sel.system_prompt && (
            <div style={{ background: '#ffffff', border: '1px solid #e8e8f0', borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 11, color: '#9a9ab0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>System Prompt</div>
              <p style={{ fontSize: 12, color: '#4a4a5a', lineHeight: 1.7 }}>{sel.system_prompt}</p>
            </div>
          )}
        </>)}
      </div>

      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#ffffff', border: '1px solid #e0e0ea', borderRadius: 14, padding: 28, width: 560, maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 16, color: '#1e6b3a', marginBottom: 20, fontWeight: 700 }}>Novo Agente</h2>
            <F label="Nome do agente"><input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Ex: Consultor Revendas Agro" style={inp} /></F>
            <F label="Objetivo"><textarea value={form.objective} onChange={e => setForm(p => ({...p, objective: e.target.value}))} placeholder="Ex: Marcar diagnóstico gratuito com gestores..." rows={2} style={{ ...inp, resize: 'none' }} /></F>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <F label="Estilo de conversa">
                <select value={form.conversation_style} onChange={e => setForm(p => ({...p, conversation_style: e.target.value}))} style={inp}>
                  {['consultivo','formal','descontraído','técnico','empático'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </F>
              <F label="Tom de voz"><input value={form.tone_of_voice} onChange={e => setForm(p => ({...p, tone_of_voice: e.target.value}))} placeholder="Ex: direto e empático" style={inp} /></F>
            </div>
            <F label="System Prompt (opcional — gerado automaticamente se vazio)">
              <textarea value={form.system_prompt} onChange={e => setForm(p => ({...p, system_prompt: e.target.value}))} placeholder="Deixe vazio para gerar automaticamente..." rows={4} style={{ ...inp, resize: 'vertical' }} />
            </F>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, background: 'transparent', border: '1px solid #e0e0ea', borderRadius: 8, color: '#6a6a7a', padding: 10, fontSize: 13 }}>Cancelar</button>
              <button onClick={save} disabled={saving} style={{ flex: 2, background: 'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border: 'none', borderRadius: 8, color: '#1a1a2e', padding: 10, fontSize: 13 }}>
                {saving ? 'Salvando...' : 'Criar Agente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
