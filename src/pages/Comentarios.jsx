import { useState, useEffect } from 'react'
import { sb, getProfileId } from '../config.js'

const TONES = ['Profissional','Empático','Humorístico','Provocativo','Educativo','Inspirador']
const EMPTY = { name:'', target_url:'', tone:'Profissional', objective:'', max_per_day:10, max_per_person:1, ai_prompt:'', is_active:false }

export default function Comentarios() {
  const [camps, setCamps] = useState([])
  const [log, setLog] = useState([])
  const [mode, setMode] = useState('list') // list | new | edit
  const [form, setForm] = useState(EMPTY)
  const [sel, setSel] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const [c, l] = await Promise.all([
        sb(`comment_campaigns?profile_id=eq.${getProfileId()}&order=created_at.desc`),
        sb(`comment_log?select=*,leads(full_name,current_company)&order=sent_at.desc&limit=20`).catch(() => [])
      ])
      setCamps(c||[]); setLog(l||[])
    } catch { setCamps([]) }
  }

  const openNew = () => { setForm(EMPTY); setSel(null); setMode('new') }

  const openEdit = (c) => {
    setForm({ name:c.name||'', target_url:c.target_url||'', tone:c.tone||'Profissional', objective:c.objective||'', max_per_day:c.max_per_day||10, max_per_person:c.max_per_person||1, ai_prompt:c.ai_prompt||'', is_active:c.is_active||false })
    setSel(c); setMode('edit')
  }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = { ...form, profile_id: getProfileId() }
      if (mode === 'new') {
        const data = await sb('comment_campaigns', { method:'POST', body: JSON.stringify(payload) })
        const created = Array.isArray(data) ? data[0] : data
        setCamps(p => [created, ...p])
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
      if (sel?.id===c.id) { setSel(null); setMode('list') }
    } catch {}
    setDeleting(null)
  }

  const inp = { width:'100%', background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:'9px 12px', color:'#1a1a2e', fontSize:13, marginBottom:12, fontFamily:'Georgia, serif' }
  const lbl = (t) => <div style={{ fontSize:11, color:'#9a9ab0', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6, fontWeight:600 }}>{t}</div>

  if (mode === 'new' || mode === 'edit') return (
    <div style={{ flex:1, overflowY:'auto', padding:'28px 32px', background:'#ffffff' }}>
      <div style={{ maxWidth:560 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <button onClick={() => setMode('list')} style={{ background:'none', border:'none', color:'#9a9ab0', fontSize:20, cursor:'pointer' }}>←</button>
          <h1 style={{ fontSize:20, color:'#1a1a2e', fontWeight:700 }}>{mode==='new' ? 'Nova Campanha de Comentários' : `Editar: ${sel?.name}`}</h1>
        </div>

        {lbl('Nome da campanha')}
        <input value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="Ex: Comentários em posts de Insumos" style={inp} />

        {lbl('URL alvo (perfil, hashtag ou post)')}
        <input value={form.target_url} onChange={e => setForm(p=>({...p,target_url:e.target.value}))} placeholder="https://linkedin.com/in/perfil ou #agromarketing" style={inp} />

        {lbl('Objetivo do comentário')}
        <textarea value={form.objective} onChange={e => setForm(p=>({...p,objective:e.target.value}))} placeholder="Ex: Gerar visibilidade e atrair diretores de marketing do agro para o meu perfil" rows={3} style={{ ...inp, resize:'vertical' }} />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            {lbl('Tom de voz')}
            <select value={form.tone} onChange={e => setForm(p=>({...p,tone:e.target.value}))} style={inp}>
              {TONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            {lbl('Máx. comentários por dia')}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <input type="range" min={1} max={50} value={form.max_per_day} onChange={e => setForm(p=>({...p,max_per_day:parseInt(e.target.value)}))} style={{ flex:1, accentColor:'#1e6b3a' }} />
              <span style={{ fontSize:18, fontWeight:900, color:'#1e6b3a', fontFamily:'monospace', minWidth:28 }}>{form.max_per_day}</span>
            </div>
          </div>
        </div>

        {lbl('Prompt personalizado (deixe vazio para gerar com IA)')}
        <textarea value={form.ai_prompt} onChange={e => setForm(p=>({...p,ai_prompt:e.target.value}))} placeholder="Se vazio, a IA cria um comentário relevante baseado no objetivo e tom escolhidos..." rows={4} style={{ ...inp, resize:'vertical' }} />

        <div style={{ display:'flex', gap:10, marginTop:8 }}>
          <button onClick={() => setMode('list')} style={{ flex:1, background:'#fff', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:12, fontSize:13 }}>Cancelar</button>
          <button onClick={save} disabled={saving || !form.name.trim()} style={{ flex:2, background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:'#fff', padding:12, fontSize:13, fontWeight:700 }}>
            {saving ? 'Salvando...' : mode==='new' ? 'Criar Campanha' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', background:'#ffffff' }}>
      {/* Campaigns */}
      <div style={{ flex:1, overflowY:'auto', padding:'28px 32px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:20, color:'#1a1a2e', fontWeight:700 }}>Campanhas de Comentários</h1>
            <p style={{ fontSize:12, color:'#9a9ab0', marginTop:4 }}>Comenta automaticamente em posts relevantes do LinkedIn</p>
          </div>
          <button onClick={openNew} style={{ background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:'#fff', padding:'10px 20px', fontSize:13, fontWeight:600 }}>+ Nova</button>
        </div>

        {camps.length === 0 ? (
          <div style={{ textAlign:'center', padding:60, color:'#c0c0d0' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>✍️</div>
            <div style={{ fontSize:14, marginBottom:20 }}>Nenhuma campanha criada ainda</div>
            <button onClick={openNew} style={{ background:'#f0f8f3', border:'1px solid #b8e8c8', borderRadius:8, color:'#1e6b3a', padding:'10px 20px', fontSize:13 }}>Criar primeira campanha</button>
          </div>
        ) : camps.map(c => (
          <div key={c.id} style={{ background:'#ffffff', border:'1px solid #e8e8f0', borderRadius:12, padding:'16px 20px', marginBottom:10, display:'flex', alignItems:'center', gap:16, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                <span style={{ fontSize:14, fontWeight:700, color:'#1a1a2e' }}>{c.name}</span>
                <span style={{ fontSize:10, color:c.is_active?'#059669':'#9a9ab0', background:c.is_active?'#f0faf4':'#f5f5fa', padding:'2px 8px', borderRadius:8, fontWeight:600 }}>{c.is_active ? '● Ativa' : '○ Pausada'}</span>
              </div>
              <div style={{ fontSize:12, color:'#6a6a7a' }}>{c.objective || c.target_url || '—'}</div>
              <div style={{ display:'flex', gap:8, marginTop:6 }}>
                {c.tone && <span style={{ fontSize:10, background:'#f0f0f5', color:'#6a6a7a', padding:'2px 8px', borderRadius:6 }}>{c.tone}</span>}
                {c.max_per_day && <span style={{ fontSize:10, background:'#f0f0f5', color:'#6a6a7a', padding:'2px 8px', borderRadius:6 }}>{c.max_per_day}/dia</span>}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <button onClick={() => toggle(c)} style={{ width:40, height:22, borderRadius:11, background:c.is_active?'#1e6b3a':'#e0e0ea', border:'none', cursor:'pointer', position:'relative', transition:'all 0.2s' }}>
                <div style={{ width:16, height:16, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left:c.is_active?21:3, transition:'all 0.2s' }} />
              </button>
              <button onClick={() => openEdit(c)} style={{ background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:'6px 12px', fontSize:12 }}>✎</button>
              <button onClick={() => del(c)} disabled={deleting===c.id} style={{ background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:8, color:'#dc2626', padding:'6px 12px', fontSize:12 }}>{deleting===c.id?'...':'✕'}</button>
            </div>
          </div>
        ))}
      </div>

      {/* Log */}
      <div style={{ width:320, background:'#f8f8fc', borderLeft:'1px solid #e8e8f0', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'16px 16px 12px', borderBottom:'1px solid #e8e8f0' }}>
          <span style={{ fontSize:11, color:'#9a9ab0', letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:600 }}>Últimos comentários</span>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:12 }}>
          {log.length === 0 ? <div style={{ textAlign:'center', color:'#c0c0d0', fontSize:12, padding:20 }}>Nenhum comentário ainda</div>
          : log.map((l,i) => (
            <div key={l.id||i} style={{ background:'#fff', border:'1px solid #e8e8f0', borderRadius:8, padding:12, marginBottom:8 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#1a1a2e', marginBottom:4 }}>{l.leads?.full_name || 'Lead'}</div>
              <div style={{ fontSize:11, color:'#6a6a7a', marginBottom:6, lineHeight:1.5 }}>{l.comment_text?.substring(0,80)}...</div>
              <div style={{ fontSize:10, color:'#c0c0d0' }}>{l.sent_at ? new Date(l.sent_at).toLocaleDateString('pt-BR') : '—'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
