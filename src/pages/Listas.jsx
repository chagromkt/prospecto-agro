import { useState, useEffect } from 'react'
import { sb, getProfileId, N8N_LEAD, SEG, COLORS } from '../config.js'

const N8N_RD = 'https://n8n-webhook.chasocial.com.br/webhook/push-rd-station'
const T = { bg: '#ffffff', bgSub: '#f8f8fc', border: '#e8e8f0', text: '#1a1a2e', textSub: '#6a6a7a', textMuted: '#9a9ab0', accent: '#1e6b3a', accentLight: '#f0f8f3' }

export default function Listas() {
  const [lists, setLists] = useState([])
  const [leads, setLeads] = useState([])
  const [sel, setSel] = useState(null)
  const [selLead, setSelLead] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [editList, setEditList] = useState(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#1e6b3a')
  const [search, setSearch] = useState('')
  const [enriching, setEnriching] = useState(null)
  const [sendingRD, setSendingRD] = useState(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => { fetchLists() }, [])
  useEffect(() => { if (sel) fetchLeads(sel.id) }, [sel])

  const fetchLists = async () => {
    try {
      const data = await sb(`lead_lists?profile_id=eq.${getProfileId()}&order=created_at.desc`)
      setLists(data)
      if (data.length > 0 && !sel) setSel(data[0])
    } catch { setLists([]) }
  }

  const fetchLeads = async (listId) => {
    setLoading(true)
    try {
      const members = await sb(`lead_list_members?list_id=eq.${listId}&select=lead_id`)
      if (!members.length) { setLeads([]); setLoading(false); return }
      const ids = members.map(m => m.lead_id).join(',')
      const data = await sb(`leads?id=in.(${ids})&order=ai_icp_score.desc.nullslast`)
      setLeads(data)
    } catch { setLeads([]) }
    setLoading(false)
  }

  const createList = async () => {
    if (!newName.trim()) return
    try {
      const data = await sb('lead_lists', { method: 'POST', body: JSON.stringify({ profile_id: getProfileId(), name: newName, color: newColor, total_leads: 0, analyzed_leads: 0 }) })
      const nl = Array.isArray(data) ? data[0] : data
      setLists(p => [nl, ...p]); setSel(nl); setLeads([])
    } catch (e) { console.log(e) }
    setShowNew(false); setNewName(''); setNewColor('#1e6b3a')
  }

  const updateList = async () => {
    if (!editList || !newName.trim()) return
    try {
      await sb(`lead_lists?id=eq.${editList.id}`, { method: 'PATCH', body: JSON.stringify({ name: newName, color: newColor }) })
      setLists(p => p.map(l => l.id === editList.id ? { ...l, name: newName, color: newColor } : l))
      if (sel?.id === editList.id) setSel(p => ({ ...p, name: newName, color: newColor }))
    } catch {}
    setEditList(null); setNewName(''); setNewColor('#1e6b3a')
  }

  const deleteList = async (list) => {
    if (!confirm(`Excluir "${list.name}"? Os leads não serão excluídos.`)) return
    try {
      await sb(`lead_list_members?list_id=eq.${list.id}`, { method: 'DELETE' })
      await sb(`lead_lists?id=eq.${list.id}`, { method: 'DELETE' })
      setLists(p => p.filter(l => l.id !== list.id))
      if (sel?.id === list.id) { const next = lists.find(l => l.id !== list.id); setSel(next || null); setLeads([]) }
    } catch {}
  }

  const removeFromList = async (lead) => {
    try {
      await sb(`lead_list_members?list_id=eq.${sel.id}&lead_id=eq.${lead.id}`, { method: 'DELETE' })
      setLeads(p => p.filter(l => l.id !== lead.id))
      setLists(p => p.map(l => l.id === sel.id ? { ...l, total_leads: Math.max(0, (l.total_leads||1)-1) } : l))
      if (selLead?.id === lead.id) setSelLead(null)
    } catch {}
  }

  const enrichLead = async (lead) => {
    setEnriching(lead.id)
    try {
      await fetch(N8N_LEAD, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile_id: getProfileId(), lead_id: lead.id, full_name: lead.full_name, headline: lead.headline, current_company: lead.current_company, location: lead.location }) })
      setTimeout(() => fetchLeads(sel.id), 3000)
    } catch {}
    setEnriching(null)
  }

  const sendToRD = async (lead) => {
    setSendingRD(lead.id)
    try {
      const res = await fetch(N8N_RD, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: lead.id, profile_id: getProfileId() }) })
      const data = await res.json()
      if (data.success) setLeads(p => p.map(l => l.id === lead.id ? { ...l, rd_station_status: 'sent' } : l))
    } catch {}
    setSendingRD(null)
  }

  const sendAllToRD = async () => {
    const pending = leads.filter(l => l.rd_station_status !== 'sent')
    if (!pending.length || !confirm(`Enviar ${pending.length} leads para o RD Station?`)) return
    for (const lead of pending) await sendToRD(lead)
  }

  const exportCSV = () => {
    if (!leads.length) return
    setExporting(true)
    const headers = ['Nome','Cargo','Empresa','Localização','ICP Score','Segmento','LinkedIn','Conexão','Dores','Insights','Status RD','Analisado em']
    const SEG_LABELS = { insumos:'Insumos', cooperativa:'Cooperativa', revenda:'Revenda', agencia_marketing:'Agência', outro:'Outro' }
    const rows = leads.map(l => [
      l.full_name || '', l.headline || '', l.current_company || '', l.location || '',
      l.ai_icp_score != null ? l.ai_icp_score : '',
      l.detected_segment ? (SEG_LABELS[l.detected_segment] || l.detected_segment) : '',
      l.linkedin_url || '', l.is_connection ? 'Sim' : 'Não',
      (l.ai_pain_points || []).join('; '),
      (l.ai_insights || []).join('; '),
      l.rd_station_status || 'pending',
      l.ai_analyzed_at ? new Date(l.ai_analyzed_at).toLocaleDateString('pt-BR') : ''
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${sel?.name || 'lista'}-${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
    setExporting(false)
  }

  const icpColor = s => s >= 75 ? '#059669' : s >= 50 ? '#d97706' : '#dc2626'
  const filtered = leads.filter(l => l.full_name?.toLowerCase().includes(search.toLowerCase()) || l.current_company?.toLowerCase().includes(search.toLowerCase()))
  const pendingRD = leads.filter(l => l.rd_station_status !== 'sent').length

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#ffffff' }}>
      {/* Lists panel */}
      <div style={{ width: 260, background: '#f8f8fc', borderRight: '1px solid #e8e8f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #e8e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: T.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Listas</span>
          <button onClick={() => { setShowNew(true); setEditList(null); setNewName(''); setNewColor('#1e6b3a') }} style={{ background: T.accent, border: 'none', borderRadius: 6, color: '#fff', padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>+ Nova</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {lists.length === 0 && <div style={{ padding: 16, textAlign: 'center', color: T.textMuted, fontSize: 12 }}>Nenhuma lista ainda</div>}
          {lists.map(list => (
            <div key={list.id} onClick={() => setSel(list)} style={{ padding: '10px 12px', borderRadius: 8, marginBottom: 3, cursor: 'pointer', background: sel?.id === list.id ? '#ffffff' : 'transparent', border: `1px solid ${sel?.id === list.id ? '#e0e0ea' : 'transparent'}`, boxShadow: sel?.id === list.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: list.color || T.accent, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: sel?.id === list.id ? T.text : T.textSub, fontWeight: sel?.id === list.id ? 600 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list.name}</span>
                {sel?.id === list.id && (
                  <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setEditList(list); setNewName(list.name); setNewColor(list.color || '#1e6b3a'); setShowNew(true) }} style={{ background: 'none', border: 'none', color: T.textMuted, fontSize: 13, cursor: 'pointer', padding: '0 3px' }}>✎</button>
                    <button onClick={() => deleteList(list)} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 13, cursor: 'pointer', padding: '0 3px' }}>✕</button>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: T.textMuted, paddingLeft: 16 }}>{list.total_leads || 0} leads · {list.analyzed_leads || 0} analisados</div>
              {(list.total_leads || 0) > 0 && <div style={{ marginTop: 5, paddingLeft: 16, height: 3, background: '#e8e8f0', borderRadius: 2 }}><div style={{ height: '100%', width: `${Math.round(((list.analyzed_leads||0)/(list.total_leads||1))*100)}%`, background: T.accent, borderRadius: 2 }} /></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Leads area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e8e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: sel?.color || T.accent, flexShrink: 0 }} />
          <h1 style={{ fontSize: 17, color: T.text, fontWeight: 700, flex: 1 }}>{sel?.name || 'Selecione uma lista'}</h1>
          <span style={{ fontSize: 11, color: T.textMuted, background: '#f0f0f5', padding: '2px 8px', borderRadius: 10 }}>{filtered.length} leads</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." style={{ background: '#f8f8fc', border: '1px solid #e0e0ea', borderRadius: 8, padding: '6px 12px', color: T.text, fontSize: 12, width: 160 }} />
          <button onClick={exportCSV} disabled={!leads.length || exporting} title="Exportar CSV" style={{ background: '#f8f8fc', border: '1px solid #e0e0ea', borderRadius: 8, color: T.textSub, padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>⬇ CSV</button>
          {pendingRD > 0 && <button onClick={sendAllToRD} style={{ background: '#1e6b3a', border: 'none', borderRadius: 8, color: '#fff', padding: '6px 12px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>→ RD ({pendingRD})</button>}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {loading ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: T.textMuted }}>Carregando...</div>
          : !sel ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 8 }}><div style={{ fontSize: 32 }}>📋</div><div style={{ color: T.textMuted, fontSize: 13 }}>Selecione ou crie uma lista</div></div>
          : filtered.length === 0 ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 8 }}><div style={{ fontSize: 32 }}>🌱</div><div style={{ color: T.textMuted, fontSize: 13 }}>Nenhum lead nesta lista</div></div>
          : filtered.map((lead, i) => (
            <div key={lead.id} onClick={() => setSelLead(selLead?.id === lead.id ? null : lead)} style={{ background: selLead?.id === lead.id ? '#f0f8f3' : '#ffffff', border: `1px solid ${selLead?.id === lead.id ? '#b8e8c8' : '#e8e8f0'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 5, cursor: 'pointer', display: 'grid', gridTemplateColumns: '40px 1fr 150px 80px 100px 100px 80px 32px', alignItems: 'center', gap: 10, animation: `fadeIn 0.3s ease ${i * 0.03}s both`, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ textAlign: 'center' }}>
                {lead.ai_icp_score ? <div style={{ fontSize: 16, fontWeight: 900, color: icpColor(lead.ai_icp_score), fontFamily: 'monospace' }}>{lead.ai_icp_score}</div> : <div style={{ fontSize: 11, color: '#c0c0d0' }}>—</div>}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>{lead.full_name}</div>
                <div style={{ fontSize: 11, color: T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.headline}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: T.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.current_company}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{lead.location}</div>
              </div>
              <div>
                {lead.detected_segment && SEG[lead.detected_segment]
                  ? <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: `${SEG[lead.detected_segment].c}15`, color: SEG[lead.detected_segment].c, fontWeight: 600 }}>{SEG[lead.detected_segment].l}</span>
                  : <span style={{ fontSize: 11, color: '#c0c0d0' }}>—</span>}
              </div>
              <div onClick={e => e.stopPropagation()}>
                {lead.ai_icp_score
                  ? <span style={{ fontSize: 11, color: '#059669' }}>✓ Analisado</span>
                  : <button onClick={() => enrichLead(lead)} disabled={enriching === lead.id} style={{ background: T.accentLight, border: `1px solid #b8e8c8`, borderRadius: 6, color: T.accent, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{enriching === lead.id ? '...' : 'Analisar IA'}</button>}
              </div>
              <div onClick={e => e.stopPropagation()}>
                {lead.rd_station_status === 'sent'
                  ? <span style={{ fontSize: 11, color: '#059669' }}>✓ No RD</span>
                  : <button onClick={() => sendToRD(lead)} disabled={sendingRD === lead.id} style={{ background: '#fff', border: '1px solid #e0e0ea', borderRadius: 6, color: T.textSub, padding: '3px 10px', fontSize: 11 }}>{sendingRD === lead.id ? '...' : '→ RD'}</button>}
              </div>
              <div>
                {lead.linkedin_url && <a href={lead.linkedin_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: '#2563eb' }}>in</a>}
              </div>
              <div onClick={e => e.stopPropagation()}>
                <button onClick={() => removeFromList(lead)} title="Remover da lista" style={{ background: 'none', border: 'none', color: '#e0e0ea', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                  onMouseLeave={e => e.currentTarget.style.color = '#e0e0ea'}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lead detail panel */}
      {selLead && (
        <div style={{ width: 300, background: '#f8f8fc', borderLeft: '1px solid #e8e8f0', overflowY: 'auto' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e8e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Perfil</span>
            <button onClick={() => setSelLead(null)} style={{ background: 'none', border: 'none', color: T.textMuted, fontSize: 18, cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#1e6b3a,#2d9e4f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff', fontWeight: 700, flexShrink: 0 }}>{selLead.full_name?.[0]}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{selLead.full_name}</div>
                <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.5, marginTop: 2 }}>{selLead.headline}</div>
              </div>
            </div>

            {selLead.ai_icp_score && (
              <div style={{ background: '#fff', border: '1px solid #e8e8f0', borderRadius: 10, padding: 14, marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: T.textMuted, textTransform: 'uppercase', fontWeight: 600 }}>ICP Score</span>
                  <span style={{ fontSize: 26, fontWeight: 900, color: icpColor(selLead.ai_icp_score), fontFamily: 'monospace' }}>{selLead.ai_icp_score}</span>
                </div>
                <p style={{ fontSize: 12, color: T.textSub, lineHeight: 1.6 }}>{selLead.ai_icp_justification || selLead.ai_profile_summary}</p>
              </div>
            )}

            {selLead.ai_pain_points?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: T.textMuted, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Dores identificadas</div>
                {selLead.ai_pain_points.map((p, i) => (
                  <div key={i} style={{ fontSize: 12, color: T.textSub, padding: '5px 0', borderBottom: '1px solid #f0f0f5', display: 'flex', gap: 8 }}>
                    <span style={{ color: T.accent }}>▸</span>{p}
                  </div>
                ))}
              </div>
            )}

            {selLead.ai_insights?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: T.textMuted, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Insights</div>
                {selLead.ai_insights.map((ins, i) => (
                  <div key={i} style={{ fontSize: 12, color: T.textSub, padding: '5px 0', borderBottom: '1px solid #f0f0f5', display: 'flex', gap: 8 }}>
                    <span style={{ color: '#2563eb' }}>→</span>{ins}
                  </div>
                ))}
              </div>
            )}

            {[['Empresa', selLead.current_company], ['Local', selLead.location], ['Segmento', selLead.detected_segment ? (SEG[selLead.detected_segment]?.l || selLead.detected_segment) : '—']].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f5' }}>
                <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 600 }}>{l}</span>
                <span style={{ fontSize: 12, color: T.textSub }}>{v || '—'}</span>
              </div>
            ))}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              {selLead.linkedin_url && <a href={selLead.linkedin_url} target="_blank" rel="noreferrer" style={{ display: 'block', background: T.accentLight, border: `1px solid #b8e8c8`, borderRadius: 8, color: T.accent, padding: 10, fontSize: 12, textAlign: 'center', fontWeight: 600 }}>Abrir LinkedIn ↗</a>}
              {!selLead.ai_icp_score && <button onClick={() => enrichLead(selLead)} disabled={enriching === selLead.id} style={{ background: 'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border: 'none', borderRadius: 8, color: '#fff', padding: 10, fontSize: 12, fontWeight: 600 }}>{enriching === selLead.id ? '🌱 Analisando...' : '🌱 Analisar com IA'}</button>}
              {selLead.rd_station_status !== 'sent'
                ? <button onClick={() => sendToRD(selLead)} disabled={sendingRD === selLead.id} style={{ background: '#fff', border: '1px solid #e0e0ea', borderRadius: 8, color: T.textSub, padding: 10, fontSize: 12 }}>{sendingRD === selLead.id ? 'Enviando...' : '→ Enviar para RD Station'}</button>
                : <div style={{ textAlign: 'center', fontSize: 12, color: '#059669', padding: 8 }}>✓ Enviado ao RD Station</div>}
              <button onClick={() => removeFromList(selLead)} style={{ background: '#fff5f5', border: '1px solid #ffd0d0', borderRadius: 8, color: '#dc2626', padding: 10, fontSize: 12 }}>Remover da lista</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nova/editar lista */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', border: '1px solid #e8e8f0', borderRadius: 14, padding: 28, width: 360, boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }}>
            <h2 style={{ fontSize: 16, color: T.text, marginBottom: 20, fontWeight: 700 }}>{editList ? 'Editar Lista' : 'Nova Lista'}</h2>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome da lista..." autoFocus onKeyDown={e => e.key === 'Enter' && (editList ? updateList() : createList())}
              style={{ width: '100%', background: '#f8f8fc', border: '1px solid #e0e0ea', borderRadius: 8, padding: 12, color: T.text, fontSize: 14, marginBottom: 16 }} />
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>Cor</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORS.map(c => <button key={c} onClick={() => setNewColor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: newColor === c ? '3px solid #1a1a2e' : '2px solid transparent', cursor: 'pointer' }} />)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowNew(false); setEditList(null) }} style={{ flex: 1, background: '#fff', border: '1px solid #e0e0ea', borderRadius: 8, color: T.textSub, padding: 10, fontSize: 13 }}>Cancelar</button>
              <button onClick={editList ? updateList : createList} style={{ flex: 2, background: 'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border: 'none', borderRadius: 8, color: '#fff', padding: 10, fontSize: 13, fontWeight: 700 }}>{editList ? 'Salvar' : 'Criar Lista'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}
