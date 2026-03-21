import { useState, useEffect, useRef } from 'react'
import { sb, getProfileId, getAccessToken, SB_URL, SB_KEY, N8N_CONTENT } from '../config.js'

const TONES = ['Educativo','Provocativo','Inspirador','Storytelling','Comercial','Bastidores']
const N8N_IMAGE = 'https://n8n-webhook.chasocial.com.br/webhook/generate-image'
const EDGE_PUBLISH = 'https://juabbkewrtbignqrufgp.supabase.co/functions/v1/publish-post'
const EMPTY = { title:'', content:'', tone:'Educativo', context:'', scheduled_at:'', status:'draft', media_url:'', media_type:'', media_filename:'', image_prompt:'' }

const statusColors = { draft:'#9a9ab0', scheduled:'#d97706', published:'#059669', failed:'#dc2626' }
const statusLabels = { draft:'Rascunho', scheduled:'Agendado', published:'Publicado', failed:'Falhou' }

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
  const [publishResult, setPublishResult] = useState(null) // { ok, message }
  const [deleting, setDeleting] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [uploading, setUploading] = useState(false)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [imageTab, setImageTab] = useState('upload')
  const [imageError, setImageError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
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

  const openNew = () => {
    setForm(EMPTY); setSel(null); setMode('new')
    setMediaPreview(null); setImageTab('upload')
    setPublishResult(null); setImageError('')
  }

  const openEdit = (p) => {
    setForm({
      title:p.title||'', content:p.content||p.final_text||p.generated_text||'',
      tone:p.tone||'Educativo', context:p.context||'',
      scheduled_at:p.scheduled_at||p.scheduled_for||'',
      status:p.status||'draft',
      media_url:p.media_url||'', media_type:p.media_type||'',
      media_filename:p.media_filename||'', image_prompt:p.image_prompt||''
    })
    setSel(p); setMode('edit')
    setMediaPreview(p.media_url && p.media_type==='image' ? p.media_url : null)
    setImageTab(p.media_url ? 'upload' : 'generate')
    setPublishResult(null); setImageError('')
  }

  // ── Upload arquivo ────────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${getProfileId()}/${Date.now()}.${ext}`
      const isVideo = file.type.startsWith('video/')
      const res = await fetch(`${SB_URL}/storage/v1/object/post-media/${path}`, {
        method:'POST',
        headers:{ apikey:SB_KEY, Authorization:`Bearer ${getAccessToken()}`, 'Content-Type':file.type },
        body:file
      })
      if (!res.ok) throw new Error('Upload falhou')
      const publicUrl = `${SB_URL}/storage/v1/object/public/post-media/${path}`
      setForm(p=>({...p, media_url:publicUrl, media_type:isVideo?'video':'image', media_filename:file.name}))
      if (!isVideo) setMediaPreview(publicUrl)
    } catch (e) {
      setImageError('Erro no upload. Tente novamente.')
      setTimeout(() => setImageError(''), 4000)
    }
    setUploading(false)
  }

  // ── Gerar imagem ──────────────────────────────────────────────────────────
  const generateImage = async () => {
    if (!form.image_prompt.trim()) return
    setGeneratingImage(true); setImageError('')
    try {
      const res = await fetch(N8N_IMAGE, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ profile_id:getProfileId(), prompt:form.image_prompt, context:form.context||form.title||'agronegócio' })
      })
      const data = await res.json()
      const imgUrl = data.image_url || data.url || ''
      if (imgUrl) {
        setForm(p=>({...p, media_url:imgUrl, media_type:'image', media_filename:'imagem-gerada-ia.png'}))
        setMediaPreview(imgUrl)
      } else {
        setImageError('IA não retornou imagem. Verifique o W8 no n8n.')
      }
    } catch {
      setImageError('Erro ao gerar imagem. Verifique o W8 no n8n.')
    }
    setGeneratingImage(false)
  }

  const removeMedia = () => {
    setForm(p=>({...p, media_url:'', media_type:'', media_filename:''}))
    setMediaPreview(null)
    if (fileRef.current) fileRef.current.value=''
  }

  // ── Gerar texto ───────────────────────────────────────────────────────────
  const generate = async () => {
    if (!form.context && !form.title) return
    setGenerating(true)
    try {
      // Busca chaves das configurações
      const cfgData = await sb(`settings?profile_id=eq.${getProfileId()}`).catch(() => [])
      const cfg = cfgData?.[0] || {}
      const openaiKey = cfg.openai_key || ''
      const anthropicKey = cfg.anthropic_key || ''

      const prompt = `Você é especialista em marketing para o agronegócio brasileiro (CHA Agromkt / Método S.A.F.R.A.™).

Crie um post para LinkedIn sobre: "${form.context || form.title}"
Tom: ${form.tone}
Contexto: agronegócio brasileiro, marketing e vendas para insumos, cooperativas e revendas

Estrutura obrigatória:
- Gancho poderoso na primeira linha (problema, provocação ou dado)
- 3-4 parágrafos de valor real
- CTA claro no final
- Emojis estratégicos
- 5 hashtags relevantes ao final

Retorne APENAS o texto do post, sem explicações.`

      let text = ''

      if (openaiKey) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 900, messages: [{ role: 'user', content: prompt }] })
        })
        const data = await res.json()
        text = data?.choices?.[0]?.message?.content?.trim() || ''
      }

      if (!text && anthropicKey) {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 900, messages: [{ role: 'user', content: prompt }] })
        })
        const data = await res.json()
        text = data?.content?.[0]?.text?.trim() || ''
      }

      if (!text) {
        setImageError('Configure uma chave OpenAI ou Anthropic em ⚙️ Configurações para gerar textos.')
        setTimeout(() => setImageError(''), 5000)
      } else {
        setForm(p => ({...p, content: text}))
      }
    } catch(e) {
      console.error(e)
      setImageError('Erro ao gerar texto. Verifique suas chaves em Configurações.')
      setTimeout(() => setImageError(''), 5000)
    }
    setGenerating(false)
  }

  // ── Salvar ────────────────────────────────────────────────────────────────
  const save = async (statusOverride) => {
    if (!form.content.trim()) return
    setSaving(true)
    const status = statusOverride || form.status
    const payload = {
      ...form, profile_id:getProfileId(), status,
      title:form.title||form.content.substring(0,60)+'...',
      final_text:form.content,
      scheduled_for:status==='scheduled'&&form.scheduled_at ? form.scheduled_at : null
    }
    try {
      if (mode==='new') {
        const data = await sb('content_posts',{method:'POST',body:JSON.stringify(payload)})
        setPosts(p=>[Array.isArray(data)?data[0]:data,...p])
      } else {
        await sb(`content_posts?id=eq.${sel.id}`,{method:'PATCH',body:JSON.stringify(payload)})
        setPosts(p=>p.map(x=>x.id===sel.id?{...x,...payload}:x))
      }
      setMode('list'); setSel(null); setMediaPreview(null)
    } catch(e) { console.error(e) }
    setSaving(false)
  }

  // ── Publicar agora ────────────────────────────────────────────────────────
  const publishNow = async () => {
    if (!form.content.trim()) return
    setPublishing(true); setPublishResult(null)

    try {
      // Primeiro salva o post
      const payload = {
        ...form, profile_id:getProfileId(), status:'draft',
        title:form.title||form.content.substring(0,60)+'...',
        final_text:form.content
      }

      let postId = sel?.id
      if (mode==='new') {
        const data = await sb('content_posts',{method:'POST',body:JSON.stringify(payload)})
        const created = Array.isArray(data)?data[0]:data
        postId = created?.id
        setPosts(p=>[created,...p])
        setSel(created)
      } else {
        await sb(`content_posts?id=eq.${sel.id}`,{method:'PATCH',body:JSON.stringify(payload)})
      }

      // Chama Edge Function para publicar
      const res = await fetch(EDGE_PUBLISH, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ post_id: postId })
      })
      const result = await res.json()

      if (result.success) {
        // Atualiza lista
        setPosts(p=>p.map(x=>x.id===postId ? {...x, status:'published', published_at:new Date().toISOString()} : x))
        setPublishResult({
          ok: true,
          message: result.published
            ? '✅ Publicado no LinkedIn com sucesso!'
            : '⚠️ Salvo como publicado no banco. Para publicar no LinkedIn, adicione sua chave Unipile em ⚙️ Configurações.'
        })
        // Volta para lista após 2s
        setTimeout(() => { setMode('list'); setSel(null); setMediaPreview(null) }, 2000)
      } else {
        setPublishResult({ ok:false, message:`❌ Erro: ${result.error || 'Falha ao publicar'}` })
      }
    } catch(e) {
      setPublishResult({ ok:false, message:`❌ Erro de conexão: ${e.message}` })
    }
    setPublishing(false)
  }

  const del = async (post) => {
    setDeleting(post.id)
    try {
      await sb(`content_posts?id=eq.${post.id}`,{method:'DELETE'})
      setPosts(p=>p.filter(x=>x.id!==post.id))
      if (sel?.id===post.id) { setSel(null); setMode('list') }
    } catch {}
    setDeleting(null); setConfirmDelete(null)
  }

  const filtered = filterStatus ? posts.filter(p=>p.status===filterStatus) : posts

  const inp = { width:'100%', background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:'9px 12px', color:'#1a1a2e', fontSize:13, marginBottom:12, fontFamily:'Georgia, serif' }
  const lbl = (t) => <div style={{ fontSize:11, color:'#9a9ab0', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6, fontWeight:600 }}>{t}</div>

  // ── EDITOR ────────────────────────────────────────────────────────────────
  if (mode==='new'||mode==='edit') return (
    <div style={{ flex:1, overflowY:'auto', padding:'24px 32px', background:'#ffffff' }}>
      <div style={{ maxWidth:700 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <button onClick={()=>setMode('list')} style={{ background:'none', border:'none', color:'#9a9ab0', fontSize:20, cursor:'pointer' }}>←</button>
          <h1 style={{ fontSize:20, color:'#1a1a2e', fontWeight:700, flex:1 }}>{mode==='new'?'Novo Post':'Editar Post'}</h1>
          <button onClick={publishNow} disabled={publishing||!form.content.trim()}
            style={{ background:publishing?'#e0e0ea':'linear-gradient(135deg,#1a1a2e,#2a2a4e)', border:'none', borderRadius:8, color:publishing?'#9a9ab0':'#fff', padding:'9px 20px', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:8, opacity:!form.content.trim()?0.5:1 }}>
            {publishing ? (<><div style={{ width:14,height:14,border:'2px solid #9a9ab0',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite' }} />Publicando...</>) : '⚡ Publicar agora'}
          </button>
        </div>

        {/* Feedback de publicação — inline, sem alert() */}
        {publishResult && (
          <div style={{ background:publishResult.ok?'#f0faf4':'#fff5f5', border:`1px solid ${publishResult.ok?'#b8e8c8':'#ffd0d0'}`, borderRadius:10, padding:'12px 16px', marginBottom:16, fontSize:13, color:publishResult.ok?'#1e6b3a':'#dc2626', fontWeight:600 }}>
            {publishResult.message}
          </div>
        )}

        {/* Tom + Status + Data */}
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
          <div style={{ opacity:form.status==='scheduled'?1:0.4 }}>
            {lbl('Publicar em')}
            <input type="datetime-local" value={form.scheduled_at}
              onChange={e=>setForm(p=>({...p,scheduled_at:e.target.value,status:'scheduled'}))} style={inp} />
          </div>
        </div>

        {/* Gerador de texto */}
        {lbl('Tema para gerar com IA')}
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <input value={form.context} onChange={e=>setForm(p=>({...p,context:e.target.value}))}
            placeholder="Ex: Como o digital transforma revendas agro"
            style={{ ...inp, marginBottom:0, flex:1 }}
            onKeyDown={e=>e.key==='Enter'&&generate()} />
          <button onClick={generate} disabled={generating||(!form.context&&!form.title)}
            style={{ background:generating?'#e0e0ea':'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:generating?'#9a9ab0':'#fff', padding:'9px 16px', fontSize:12, fontWeight:600, whiteSpace:'nowrap', flexShrink:0 }}>
            {generating?'✨ Gerando...':'✨ Gerar texto'}
          </button>
        </div>

        {/* Conteúdo */}
        {lbl('Conteúdo do post')}
        <textarea value={form.content} onChange={e=>setForm(p=>({...p,content:e.target.value}))}
          placeholder="Escreva ou gere o texto do post..." rows={11} style={{ ...inp, resize:'vertical' }} />
        <div style={{ fontSize:11, color:'#c0c0d0', marginTop:-8, marginBottom:20 }}>{form.content.length} caracteres</div>

        {/* Seção de imagem */}
        <div style={{ background:'#f8f8fc', border:'1px solid #e8e8f0', borderRadius:12, padding:20, marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#1a1a2e', marginBottom:14 }}>🖼 Imagem / Vídeo do post</div>

          <div style={{ display:'flex', background:'#f0f0f5', borderRadius:8, padding:3, marginBottom:16, width:'fit-content', gap:2 }}>
            {[['upload','📁 Subir arquivo'],['generate','✨ Gerar com IA']].map(([id,l])=>(
              <button key={id} onClick={()=>{setImageTab(id);setImageError('')}}
                style={{ padding:'6px 16px', borderRadius:6, border:'none', background:imageTab===id?'#fff':'transparent', color:imageTab===id?'#1a1a2e':'#9a9ab0', fontSize:12, fontWeight:imageTab===id?600:400, cursor:'pointer', boxShadow:imageTab===id?'0 1px 3px rgba(0,0,0,0.08)':'none' }}>{l}</button>
            ))}
          </div>

          {/* Preview */}
          {form.media_url && (
            <div style={{ background:'#fff', border:'1px solid #e0e0ea', borderRadius:10, padding:12, marginBottom:14, display:'flex', alignItems:'center', gap:12 }}>
              {form.media_type==='image'&&mediaPreview && <img src={mediaPreview} alt="preview" style={{ width:72,height:72,objectFit:'cover',borderRadius:8,border:'1px solid #e0e0ea' }} onError={e=>e.target.style.display='none'} />}
              {form.media_type==='image'&&!mediaPreview && <div style={{ width:72,height:72,background:'#f0f8f3',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28 }}>🖼</div>}
              {form.media_type==='video' && <div style={{ width:72,height:72,background:'#1a1a2e',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28 }}>🎬</div>}
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:600,color:'#1a1a2e',marginBottom:2 }}>{form.media_filename||'Mídia anexada'}</div>
                <div style={{ fontSize:11,color:'#9a9ab0' }}>{form.media_type==='video'?'Vídeo':'Imagem'} · Pronto para publicar</div>
              </div>
              <button onClick={removeMedia} style={{ background:'#fff5f5',border:'1px solid #ffd0d0',borderRadius:8,color:'#dc2626',padding:'6px 12px',fontSize:12,flexShrink:0 }}>✕ Remover</button>
            </div>
          )}

          {/* Erro de imagem */}
          {imageError && <div style={{ background:'#fff5f5',border:'1px solid #ffd0d0',borderRadius:8,padding:'8px 12px',marginBottom:10,fontSize:12,color:'#dc2626' }}>{imageError}</div>}

          {/* Tab upload */}
          {imageTab==='upload' && (
            <div>
              <div onClick={()=>fileRef.current?.click()}
                style={{ border:'2px dashed #e0e0ea',borderRadius:10,padding:'20px',textAlign:'center',cursor:'pointer',background:'#fff',transition:'all 0.15s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='#1e6b3a';e.currentTarget.style.background='#f0faf4'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#e0e0ea';e.currentTarget.style.background='#fff'}}>
                {uploading ? <div style={{ fontSize:13,color:'#9a9ab0' }}>⬆ Enviando arquivo...</div>
                : (<>
                  <div style={{ fontSize:28,marginBottom:8 }}>📎</div>
                  <div style={{ fontSize:13,color:'#6a6a7a',fontWeight:600 }}>Clique para adicionar imagem ou vídeo</div>
                  <div style={{ fontSize:11,color:'#9a9ab0',marginTop:4 }}>JPG, PNG, GIF, WEBP, MP4 · Máx 50MB</div>
                </>)}
              </div>
              <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFileChange} style={{ display:'none' }} />
            </div>
          )}

          {/* Tab gerar */}
          {imageTab==='generate' && (
            <div>
              <div style={{ fontSize:11,color:'#9a9ab0',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6,fontWeight:600 }}>Descreva a imagem</div>
              <textarea value={form.image_prompt} onChange={e=>setForm(p=>({...p,image_prompt:e.target.value}))}
                placeholder="Ex: Fazendeiro moderno usando tablet no campo de soja ao pôr do sol, fotografia profissional, cores vibrantes"
                rows={3} style={{ ...inp, resize:'vertical', marginBottom:10 }} />
              <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:12 }}>
                {['Fazendeiro moderno com tecnologia','Soja com drone sobrevoando','Reunião em cooperativa agrícola','Infográfico clean sobre agro'].map((s,i)=>(
                  <button key={i} onClick={()=>setForm(p=>({...p,image_prompt:s}))}
                    style={{ background:'#f0f8f3',border:'1px solid #b8e8c8',borderRadius:6,color:'#1e6b3a',padding:'4px 10px',fontSize:11,cursor:'pointer' }}>{s}</button>
                ))}
              </div>
              <button onClick={generateImage} disabled={generatingImage||!form.image_prompt.trim()}
                style={{ width:'100%',background:!form.image_prompt.trim()?'#e0e0ea':'linear-gradient(135deg,#1e6b3a,#2d9e4f)',border:'none',borderRadius:8,color:!form.image_prompt.trim()?'#9a9ab0':'#fff',padding:'10px',fontSize:13,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
                {generatingImage?(<><div style={{ width:16,height:16,border:'2px solid #fff',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite' }} />Gerando imagem...</>):'✨ Gerar imagem com IA'}
              </button>
            </div>
          )}
        </div>

        {/* Ações */}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={()=>setMode('list')} style={{ flex:1,background:'#fff',border:'1px solid #e0e0ea',borderRadius:8,color:'#6a6a7a',padding:12,fontSize:13 }}>Cancelar</button>
          <button onClick={()=>save('draft')} disabled={saving||!form.content.trim()}
            style={{ flex:1,background:'#f8f8fc',border:'1px solid #e0e0ea',borderRadius:8,color:'#6a6a7a',padding:12,fontSize:13 }}>💾 Rascunho</button>
          <button onClick={()=>form.status==='scheduled'?save('scheduled'):save()} disabled={saving||!form.content.trim()}
            style={{ flex:2,background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)',border:'none',borderRadius:8,color:'#fff',padding:12,fontSize:13,fontWeight:700 }}>
            {saving?'Salvando...':form.status==='scheduled'?'📅 Agendar':'Salvar'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // ── LISTAGEM ──────────────────────────────────────────────────────────────
  return (
    <div style={{ flex:1, overflowY:'auto', padding:'28px 32px', background:'#ffffff' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:20,color:'#1a1a2e',fontWeight:700 }}>Conteúdo</h1>
          <p style={{ fontSize:12,color:'#9a9ab0',marginTop:4 }}>Crie, agende e publique posts no LinkedIn</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
            style={{ background:'#f8f8fc',border:'1px solid #e0e0ea',borderRadius:8,padding:'8px 12px',color:'#6a6a7a',fontSize:12 }}>
            <option value="">Todos</option>
            <option value="draft">Rascunhos</option>
            <option value="scheduled">Agendados</option>
            <option value="published">Publicados</option>
          </select>
          <button onClick={openNew} style={{ background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)',border:'none',borderRadius:8,color:'#fff',padding:'10px 20px',fontSize:13,fontWeight:600 }}>+ Novo Post</button>
        </div>
      </div>

      {loading ? <div style={{ textAlign:'center',color:'#9a9ab0',padding:40 }}>Carregando...</div>
      : filtered.length===0 ? (
        <div style={{ textAlign:'center',padding:60,color:'#c0c0d0' }}>
          <div style={{ fontSize:40,marginBottom:12 }}>✦</div>
          <div style={{ fontSize:14,marginBottom:20 }}>Nenhum post ainda</div>
          <button onClick={openNew} style={{ background:'#f0f8f3',border:'1px solid #b8e8c8',borderRadius:8,color:'#1e6b3a',padding:'10px 20px',fontSize:13 }}>Criar primeiro post</button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:16 }}>
          {filtered.map(post => {
            const text = post.content||post.final_text||post.generated_text||''
            const sched = post.scheduled_at||post.scheduled_for
            return (
              <div key={post.id} style={{ background:'#fff',border:'1px solid #e8e8f0',borderRadius:12,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.05)',display:'flex',flexDirection:'column' }}>
                {post.media_url&&post.media_type==='image' && <img src={post.media_url} alt="" style={{ width:'100%',height:140,objectFit:'cover' }} onError={e=>e.target.style.display='none'} />}
                {post.media_url&&post.media_type==='video' && <div style={{ width:'100%',height:90,background:'#1a1a2e',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32 }}>🎬</div>}
                <div style={{ padding:16,flex:1,display:'flex',flexDirection:'column' }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8 }}>
                    <span style={{ fontSize:10,color:statusColors[post.status],background:`${statusColors[post.status]}15`,padding:'2px 8px',borderRadius:8,fontWeight:600 }}>{statusLabels[post.status]||post.status}</span>
                    <div style={{ display:'flex',gap:5 }}>
                      {post.tone && <span style={{ fontSize:10,color:'#9a9ab0',background:'#f5f5fa',padding:'2px 7px',borderRadius:7 }}>{post.tone}</span>}
                      {post.media_type && <span style={{ fontSize:10,color:'#2563eb',background:'#eff6ff',padding:'2px 7px',borderRadius:7 }}>{post.media_type==='video'?'🎬':'🖼'}</span>}
                      {post.linkedin_post_id && <span style={{ fontSize:10,color:'#059669',background:'#f0faf4',padding:'2px 7px',borderRadius:7 }}>✓ LinkedIn</span>}
                    </div>
                  </div>
                  <div style={{ fontSize:12,color:'#4a4a5a',lineHeight:1.6,flex:1,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:4,WebkitBoxOrient:'vertical',marginBottom:8 }}>{text}</div>
                  {sched && <div style={{ fontSize:11,color:'#d97706',marginBottom:8 }}>📅 {new Date(sched).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>}
                  <div style={{ display:'flex',gap:8,marginTop:'auto' }}>
                    <button onClick={()=>openEdit(post)} style={{ flex:1,background:'#f8f8fc',border:'1px solid #e0e0ea',borderRadius:8,color:'#6a6a7a',padding:'7px',fontSize:12,fontWeight:600 }}>✎ Editar</button>
                    {post.status!=='published' && (
                      <button onClick={async()=>{
                        const r = await fetch(EDGE_PUBLISH,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ post_id: post.id })})
                        const d = await r.json()
                        if(d.success) setPosts(p=>p.map(x=>x.id===post.id?{...x,status:'published'}:x))
                      }} style={{ background:'#f0faf4',border:'1px solid #b8e8c8',borderRadius:8,color:'#1e6b3a',padding:'7px 10px',fontSize:12,fontWeight:600 }}>⚡</button>
                    )}
                    <button onClick={()=>setConfirmDelete(post)}
                      style={{ background:'#fff5f5',border:'1px solid #ffd0d0',borderRadius:8,color:'#dc2626',padding:'7px 12px',fontSize:12 }}>✕</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal confirmação de delete — sem alert() */}
      {confirmDelete && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300 }}>
          <div style={{ background:'#fff',borderRadius:14,padding:28,width:340,boxShadow:'0 8px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize:16,fontWeight:700,color:'#1a1a2e',marginBottom:8 }}>Excluir post?</div>
            <div style={{ fontSize:13,color:'#6a6a7a',marginBottom:20,lineHeight:1.6 }}>
              "{(confirmDelete.title||confirmDelete.content||'').substring(0,60)}..." será removido permanentemente.
            </div>
            <div style={{ display:'flex',gap:10 }}>
              <button onClick={()=>setConfirmDelete(null)} style={{ flex:1,background:'#fff',border:'1px solid #e0e0ea',borderRadius:8,color:'#6a6a7a',padding:10,fontSize:13 }}>Cancelar</button>
              <button onClick={()=>del(confirmDelete)} disabled={deleting===confirmDelete.id}
                style={{ flex:1,background:'#dc2626',border:'none',borderRadius:8,color:'#fff',padding:10,fontSize:13,fontWeight:700 }}>
                {deleting===confirmDelete.id?'Excluindo...':'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
