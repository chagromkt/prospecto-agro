import { useState, useEffect } from 'react'
import { sb, getProfileId } from '../config.js'

export default function Mensagens() {
  const [conversations, setConversations] = useState([])
  const [selConv, setSelConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const data = await sb(`conversations?profile_id=eq.${getProfileId()}&select=*,leads(full_name,headline,current_company,linkedin_url,avatar_url),campaigns(name)&order=last_message_at.desc.nullslast`).catch(() => [])
      setConversations(data || [])
    } catch { setConversations([]) }
    setLoading(false)
  }

  const selectConv = async (conv) => {
    setSelConv(conv)
    setLoadingMsgs(true)
    try {
      const data = await sb(`conversation_messages?conversation_id=eq.${conv.id}&order=sent_at.asc`)
      setMessages(data || [])
    } catch { setMessages([]) }
    setLoadingMsgs(false)
  }

  const filtered = conversations.filter(c => {
    const name = c.leads?.full_name?.toLowerCase() || ''
    const company = c.leads?.current_company?.toLowerCase() || ''
    const matchSearch = !search || name.includes(search.toLowerCase()) || company.includes(search.toLowerCase())
    const matchStatus = !filterStatus || c.status === filterStatus
    return matchSearch && matchStatus
  })

  const statusColors = { active:'#059669', paused:'#d97706', completed:'#3b82f6', waiting:'#f59e0b' }
  const statusLabels = { active:'Ativa', paused:'Pausada', completed:'Concluída', waiting:'Aguardando' }

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', background:'#ffffff' }}>
      {/* Conversation list */}
      <div style={{ width:340, background:'#f8f8fc', borderRight:'1px solid #e8e8f0', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'16px 16px 12px', borderBottom:'1px solid #e8e8f0' }}>
          <h1 style={{ fontSize:16, color:'#1a1a2e', fontWeight:700, marginBottom:10 }}>Mensagens</h1>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por lead ou empresa..." style={{ width:'100%', background:'#fff', border:'1px solid #e0e0ea', borderRadius:8, padding:'7px 12px', color:'#1a1a2e', fontSize:12, marginBottom:8 }} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width:'100%', background:'#fff', border:'1px solid #e0e0ea', borderRadius:8, padding:'7px 12px', color:'#6a6a7a', fontSize:12 }}>
            <option value="">Todas as conversas</option>
            <option value="active">Ativas</option>
            <option value="waiting">Aguardando resposta</option>
            <option value="completed">Concluídas</option>
          </select>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:8 }}>
          {loading ? <div style={{ padding:20, textAlign:'center', color:'#9a9ab0', fontSize:12 }}>Carregando...</div>
          : filtered.length === 0 ? <div style={{ padding:20, textAlign:'center', color:'#c0c0d0', fontSize:12 }}>Nenhuma conversa</div>
          : filtered.map(conv => (
            <div key={conv.id} onClick={() => selectConv(conv)}
              style={{ padding:'10px 12px', borderRadius:8, marginBottom:3, cursor:'pointer', background:selConv?.id===conv.id?'#ffffff':'transparent', border:`1px solid ${selConv?.id===conv.id?'#e0e0ea':'transparent'}`, boxShadow:selConv?.id===conv.id?'0 1px 3px rgba(0,0,0,0.06)':'none' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                <div style={{ fontSize:13, fontWeight:600, color:selConv?.id===conv.id?'#1a1a2e':'#4a4a5a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{conv.leads?.full_name || '—'}</div>
                <span style={{ fontSize:9, color:statusColors[conv.status]||'#9a9ab0', background:`${statusColors[conv.status]||'#9a9ab0'}15`, padding:'1px 6px', borderRadius:6, fontWeight:600, flexShrink:0, marginLeft:6 }}>{statusLabels[conv.status]||conv.status}</span>
              </div>
              <div style={{ fontSize:11, color:'#9a9ab0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:3 }}>{conv.leads?.current_company}</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                {conv.campaigns?.name && <span style={{ fontSize:10, color:'#2563eb', background:'#eff6ff', padding:'1px 6px', borderRadius:5 }}>{conv.campaigns.name}</span>}
                <span style={{ fontSize:10, color:'#c0c0d0' }}>{conv.messages_count||0} msgs</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message thread */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {!selConv ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, color:'#c0c0d0' }}>
            <div style={{ fontSize:40 }}>💬</div>
            <div style={{ fontSize:14 }}>Selecione uma conversa</div>
          </div>
        ) : (<>
          {/* Header */}
          <div style={{ padding:'14px 20px', borderBottom:'1px solid #e8e8f0', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#fff', fontWeight:700, flexShrink:0 }}>
              {selConv.leads?.full_name?.[0] || '?'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e' }}>{selConv.leads?.full_name}</div>
              <div style={{ fontSize:11, color:'#9a9ab0' }}>{selConv.leads?.headline} · {selConv.leads?.current_company}</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {selConv.leads?.linkedin_url && (
                <a href={selConv.leads.linkedin_url} target="_blank" rel="noreferrer" style={{ background:'#f0f8f3', border:'1px solid #b8e8c8', borderRadius:8, color:'#1e6b3a', padding:'6px 12px', fontSize:12, fontWeight:600 }}>LinkedIn ↗</a>
              )}
              {selConv.campaigns?.name && (
                <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, color:'#2563eb', padding:'6px 12px', fontSize:11 }}>📌 {selConv.campaigns.name}</div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:12 }}>
            {loadingMsgs ? <div style={{ textAlign:'center', color:'#9a9ab0' }}>Carregando mensagens...</div>
            : messages.length === 0 ? <div style={{ textAlign:'center', color:'#c0c0d0', paddingTop:40 }}>Nenhuma mensagem registrada</div>
            : messages.map((msg, i) => {
              const isOut = msg.direction === 'outbound' || msg.direction === 'sent'
              return (
                <div key={msg.id||i} style={{ display:'flex', justifyContent:isOut?'flex-end':'flex-start' }}>
                  <div style={{ maxWidth:'72%' }}>
                    <div style={{ background:isOut?'linear-gradient(135deg,#1e6b3a,#2d9e4f)':'#f0f0f5', color:isOut?'#fff':'#1a1a2e', borderRadius:isOut?'12px 12px 4px 12px':'12px 12px 12px 4px', padding:'10px 14px', fontSize:13, lineHeight:1.6 }}>
                      {msg.content}
                    </div>
                    <div style={{ fontSize:10, color:'#c0c0d0', marginTop:3, textAlign:isOut?'right':'left', display:'flex', alignItems:'center', gap:4, justifyContent:isOut?'flex-end':'flex-start' }}>
                      {msg.generated_by_ai && <span style={{ color:'#7c3aed', background:'#f5f3ff', padding:'1px 5px', borderRadius:4 }}>✨ IA</span>}
                      {isOut ? 'Enviado por você' : selConv.leads?.full_name}
                      {msg.sent_at && <span>· {new Date(msg.sent_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Info footer */}
          <div style={{ padding:'10px 20px', borderTop:'1px solid #e8e8f0', background:'#f8f8fc', fontSize:11, color:'#9a9ab0', display:'flex', gap:16 }}>
            <span>💬 {selConv.messages_count||0} mensagens</span>
            <span>Status: <strong style={{ color:statusColors[selConv.status]||'#9a9ab0' }}>{statusLabels[selConv.status]||selConv.status}</strong></span>
            {selConv.last_message_at && <span>Última: {new Date(selConv.last_message_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>}
          </div>
        </>)}
      </div>
    </div>
  )
}
