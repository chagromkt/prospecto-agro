import { useState, useEffect } from 'react'
import { sb, getProfileId, SB_URL, SB_KEY } from '../config.js'

const TONES = ['Educativo','Provocativo','Inspirador','Storytelling','Comercial','Bastidores']
const EMPTY = { title:'', content:'', tone:'Educativo', context:'', scheduled_at:'', status:'draft' }

export default function Conteudo() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('list') // list | new | edit
  const [form, setForm] = useState(EMPTY)
  const [sel, setSel] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const data = await sb(`content_posts?profile_id=eq.${getProfileId()}&order=created_at.desc`)
      setPosts(data || [])
    } catch { setPosts([]) }
    setLoading(false)
  }

  const openNew = () => { setForm(EMPTY); setSel(null); setMode('new') }

  const openEdit = (p) => {
    setForm({ title:p.title||'', content:p.content||'', tone:p.tone||'Educativo', context:p.context||'', scheduled_at:p.scheduled_at||'', status:p.status||'draft' })
    setSel(p); setMode('edit')
  }

  const generate = async () => {
    if (!form.context && !form.title) return
    setGenerating(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers: { 'x-api-key': '', 'anthropic-version':'2023-06-01', 'Content-Type':'application/json' },
        body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:800, messages:[{ role:'user', content:`Crie um post para LinkedIn sobre: "${form.context || form.title}"\n\nTom: ${form.tone}\nContexto: agronegócio brasileiro, marketing e vendas\nEspecialização: Método S.A.F.R.A.™ (CHA Agromkt)\n\nO post deve ter:\n- Gancho poderoso na primeira linha\n- Conteúdo de valor com 3-4 parágrafos\n- CTA claro no final\n- Emojis estratégicos\n- Hashtags relevantes\n\nRetorne APENAS o texto do post, sem explicações.` }] })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      setForm(p => ({...p, content: text}))
    } catch (e) { console.error(e) }
    setGenerating(false)
  }

  const save = async (statusOverride) => {
    if (!form.content.trim()) return
    setSaving(true)
    const payload = { ...form, profile_id: getProfileId(), status: statusOverride || form.status, title: form.title || form.content.substring(0,50)+'...' }
    try {
      if (mode === 'new') {
        const data = await sb('content_posts', { method:'POST', body: JSON.stringify(payload) })
        const created = Array.isArray(data) ? data[0] : data
        setPosts(p => [created, ...p])
      } else {
        await sb(`content_posts?id=eq.${sel.id}`, { method:'PATCH', body: JSON.stringify(payload) })
        setPosts(p => p.map(x => x.id===sel.id ? {...x,...payload} : x))
      }
      setMode('list'); setSel(null)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const del = async (post) => {
    if (!confirm(`Excluir post "${post.title||'este post'}"?`)) return
    setDeleting(post.id)
    try {
      await sb(`content_posts?id=eq.${post.id}`, { method:'DELETE' })
      setPosts(p => p.filter(x => x.id!==post.id))
      if (sel?.id===post.id) { setSel(null); setMode('list') }
    } catch {}
    setDeleting(null)
  }

  const statusColors = { draft:'#9a9ab0', scheduled:'#d97706', published:'#059669' }
  const statusLabels = { draft:'Rascunho', scheduled:'Agendado', published:'Publicado' }

  const filtered = filterStatus ? posts.filter(p => p.status===filterStatus) : posts

  const inp = { width:'100%', background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:'9px 12px', color:'#1a1a2e', fontSize:13, marginBottom:12, fontFamily:'Georgia, serif' }
  const lbl = (t) => <div style={{ fontSize:11, color:'#9a9ab0', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6, fontWeight:600 }}>{t}</div>

  if (mode === 'new' || mode === 'edit') return (
    <div style={{ flex:1, overflowY:'auto', padding:'28px 32px', background:'#ffffff' }}>
      <div style={{ maxWidth:640 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <button onClick={() => setMode('list')} style={{ background:'none', border:'none', color:'#9a9ab0', fontSize:20, cursor:'pointer' }}>←</button>
          <h1 style={{ fontSize:20, color:'#1a1a2e', fontWeight:700 }}>{mode==='new' ? 'Novo Post' : 'Editar Post'}</h1>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            {lbl('Tom de voz')}
            <select value={form.tone} onChange={e => setForm(p=>({...p,tone:e.target.value}))} style={inp}>
              {TONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            {lbl('Status')}
            <select value={form.status} onChange={e => setForm(p=>({...p,status:e.target.value}))} style={inp}>
              <option value="draft">Rascunho</option>
              <option value="scheduled">Agendado</option>
              <option value="published">Publicado</option>
            </select>
          </div>
        </div>

        {form.status === 'scheduled' && (<>
          {lbl('Data e hora de publicação')}
          <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(p=>({...p,scheduled_at:e.target.value}))} style={inp} />
        </>)}

        {lbl('Tema / contexto para IA')}
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <input value={form.context} onChange={e => setForm(p=>({...p,context:e.target.value}))} placeholder="Ex: Como o agromarketing digital aumenta as vendas em revendas" style={{ ...inp, marginBottom:0, flex:1 }} />
          <button onClick={generate} disabled={generating || (!form.context && !form.title)} style={{ background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:'#fff', padding:'9px 16px', fontSize:12, fontWeight:600, whiteSpace:'nowrap', flexShrink:0 }}>
            {generating ? '✨ Gerando...' : '✨ Gerar com IA'}
          </button>
        </div>

        {lbl('Conteúdo do post')}
        <textarea value={form.content} onChange={e => setForm(p=>({...p,content:e.target.value}))} placeholder="Escreva ou gere o conteúdo do post..." rows={14} style={{ ...inp, resize:'vertical' }} />
        <div style={{ fontSize:11, color:'#c0c0d0', marginTop:-8, marginBottom:16 }}>{form.content.length} caracteres</div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => setMode('list')} style={{ flex:1, background:'#fff', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:12, fontSize:13 }}>Cancelar</button>
          <button onClick={() => save('draft')} disabled={saving || !form.content.trim()} style={{ flex:1, background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:12, fontSize:13 }}>Salvar rascunho</button>
          <button onClick={() => save()} disabled={saving || !form.content.trim()} style={{ flex:2, background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:'#fff', padding:12, fontSize:13, fontWeight:700 }}>
            {saving ? 'Salvando...' : mode==='new' ? 'Criar Post' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'28px 32px', background:'#ffffff' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:20, color:'#1a1a2e', fontWeight:700 }}>Conteúdo</h1>
          <p style={{ fontSize:12, color:'#9a9ab0', marginTop:4 }}>Crie e gerencie posts para o LinkedIn</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:'8px 12px', color:'#6a6a7a', fontSize:12 }}>
            <option value="">Todos</option>
            <option value="draft">Rascunhos</option>
            <option value="scheduled">Agendados</option>
            <option value="published">Publicados</option>
          </select>
          <button onClick={openNew} style={{ background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:'#fff', padding:'10px 20px', fontSize:13, fontWeight:600 }}>+ Novo Post</button>
        </div>
      </div>

      {loading ? <div style={{ textAlign:'center', color:'#9a9ab0', padding:40 }}>Carregando...</div>
      : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:60, color:'#c0c0d0' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>✦</div>
          <div style={{ fontSize:14, marginBottom:20 }}>Nenhum post ainda</div>
          <button onClick={openNew} style={{ background:'#f0f8f3', border:'1px solid #b8e8c8', borderRadius:8, color:'#1e6b3a', padding:'10px 20px', fontSize:13 }}>Criar primeiro post</button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:16 }}>
          {filtered.map(post => (
            <div key={post.id} style={{ background:'#ffffff', border:'1px solid #e8e8f0', borderRadius:12, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.05)', display:'flex', flexDirection:'column' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <span style={{ fontSize:10, color:statusColors[post.status], background:`${statusColors[post.status]}15`, padding:'2px 8px', borderRadius:8, fontWeight:600 }}>{statusLabels[post.status]||post.status}</span>
                {post.tone && <span style={{ fontSize:10, color:'#9a9ab0', background:'#f5f5fa', padding:'2px 8px', borderRadius:8 }}>{post.tone}</span>}
              </div>
              <div style={{ fontSize:13, color:'#1a1a2e', lineHeight:1.6, flex:1, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:4, WebkitBoxOrient:'vertical', marginBottom:12 }}>
                {post.content}
              </div>
              {post.scheduled_at && <div style={{ fontSize:11, color:'#d97706', marginBottom:10 }}>📅 {new Date(post.scheduled_at).toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>}
              <div style={{ fontSize:11, color:'#c0c0d0', marginBottom:12 }}>{post.content?.length||0} chars</div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => openEdit(post)} style={{ flex:1, background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:'7px', fontSize:12, fontWeight:600 }}>✎ Editar</button>
                <button onClick={() => del(post)} disabled={deleting===post.id} style={{ background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:8, color:'#dc2626', padding:'7px 12px', fontSize:12 }}>{deleting===post.id?'...':'✕'}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
