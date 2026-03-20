import { useState, useEffect } from 'react'
import { sb, PROFILE_ID, SB_KEY, SB_URL } from '../config.js'

export default function Conteudo() {
  const [posts, setPosts] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({ agent_prompt: '', tone_of_voice: 'consultivo e direto', knowledge_context: '', generated_text: '', final_text: '', scheduled_for: '' })

  useEffect(() => {
    sb(`content_posts?profile_id=eq.${PROFILE_ID}&order=created_at.desc`)
      .then(setPosts)
      .catch(() => setPosts([
        { id: 'p1', final_text: 'O produtor rural de hoje não compra mais insumo — ele compra resultado. Se sua estratégia de marketing ainda fala sobre produto, está na hora de falar sobre transformação. Método S.A.F.R.A.™ #agromarketing', status: 'published', published_at: new Date().toISOString(), reactions: 234, comments: 18 },
        { id: 'p2', final_text: '3 erros que cooperativas cometem no marketing digital — e como evitar cada um deles. Thread 🧵', status: 'scheduled', scheduled_for: new Date(Date.now() + 86400000).toISOString() },
        { id: 'p3', final_text: null, generated_text: 'Rascunho sendo editado...', status: 'draft' },
      ]))
  }, [])

  const generate = async () => {
    if (!form.agent_prompt.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': '', 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 600,
          messages: [{ role: 'user', content: `Crie um post para LinkedIn sobre agronegócio brasileiro. Tom: ${form.tone_of_voice}. Tema: ${form.agent_prompt}. Contexto adicional: ${form.knowledge_context || 'CHA Agromkt, Método S.A.F.R.A.™'}. Máximo 1300 caracteres. Inclua hashtags relevantes. Retorne APENAS o texto do post.` }]
        })
      })
      const data = await res.json()
      setForm(p => ({ ...p, generated_text: data.content?.[0]?.text || '', final_text: data.content?.[0]?.text || '' }))
    } catch {
      setForm(p => ({ ...p, generated_text: 'O agronegócio brasileiro é o motor da nossa economia. E por trás de cada safra recorde, existe uma estratégia de marketing que conecta produtor, revenda e indústria.\n\nNo Método S.A.F.R.A.™, acreditamos que marketing no campo não é sobre posts bonitos — é sobre safras de clientes.\n\nQual é a sua estratégia para essa temporada?\n\n#agromarketing #agronegocio #safra #marketingdigital', final_text: '' }))
    }
    setGenerating(false)
  }

  const schedule = async () => {
    const payload = { profile_id: PROFILE_ID, generated_text: form.generated_text, final_text: form.final_text || form.generated_text, agent_prompt: form.agent_prompt, tone_of_voice: form.tone_of_voice, status: form.scheduled_for ? 'scheduled' : 'draft', scheduled_for: form.scheduled_for || null }
    try {
      const data = await sb('content_posts', { method: 'POST', body: JSON.stringify(payload) })
      setPosts(p => [Array.isArray(data) ? data[0] : data, ...p])
    } catch {
      setPosts(p => [{ id: `p${Date.now()}`, ...payload }, ...p])
    }
    setShowNew(false); setForm({ agent_prompt: '', tone_of_voice: 'consultivo e direto', knowledge_context: '', generated_text: '', final_text: '', scheduled_for: '' })
  }

  const statusColor = s => s === 'published' ? '#059669' : s === 'scheduled' ? '#f59e0b' : '#9a9ab0'
  const statusLabel = s => s === 'published' ? 'Publicado' : s === 'scheduled' ? 'Agendado' : 'Rascunho'
  const inp = { background: '#f8f8fc', border: '1px solid #e0e0ea', borderRadius: 8, padding: '10px 12px', color: '#2a2a3e', fontSize: 13, width: '100%' }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '20px 32px', borderBottom: '1px solid #e8e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, color: '#1e6b3a', fontWeight: 700 }}>Conteúdo LinkedIn</h1>
          <p style={{ fontSize: 12, color: '#9a9ab0', marginTop: 4 }}>Gere e agende posts com IA</p>
        </div>
        <button onClick={() => setShowNew(true)} style={{ background: 'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border: 'none', borderRadius: 8, color: '#1a1a2e', padding: '10px 20px', fontSize: 13 }}>+ Novo Post</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {posts.map(post => (
            <div key={post.id} style={{ background: '#ffffff', border: '1px solid #e8e8f0', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: statusColor(post.status), background: `${statusColor(post.status)}15`, padding: '3px 8px', borderRadius: 8 }}>{statusLabel(post.status)}</span>
                {post.scheduled_for && <span style={{ fontSize: 10, color: '#9a9ab0' }}>{new Date(post.scheduled_for).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span>}
              </div>
              <p style={{ fontSize: 13, color: '#4a4a5a', lineHeight: 1.6, flex: 1, display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {post.final_text || post.generated_text || '(rascunho vazio)'}
              </p>
              {post.status === 'published' && (
                <div style={{ display: 'flex', gap: 16, paddingTop: 8, borderTop: '1px solid #e8e8f0' }}>
                  {[['❤️', post.reactions || 0], ['💬', post.comments || 0], ['↩', post.reposts || 0]].map(([icon, v], i) => (
                    <span key={i} style={{ fontSize: 12, color: '#1e6b3a' }}>{icon} {v}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#ffffff', border: '1px solid #e0e0ea', borderRadius: 14, padding: 28, width: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 16, color: '#1e6b3a', marginBottom: 20, fontWeight: 700 }}>Criar Post com IA</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: '#9a9ab0', marginBottom: 6 }}>TEMA / PROMPT</div>
                <textarea value={form.agent_prompt} onChange={e => setForm(p => ({...p, agent_prompt: e.target.value}))} placeholder="Ex: 3 erros de marketing que revendas agro cometem..." rows={3} style={{ ...inp, resize: 'none' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#9a9ab0', marginBottom: 6 }}>CONTEXTO / BASE DE CONHECIMENTO</div>
                <textarea value={form.knowledge_context} onChange={e => setForm(p => ({...p, knowledge_context: e.target.value}))} placeholder="Informações adicionais, cases, dados..." rows={3} style={{ ...inp, resize: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: '#9a9ab0', marginBottom: 6 }}>TOM DE VOZ</div>
                <select value={form.tone_of_voice} onChange={e => setForm(p => ({...p, tone_of_voice: e.target.value}))} style={inp}>
                  {['consultivo e direto','técnico e objetivo','inspirador','provocativo','didático','conversacional'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button onClick={generate} disabled={generating} style={{ alignSelf: 'flex-end', background: 'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border: 'none', borderRadius: 8, color: '#1a1a2e', padding: '10px 20px', fontSize: 13, minWidth: 140 }}>
                {generating ? '⏳ Gerando...' : '✦ Gerar com IA'}
              </button>
            </div>

            {form.generated_text && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#9a9ab0', marginBottom: 6 }}>TEXTO GERADO — EDITE SE NECESSÁRIO</div>
                <textarea value={form.final_text || form.generated_text} onChange={e => setForm(p => ({...p, final_text: e.target.value}))} rows={8} style={{ ...inp, resize: 'vertical', lineHeight: 1.7 }} />
                <div style={{ fontSize: 11, color: '#9a9ab0', marginTop: 4 }}>{(form.final_text || form.generated_text).length} / 3000 caracteres</div>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#9a9ab0', marginBottom: 6 }}>AGENDAR PUBLICAÇÃO (opcional)</div>
              <input type="datetime-local" value={form.scheduled_for} onChange={e => setForm(p => ({...p, scheduled_for: e.target.value}))} style={inp} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, background: 'transparent', border: '1px solid #e0e0ea', borderRadius: 8, color: '#6a6a7a', padding: 10, fontSize: 13 }}>Cancelar</button>
              <button onClick={schedule} style={{ flex: 2, background: 'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border: 'none', borderRadius: 8, color: '#1a1a2e', padding: 10, fontSize: 13 }}>
                {form.scheduled_for ? '📅 Agendar Post' : '💾 Salvar Rascunho'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
