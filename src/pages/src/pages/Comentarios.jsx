import { useState, useEffect } from 'react'
import { sb, PROFILE_ID } from '../config.js'

export default function Comentarios() {
  const [camps, setCamps] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: '', objective: '', tone_of_voice: 'construtivo e relevante', system_prompt: '', max_comments_per_day: 15, max_comments_per_person: 2, is_active: false })
  const [logs, setLogs] = useState([])

  useEffect(() => {
    sb(`comment_campaigns?profile_id=eq.${PROFILE_ID}&order=created_at.desc`)
      .then(setCamps)
      .catch(() => setCamps([
        { id: 'cc1', name: 'Comentários Revendas', objective: 'Gerar visibilidade entre gestores de revendas', tone_of_voice: 'consultivo', max_comments_per_day: 15, max_comments_per_person: 2, is_active: true, total_comments: 47 },
        { id: 'cc2', name: 'Comentários Cooperativas', objective: 'Engajar donos de cooperativas', tone_of_voice: 'empático', max_comments_per_day: 10, max_comments_per_person: 1, is_active: false, total_comments: 12 },
      ]))
    sb(`comment_log?select=*,leads(full_name,current_company)&order=sent_at.desc&limit=20`)
      .then(setLogs)
      .catch(() => setLogs([
        { id: 'log1', comment_text: 'Excelente ponto! A digitalização do canal de vendas no agro ainda é um gargalo para muitas revendas. Como vocês têm abordado essa transição?', sent_at: new Date().toISOString(), status: 'sent', leads: { full_name: 'Carlos Mendonça', current_company: 'AgroNutri Insumos' } },
        { id: 'log2', comment_text: 'Dado muito relevante! No Método S.A.F.R.A.™ vemos exatamente esse padrão — produtores buscam parceiros, não fornecedores.', sent_at: new Date(Date.now() - 3600000).toISOString(), status: 'sent', leads: { full_name: 'Ana Ferreira', current_company: 'Cooperativa Verde Campo' } },
      ]))
  }, [])

  const save = async () => {
    try {
      const data = await sb('comment_campaigns', { method: 'POST', body: JSON.stringify({ ...form, profile_id: PROFILE_ID, total_comments: 0 }) })
      setCamps(p => [Array.isArray(data) ? data[0] : data, ...p])
    } catch {
      setCamps(p => [{ id: `cc${Date.now()}`, ...form, total_comments: 0 }, ...p])
    }
    setShowNew(false); setForm({ name: '', objective: '', tone_of_voice: 'construtivo e relevante', system_prompt: '', max_comments_per_day: 15, max_comments_per_person: 2, is_active: false })
  }

  const toggle = async (camp) => {
    try { await sb(`comment_campaigns?id=eq.${camp.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !camp.is_active }) }) } catch {}
    setCamps(p => p.map(c => c.id === camp.id ? { ...c, is_active: !c.is_active } : c))
  }

  const inp = { background: '#f8f8fc', border: '1px solid #e0e0ea', borderRadius: 8, padding: '10px 12px', color: '#2a2a3e', fontSize: 13, width: '100%' }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 32px', borderBottom: '1px solid #e8e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 20, color: '#1e6b3a', fontWeight: 700 }}>Agente de Comentários</h1>
            <p style={{ fontSize: 12, color: '#9a9ab0', marginTop: 4 }}>Comenta automaticamente nos posts dos seus leads</p>
          </div>
          <button onClick={() => setShowNew(true)} style={{ background: 'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border: 'none', borderRadius: 8, color: '#1a1a2e', padding: '10px 20px', fontSize: 13 }}>+ Nova Campanha</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#9a9ab0', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Campanhas Ativas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {camps.map(c => (
                <div key={c.id} style={{ background: '#ffffff', border: '1px solid #e8e8f0', borderRadius: 12, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, color: '#1e6b3a', fontWeight: 700, marginBottom: 4 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: '#6a6a7a' }}>{c.objective}</div>
                    </div>
                    <button onClick={() => toggle(c)} style={{ background: c.is_active ? '#f0f8f3' : '#fff5f5', border: c.is_active ? '1px solid #1e6b3a' : '1px solid #ffd0d0', borderRadius: 20, padding: '6px 14px', fontSize: 12, color: c.is_active ? '#059669' : '#dc2626' }}>
                      {c.is_active ? '● Ativo' : '○ Inativo'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 20 }}>
                    {[['Tom', c.tone_of_voice],['Por dia', c.max_comments_per_day],['Por pessoa', c.max_comments_per_person],['Total', c.total_comments || 0]].map(([l,v]) => (
                      <div key={l}>
                        <div style={{ fontSize: 10, color: '#c0c0d0', textTransform: 'uppercase' }}>{l}</div>
                        <div style={{ fontSize: 13, color: '#4a4a5a', marginTop: 2 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ width: 340 }}>
            <div style={{ fontSize: 11, color: '#9a9ab0', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Últimos Comentários</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {logs.map(log => (
                <div key={log.id} style={{ background: '#ffffff', border: '1px solid #e8e8f0', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#1e6b3a' }}>{log.leads?.full_name}</span>
                    <span style={{ fontSize: 10, color: '#9a9ab0' }}>{new Date(log.sent_at).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#4a4a5a', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{log.comment_text}</p>
                  <div style={{ fontSize: 10, color: '#c0c0d0', marginTop: 6 }}>{log.leads?.current_company}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#ffffff', border: '1px solid #e0e0ea', borderRadius: 14, padding: 28, width: 500 }}>
            <h2 style={{ fontSize: 16, color: '#1e6b3a', marginBottom: 20, fontWeight: 700 }}>Nova Campanha de Comentários</h2>
            {[['Nome', 'name', 'Ex: Comentários Revendas Agro'],['Objetivo', 'objective', 'Ex: Gerar visibilidade entre gestores...']].map(([l, k, p]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#9a9ab0', marginBottom: 6, textTransform: 'uppercase' }}>{l}</div>
                <input value={form[k]} onChange={e => setForm(p2 => ({...p2, [k]: e.target.value}))} placeholder={p} style={inp} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: '#9a9ab0', marginBottom: 6, textTransform: 'uppercase' }}>Por dia (máx)</div>
                <input type="number" value={form.max_comments_per_day} onChange={e => setForm(p => ({...p, max_comments_per_day: parseInt(e.target.value)}))} min={1} max={30} style={inp} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#9a9ab0', marginBottom: 6, textTransform: 'uppercase' }}>Por pessoa (máx)</div>
                <input type="number" value={form.max_comments_per_person} onChange={e => setForm(p => ({...p, max_comments_per_person: parseInt(e.target.value)}))} min={1} max={5} style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#9a9ab0', marginBottom: 6, textTransform: 'uppercase' }}>Tom de voz</div>
              <select value={form.tone_of_voice} onChange={e => setForm(p => ({...p, tone_of_voice: e.target.value}))} style={inp}>
                {['construtivo e relevante','consultivo','provocativo','empático','técnico','inspirador'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, background: 'transparent', border: '1px solid #e0e0ea', borderRadius: 8, color: '#6a6a7a', padding: 10, fontSize: 13 }}>Cancelar</button>
              <button onClick={save} style={{ flex: 2, background: 'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border: 'none', borderRadius: 8, color: '#1a1a2e', padding: 10, fontSize: 13 }}>Criar Campanha</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
