import { useState, useEffect } from 'react'
import { sb, PROFILE_ID, N8N_LEAD, SEG, ICP, COLORS, MOCK_LISTS, MOCK_LEADS } from '../config.js'

export default function Listas() {
  const [lists, setLists] = useState([])
  const [leads, setLeads] = useState([])
  const [sel, setSel] = useState(null)
  const [selLead, setSelLead] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#2d6a3f')
  const [search, setSearch] = useState('')
  const [enriching, setEnriching] = useState(null)

  useEffect(() => { fetchLists() }, [])
  useEffect(() => { if (sel) fetchLeads(sel.id) }, [sel])

  const fetchLists = async () => {
    try {
      const data = await sb(`lead_lists?profile_id=eq.${PROFILE_ID}&order=created_at.desc`)
      setLists(data); if (data.length > 0) setSel(data[0])
    } catch { setLists(MOCK_LISTS); setSel(MOCK_LISTS[0]) }
  }

  const fetchLeads = async (listId) => {
    if (listId.startsWith('m')) { setLeads(MOCK_LEADS); return }
    setLoading(true)
    try {
      const members = await sb(`lead_list_members?list_id=eq.${listId}&select=lead_id`)
      if (!members.length) { setLeads([]); setLoading(false); return }
      const ids = members.map(m => m.lead_id).join(',')
      const data = await sb(`leads?id=in.(${ids})&order=ai_icp_score.desc.nullslast`)
      setLeads(data)
    } catch { setLeads(MOCK_LEADS) }
    setLoading(false)
  }

  const createList = async () => {
    if (!newName.trim()) return
    try {
      const data = await sb('lead_lists', { method: 'POST', body: JSON.stringify({ profile_id: PROFILE_ID, name: newName, color: newColor, total_leads: 0, analyzed_leads: 0 }) })
      const nl = Array.isArray(data) ? data[0] : data
      setLists(p => [nl, ...p]); setSel(nl)
    } catch {
      const nl = { id: `m${Date.now()}`, name: newName, color: newColor, total_leads: 0, analyzed_leads: 0 }
      setLists(p => [nl, ...p]); setSel(nl)
    }
    setShowNew(false); setNewName('')
  }

  const enrichLead = async (lead) => {
    setEnriching(lead.id)
    try {
      await fetch(N8N_LEAD, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile_id: PROFILE_ID, lead_id: lead.id, full_name: lead.full_name, headline: lead.headline, current_company: lead.current_company, location: lead.location }) })
      await fetchLeads(sel.id)
    } catch {}
    setEnriching(null)
  }

  const sendToRD = async (lead) => {
    try {
      await sb(`leads?id=eq.${lead.id}`, { method: 'PATCH', body: JSON.stringify({ rd_station_status: 'sent', rd_station_sent_at: new Date().toISOString() }) })
      setLeads(p => p.map(l => l.id === lead.id ? { ...l, rd_station_status: 'sent' } : l))
    } catch {}
  }

  const filtered = leads.filter(l => l.full_name?.toLowerCase().includes(search.toLowerCase()) || l.current_company?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Lists panel */}
      <div style={{ width: 260, background: '#0c160e', borderRight: '1px solid #162018', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #162018', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#3d6b4a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Listas</span>
          <button onClick={() => setShowNew(true)} style={{ background: '#1e4a28', border: 'none', borderRadius: 6, color: '#4a9e5c', padding: '4px 10px', fontSize: 12 }}>+ Nova</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {lists.map(list => (
            <div key={list.id} onClick={() => setSel(list)} style={{ padding: 12, borderRadius: 8, marginBottom: 4, cursor: 'pointer', background: sel?.id === list.id ? '#0f2a18' : 'transparent', border: `1px solid ${sel?.id === list.id ? '#1e4a28' : 'transparent'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: list.color || '#2d6a3f' }} />
                <span style={{ fontSize: 13, color: sel?.id === list.id ? '#c8b76a' : '#a09070', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list.name}</span>
              </div>
              <div style={{ fontSize: 11, color: '#3d6b4a', paddingLeft: 16 }}>{list.total_leads} leads</div>
              {list.total_leads > 0 && (
                <div style={{ marginTop: 6, paddingLeft: 16, height: 2, background: '#162018', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${Math.round(((list.analyzed_leads||0)/list.total_leads)*100)}%`, background: '#2d6a3f', borderRadius: 2 }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Leads area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #162018', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: sel?.color || '#2d6a3f' }} />
            <h1 style={{ fontSize: 18, color: '#c8b76a', fontWeight: 700 }}>{sel?.name || 'Selecione uma lista'}</h1>
            <span style={{ fontSize: 11, color: '#3d6b4a', background: '#0f1a11', border: '1px solid #162018', padding: '2px 8px', borderRadius: 10 }}>{leads.length} leads</span>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." style={{ background: '#0f1a11', border: '1px solid #1e3322', borderRadius: 8, padding: '8px 14px', color: '#c8d4c0', fontSize: 13, width: 200 }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {loading ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#3d5a3d' }}>Carregando...</div>
          : filtered.length === 0 ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 8 }}><div style={{ fontSize: 32 }}>🌱</div><div style={{ color: '#3d6b4a', fontSize: 13 }}>Nenhum lead nesta lista</div></div>
          : filtered.map((lead, i) => (
            <div key={lead.id} onClick={() => setSelLead(selLead?.id === lead.id ? null : lead)} style={{ background: '#0d1a0f', border: `1px solid ${selLead?.id === lead.id ? '#2d6a3f' : '#162018'}`, borderRadius: 10, padding: '14px 16px', marginBottom: 8, cursor: 'pointer', display: 'grid', gridTemplateColumns: '44px 1fr 160px 90px 110px 110px 90px', alignItems: 'center', gap: 12, animation: `fadeIn 0.3s ease ${i * 0.04}s both` }}>
              <div style={{ textAlign: 'center' }}>
                {lead.ai_icp_score ? <div style={{ fontSize: 18, fontWeight: 900, color: ICP(lead.ai_icp_score), fontFamily: 'monospace' }}>{lead.ai_icp_score}</div> : <div style={{ fontSize: 11, color: '#2d4a2d' }}>—</div>}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#c8b76a', marginBottom: 2 }}>{lead.full_name}</div>
                <div style={{ fontSize: 11, color: '#5a7a5a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.headline}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#7a9a7a' }}>{lead.current_company}</div>
                <div style={{ fontSize: 11, color: '#3d5a3d' }}>{lead.location}</div>
              </div>
              <div>
                {lead.detected_segment && SEG[lead.detected_segment]
                  ? <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: `${SEG[lead.detected_segment].c}20`, color: SEG[lead.detected_segment].c, border: `1px solid ${SEG[lead.detected_segment].c}40` }}>{SEG[lead.detected_segment].l}</span>
                  : <span style={{ fontSize: 10, color: '#2d4a2d' }}>—</span>}
              </div>
              <div><span style={{ fontSize: 11, color: lead.is_connection ? '#4ade80' : '#3d5a3d' }}>{lead.is_connection ? '✓ Conexão' : 'Não conectado'}</span></div>
              <div onClick={e => e.stopPropagation()}>
                {lead.ai_icp_score ? <span style={{ fontSize: 11, color: '#2d6a3f' }}>✓ Analisado</span>
                : <button onClick={() => enrichLead(lead)} disabled={enriching === lead.id} style={{ background: '#0f2a18', border: '1px solid #1e4a28', borderRadius: 6, color: '#4a9e5c', padding: '4px 10px', fontSize: 11 }}>{enriching === lead.id ? '...' : 'Analisar IA'}</button>}
              </div>
              <div onClick={e => e.stopPropagation()}>
                {lead.rd_station_status === 'sent' ? <span style={{ fontSize: 11, color: '#3d6b4a' }}>✓ No RD</span>
                : <button onClick={() => sendToRD(lead)} style={{ background: 'transparent', border: '1px solid #1e3322', borderRadius: 6, color: '#5a7a5a', padding: '4px 10px', fontSize: 11 }}>→ RD</button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lead detail */}
      {selLead && (
        <div style={{ width: 300, background: '#0a110b', borderLeft: '1px solid #162018', overflowY: 'auto' }}>
          <div style={{ padding: 16, borderBottom: '1px solid #162018', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#3d6b4a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Perfil</span>
            <button onClick={() => setSelLead(null)} style={{ background: 'none', border: 'none', color: '#3d5a3d', fontSize: 18 }}>✕</button>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1e3322', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#4a9e5c', flexShrink: 0 }}>{selLead.full_name?.[0]}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#c8b76a', marginBottom: 3 }}>{selLead.full_name}</div>
                <div style={{ fontSize: 11, color: '#5a7a5a', lineHeight: 1.5 }}>{selLead.headline}</div>
              </div>
            </div>
            {selLead.ai_icp_score && (
              <div style={{ background: '#0d1a0f', border: '1px solid #1e3322', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: '#3d5a3d', textTransform: 'uppercase' }}>ICP Score</span>
                  <span style={{ fontSize: 28, fontWeight: 900, color: ICP(selLead.ai_icp_score), fontFamily: 'monospace' }}>{selLead.ai_icp_score}</span>
                </div>
                <p style={{ fontSize: 12, color: '#7a9a7a', margin: 0, lineHeight: 1.6 }}>{selLead.ai_icp_justification || selLead.ai_profile_summary}</p>
              </div>
            )}
            {selLead.ai_pain_points?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#3d5a3d', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Dores</div>
                {selLead.ai_pain_points.map((p, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#7a9a7a', padding: '5px 0', borderBottom: '1px solid #0f1a11', display: 'flex', gap: 8 }}>
                    <span style={{ color: '#2d6a3f' }}>▸</span>{p}
                  </div>
                ))}
              </div>
            )}
            {[['Empresa', selLead.current_company],['Local', selLead.location],['Email', selLead.email || '—'],['Tel', selLead.phone || '—']].map(([l,v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #0f1a11' }}>
                <span style={{ fontSize: 11, color: '#3d5a3d' }}>{l}</span>
                <span style={{ fontSize: 12, color: '#7a9a7a' }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              {selLead.linkedin_url && <a href={selLead.linkedin_url} target="_blank" rel="noreferrer" style={{ display: 'block', background: '#0f2a18', border: '1px solid #1e4a28', borderRadius: 8, color: '#4a9e5c', padding: 10, fontSize: 12, textAlign: 'center' }}>Abrir LinkedIn ↗</a>}
              {!selLead.ai_icp_score && <button onClick={() => enrichLead(selLead)} disabled={enriching === selLead.id} style={{ background: 'linear-gradient(135deg,#1e5c2c,#2d8a40)', border: 'none', borderRadius: 8, color: '#e8e4d9', padding: 10, fontSize: 12 }}>{enriching === selLead.id ? 'Analisando...' : '🌱 Analisar com IA'}</button>}
              {selLead.rd_station_status !== 'sent' && <button onClick={() => sendToRD(selLead)} style={{ background: 'transparent', border: '1px solid #1e3322', borderRadius: 8, color: '#5a7a5a', padding: 10, fontSize: 12 }}>Enviar para RD Station</button>}
            </div>
          </div>
        </div>
      )}

      {/* Modal nova lista */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#0d1a0f', border: '1px solid #1e3322', borderRadius: 14, padding: 28, width: 360 }}>
            <h2 style={{ fontSize: 16, color: '#c8b76a', marginBottom: 20, fontWeight: 700 }}>Nova Lista</h2>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome da lista..." autoFocus onKeyDown={e => e.key === 'Enter' && createList()}
              style={{ width: '100%', background: '#0a110b', border: '1px solid #1e3322', borderRadius: 8, padding: 12, color: '#c8d4c0', fontSize: 14, marginBottom: 16 }} />
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#3d5a3d', marginBottom: 8, textTransform: 'uppercase' }}>Cor</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORS.map(c => <button key={c} onClick={() => setNewColor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: newColor === c ? '3px solid #fff' : '2px solid transparent' }} />)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, background: 'transparent', border: '1px solid #1e3322', borderRadius: 8, color: '#5a7a5a', padding: 10, fontSize: 13 }}>Cancelar</button>
              <button onClick={createList} style={{ flex: 2, background: 'linear-gradient(135deg,#1e5c2c,#2d8a40)', border: 'none', borderRadius: 8, color: '#e8e4d9', padding: 10, fontSize: 13 }}>Criar Lista</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
