import { useState, useEffect, useRef } from 'react'
import { sb, getProfileId, getAccessToken, SB_URL, SB_KEY, N8N_CONTENT } from '../config.js'

const TONES = ['Educativo','Provocativo','Inspirador','Storytelling','Comercial','Bastidores']
const EMPTY = { title:'', content:'', tone:'Educativo', context:'', scheduled_at:'', status:'draft', media_url:'', media_type:'', media_filename:'' }

const statusColors = { draft:'#9a9ab0', scheduled:'#d97706', published:'#059669' }
const statusLabels = { draft:'Rascunho', scheduled:'Agendado', published:'Publicado' }

export default function Conteudo() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('list')
  const [form, setForm] = useState(EMPTY)
  const [sel, setSel] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [uploading, setUploading] = useState(false)
  const [mediaPreview, setMediaPreview] = useState(null)
  const fileRef = useRef()

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const data = await sb(`content_posts?profile_id=eq.${getProfileId()}&order=created_at.desc`)
      setPosts(data || [])
    } catch { setPosts([]) }
    setLoading(false)
  }

  const openNew = () => { setForm(EMPTY); setSel(null); setMode('new'); setMediaPreview(null) }

  const openEdit = (p) => {
    setForm({ title:p.title||'', content:p.content||p.final_text||p.generated_text||'', tone:p.tone||'Educativo', context:p.context||'', scheduled_at:p.scheduled_at||p.scheduled_for||'', status:p.status||'draft', media_url:p.media_url||'', media_type:p.media_type||'', media_filename:p.media_filename||'' })
    setSel(p); setMode('edit')
    if (p.media_url) setMediaPreview(p.media_url)
    else setMediaPreview(null)
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${getProfileId()}/${Date.now()}.${ext}`
      const isVideo = file.type.startsWith('video/')

      // Upload via Supabase Storage API
      const res = await fetch(`${SB_URL}/storage/v1/object/post-media/${path}`, {
        method: 'POST',
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${getAccessToken()}`,
          'Content-Type': file.type,
        },
        body: file
      })

      if (!res.ok) throw new Error('Upload falhou')

      const publicUrl = `${SB_URL}/storage/v1/object/public/post-media/${path}`
      setForm(p => ({ ...p, media_url: publicUrl, media_type: isVideo ? 'video' : 'image', media_filename: file.name }))
      setMediaPreview(isVideo ? null : publicUrl)
    } catch (e) { console.error('Upload error:', e) }
    setUploading(false)
  }

  const removeMedia = () => {
    setForm(p => ({ ...p, media_url:'', media_type:'', media_filename:'' }))
    setMediaPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const generate = async () => {
    if (!form.context && !form.title) return
    setGenerating(true)
    try {
      const res = await fetch(N8N_CONTENT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: getProfileId(),
          topic: form.context || form.title,
          tone: form.tone
        })
      })
      const data = await res.json()
      const text = data.content || data.text || data.generated_text || ''
      if (text) setForm(p => ({...p, content: text}))
    } catch (e) { console.error('Generate error:', e) }
    setGenerating(false)
  }

  const save = async (statusOverride) => {
    if (!form.content.trim()) return
    setSaving(true)
    const payload = {
      ...form,
      profile_id: getProfileId(),
      status: statusOverride || form.status,
      title: form.title || form.content.substring(0,60)+'...',
      final_text: form.content,
      scheduled_for: form.scheduled_at || null
    }
    try {
      if (mode === 'new') {
        const data = await sb('content_posts', { method:'POST', body: JSON.stringify(payload) })
        setPosts(p => [Array.isArray(data)?data[0]:data, ...p])
      } else {
        await sb(`content_posts?id=eq.${sel.id}`, { method:'PATCH', body: JSON.stringify(payload) })
        setPosts(p => p.map(x => x.id===sel.id ? {...x,...payload} : x))
      }
      setMode('list'); setSel(null); setMediaPreview(null)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const del = async (post) => {
    if (!confirm(`Excluir post?`)) return
    setDeleting(post.id)
    try {
      await sb(`content_posts?id=eq.${post.id}`, { method:'DELETE' })
      setPosts(p => p.filter(x => x.id!==post.id))
      if (sel?.id===post.id) { setSel(null); setMode('list') }
    } catch {}
    setDeleting(null)
  }

  const filtered = filterStatus ? posts.filter(p => p.status===filterStatus) : posts
  const inp = { width:'100%', background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:'9px 12px', color:'#1a1a2e', fontSize:13, marginBottom:12, fontFamily:'Georgia, serif' }
  const lbl = (t) => <div style={{ fontSize:11, color:'#9a9ab0', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6, fontWeight:600 }}>{t}</div>

  if (mode === 'new' || mode === 'edit') return (
    <div style={{ flex:1, overflowY:'auto', padding:'28px 32px', background:'#ffffff' }}>
      <div style={{ maxWidth:680 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <button onClick={() => setMode('list')} style={{ background:'none', border:'none', color:'#9a9ab0', fontSize:20, cursor:'pointer' }}>←</button>
          <h1 style={{ fontSize:20, color:'#1a1a2e', fontWeight:700 }}>{mode==='new' ? 'Novo Post' : 'Editar Post'}</h1>
        </div>

        {/* Row 1: tone + status */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
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
          <div>
            {lbl('Publicar em')}
            <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(p=>({...p,scheduled_at:e.target.value,status:'scheduled'}))} style={{ ...inp, opacity: form.status==='scheduled' ? 1 : 0.4 }} disabled={form.status !== 'scheduled'} />
          </div>
        </div>

        {/* AI Generator */}
        {lbl('Tema para gerar com IA')}
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <input value={form.context} onChange={e => setForm(p=>({...p,context:e.target.value}))} placeholder="Ex: Como o digital está transformando as revendas agro" style={{ ...inp, marginBottom:0, flex:1 }} onKeyDown={e => e.key==='Enter' && generate()} />
          <button onClick={generate} disabled={generating || (!form.context && !form.title)} style={{ background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:'#fff', padding:'9px 16px', fontSize:12, fontWeight:600, whiteSpace:'nowrap', flexShrink:0 }}>
            {generating ? '✨ Gerando...' : '✨ Gerar com IA'}
          </button>
        </div>

        {/* Content */}
        {lbl('Conteúdo do post')}
        <textarea value={form.content} onChange={e => setForm(p=>({...p,content:e.target.value}))} placeholder="Escreva ou gere o conteúdo do post..." rows={12} style={{ ...inp, resize:'vertical' }} />
        <div style={{ fontSize:11, color:'#c0c0d0', marginTop:-8, marginBottom:16 }}>{form.content.length} caracteres</div>

        {/* Media upload */}
        {lbl('Imagem ou Vídeo (opcional)')}
        <div style={{ marginBottom:16 }}>
          {form.media_url ? (
            <div style={{ background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:10, padding:14, display:'flex', alignItems:'center', gap:12 }}>
              {form.media_type === 'image' && mediaPreview && (
                <img src={mediaPreview} alt="preview" style={{ width:64, height:64, objectFit:'cover', borderRadius:8 }} />
              )}
              {form.media_type === 'video' && (
                <div style={{ width:64, height:64, background:'#1a1a2e', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>🎬</div>
              )}
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#1a1a2e' }}>{form.media_filename}</div>
                <div style={{ fontSize:11, color:'#9a9ab0' }}>{form.media_type === 'video' ? 'Vídeo' : 'Imagem'} · Pronto para publicar</div>
              </div>
              <button onClick={removeMedia} style={{ background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:8, color:'#dc2626', padding:'6px 12px', fontSize:12 }}>Remover</button>
            </div>
          ) : (
            <div onClick={() => fileRef.current?.click()}
              style={{ border:'2px dashed #e0e0ea', borderRadius:10, padding:'24px', textAlign:'center', cursor:'pointer', background:'#f8f8fc', transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='#1e6b3a'; e.currentTarget.style.background='#f0faf4' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='#e0e0ea'; e.currentTarget.style.background='#f8f8fc' }}>
              {uploading ? (
                <div style={{ fontSize:13, color:'#9a9ab0' }}>⬆ Enviando...</div>
              ) : (<>
                <div style={{ fontSize:28, marginBottom:8 }}>📎</div>
                <div style={{ fontSize:13, color:'#6a6a7a', fontWeight:600 }}>Clique para adicionar imagem ou vídeo</div>
                <div style={{ fontSize:11, color:'#9a9ab0', marginTop:4 }}>JPG, PNG, GIF, WEBP, MP4, MOV · Máx 50MB</div>
              </>)}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFileChange} style={{ display:'none' }} />
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => setMode('list')} style={{ flex:1, background:'#fff', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:12, fontSize:13 }}>Cancelar</button>
          <button onClick={() => save('draft')} disabled={saving || !form.content.trim()} style={{ flex:1, background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:12, fontSize:13 }}>💾 Rascunho</button>
          <button onClick={() => form.status==='scheduled' ? save('scheduled') : save()} disabled={saving || !form.content.trim()} style={{ flex:2, background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:'#fff', padding:12, fontSize:13, fontWeight:700 }}>
            {saving ? 'Salvando...' : form.status==='scheduled' ? '📅 Agendar Post' : mode==='new' ? 'Criar Post' : 'Salvar'}
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
          <p style={{ fontSize:12, color:'#9a9ab0', marginTop:4 }}>Crie, agende e gerencie posts para o LinkedIn</p>
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
          {filtered.map(post => {
            const text = post.content || post.final_text || post.generated_text || ''
            const sched = post.scheduled_at || post.scheduled_for
            return (
              <div key={post.id} style={{ background:'#ffffff', border:'1px solid #e8e8f0', borderRadius:12, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', display:'flex', flexDirection:'column' }}>
                {/* Media preview */}
                {post.media_url && post.media_type === 'image' && (
                  <img src={post.media_url} alt="" style={{ width:'100%', height:140, objectFit:'cover' }} />
                )}
                {post.media_url && post.media_type === 'video' && (
                  <div style={{ width:'100%', height:100, background:'#1a1a2e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>🎬</div>
                )}
                <div style={{ padding:16, flex:1, display:'flex', flexDirection:'column' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <span style={{ fontSize:10, color:statusColors[post.status], background:`${statusColors[post.status]}15`, padding:'2px 8px', borderRadius:8, fontWeight:600 }}>{statusLabels[post.status]||post.status}</span>
                    <div style={{ display:'flex', gap:6 }}>
                      {post.tone && <span style={{ fontSize:10, color:'#9a9ab0', background:'#f5f5fa', padding:'2px 8px', borderRadius:8 }}>{post.tone}</span>}
                      {post.media_type && <span style={{ fontSize:10, color:'#2563eb', background:'#eff6ff', padding:'2px 8px', borderRadius:8 }}>{post.media_type==='video'?'🎬 Vídeo':'🖼 Imagem'}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:'#4a4a5a', lineHeight:1.6, flex:1, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:4, WebkitBoxOrient:'vertical', marginBottom:8 }}>
                    {text}
                  </div>
                  {sched && <div style={{ fontSize:11, color:'#d97706', marginBottom:8 }}>📅 {new Date(sched).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>}
                  <div style={{ display:'flex', gap:8, marginTop:'auto' }}>
                    <button onClick={() => openEdit(post)} style={{ flex:1, background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:'7px', fontSize:12, fontWeight:600 }}>✎ Editar</button>
                    <button onClick={() => del(post)} disabled={deleting===post.id} style={{ background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:8, color:'#dc2626', padding:'7px 12px', fontSize:12 }}>{deleting===post.id?'...':'✕'}</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
