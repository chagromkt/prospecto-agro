import { useState, useEffect } from 'react'
import { sb, getProfileId } from '../config.js'

const TONES = ['Profissional','Empático','Humorístico','Provocativo','Educativo','Inspirador']
const EMPTY = { name:'', target_url:'', tone:'Profissional', objective:'', max_per_day:10, max_per_person:1, ai_prompt:'', is_active:false }

export default function Comentarios() {
  const [camps, setCamps] = useState([])
  const [log, setLog] = useState([])
  const [mode, setMode] = useState('list')
  const [form, setForm] = useState(EMPTY)
  const [sel, setSel] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [logFilter, setLogFilter] = useState('')
  const [selLog, setSelLog] = useState(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const [c, l] = await Promise.all([
        sb(`comment_campaigns?profile_id=eq.${getProfileId()}&order=created_at.desc`),
        sb(`comment_log?select=*,leads(full_name,current_company,headline,linkedin_url),comment_campaigns(name)&order=sent_at.desc&limit=100`).catch(() => [])
      ])
      setCamps(c||[]); setLog(l||[])
    } catch { setCamps([]) }
  }

  const openNew = () => { setForm(EMPTY); setSel(null); setMode('new') }
  const openEdit = (c) => { setForm({ name:c.name||'', target_url:c.target_url||'', tone:c.tone||'Profissional', objective:c.objective||'', max_per_day:c.max_per_day||10, max_per_person:c.max_per_person||1, ai_prompt:c.ai_prompt||'', is_active:c.is_active||false }); setSel(c); setMode('edit') }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = { ...form, profile_id: getProfileId() }
      if (mode === 'new') {
        const data = await sb('comment_campaigns', { method:'POST', body: JSON.stringify(payload) })
        setCamps(p => [Array.isArray(data)?data[0]:data, ...p])
      } else {
        await sb(`comment_campaigns?id=eq.${sel.id}`, { method:'PATCH', body: JSON.stringify(form) })
        setCamps(p => p.map(c => c.id===sel.id ? {...c,...form} : c))
      }
      setMode('list'); setSel(null)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const toggle = async (c) => {
    try {
      await sb(`comment_campaigns?id=eq.${c.id}`, { method:'PATCH', body: JSON.stringify({ is_active: !c.is_active }) })
      setCamps(p => p.map(x => x.id===c.id ? {...x, is_active:!c.is_active} : x))
    } catch {}
  }

  const del = async (c) => {
    if (!confirm(`Excluir campanha "${c.name}"?`)) return
    setDeleting(c.id)
    try {
      await sb(`comment_campaigns?id=eq.${c.id}`, { method:'DELETE' })
      setCamps(p => p.filter(x => x.id!==c.id))
    } catch {}
    setDeleting(null)
  }

  const filteredLog = logFilter ? log.filter(l => l.comment_campaigns?.name === logFilter || l.leads?.full_name?.toLowerCase().includes(logFilter.toLowerCase())) : log

  const inp = { width:'100%', background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:'9px 12px', color:'#1a1a2e', fontSize:13, marginBottom:12, fontFamily:'Georgia, serif' }
  const lbl = (t) => <div style={{ fontSize:11, color:'#9a9ab0', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6, fontWeight:600 }}>{t}</div>

  if (mode === 'new' || mode === 'edit') return (
    <div style={{ flex:1, overflowY:'auto', padding:'28px 32px', background:'#ffffff' }}>
      <div style={{ maxWidth:560 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <button onClick={() => setMode('list')} style={{ background:'none', border:'none', color:'#9a9ab0', fontSize:20, cursor:'pointer' }}>←</button>
          <h1 style={{ fontSize:20, color:'#1a1a2e', fontWeight:700 }}>{mode==='new' ? 'Nova Campanha de Comentários' : `Editar: ${sel?.name}`}</h1>
        </div>
        {lbl('Nome')}
        <input value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="Ex: Comentários em posts de Insumos" style={inp} />
        {lbl('URL alvo (perfil, hashtag ou post)')}
        <input value={form.target_url} onChange={e => setForm(p=>({...p,target_url:e.target.value}))} placeholder="https://linkedin.com/in/perfil ou #agromarketing" style={inp} />
        {lbl('Objetivo')}
        <textarea value={form.objective} onChange={e => setForm(p=>({...p,objective:e.target.value}))} rows={3} placeholder="Ex: Gerar visibilidade com diretores de marketing do agro" style={{ ...inp, resize:'vertical' }} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            {lbl('Tom de voz')}
            <select value={form.tone} onChange={e => setForm(p=>({...p,tone:e.target.value}))} style={inp}>
              {TONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            {lbl('Máx. por dia')}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <input type="range" min={1} max={50} value={form.max_per_day} onChange={e => setForm(p=>({...p,max_per_day:parseInt(e.target.value)}))} style={{ flex:1, accentColor:'#1e6b3a' }} />
              <span style={{ fontSize:18, fontWeight:900, color:'#1e6b3a', fontFamily:'monospace', minWidth:28 }}>{form.max_per_day}</span>
            </div>
          </div>
        </div>
        {lbl('Prompt personalizado (vazio = IA gera automaticamente)')}
        <textarea value={form.ai_prompt} onChange={e => setForm(p=>({...p,ai_prompt:e.target.value}))} rows={4} placeholder="Opcional: personalize como a IA vai criar os comentários..." style={{ ...inp, resize:'vertical' }} />
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => setMode('list')} style={{ flex:1, background:'#fff', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:12, fontSize:13 }}>Cancelar</button>
          <button onClick={save} disabled={saving || !form.name.trim()} style={{ flex:2, background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:'#fff', padding:12, fontSize:13, fontWeight:700 }}>{saving?'Salvando...':mode==='new'?'Criar':'Salvar'}</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', background:'#ffffff' }}>
      {/* Left: Campaigns */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', borderRight:'1px solid #e8e8f0' }}>
        <div style={{ padding:'16px 24px', borderBottom:'1px solid #e8e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h1 style={{ fontSize:18, color:'#1a1a2e', fontWeight:700 }}>Campanhas de Comentários</h1>
            <p style={{ fontSize:11, color:'#9a9ab0', marginTop:2 }}>Comenta automaticamente em posts relevantes</p>
          </div>
          <button onClick={openNew} style={{ background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:'#fff', padding:'8px 16px', fontSize:12, fontWeight:600 }}>+ Nova</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'12px 16px' }}>
          {camps.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'#c0c0d0' }}>
              <div style={{ fontSize:32, marginBottom:8 }}>✍️</div>
              <div style={{ fontSize:13 }}>Nenhuma campanha criada</div>
            </div>
          ) : camps.map(c => (
            <div key={c.id} style={{ background:'#fff', border:'1px solid #e8e8f0', borderRadius:10, padding:'14px 16px', marginBottom:8, display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'#1a1a2e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</span>
                  <span style={{ fontSize:10, color:c.is_active?'#059669':'#9a9ab0', background:c.is_active?'#f0faf4':'#f5f5fa', padding:'2px 8px', borderRadius:8, fontWeight:600, flexShrink:0 }}>{c.is_active?'● Ativa':'○ Pausada'}</span>
                </div>
                <div style={{ fontSize:11, color:'#9a9ab0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.objective||c.target_url||'—'}</div>
                <div style={{ display:'flex', gap:6, marginTop:5 }}>
                  {c.tone && <span style={{ fontSize:10, background:'#f0f0f5', color:'#6a6a7a', padding:'2px 7px', borderRadius:6 }}>{c.tone}</span>}
                  {c.max_per_day && <span style={{ fontSize:10, background:'#f0f0f5', color:'#6a6a7a', padding:'2px 7px', borderRadius:6 }}>{c.max_per_day}/dia</span>}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                <button onClick={() => toggle(c)} style={{ width:36, height:20, borderRadius:10, background:c.is_active?'#1e6b3a':'#e0e0ea', border:'none', cursor:'pointer', position:'relative', transition:'all 0.2s' }}>
                  <div style={{ width:14, height:14, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left:c.is_active?19:3, transition:'all 0.2s' }} />
                </button>
                <button onClick={() => openEdit(c)} style={{ background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:6, color:'#6a6a7a', padding:'5px 10px', fontSize:11 }}>✎</button>
                <button onClick={() => del(c)} disabled={deleting===c.id} style={{ background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:6, color:'#dc2626', padding:'5px 10px', fontSize:11 }}>{deleting===c.id?'...':'✕'}</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Log de comentários */}
      <div style={{ width:420, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'16px 16px 12px', borderBottom:'1px solid #e8e8f0', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, color:'#9a9ab0', letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:600, flex:1 }}>Histórico de comentários</span>
          <input value={logFilter} onChange={e => setLogFilter(e.target.value)} placeholder="Filtrar..." style={{ background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:7, padding:'5px 10px', color:'#1a1a2e', fontSize:11, width:120 }} />
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:12 }}>
          {filteredLog.length === 0 ? (
            <div style={{ textAlign:'center', color:'#c0c0d0', fontSize:12, padding:24 }}>Nenhum comentário ainda</div>
          ) : filteredLog.map((l,i) => (
            <div key={l.id||i} onClick={() => setSelLog(selLog?.id===l.id ? null : l)}
              style={{ background:selLog?.id===l.id?'#f0f8f3':'#fff', border:`1px solid ${selLog?.id===l.id?'#b8e8c8':'#e8e8f0'}`, borderRadius:9, padding:12, marginBottom:7, cursor:'pointer', transition:'all 0.15s' }}>
              {/* Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:'#1a1a2e' }}>{l.leads?.full_name || 'Lead desconhecido'}</div>
                  <div style={{ fontSize:10, color:'#9a9ab0' }}>{l.leads?.current_company}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:10, color:l.status==='sent'?'#059669':'#d97706', fontWeight:600 }}>{l.status==='sent'?'✓ Enviado':'⏳ Pendente'}</div>
                  <div style={{ fontSize:10, color:'#c0c0d0' }}>{l.sent_at ? new Date(l.sent_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—'}</div>
                </div>
              </div>

              {/* Comment text */}
              <div style={{ fontSize:12, color:'#4a4a5a', lineHeight:1.6, background:'#f8f8fc', borderRadius:7, padding:'8px 10px', marginBottom: selLog?.id===l.id ? 8 : 0 }}>
                {l.comment_text}
              </div>

              {/* Expanded: post info + lead info */}
              {selLog?.id===l.id && (<>
                {l.post_url && (
                  <div style={{ marginBottom:6 }}>
                    <div style={{ fontSize:10, color:'#9a9ab0', fontWeight:600, textTransform:'uppercase', marginBottom:3 }}>Post comentado</div>
                    <div style={{ fontSize:11, color:'#6a6a7a' }}>{l.post_author && <span style={{ fontWeight:600 }}>{l.post_author} · </span>}{l.post_url && <a href={l.post_url} target="_blank" rel="noreferrer" style={{ color:'#2563eb' }}>Abrir post ↗</a>}</div>
                  </div>
                )}
                <div style={{ display:'flex', gap:8, marginTop:4 }}>
                  {l.leads?.linkedin_url && <a href={l.leads.linkedin_url} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'#1e6b3a', background:'#f0f8f3', border:'1px solid #b8e8c8', borderRadius:6, padding:'4px 10px' }}>Ver lead no LinkedIn ↗</a>}
                  {l.comment_campaigns?.name && <span style={{ fontSize:11, color:'#9a9ab0', background:'#f5f5fa', borderRadius:6, padding:'4px 10px' }}>📌 {l.comment_campaigns.name}</span>}
                  {l.generated_by_ai && <span style={{ fontSize:11, color:'#7c3aed', background:'#f5f3ff', borderRadius:6, padding:'4px 10px' }}>✨ IA</span>}
                </div>
              </>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
