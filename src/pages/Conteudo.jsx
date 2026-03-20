import { useState, useEffect, useRef } from 'react'
import { sb, getProfileId, getAccessToken, SB_URL, SB_KEY, N8N_CONTENT } from '../config.js'

const TONES = ['Educativo','Provocativo','Inspirador','Storytelling','Comercial','Bastidores']
const N8N_IMAGE = 'https://n8n-webhook.chasocial.com.br/webhook/generate-image'
const EMPTY = { title:'', content:'', tone:'Educativo', context:'', scheduled_at:'', status:'draft', media_url:'', media_type:'', media_filename:'', image_prompt:'' }

const statusColors = { draft:'#9a9ab0', scheduled:'#d97706', published:'#059669' }
const statusLabels = { draft:'Rascunho', scheduled:'Agendado', published:'Publicado' }

export default function Conteudo() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('list')
  const [form, setForm] = useState(EMPTY)
  const [sel, setSel] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [uploading, setUploading] = useState(false)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [imageTab, setImageTab] = useState('upload') // 'upload' | 'generate'
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

  const openNew = () => { setForm(EMPTY); setSel(null); setMode('new'); setMediaPreview(null); setImageTab('upload') }

  const openEdit = (p) => {
    setForm({
      title: p.title||'', content: p.content||p.final_text||p.generated_text||'',
      tone: p.tone||'Educativo', context: p.context||'',
      scheduled_at: p.scheduled_at||p.scheduled_for||'',
      status: p.status||'draft',
      media_url: p.media_url||'', media_type: p.media_type||'', media_filename: p.media_filename||'',
      image_prompt: p.image_prompt||''
    })
    setSel(p); setMode('edit')
    setMediaPreview(p.media_url && p.media_type==='image' ? p.media_url : null)
    setImageTab(p.media_url ? 'upload' : 'generate')
  }

  // ── Upload de arquivo ──────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${getProfileId()}/${Date.now()}.${ext}`
      const isVideo = file.type.startsWith('video/')
      const res = await fetch(`${SB_URL}/storage/v1/object/post-media/${path}`, {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${getAccessToken()}`, 'Content-Type': file.type },
        body: file
      })
      if (!res.ok) throw new Error('Upload falhou')
      const publicUrl = `${SB_URL}/storage/v1/object/public/post-media/${path}`
      setForm(p => ({ ...p, media_url: publicUrl, media_type: isVideo?'video':'image', media_filename: file.name }))
      if (!isVideo) setMediaPreview(publicUrl)
    } catch (e) { console.error(e); alert('Erro no upload. Tente novamente.') }
    setUploading(false)
  }

  // ── Gerar imagem com IA ────────────────────────────────────────────────────
  const generateImage = async () => {
    if (!form.image_prompt.trim()) return
    setGeneratingImage(true)
    try {
      const res = await fetch(N8N_IMAGE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: getProfileId(),
          prompt: form.image_prompt,
          context: form.context || form.title || 'post de agronegócio para LinkedIn'
        })
      })
      const data = await res.json()
      const imgUrl = data.image_url || data.url || ''
      if (imgUrl) {
        setForm(p => ({ ...p, media_url: imgUrl, media_type: 'image', media_filename: 'imagem-gerada-ia.png' }))
        setMediaPreview(imgUrl)
      } else {
        alert('IA não retornou imagem. Verifique o W8 no n8n.')
      }
    } catch (e) { console.error(e); alert('Erro ao gerar imagem.') }
    setGeneratingImage(false)
  }

  const removeMedia = () => {
    setForm(p => ({ ...p, media_url:'', media_type:'', media_filename:'' }))
    setMediaPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Gerar texto com IA ─────────────────────────────────────────────────────
  const generate = async () => {
    if (!form.context && !form.title) return
    setGenerating(true)
    try {
      const res = await fetch(N8N_CONTENT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: getProfileId(), topic: form.context || form.title, tone: form.tone })
      })
      const data = await res.json()
      const text = data.content || data.text || data.generated_text || ''
      if (text) setForm(p => ({...p, content: text}))
    } catch (e) { console.error(e) }
    setGenerating(false)
  }

  // ── Salvar (rascunho ou agendado) ─────────────────────────────────────────
  const save = async (statusOverride) => {
    if (!form.content.trim()) return
    setSaving(true)
    const status = statusOverride || form.status
    const payload = {
      ...form,
      profile_id: getProfileId(),
      status,
      title: form.title || form.content.substring(0,60)+'...',
      final_text: form.content,
      scheduled_for: status === 'scheduled' && form.scheduled_at ? form.scheduled_at : null
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

  // ── Publicar agora ────────────────────────────────────────────────────────
  const publishNow = async () => {
    if (!form.content.trim()) return
    if (!confirm('Publicar este post agora no LinkedIn?')) return
    setPublishing(true)
    const payload = {
      ...form,
      profile_id: getProfileId(),
      status: 'published',
      title: form.title || form.content.substring(0,60)+'...',
      final_text: form.content,
      published_at: new Date().toISOString(),
      scheduled_for: null
    }
    try {
      let postId = sel?.id
      if (mode === 'new') {
        const data = await sb('content_posts', { method:'POST', body: JSON.stringify({...payload, status:'published'}) })
        const created = Array.isArray(data)?data[0]:data
        postId = created?.id
        setPosts(p => [created, ...p])
      } else {
        await sb(`content_posts?id=eq.${sel.id}`, { method:'PATCH', body: JSON.stringify(payload) })
        setPosts(p => p.map(x => x.id===sel.id ? {...x,...payload} : x))
      }
      // TODO: chamar W via n8n para publicar no LinkedIn via Unipile
      alert('✅ Post marcado como publicado! Integre com Unipile para publicação automática.')
      setMode('list'); setSel(null); setMediaPreview(null)
    } catch (e) { console.error(e) }
    setPublishing(false)
  }

  const del = async (post) => {
    if (!confirm('Excluir post?')) return
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

  // ── EDITOR ─────────────────────────────────────────────────────────────────
  if (mode === 'new' || mode === 'edit') return (
    <div style={{ flex:1, overflowY:'auto', padding:'24px 32px', background:'#ffffff' }}>
      <div style={{ maxWidth:700 }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <button onClick={()=>setMode('list')} style={{ background:'none', border:'none', color:'#9a9ab0', fontSize:20, cursor:'pointer' }}>←</button>
          <h1 style={{ fontSize:20, color:'#1a1a2e', fontWeight:700, flex:1 }}>{mode==='new'?'Novo Post':'Editar Post'}</h1>
          {/* Publicar agora - destaque */}
          <button onClick={publishNow} disabled={publishing || !form.content.trim()} style={{ background:'linear-gradient(135deg,#1a1a2e,#2a2a4e)', border:'none', borderRadius:8, color:'#fff', padding:'9px 18px', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:8, opacity: !form.content.trim()?0.5:1 }}>
            {publishing ? '⏳ Publicando...' : '⚡ Publicar agora'}
          </button>
        </div>

        {/* Row 1: tom + status */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
          <div>
            {lbl('Tom de voz')}
            <select value={form.tone} onChange={e=>setForm(p=>({...p,tone:e.target.value}))} style={inp}>
              {TONES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            {lbl('Status')}
            <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={inp}>
              <option value="draft">Rascunho</option>
              <option value="scheduled">Agendado</option>
              <option value="published">Publicado</option>
            </select>
          </div>
          <div style={{ opacity: form.status==='scheduled' ? 1 : 0.4 }}>
            {lbl('Publicar em')}
            <input type="datetime-local" value={form.scheduled_at} onChange={e=>setForm(p=>({...p,scheduled_at:e.target.value,status:'scheduled'}))} style={inp} />
          </div>
        </div>

        {/* Gerador de texto IA */}
        {lbl('Tema para gerar com IA')}
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <input value={form.context} onChange={e=>setForm(p=>({...p,context:e.target.value}))} placeholder="Ex: Como o agromarketing digital aumenta as vendas em revendas" style={{ ...inp, marginBottom:0, flex:1 }} onKeyDown={e=>e.key==='Enter'&&generate()} />
          <button onClick={generate} disabled={generating||(!form.context&&!form.title)} style={{ background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:'#fff', padding:'9px 16px', fontSize:12, fontWeight:600, whiteSpace:'nowrap', flexShrink:0 }}>
            {generating?'✨ Gerando...':'✨ Gerar texto'}
          </button>
        </div>

        {/* Texto do post */}
        {lbl('Conteúdo do post')}
        <textarea value={form.content} onChange={e=>setForm(p=>({...p,content:e.target.value}))} placeholder="Escreva ou gere o texto do post..." rows={11} style={{ ...inp, resize:'vertical' }} />
        <div style={{ fontSize:11, color:'#c0c0d0', marginTop:-8, marginBottom:20 }}>{form.content.length} caracteres</div>

        {/* ── SEÇÃO DE IMAGEM ── */}
        <div style={{ background:'#f8f8fc', border:'1px solid #e8e8f0', borderRadius:12, padding:20, marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#1a1a2e', marginBottom:14 }}>🖼 Imagem / Vídeo do post</div>

          {/* Tabs: Upload vs Gerar */}
          <div style={{ display:'flex', background:'#f0f0f5', borderRadius:8, padding:3, marginBottom:16, width:'fit-content' }}>
            {[['upload','📁 Subir arquivo'],['generate','✨ Gerar com IA']].map(([id,l])=>(
              <button key={id} onClick={()=>setImageTab(id)} style={{ padding:'6px 16px', borderRadius:6, border:'none', background:imageTab===id?'#fff':'transparent', color:imageTab===id?'#1a1a2e':'#9a9ab0', fontSize:12, fontWeight:imageTab===id?600:400, boxShadow:imageTab===id?'0 1px 3px rgba(0,0,0,0.08)':'none', cursor:'pointer' }}>{l}</button>
            ))}
          </div>

          {/* Preview da mídia atual */}
          {form.media_url && (
            <div style={{ background:'#fff', border:'1px solid #e0e0ea', borderRadius:10, padding:12, marginBottom:14, display:'flex', alignItems:'center', gap:12 }}>
              {form.media_type==='image' && mediaPreview && (
                <img src={mediaPreview} alt="preview" style={{ width:72, height:72, objectFit:'cover', borderRadius:8, border:'1px solid #e0e0ea' }} />
              )}
              {form.media_type==='image' && !mediaPreview && (
                <div style={{ width:72, height:72, background:'#f0f8f3', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>🖼</div>
              )}
              {form.media_type==='video' && (
                <div style={{ width:72, height:72, background:'#1a1a2e', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>🎬</div>
              )}
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#1a1a2e', marginBottom:2 }}>{form.media_filename || 'Mídia anexada'}</div>
                <div style={{ fontSize:11, color:'#9a9ab0' }}>{form.media_type==='video'?'Vídeo':'Imagem'} · Pronto para publicar</div>
              </div>
              <button onClick={removeMedia} style={{ background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:8, color:'#dc2626', padding:'6px 12px', fontSize:12, flexShrink:0 }}>✕ Remover</button>
            </div>
          )}

          {/* Tab: Upload */}
          {imageTab === 'upload' && (
            <div>
              <div onClick={()=>fileRef.current?.click()} style={{ border:'2px dashed #e0e0ea', borderRadius:10, padding:'20px', textAlign:'center', cursor:'pointer', background:'#fff', transition:'all 0.15s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='#1e6b3a';e.currentTarget.style.background='#f0faf4'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#e0e0ea';e.currentTarget.style.background='#fff'}}>
                {uploading ? (
                  <div style={{ fontSize:13, color:'#9a9ab0' }}>⬆ Enviando arquivo...</div>
                ) : (<>
                  <div style={{ fontSize:28, marginBottom:8 }}>📎</div>
                  <div style={{ fontSize:13, color:'#6a6a7a', fontWeight:600 }}>Clique para adicionar imagem ou vídeo</div>
                  <div style={{ fontSize:11, color:'#9a9ab0', marginTop:4 }}>JPG, PNG, GIF, WEBP, MP4 · Máx 50MB</div>
                </>)}
              </div>
              <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFileChange} style={{ display:'none' }} />
            </div>
          )}

          {/* Tab: Gerar com IA */}
          {imageTab === 'generate' && (
            <div>
              <div style={{ fontSize:11, color:'#9a9ab0', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6, fontWeight:600 }}>Descreva a imagem que quer gerar</div>
              <textarea
                value={form.image_prompt}
                onChange={e=>setForm(p=>({...p,image_prompt:e.target.value}))}
                placeholder="Ex: Foto de um fazendeiro moderno usando tablet no campo de soja ao pôr do sol, estilo fotográfico profissional, cores vibrantes, agronegócio brasileiro"
                rows={3}
                style={{ ...inp, resize:'vertical', marginBottom:10 }}
              />
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
                {[
                  'Fazendeiro moderno com tecnologia no campo',
                  'Plantação de soja com drone sobrevoando',
                  'Reunião comercial em cooperativa agrícola',
                  'Infográfico estilo clean sobre agro',
                ].map((s,i)=>(
                  <button key={i} onClick={()=>setForm(p=>({...p,image_prompt:s}))} style={{ background:'#f0f8f3', border:'1px solid #b8e8c8', borderRadius:6, color:'#1e6b3a', padding:'4px 10px', fontSize:11, cursor:'pointer' }}>{s}</button>
                ))}
              </div>
              <button onClick={generateImage} disabled={generatingImage||!form.image_prompt.trim()} style={{ width:'100%', background: !form.image_prompt.trim()?'#e0e0ea':'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:!form.image_prompt.trim()?'#9a9ab0':'#fff', padding:'10px', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {generatingImage ? (<><div style={{ width:16, height:16, border:'2px solid #fff', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />Gerando imagem...</>) : '✨ Gerar imagem com IA'}
              </button>
              <div style={{ fontSize:11, color:'#9a9ab0', marginTop:8, textAlign:'center' }}>
                Usa o W8 (n8n) — conecte a DALL-E, Midjourney ou outra IA de imagens
              </div>
            </div>
          )}
        </div>

        {/* Botões de ação */}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={()=>setMode('list')} style={{ flex:1, background:'#fff', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:12, fontSize:13 }}>Cancelar</button>
          <button onClick={()=>save('draft')} disabled={saving||!form.content.trim()} style={{ flex:1, background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:12, fontSize:13 }}>
            💾 Salvar rascunho
          </button>
          <button onClick={()=>form.status==='scheduled'?save('scheduled'):save()} disabled={saving||!form.content.trim()} style={{ flex:2, background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:'#fff', padding:12, fontSize:13, fontWeight:700 }}>
            {saving?'Salvando...':form.status==='scheduled'?'📅 Agendar post':'Salvar alterações'}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // ── LISTAGEM ───────────────────────────────────────────────────────────────
  return (
    <div style={{ flex:1, overflowY:'auto', padding:'28px 32px', background:'#ffffff' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:20, color:'#1a1a2e', fontWeight:700 }}>Conteúdo</h1>
          <p style={{ fontSize:12, color:'#9a9ab0', marginTop:4 }}>Crie, agende e publique posts no LinkedIn</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:'8px 12px', color:'#6a6a7a', fontSize:12 }}>
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
              <div key={post.id} style={{ background:'#fff', border:'1px solid #e8e8f0', borderRadius:12, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', display:'flex', flexDirection:'column' }}>
                {post.media_url && post.media_type==='image' && (
                  <img src={post.media_url} alt="" style={{ width:'100%', height:140, objectFit:'cover' }} onError={e=>e.target.style.display='none'} />
                )}
                {post.media_url && post.media_type==='video' && (
                  <div style={{ width:'100%', height:90, background:'#1a1a2e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>🎬</div>
                )}
                <div style={{ padding:16, flex:1, display:'flex', flexDirection:'column' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <span style={{ fontSize:10, color:statusColors[post.status], background:`${statusColors[post.status]}15`, padding:'2px 8px', borderRadius:8, fontWeight:600 }}>{statusLabels[post.status]||post.status}</span>
                    <div style={{ display:'flex', gap:5 }}>
                      {post.tone && <span style={{ fontSize:10, color:'#9a9ab0', background:'#f5f5fa', padding:'2px 7px', borderRadius:7 }}>{post.tone}</span>}
                      {post.media_type && <span style={{ fontSize:10, color:'#2563eb', background:'#eff6ff', padding:'2px 7px', borderRadius:7 }}>{post.media_type==='video'?'🎬':'🖼'}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:'#4a4a5a', lineHeight:1.6, flex:1, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:4, WebkitBoxOrient:'vertical', marginBottom:8 }}>{text}</div>
                  {sched && <div style={{ fontSize:11, color:'#d97706', marginBottom:8 }}>📅 {new Date(sched).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>}
                  <div style={{ display:'flex', gap:8, marginTop:'auto' }}>
                    <button onClick={()=>openEdit(post)} style={{ flex:1, background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:'7px', fontSize:12, fontWeight:600 }}>✎ Editar</button>
                    {post.status !== 'published' && (
                      <button onClick={async()=>{
                        if(!confirm('Publicar agora?'))return
                        await sb(`content_posts?id=eq.${post.id}`,{method:'PATCH',body:JSON.stringify({status:'published',published_at:new Date().toISOString()})})
                        setPosts(p=>p.map(x=>x.id===post.id?{...x,status:'published'}:x))
                      }} style={{ background:'#f0faf4', border:'1px solid #b8e8c8', borderRadius:8, color:'#1e6b3a', padding:'7px 10px', fontSize:12, fontWeight:600 }}>⚡</button>
                    )}
                    <button onClick={()=>del(post)} disabled={deleting===post.id} style={{ background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:8, color:'#dc2626', padding:'7px 12px', fontSize:12 }}>{deleting===post.id?'...':'✕'}</button>
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
