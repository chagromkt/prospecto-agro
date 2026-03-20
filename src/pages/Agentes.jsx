import { useState, useEffect } from 'react'
import { sb, getProfileId } from '../config.js'

const STYLES = [
  { id: 'consultivo', label: 'Consultivo' },
  { id: 'direto', label: 'Direto e objetivo' },
  { id: 'educativo', label: 'Educativo' },
  { id: 'amigavel', label: 'Amigável e informal' },
  { id: 'tecnico', label: 'Técnico especialista' },
]

const TONES = [
  { id: 'profissional', label: 'Profissional' },
  { id: 'empatico', label: 'Empático' },
  { id: 'urgente', label: 'Urgente' },
  { id: 'descontraido', label: 'Descontraído' },
  { id: 'assertivo', label: 'Assertivo' },
]

const EMPTY = { name:'', objective:'', conversation_style:'consultivo', tone_of_voice:'profissional', system_prompt:'', max_messages_per_lead:5, delay_between_messages:60, is_active:true }

export default function Agentes() {
  const [agents, setAgents] = useState([])
  const [sel, setSel] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [mode, setMode] = useState('list') // list | new | edit
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const data = await sb(`agents?profile_id=eq.${getProfileId()}&order=created_at.desc`)
      setAgents(data || [])
    } catch { setAgents([]) }
    setLoading(false)
  }

  const openNew = () => { setForm(EMPTY); setSel(null); setMode('new') }

  const openEdit = (a) => {
    setForm({ name: a.name||'', objective: a.objective||'', conversation_style: a.conversation_style||'consultivo', tone_of_voice: a.tone_of_voice||'profissional', system_prompt: a.system_prompt||'', max_messages_per_lead: a.max_messages_per_lead||5, delay_between_messages: a.delay_between_messages||60, is_active: a.is_active })
    setSel(a); setMode('edit')
  }

  const save = async () => {
    if (!form.name.trim() || !form.objective.trim()) return
    setSaving(true)
    try {
      // Auto-generate system_prompt if empty
      const systemPrompt = form.system_prompt.trim() || 
        `Você é ${form.name}, um assistente especializado em agronegócio brasileiro.\nObjetivo: ${form.objective}\nEstilo: ${form.conversation_style}\nTom: ${form.tone_of_voice}\nContexto: CHA Agromkt / Método S.A.F.R.A.™ — especialistas em agromarketing digital.\nSeja sempre objetivo, relevante e mostre valor real nas suas respostas.`
      const payload = { ...form, profile_id: getProfileId(), system_prompt: systemPrompt }
      if (mode === 'new') {
        const data = await sb('agents', { method:'POST', body: JSON.stringify(payload) })
        const created = Array.isArray(data) ? data[0] : data
        setAgents(p => [created, ...p])
      } else {
        await sb(`agents?id=eq.${sel.id}`, { method:'PATCH', body: JSON.stringify(form) })
        setAgents(p => p.map(a => a.id===sel.id ? {...a, ...form} : a))
      }
      setMode('list'); setSel(null)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const toggleActive = async (a) => {
    try {
      await sb(`agents?id=eq.${a.id}`, { method:'PATCH', body: JSON.stringify({ is_active: !a.is_active }) })
      setAgents(p => p.map(x => x.id===a.id ? {...x, is_active:!a.is_active} : x))
    } catch {}
  }

  const del = async (a) => {
    if (!confirm(`Excluir agente "${a.name}"?`)) return
    setDeleting(a.id)
    try {
      await sb(`agents?id=eq.${a.id}`, { method:'DELETE' })
      setAgents(p => p.filter(x => x.id!==a.id))
      if (sel?.id === a.id) { setSel(null); setMode('list') }
    } catch {}
    setDeleting(null)
  }

  const inp = { width:'100%', background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:'9px 12px', color:'#1a1a2e', fontSize:13, marginBottom:12, fontFamily:'Georgia, serif' }
  const lbl = (t) => <div style={{ fontSize:11, color:'#9a9ab0', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6, fontWeight:600 }}>{t}</div>

  if (mode === 'new' || mode === 'edit') return (
    <div style={{ flex:1, overflowY:'auto', padding:'28px 32px', background:'#ffffff' }}>
      <div style={{ maxWidth:600 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
          <button onClick={() => setMode('list')} style={{ background:'none', border:'none', color:'#9a9ab0', fontSize:20, cursor:'pointer' }}>←</button>
          <h1 style={{ fontSize:20, color:'#1a1a2e', fontWeight:700 }}>{mode==='new' ? 'Novo Agente' : `Editar: ${sel?.name}`}</h1>
        </div>

        {lbl('Nome do agente')}
        <input value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="Ex: Consultor Agro Premium" style={inp} />

        {lbl('Objetivo principal')}
        <textarea value={form.objective} onChange={e => setForm(p=>({...p,objective:e.target.value}))} placeholder="Ex: Marcar diagnóstico gratuito com gestores do agro que já aceitaram conexão" rows={3} style={{ ...inp, resize:'vertical' }} />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            {lbl('Estilo de conversa')}
            <select value={form.conversation_style} onChange={e => setForm(p=>({...p,conversation_style:e.target.value}))} style={inp}>
              {STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            {lbl('Tom de voz')}
            <select value={form.tone_of_voice} onChange={e => setForm(p=>({...p,tone_of_voice:e.target.value}))} style={inp}>
              {TONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            {lbl('Máx. mensagens por lead')}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <input type="range" min={1} max={20} value={form.max_messages_per_lead} onChange={e => setForm(p=>({...p,max_messages_per_lead:parseInt(e.target.value)}))} style={{ flex:1, accentColor:'#1e6b3a' }} />
              <span style={{ fontSize:18, fontWeight:900, color:'#1e6b3a', fontFamily:'monospace', minWidth:28 }}>{form.max_messages_per_lead}</span>
            </div>
          </div>
          <div>
            {lbl('Delay entre mensagens (min)')}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <input type="range" min={10} max={480} step={10} value={form.delay_between_messages} onChange={e => setForm(p=>({...p,delay_between_messages:parseInt(e.target.value)}))} style={{ flex:1, accentColor:'#1e6b3a' }} />
              <span style={{ fontSize:18, fontWeight:900, color:'#1e6b3a', fontFamily:'monospace', minWidth:36 }}>{form.delay_between_messages}</span>
            </div>
          </div>
        </div>

        {lbl('System prompt (deixe vazio para gerar automaticamente)')}
        <textarea value={form.system_prompt} onChange={e => setForm(p=>({...p,system_prompt:e.target.value}))} placeholder="Se vazio, o sistema gera um prompt baseado no objetivo, estilo e tom escolhidos..." rows={6} style={{ ...inp, resize:'vertical' }} />

        <div style={{ display:'flex', gap:10, marginTop:8 }}>
          <button onClick={() => setMode('list')} style={{ flex:1, background:'#fff', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:12, fontSize:13 }}>Cancelar</button>
          <button onClick={save} disabled={saving || !form.name.trim() || !form.objective.trim()} style={{ flex:2, background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:'#fff', padding:12, fontSize:13, fontWeight:700 }}>
            {saving ? 'Salvando...' : mode==='new' ? 'Criar Agente' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'28px 32px', background:'#ffffff' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:20, color:'#1a1a2e', fontWeight:700 }}>Agentes de Conversa</h1>
          <p style={{ fontSize:12, color:'#9a9ab0', marginTop:4 }}>Configure agentes de IA para responder leads automaticamente</p>
        </div>
        <button onClick={openNew} style={{ background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:'#fff', padding:'10px 20px', fontSize:13, fontWeight:600 }}>+ Novo Agente</button>
      </div>

      {loading ? <div style={{ textAlign:'center', color:'#9a9ab0', padding:40 }}>Carregando...</div>
      : agents.length === 0 ? (
        <div style={{ textAlign:'center', padding:60, color:'#c0c0d0' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🤖</div>
          <div style={{ fontSize:14, marginBottom:20 }}>Nenhum agente criado ainda</div>
          <button onClick={openNew} style={{ background:'#f0f8f3', border:'1px solid #b8e8c8', borderRadius:8, color:'#1e6b3a', padding:'10px 20px', fontSize:13 }}>Criar primeiro agente</button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:16 }}>
          {agents.map(a => (
            <div key={a.id} style={{ background:'#ffffff', border:'1px solid #e8e8f0', borderRadius:12, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.05)', position:'relative' }}>
              {/* Active indicator */}
              <div style={{ position:'absolute', top:16, right:16, display:'flex', alignItems:'center', gap:8 }}>
                <button onClick={() => toggleActive(a)} style={{ width:40, height:22, borderRadius:11, background:a.is_active?'#1e6b3a':'#e0e0ea', border:'none', cursor:'pointer', position:'relative', transition:'all 0.2s' }}>
                  <div style={{ width:16, height:16, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left:a.is_active?21:3, transition:'all 0.2s' }} />
                </button>
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, paddingRight:60 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'#f0f8f3', border:'1px solid #b8e8c8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🤖</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e' }}>{a.name}</div>
                  <div style={{ fontSize:11, color:a.is_active?'#059669':'#9a9ab0', fontWeight:600 }}>{a.is_active ? '● Ativo' : '○ Inativo'}</div>
                </div>
              </div>

              <div style={{ fontSize:12, color:'#6a6a7a', lineHeight:1.6, marginBottom:12, minHeight:36 }}>{a.objective}</div>

              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
                {[a.conversation_style, a.tone_of_voice].filter(Boolean).map((tag,i) => (
                  <span key={i} style={{ fontSize:10, background:'#f0f0f5', color:'#6a6a7a', padding:'2px 8px', borderRadius:6 }}>{tag}</span>
                ))}
                <span style={{ fontSize:10, background:'#f0f8f3', color:'#1e6b3a', padding:'2px 8px', borderRadius:6 }}>{a.max_messages_per_lead||5} msgs/lead</span>
              </div>

              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => openEdit(a)} style={{ flex:1, background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:'7px', fontSize:12, fontWeight:600 }}>✎ Editar</button>
                <button onClick={() => del(a)} disabled={deleting===a.id} style={{ background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:8, color:'#dc2626', padding:'7px 12px', fontSize:12 }}>
                  {deleting===a.id ? '...' : '✕'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
