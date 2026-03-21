import { useState, useEffect, useRef } from 'react'
import { sb, getProfileId, SB_URL, SB_KEY, getAccessToken } from '../config.js'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EDGE_SYNC = 'https://juabbkewrtbignqrufgp.supabase.co/functions/v1/sync-conversations'
const UNIPILE_URL = 'https://api35.unipile.com:16513'

const STATUS_COLORS = { active:'#059669', waiting:'#d97706', completed:'#3b82f6', paused:'#9a9ab0' }
const STATUS_LABELS = { active:'Ativa', waiting:'Aguardando', completed:'Concluída', paused:'Pausada' }

export default function Mensagens() {
  const [conversations, setConversations] = useState([])
  const [selConv, setSelConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterUnread, setFilterUnread] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [settings, setSettings] = useState(null)
  const messagesEndRef = useRef(null)
  const replyRef = useRef(null)
  const realtimeRef = useRef(null)

  useEffect(() => {
    load()
    loadSettings()
    setupRealtime()
    return () => { if (realtimeRef.current) realtimeRef.current.unsubscribe() }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const load = async () => {
    setLoading(true)
    try {
      const data = await sb(
        `conversations?profile_id=eq.${getProfileId()}&select=*,leads(id,full_name,headline,current_company,linkedin_url,avatar_url,ai_icp_score,detected_segment),campaigns(name)&order=last_message_at.desc.nullslast`
      ).catch(() => [])
      setConversations(data || [])
    } catch { setConversations([]) }
    setLoading(false)
  }

  const loadSettings = async () => {
    const data = await sb(`settings?profile_id=eq.${getProfileId()}`).catch(() => [])
    setSettings(data?.[0] || null)
  }

  const setupRealtime = () => {
    // Supabase realtime client separado para não conflitar com o sb() global
    const client = createClient(
      'https://juabbkewrtbignqrufgp.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1YWJia2V3cnRiaWducXJ1ZmdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4OTg3ODEsImV4cCI6MjA4OTQ3NDc4MX0.KIi4KsbA6J-voPSuMMiI1azR4ESM73fP75YPYU54-IY'
    )

    const channel = client
      .channel('messaging-realtime')
      // Nova mensagem em qualquer conversa
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversation_messages'
      }, (payload) => {
        const newMsg = payload.new
        // Se a mensagem é da conversa aberta, adiciona no chat
        setSelConv(prev => {
          if (prev && newMsg.conversation_id === prev.id) {
            setMessages(msgs => {
              const exists = msgs.some(m => m.id === newMsg.id)
              if (exists) return msgs
              return [...msgs, newMsg]
            })
          }
          return prev
        })
        // Atualiza lista de conversas (badge de não lido)
        setConversations(prev => prev.map(c => {
          if (c.id !== newMsg.conversation_id) return c
          return {
            ...c,
            messages_count: (c.messages_count || 0) + 1,
            unread_count: newMsg.direction === 'inbound' ? (c.unread_count || 0) + 1 : c.unread_count,
            last_message_preview: newMsg.content?.substring(0, 80),
            last_message_at: newMsg.sent_at
          }
        }))
      })
      // Conversa atualizada
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations'
      }, (payload) => {
        setConversations(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c))
      })
      // Nova conversa criada
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversations',
        filter: `profile_id=eq.${getProfileId()}`
      }, () => {
        load()
      })
      .subscribe()

    realtimeRef.current = channel
  }

  const selectConv = async (conv) => {
    setSelConv(conv)
    setReply('')
    setLoadingMsgs(true)
    try {
      const data = await sb(
        `conversation_messages?conversation_id=eq.${conv.id}&order=sent_at.asc&limit=100`
      )
      setMessages(data || [])
    } catch { setMessages([]) }
    setLoadingMsgs(false)

    // Marca como lido
    if (conv.unread_count > 0) {
      await sb(`conversations?id=eq.${conv.id}`, { method:'PATCH', body: JSON.stringify({ unread_count: 0 }) })
      setConversations(prev => prev.map(c => c.id === conv.id ? {...c, unread_count: 0} : c))
    }
  }

  const syncConversations = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const r = await fetch(EDGE_SYNC, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: getProfileId() })
      })
      const data = await r.json()
      setSyncResult(data)
      if (data.success) await load()
    } catch(e) { setSyncResult({ success: false, error: e.message }) }
    setSyncing(false)
  }

  const sendReply = async () => {
    if (!reply.trim() || !selConv || !settings?.unipile_key) return
    setSending(true)
    try {
      const token = getAccessToken()

      // Envia via Unipile no thread existente
      let chatId = selConv.linkedin_thread_id
      let msgText = reply.trim()

      if (chatId) {
        // Envia mensagem no chat existente
        const r = await fetch(`${UNIPILE_URL}/api/v1/chats/${chatId}/messages`, {
          method: 'POST',
          headers: { 'X-API-KEY': settings.unipile_key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ account_id: settings.unipile_account_id, text: msgText })
        })
        console.log('Send reply:', r.status)
      } else {
        // Sem thread_id — envia via lead_urn se disponível
        if (selConv.leads?.id) {
          const leadData = await sb(`leads?id=eq.${selConv.leads.id}&select=linkedin_urn`).catch(() => [])
          const urn = leadData?.[0]?.linkedin_urn
          if (urn) {
            const r = await fetch(`${UNIPILE_URL}/api/v1/chats`, {
              method: 'POST',
              headers: { 'X-API-KEY': settings.unipile_key, 'Content-Type': 'application/json' },
              body: JSON.stringify({ account_id: settings.unipile_account_id, attendees_ids: [urn], text: msgText })
            })
            const d = await r.json().catch(() => ({}))
            if (d?.id) {
              // Atualiza thread_id da conversa
              await sb(`conversations?id=eq.${selConv.id}`, { method:'PATCH', body: JSON.stringify({ linkedin_thread_id: d.id }) })
              setSelConv(prev => ({...prev, linkedin_thread_id: d.id}))
              chatId = d.id
            }
          }
        }
      }

      // Salva no banco
      const { data: savedMsg } = await sb('conversation_messages', {
        method: 'POST',
        body: JSON.stringify({
          conversation_id: selConv.id,
          direction: 'outbound',
          content: msgText,
          sender_name: 'Você',
          generated_by_ai: false,
          sent_at: new Date().toISOString()
        })
      }).then(async () => {
        // Recarrega a mensagem (o sb POST não retorna o objeto no modo atual)
        const data = await sb(`conversation_messages?conversation_id=eq.${selConv.id}&order=sent_at.desc&limit=1`)
        return { data: data?.[0] }
      })

      if (savedMsg) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === savedMsg.id)
          return exists ? prev : [...prev, savedMsg]
        })
      }

      // Atualiza conversa
      await sb(`conversations?id=eq.${selConv.id}`, {
        method:'PATCH',
        body: JSON.stringify({
          messages_count: (selConv.messages_count || 0) + 1,
          last_message_at: new Date().toISOString(),
          last_message_preview: msgText.substring(0, 80),
          status: 'active'
        })
      })
      setConversations(prev => prev.map(c => c.id === selConv.id
        ? {...c, messages_count: (c.messages_count||0)+1, last_message_at: new Date().toISOString(), last_message_preview: msgText.substring(0,80)}
        : c))

      setReply('')
      replyRef.current?.focus()
    } catch(e) { console.error('Send error:', e) }
    setSending(false)
  }

  const filtered = conversations.filter(c => {
    const q = search.toLowerCase()
    if (q && !c.leads?.full_name?.toLowerCase().includes(q) && !c.leads?.current_company?.toLowerCase().includes(q)) return false
    if (filterStatus && c.status !== filterStatus) return false
    if (filterUnread && !c.unread_count) return false
    return true
  })

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0)

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', background:'#ffffff' }}>

      {/* ── LISTA CONVERSAS ── */}
      <div style={{ width:320, background:'#f8f8fc', borderRight:'1px solid #e8e8f0', display:'flex', flexDirection:'column', flexShrink:0 }}>
        {/* Header */}
        <div style={{ padding:'14px 14px 10px', borderBottom:'1px solid #e8e8f0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <h1 style={{ fontSize:15, fontWeight:700, color:'#1a1a2e' }}>Mensagens</h1>
              {totalUnread > 0 && (
                <span style={{ background:'#dc2626', color:'#fff', fontSize:10, fontWeight:700, borderRadius:10, padding:'1px 7px' }}>{totalUnread}</span>
              )}
            </div>
            <button onClick={syncConversations} disabled={syncing}
              style={{ background:syncing?'#e0e0ea':'#f0f8f3', border:'1px solid #b8e8c8', borderRadius:7, color:syncing?'#9a9ab0':'#1e6b3a', padding:'5px 10px', fontSize:11, fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
              {syncing
                ? <><div style={{ width:10,height:10,border:'2px solid #9a9ab0',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite' }} />Sincronizando</>
                : '🔄 Sincronizar'
              }
            </button>
          </div>

          {/* Resultado do sync */}
          {syncResult && (
            <div style={{ background:syncResult.success?'#f0faf4':'#fff5f5', border:`1px solid ${syncResult.success?'#b8e8c8':'#ffd0d0'}`, borderRadius:7, padding:'6px 10px', marginBottom:8, fontSize:11, color:syncResult.success?'#059669':'#dc2626' }}>
              {syncResult.success
                ? `✅ ${syncResult.new_conversations} conversas novas · ${syncResult.new_messages} mensagens importadas`
                : `❌ ${syncResult.error}`
              }
            </div>
          )}

          {/* Busca */}
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou empresa..." style={{ width:'100%', background:'#fff', border:'1px solid #e0e0ea', borderRadius:8, padding:'7px 12px', color:'#1a1a2e', fontSize:12, marginBottom:6 }} />

          {/* Filtros */}
          <div style={{ display:'flex', gap:6 }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ flex:1, background:'#fff', border:'1px solid #e0e0ea', borderRadius:7, padding:'5px 8px', color:'#6a6a7a', fontSize:11 }}>
              <option value="">Todas</option>
              <option value="active">Ativas</option>
              <option value="waiting">Aguardando</option>
              <option value="completed">Concluídas</option>
            </select>
            <button onClick={() => setFilterUnread(p => !p)}
              style={{ background:filterUnread?'#fee2e2':'#fff', border:`1px solid ${filterUnread?'#fca5a5':'#e0e0ea'}`, borderRadius:7, color:filterUnread?'#dc2626':'#9a9ab0', padding:'5px 10px', fontSize:11, fontWeight:filterUnread?700:400 }}>
              Não lidas
            </button>
          </div>
        </div>

        {/* Lista */}
        <div style={{ flex:1, overflowY:'auto', padding:8 }}>
          {loading
            ? <div style={{ padding:20, textAlign:'center', color:'#9a9ab0', fontSize:12 }}>Carregando...</div>
            : filtered.length === 0
              ? <div style={{ padding:30, textAlign:'center', color:'#c0c0d0', fontSize:12, lineHeight:1.8 }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>💬</div>
                  {conversations.length === 0
                    ? <><div>Nenhuma conversa ainda</div><div style={{ marginTop:6 }}>Clique em <strong style={{ color:'#1e6b3a' }}>🔄 Sincronizar</strong> para importar conversas do LinkedIn</div></>
                    : 'Nenhuma conversa com esses filtros'}
                </div>
              : filtered.map(conv => {
                  const unread = conv.unread_count > 0
                  const isSelected = selConv?.id === conv.id
                  const lastAt = conv.last_message_at
                    ? new Date(conv.last_message_at).toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})
                    : ''
                  return (
                    <div key={conv.id} onClick={() => selectConv(conv)}
                      style={{ padding:'10px 12px', borderRadius:9, marginBottom:3, cursor:'pointer', background:isSelected?'#ffffff':unread?'#fff8f0':'transparent', border:`1px solid ${isSelected?'#e0e0ea':unread?'#fed7aa':'transparent'}`, boxShadow:isSelected?'0 1px 3px rgba(0,0,0,0.06)':'none', position:'relative' }}>

                      {/* Badge não lido */}
                      {unread && <div style={{ position:'absolute', top:10, right:10, width:8, height:8, borderRadius:'50%', background:'#dc2626' }} />}

                      <div style={{ display:'flex', gap:9, alignItems:'flex-start' }}>
                        {/* Avatar */}
                        {conv.leads?.avatar_url
                          ? <img src={conv.leads.avatar_url} alt="" style={{ width:34, height:34, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} onError={e => e.target.style.display='none'} />
                          : <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', flexShrink:0 }}>
                              {(conv.leads?.full_name||'?')[0].toUpperCase()}
                            </div>
                        }
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                            <span style={{ fontSize:12, fontWeight:unread?700:600, color:'#1a1a2e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                              {conv.leads?.full_name || 'Lead desconhecido'}
                            </span>
                            <span style={{ fontSize:9, color:'#c0c0d0', flexShrink:0, marginLeft:6 }}>{lastAt}</span>
                          </div>
                          <div style={{ fontSize:10, color:'#9a9ab0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:3 }}>
                            {conv.leads?.current_company || conv.leads?.headline || '—'}
                          </div>
                          {conv.last_message_preview && (
                            <div style={{ fontSize:11, color:unread?'#4a4a5a':'#9a9ab0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:unread?600:400 }}>
                              {conv.last_message_preview}
                            </div>
                          )}
                          <div style={{ display:'flex', gap:5, marginTop:4, alignItems:'center' }}>
                            <span style={{ fontSize:9, color:STATUS_COLORS[conv.status]||'#9a9ab0', background:`${STATUS_COLORS[conv.status]||'#9a9ab0'}15`, padding:'1px 5px', borderRadius:5, fontWeight:600 }}>
                              {STATUS_LABELS[conv.status]||conv.status}
                            </span>
                            {conv.campaigns?.name && (
                              <span style={{ fontSize:9, color:'#2563eb', background:'#eff6ff', padding:'1px 5px', borderRadius:5 }}>
                                {conv.campaigns.name}
                              </span>
                            )}
                            <span style={{ fontSize:9, color:'#c0c0d0' }}>{conv.messages_count||0}msgs</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
              })
          }
        </div>
      </div>

      {/* ── THREAD DE MENSAGENS ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {!selConv ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:14, color:'#c0c0d0' }}>
            <div style={{ fontSize:48 }}>💬</div>
            <div style={{ fontSize:16, color:'#6a6a7a' }}>Selecione uma conversa</div>
            {!settings?.unipile_key && (
              <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:10, padding:'12px 20px', fontSize:12, color:'#c2410c', maxWidth:360, textAlign:'center' }}>
                ⚠️ Configure a chave Unipile em <strong>⚙️ Configurações</strong> para enviar mensagens e sincronizar conversas.
              </div>
            )}
            <div style={{ background:'#f8f8fc', border:'1px solid #e8e8f0', borderRadius:12, padding:18, maxWidth:400, fontSize:12, color:'#6a6a7a', lineHeight:1.8 }}>
              <div style={{ fontWeight:700, marginBottom:8, color:'#1a1a2e' }}>Para receber respostas em tempo real:</div>
              <div style={{ marginBottom:4 }}>1. Acesse o <strong>Unipile Dashboard → Webhooks</strong></div>
              <div style={{ marginBottom:4 }}>2. Crie um webhook com a URL:</div>
              <code style={{ display:'block', background:'#1a1a2e', color:'#a8ffa8', borderRadius:6, padding:'6px 10px', fontSize:11, marginBottom:4, wordBreak:'break-all' }}>
                https://juabbkewrtbignqrufgp.supabase.co/functions/v1/unipile-webhook
              </code>
              <div>3. Selecione o evento <strong>messaging.message.new</strong></div>
            </div>
          </div>
        ) : (
          <>
            {/* Header da conversa */}
            <div style={{ padding:'12px 20px', borderBottom:'1px solid #e8e8f0', display:'flex', alignItems:'center', gap:12 }}>
              {conv => conv?.leads?.avatar_url
                ? <img src={selConv.leads?.avatar_url} alt="" style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} onError={e => e.target.style.display='none'} />
                : null
              }
              <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, color:'#fff', fontWeight:700, flexShrink:0 }}>
                {(selConv.leads?.full_name||'?')[0].toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e' }}>{selConv.leads?.full_name || 'Lead'}</div>
                <div style={{ fontSize:11, color:'#9a9ab0' }}>
                  {selConv.leads?.headline}{selConv.leads?.current_company ? ` · ${selConv.leads.current_company}` : ''}
                </div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ fontSize:10, color:STATUS_COLORS[selConv.status]||'#9a9ab0', background:`${STATUS_COLORS[selConv.status]||'#9a9ab0'}15`, padding:'2px 8px', borderRadius:6, fontWeight:600 }}>
                  {STATUS_LABELS[selConv.status]||selConv.status}
                </span>
                {selConv.campaigns?.name && (
                  <span style={{ fontSize:10, color:'#2563eb', background:'#eff6ff', padding:'2px 8px', borderRadius:6 }}>📌 {selConv.campaigns.name}</span>
                )}
                {selConv.leads?.linkedin_url && (
                  <a href={selConv.leads.linkedin_url} target="_blank" rel="noreferrer"
                    style={{ background:'#f0f8f3', border:'1px solid #b8e8c8', borderRadius:7, color:'#1e6b3a', padding:'5px 10px', fontSize:11, fontWeight:600, textDecoration:'none' }}>
                    LinkedIn ↗
                  </a>
                )}
              </div>
            </div>

            {/* Mensagens */}
            <div style={{ flex:1, overflowY:'auto', padding:'16px 24px', display:'flex', flexDirection:'column', gap:10, background:'#fafafa' }}>
              {loadingMsgs
                ? <div style={{ textAlign:'center', color:'#9a9ab0', padding:20 }}>Carregando mensagens...</div>
                : messages.length === 0
                  ? <div style={{ textAlign:'center', color:'#c0c0d0', paddingTop:40, fontSize:13 }}>Nenhuma mensagem registrada nesta conversa</div>
                  : messages.map((msg, i) => {
                      const isOut = msg.direction === 'outbound' || msg.direction === 'sent'
                      const showDate = i === 0 || (
                        msg.sent_at && messages[i-1]?.sent_at &&
                        new Date(msg.sent_at).toDateString() !== new Date(messages[i-1].sent_at).toDateString()
                      )
                      const timeStr = msg.sent_at
                        ? new Date(msg.sent_at).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})
                        : ''
                      const dateStr = msg.sent_at
                        ? new Date(msg.sent_at).toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit',year:'2-digit'})
                        : ''

                      return (
                        <div key={msg.id || i}>
                          {/* Separador de data */}
                          {showDate && msg.sent_at && (
                            <div style={{ textAlign:'center', fontSize:10, color:'#c0c0d0', padding:'8px 0', display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{ flex:1, height:1, background:'#f0f0f5' }} />
                              {dateStr}
                              <div style={{ flex:1, height:1, background:'#f0f0f5' }} />
                            </div>
                          )}
                          <div style={{ display:'flex', justifyContent:isOut?'flex-end':'flex-start' }}>
                            <div style={{ maxWidth:'72%' }}>
                              {/* Nome do remetente */}
                              {!isOut && msg.sender_name && (
                                <div style={{ fontSize:10, color:'#9a9ab0', marginBottom:3, paddingLeft:4 }}>{msg.sender_name}</div>
                              )}
                              {/* Bolha */}
                              <div style={{ background:isOut?'linear-gradient(135deg,#1e6b3a,#2d9e4f)':'#ffffff', color:isOut?'#fff':'#1a1a2e', borderRadius:isOut?'14px 14px 4px 14px':'14px 14px 14px 4px', padding:'10px 14px', fontSize:13, lineHeight:1.6, boxShadow:'0 1px 4px rgba(0,0,0,0.08)', border:isOut?'none':'1px solid #e8e8f0' }}>
                                {msg.content}
                              </div>
                              {/* Metadados */}
                              <div style={{ fontSize:10, color:'#c0c0d0', marginTop:3, textAlign:isOut?'right':'left', display:'flex', gap:4, justifyContent:isOut?'flex-end':'flex-start', alignItems:'center' }}>
                                {msg.generated_by_ai && (
                                  <span style={{ color:'#7c3aed', background:'#f5f3ff', padding:'1px 5px', borderRadius:4 }}>✨ IA</span>
                                )}
                                {timeStr}
                                {isOut && <span>· Enviado</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                  })
              }
              <div ref={messagesEndRef} />
            </div>

            {/* Box de resposta */}
            <div style={{ padding:'12px 16px', borderTop:'1px solid #e8e8f0', background:'#ffffff' }}>
              {!settings?.unipile_key ? (
                <div style={{ textAlign:'center', fontSize:12, color:'#9a9ab0', padding:'6px 0' }}>
                  Configure a chave Unipile em ⚙️ Configurações para responder
                </div>
              ) : (
                <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
                  <textarea
                    ref={replyRef}
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() }
                    }}
                    placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
                    rows={2}
                    style={{ flex:1, background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:10, padding:'10px 14px', color:'#1a1a2e', fontSize:13, resize:'none', lineHeight:1.5, outline:'none', fontFamily:'inherit' }}
                  />
                  <button onClick={sendReply} disabled={sending || !reply.trim()}
                    style={{ background:(!reply.trim()||sending)?'#e0e0ea':'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:10, color:(!reply.trim()||sending)?'#9a9ab0':'#fff', padding:'10px 18px', fontSize:13, fontWeight:700, flexShrink:0, height:44 }}>
                    {sending
                      ? <div style={{ width:16,height:16,border:'2px solid #9a9ab0',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite' }} />
                      : '↑ Enviar'
                    }
                  </button>
                </div>
              )}
              <div style={{ fontSize:10, color:'#c0c0d0', marginTop:5, textAlign:'right' }}>
                {reply.length > 0 && `${reply.length} chars · `}Enter para enviar · Shift+Enter para nova linha
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
