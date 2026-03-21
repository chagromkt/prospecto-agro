import { useState, useEffect, useRef } from 'react'
import { sb, getProfileId, getAccessToken, SB_URL, SB_KEY, N8N_LEAD, N8N_RD, SEG, ICP, COLORS } from '../config.js'

const EDGE_ENRICH = 'https://juabbkewrtbignqrufgp.supabase.co/functions/v1/enrich-list'

const DISQUALIFY_REASONS = [
  'Não é ICP', 'Sem orçamento', 'Já é cliente', 'Concorrente',
  'Não respondeu', 'Cargo inadequado', 'Região fora do alvo', 'Outro'
]

const T = {
  bg:'#ffffff', bgSub:'#f8f8fc', border:'#e8e8f0',
  text:'#1a1a2e', textSub:'#6a6a7a', textMuted:'#9a9ab0',
  accent:'#1e6b3a', accentLight:'#f0f8f3'
}

const SENIORITY_OPTS = ['C-Level','Diretor','Gerente','Coordenador','Analista','Técnico']
const SEG_OPTS = ['insumos','cooperativa','revenda','maquinas','pecuaria','outros']

export default function Listas() {
  const [lists, setLists] = useState([])
  const [leads, setLeads] = useState([])
  const [sel, setSel] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [editList, setEditList] = useState(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#1e6b3a')
  const [enriching, setEnriching] = useState(null)
  const [sendingRD, setSendingRD] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [selLead, setSelLead] = useState(null)

  // Filtros
  const [search, setSearch] = useState('')
  const [filterSeg, setFilterSeg] = useState('')
  const [filterSeniority, setFilterSeniority] = useState('')
  const [filterMinScore, setFilterMinScore] = useState(0)
  const [filterAnalyzed, setFilterAnalyzed] = useState('') // ''|'yes'|'no'
  const [filterDisq, setFilterDisq] = useState('active') // 'active'|'disqualified'|'all'
  const [showFilters, setShowFilters] = useState(false)

  // Seleção em lote
  const [selected, setSelected] = useState(new Set())

  // Enriquecer tudo
  const [enrichAllModal, setEnrichAllModal] = useState(false)
  const [enrichAllForce, setEnrichAllForce] = useState(false)
  const [enrichingAll, setEnrichingAll] = useState(false)
  const [enrichAllResult, setEnrichAllResult] = useState(null)

  // Descarte
  const [disqModal, setDisqModal] = useState(null) // lead ou 'batch'
  const [disqReason, setDisqReason] = useState('')
  const [disqCustom, setDisqCustom] = useState('')
  const [disqSaving, setDisqSaving] = useState(false)

  useEffect(() => {
    sb(`lead_lists?profile_id=eq.${getProfileId()}&order=created_at.desc`)
      .then(d => { setLists(d||[]); if (d?.length) { setSel(d[0]); loadLeads(d[0].id) } })
      .catch(() => {})
  }, [])

  const loadLeads = async (listId) => {
    setLoading(true)
    setSelected(new Set())
    try {
      const members = await sb(`lead_list_members?list_id=eq.${listId}&select=lead_id`)
      const ids = (members||[]).map(m => m.lead_id)
      if (!ids.length) { setLeads([]); setLoading(false); return }
      const data = await sb(`leads?id=in.(${ids.join(',')})&order=ai_icp_score.desc.nullslast`)
      setLeads(data||[])
    } catch { setLeads([]) }
    setLoading(false)
  }

  const selectList = (list) => { setSel(list); loadLeads(list.id); setSelLead(null); setSearch('') }

  const saveList = async () => {
    if (!newName.trim()) return
    if (editList) {
      await sb(`lead_lists?id=eq.${editList.id}`, { method:'PATCH', body: JSON.stringify({ name: newName, color: newColor }) })
      setLists(p => p.map(l => l.id === editList.id ? {...l, name: newName, color: newColor} : l))
    } else {
      const token = getAccessToken()
      const r = await fetch(`${SB_URL}/rest/v1/lead_lists`, {
        method:'POST',
        headers:{ apikey:SB_KEY, Authorization:`Bearer ${token}`, 'Content-Type':'application/json', Prefer:'return=representation,resolution=merge-duplicates' },
        body: JSON.stringify({ name: newName, color: newColor, profile_id: getProfileId() })
      })
      const data = await r.json()
      const created = Array.isArray(data) ? data[0] : data
      setLists(p => [created, ...p])
    }
    setShowNew(false)
  }

  const deleteList = async (list) => {
    if (!confirm(`Excluir "${list.name}"? Os leads não serão deletados.`)) return
    await sb(`lead_lists?id=eq.${list.id}`, { method:'DELETE' })
    setLists(p => p.filter(l => l.id !== list.id))
    if (sel?.id === list.id) { setSel(null); setLeads([]) }
  }

  const removeFromList = async (lead) => {
    await sb(`lead_list_members?list_id=eq.${sel.id}&lead_id=eq.${lead.id}`, { method:'DELETE' })
    setLeads(p => p.filter(l => l.id !== lead.id))
    if (selLead?.id === lead.id) setSelLead(null)
  }

  const enrichLead = async (lead) => {
    setEnriching(lead.id)
    try {
      await fetch(EDGE_ENRICH, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ profile_id: getProfileId(), lead_ids: [lead.id], force_reanalyze: true })
      })
      await loadLeads(sel.id)
    } catch(e) { console.error(e) }
    setEnriching(null)
  }

  const enrichAll = async () => {
    setEnrichingAll(true); setEnrichAllResult(null)
    try {
      const r = await fetch(EDGE_ENRICH, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ profile_id: getProfileId(), list_id: sel.id, force_reanalyze: enrichAllForce })
      })
      const data = await r.json()
      setEnrichAllResult(data)
      if (data.success) await loadLeads(sel.id)
    } catch(e) { setEnrichAllResult({ success: false, error: e.message }) }
    setEnrichingAll(false)
  }

  const sendToRD = async (lead) => {
    setSendingRD(lead.id)
    try {
      await fetch(N8N_RD, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ lead_id: lead.id, profile_id: getProfileId() }) })
      await sb(`leads?id=eq.${lead.id}`, { method:'PATCH', body: JSON.stringify({ rd_station_status: 'sent', rd_station_sent_at: new Date().toISOString() }) })
      setLeads(p => p.map(l => l.id === lead.id ? {...l, rd_station_status: 'sent'} : l))
    } catch(e) { console.error(e) }
    setSendingRD(null)
  }

  const sendAllToRD = async () => {
    const pending = filtered.filter(l => l.rd_station_status !== 'sent' && !l.is_disqualified)
    for (const lead of pending) await sendToRD(lead)
  }

  // ── Descarte ─────────────────────────────────────────────────────────────
  const openDisqModal = (target) => {
    setDisqModal(target); setDisqReason(''); setDisqCustom('')
  }

  const confirmDisqualify = async () => {
    const reason = disqReason === 'Outro' ? disqCustom : disqReason
    if (!reason.trim()) return
    setDisqSaving(true)
    try {
      const update = { is_disqualified: true, disqualified_reason: reason, disqualified_at: new Date().toISOString() }

      if (disqModal === 'batch') {
        // Descarta selecionados
        const ids = [...selected]
        for (const id of ids) {
          await sb(`leads?id=eq.${id}`, { method:'PATCH', body: JSON.stringify(update) })
        }
        setLeads(p => p.map(l => ids.includes(l.id) ? {...l, ...update} : l))
        setSelected(new Set())
      } else {
        // Descarta um único lead
        await sb(`leads?id=eq.${disqModal.id}`, { method:'PATCH', body: JSON.stringify(update) })
        setLeads(p => p.map(l => l.id === disqModal.id ? {...l, ...update} : l))
        if (selLead?.id === disqModal.id) setSelLead(prev => ({...prev, ...update}))
      }

      // Cancela execuções pendentes nas campanhas para os leads descartados
      const ids = disqModal === 'batch' ? [...selected] : [disqModal.id]
      for (const id of ids) {
        await sb(`campaign_executions?lead_id=eq.${id}&status=in.(pending,waiting)`, {
          method: 'PATCH', body: JSON.stringify({ status: 'skipped' })
        })
      }

    } catch(e) { console.error(e) }
    setDisqSaving(false)
    setDisqModal(null)
  }

  const requalify = async (lead) => {
    const update = { is_disqualified: false, disqualified_reason: null, disqualified_at: null }
    await sb(`leads?id=eq.${lead.id}`, { method:'PATCH', body: JSON.stringify(update) })
    setLeads(p => p.map(l => l.id === lead.id ? {...l, ...update} : l))
    if (selLead?.id === lead.id) setSelLead(prev => ({...prev, ...update}))
  }

  // ── Seleção ──────────────────────────────────────────────────────────────
  const toggleSelect = (id, e) => {
    e.stopPropagation()
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(l => l.id)))
  }

  // ── Exportar CSV ─────────────────────────────────────────────────────────
  const exportCSV = () => {
    const toExport = filtered
    const headers = ['Nome','Cargo','Empresa','Local','Score ICP','Segmento','Senioridade','LinkedIn','Status RD','Descartado','Motivo Descarte']
    const rows = toExport.map(l => [
      l.full_name, l.headline, l.current_company, l.location,
      l.ai_icp_score||'', l.detected_segment||'', l.seniority_level||'',
      l.linkedin_url||'', l.rd_station_status||'',
      l.is_disqualified?'Sim':'Não', l.disqualified_reason||''
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type:'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `${sel?.name||'lista'}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // ── Filtros ───────────────────────────────────────────────────────────────
  const filtered = leads.filter(l => {
    const q = search.toLowerCase()
    if (q && !l.full_name?.toLowerCase().includes(q) && !l.current_company?.toLowerCase().includes(q) && !l.headline?.toLowerCase().includes(q)) return false
    if (filterSeg && l.detected_segment !== filterSeg) return false
    if (filterSeniority && l.seniority_level !== filterSeniority) return false
    if (filterMinScore > 0 && (l.ai_icp_score||0) < filterMinScore) return false
    if (filterAnalyzed === 'yes' && !l.ai_analyzed_at) return false
    if (filterAnalyzed === 'no' && l.ai_analyzed_at) return false
    if (filterDisq === 'active' && l.is_disqualified) return false
    if (filterDisq === 'disqualified' && !l.is_disqualified) return false
    return true
  })

  const pendingAnalysis = leads.filter(l => !l.ai_analyzed_at && !l.is_disqualified).length
  const pendingRD = filtered.filter(l => l.rd_station_status !== 'sent' && !l.is_disqualified).length
  const activeFilterCount = [filterSeg, filterSeniority, filterMinScore > 0 ? 1 : 0, filterAnalyzed, filterDisq !== 'active' ? 1 : 0].filter(Boolean).length

  const inp = { background:T.bgSub, border:`1px solid ${T.border}`, borderRadius:8, padding:'8px 10px', color:T.text, fontSize:12, width:'100%' }

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', background:T.bg }}>

      {/* ── COLUNA LISTAS ── */}
      <div style={{ width:220, background:T.bgSub, borderRight:`1px solid ${T.border}`, display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'14px 12px 10px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:700, color:T.text }}>Listas</span>
          <button onClick={() => { setShowNew(true); setEditList(null); setNewName(''); setNewColor('#1e6b3a') }}
            style={{ background:T.accent, border:'none', borderRadius:6, color:'#fff', padding:'4px 12px', fontSize:12, fontWeight:600 }}>+ Nova</button>
        </div>

        {showNew && (
          <div style={{ padding:12, borderBottom:`1px solid ${T.border}`, background:'#fff' }}>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome da lista" style={{ ...inp, marginBottom:8 }} onKeyDown={e => e.key==='Enter'&&saveList()} autoFocus />
            <div style={{ display:'flex', gap:6, marginBottom:8, flexWrap:'wrap' }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => setNewColor(c)}
                  style={{ width:18, height:18, borderRadius:'50%', background:c, cursor:'pointer', border:`2px solid ${newColor===c?'#1a1a2e':'transparent'}` }} />
              ))}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={saveList} style={{ flex:1, background:T.accent, border:'none', borderRadius:6, color:'#fff', padding:'6px 0', fontSize:12, fontWeight:600 }}>Salvar</button>
              <button onClick={() => setShowNew(false)} style={{ flex:1, background:'#f0f0f5', border:'none', borderRadius:6, color:T.textSub, padding:'6px 0', fontSize:12 }}>Cancelar</button>
            </div>
          </div>
        )}

        <div style={{ flex:1, overflowY:'auto', padding:8 }}>
          {lists.map(list => (
            <div key={list.id} onClick={() => selectList(list)}
              style={{ padding:'9px 10px', borderRadius:8, marginBottom:3, cursor:'pointer', background:sel?.id===list.id?'#ffffff':'transparent', border:`1px solid ${sel?.id===list.id?T.border:'transparent'}`, boxShadow:sel?.id===list.id?'0 1px 3px rgba(0,0,0,0.06)':'none' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <div style={{ width:9, height:9, borderRadius:'50%', background:list.color||T.accent, flexShrink:0 }} />
                  <span style={{ fontSize:12, fontWeight:600, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:110 }}>{list.name}</span>
                </div>
                <div style={{ display:'flex', gap:3 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setEditList(list); setNewName(list.name); setNewColor(list.color||'#1e6b3a'); setShowNew(true) }}
                    style={{ background:'none', border:'none', color:T.textMuted, fontSize:12, cursor:'pointer', padding:'0 3px' }}>✎</button>
                  <button onClick={() => deleteList(list)}
                    style={{ background:'none', border:'none', color:'#dc2626', fontSize:12, cursor:'pointer', padding:'0 3px' }}>✕</button>
                </div>
              </div>
              <div style={{ fontSize:10, color:T.textMuted, marginTop:2, paddingLeft:16 }}>{list.total_leads||0} leads</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PAINEL PRINCIPAL ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {!sel ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:T.textMuted, flexDirection:'column', gap:10 }}>
            <div style={{ fontSize:36 }}>📋</div>
            <div style={{ fontSize:14 }}>Selecione ou crie uma lista</div>
          </div>
        ) : (
          <>
            {/* Header da lista */}
            <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, background:T.bg }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:sel.color||T.accent }} />
                <span style={{ fontSize:15, fontWeight:700, color:T.text }}>{sel.name}</span>
                <span style={{ fontSize:11, color:T.textMuted, background:'#f0f0f5', padding:'2px 8px', borderRadius:10 }}>
                  {filtered.length}{filtered.length !== leads.length ? ` / ${leads.length}` : ''} leads
                </span>
                <div style={{ marginLeft:'auto', display:'flex', gap:8, flexWrap:'wrap' }}>
                  {/* Analisar todos */}
                  <button onClick={() => { setEnrichAllModal(true); setEnrichAllResult(null); setEnrichAllForce(false) }}
                    style={{ background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:8, color:'#5b21b6', padding:'6px 12px', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
                    🤖 Analisar todos {pendingAnalysis > 0 && <span style={{ background:'#5b21b6', color:'#fff', borderRadius:10, padding:'1px 6px', fontSize:10 }}>{pendingAnalysis}</span>}
                  </button>
                  <button onClick={exportCSV} disabled={!leads.length} style={{ background:T.bgSub, border:`1px solid ${T.border}`, borderRadius:8, color:T.textSub, padding:'6px 12px', fontSize:12 }}>⬇ CSV</button>
                  {pendingRD > 0 && (
                    <button onClick={sendAllToRD} style={{ background:T.accent, border:'none', borderRadius:8, color:'#fff', padding:'6px 12px', fontSize:12, fontWeight:600 }}>→ RD ({pendingRD})</button>
                  )}
                  <button onClick={() => setShowFilters(p => !p)}
                    style={{ background:showFilters?'#f0f8f3':'#f8f8fc', border:`1px solid ${activeFilterCount>0?T.accent:T.border}`, borderRadius:8, color:activeFilterCount>0?T.accent:T.textSub, padding:'6px 12px', fontSize:12, fontWeight:activeFilterCount>0?700:400 }}>
                    🔽 Filtros {activeFilterCount > 0 && `(${activeFilterCount})`}
                  </button>
                </div>
              </div>

              {/* Filtros expandíveis */}
              {showFilters && (
                <div style={{ marginTop:12, padding:12, background:'#f8f8fc', borderRadius:10, border:`1px solid ${T.border}`, display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
                  <div>
                    <div style={{ fontSize:10, color:T.textMuted, marginBottom:4, textTransform:'uppercase', fontWeight:600 }}>Segmento</div>
                    <select value={filterSeg} onChange={e => setFilterSeg(e.target.value)} style={{ ...inp, width:120 }}>
                      <option value="">Todos</option>
                      {SEG_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:T.textMuted, marginBottom:4, textTransform:'uppercase', fontWeight:600 }}>Senioridade</div>
                    <select value={filterSeniority} onChange={e => setFilterSeniority(e.target.value)} style={{ ...inp, width:130 }}>
                      <option value="">Todos</option>
                      {SENIORITY_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:T.textMuted, marginBottom:4, textTransform:'uppercase', fontWeight:600 }}>Score mínimo: <strong style={{ color:T.accent }}>{filterMinScore}</strong></div>
                    <input type="range" min={0} max={100} step={5} value={filterMinScore} onChange={e => setFilterMinScore(Number(e.target.value))}
                      style={{ width:100, accentColor:T.accent }} />
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:T.textMuted, marginBottom:4, textTransform:'uppercase', fontWeight:600 }}>Análise IA</div>
                    <select value={filterAnalyzed} onChange={e => setFilterAnalyzed(e.target.value)} style={{ ...inp, width:130 }}>
                      <option value="">Todos</option>
                      <option value="yes">Analisados</option>
                      <option value="no">Não analisados</option>
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:T.textMuted, marginBottom:4, textTransform:'uppercase', fontWeight:600 }}>Status</div>
                    <select value={filterDisq} onChange={e => setFilterDisq(e.target.value)} style={{ ...inp, width:130 }}>
                      <option value="active">Ativos</option>
                      <option value="disqualified">Descartados</option>
                      <option value="all">Todos</option>
                    </select>
                  </div>
                  {activeFilterCount > 0 && (
                    <button onClick={() => { setFilterSeg(''); setFilterSeniority(''); setFilterMinScore(0); setFilterAnalyzed(''); setFilterDisq('active') }}
                      style={{ background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:8, color:'#dc2626', padding:'7px 12px', fontSize:12 }}>
                      ✕ Limpar
                    </button>
                  )}
                </div>
              )}

              {/* Barra de busca + ações em lote */}
              <div style={{ display:'flex', gap:8, marginTop:10, alignItems:'center' }}>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nome, empresa ou cargo..." style={{ ...inp, flex:1 }} />
                {/* Checkbox selecionar tudo */}
                {filtered.length > 0 && (
                  <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12, color:T.textSub, flexShrink:0, whiteSpace:'nowrap' }}>
                    <input type="checkbox" checked={selected.size > 0 && selected.size === filtered.length}
                      onChange={toggleSelectAll} />
                    {selected.size > 0 ? `${selected.size} sel.` : 'Sel. todos'}
                  </label>
                )}
              </div>

              {/* Barra ações em lote */}
              {selected.size > 0 && (
                <div style={{ marginTop:8, padding:'8px 12px', background:'#1a1a2e', borderRadius:8, display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:12, color:'#a0a0c0' }}>{selected.size} lead{selected.size>1?'s':''} selecionado{selected.size>1?'s':''}</span>
                  <button onClick={() => openDisqModal('batch')}
                    style={{ background:'#dc2626', border:'none', borderRadius:6, color:'#fff', padding:'5px 14px', fontSize:12, fontWeight:700 }}>
                    🚫 Descartar selecionados
                  </button>
                  <button onClick={() => {
                    const ids = [...selected]
                    fetch(EDGE_ENRICH, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ profile_id: getProfileId(), lead_ids: ids, force_reanalyze: true }) })
                      .then(() => loadLeads(sel.id))
                  }} style={{ background:'#5b21b6', border:'none', borderRadius:6, color:'#fff', padding:'5px 14px', fontSize:12, fontWeight:700 }}>
                    🤖 Analisar selecionados
                  </button>
                  <button onClick={() => setSelected(new Set())}
                    style={{ background:'none', border:'1px solid #4a4a6a', borderRadius:6, color:'#9a9ab0', padding:'5px 10px', fontSize:12, marginLeft:'auto' }}>
                    ✕ Limpar
                  </button>
                </div>
              )}
            </div>

            {/* Lista de leads */}
            <div style={{ flex:1, overflowY:'auto', padding:'10px 16px' }}>
              {loading ? (
                <div style={{ textAlign:'center', color:T.textMuted, padding:40 }}>Carregando...</div>
              ) : filtered.length === 0 ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:200, gap:8 }}>
                  <div style={{ fontSize:32 }}>🌱</div>
                  <div style={{ color:T.textMuted, fontSize:13 }}>Nenhum lead {activeFilterCount>0?'com esses filtros':'nesta lista'}</div>
                </div>
              ) : filtered.map((lead, i) => {
                const isDisq = lead.is_disqualified
                const isSel = selected.has(lead.id)
                const seg = SEG[lead.detected_segment]
                return (
                  <div key={lead.id}
                    style={{ background: isSel ? '#f0faf4' : isDisq ? '#fafafa' : '#fff', border:`1px solid ${isSel?'#b8e8c8':isDisq?'#ffd0d0':'#e8e8f0'}`, borderRadius:10, padding:'10px 14px', marginBottom:5, cursor:'pointer', display:'flex', alignItems:'center', gap:10, opacity: isDisq ? 0.65 : 1, transition:'all 0.15s' }}
                    onClick={() => setSelLead(selLead?.id===lead.id?null:lead)}>

                    {/* Checkbox */}
                    <div onClick={e => toggleSelect(lead.id, e)} style={{ flexShrink:0 }}>
                      <input type="checkbox" checked={isSel} onChange={() => {}} style={{ cursor:'pointer', width:14, height:14 }} />
                    </div>

                    {/* Avatar */}
                    {lead.avatar_url
                      ? <img src={lead.avatar_url} alt="" style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} onError={e => e.target.style.display='none'} />
                      : <div style={{ width:32, height:32, borderRadius:'50%', background:'#e8e8f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:T.textSub, flexShrink:0 }}>
                          {(lead.full_name||'?')[0].toUpperCase()}
                        </div>
                    }

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                        <span style={{ fontSize:13, fontWeight:700, color:T.text, textDecoration:isDisq?'line-through':'none' }}>{lead.full_name}</span>
                        {isDisq && <span style={{ fontSize:10, background:'#fee2e2', color:'#dc2626', borderRadius:6, padding:'1px 7px', fontWeight:600 }}>🚫 {lead.disqualified_reason||'Descartado'}</span>}
                        {seg && !isDisq && <span style={{ fontSize:10, background:`${seg.c}18`, color:seg.c, borderRadius:6, padding:'1px 7px', fontWeight:600 }}>{seg.l}</span>}
                        {lead.seniority_level && !isDisq && <span style={{ fontSize:10, background:'#f0f0f5', color:T.textSub, borderRadius:6, padding:'1px 7px' }}>{lead.seniority_level}</span>}
                      </div>
                      <div style={{ fontSize:11, color:T.textSub, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {lead.headline || '—'} {lead.current_company ? `· ${lead.current_company}` : ''}
                      </div>
                    </div>

                    {/* Score */}
                    <div style={{ textAlign:'center', flexShrink:0, width:42 }}>
                      {lead.ai_icp_score != null
                        ? <><div style={{ fontSize:18, fontWeight:900, color:ICP(lead.ai_icp_score), fontFamily:'monospace' }}>{lead.ai_icp_score}</div><div style={{ fontSize:9, color:T.textMuted }}>ICP</div></>
                        : <div style={{ fontSize:10, color:T.textMuted }}>—</div>
                      }
                    </div>

                    {/* Ações */}
                    <div style={{ display:'flex', gap:5, flexShrink:0 }} onClick={e => e.stopPropagation()}>
                      {!lead.ai_analyzed_at || lead.ai_icp_score == null
                        ? <button onClick={() => enrichLead(lead)} disabled={enriching===lead.id}
                            style={{ background:T.accentLight, border:`1px solid #b8e8c8`, borderRadius:6, color:T.accent, padding:'3px 8px', fontSize:11, fontWeight:600 }}>
                            {enriching===lead.id ? '...' : '🤖'}
                          </button>
                        : <span style={{ fontSize:11, color:T.accent, padding:'3px 8px' }}>✓IA</span>
                      }
                      {!isDisq && (
                        lead.rd_station_status === 'sent'
                          ? <span style={{ fontSize:11, color:'#059669', padding:'3px 6px' }}>✓RD</span>
                          : <button onClick={() => sendToRD(lead)} disabled={sendingRD===lead.id}
                              style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:6, color:T.textSub, padding:'3px 8px', fontSize:11 }}>
                              {sendingRD===lead.id ? '...' : '→RD'}
                            </button>
                      )}
                      {lead.linkedin_url && (
                        <a href={lead.linkedin_url} target="_blank" rel="noreferrer"
                          style={{ fontSize:11, color:'#2563eb', padding:'3px 4px', textDecoration:'none' }}>in</a>
                      )}
                      {/* Descarte / requalificar */}
                      {isDisq
                        ? <button onClick={() => requalify(lead)} title="Reativar lead"
                            style={{ background:'#f0faf4', border:'1px solid #b8e8c8', borderRadius:6, color:T.accent, padding:'3px 7px', fontSize:11 }}>↩</button>
                        : <button onClick={() => openDisqModal(lead)} title="Descartar lead"
                            style={{ background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:6, color:'#dc2626', padding:'3px 7px', fontSize:11 }}>🚫</button>
                      }
                      <button onClick={() => removeFromList(lead)} title="Remover da lista"
                        style={{ background:'none', border:'none', color:'#e0e0ea', fontSize:15, cursor:'pointer', lineHeight:1, padding:'3px 4px' }}
                        onMouseEnter={e=>e.currentTarget.style.color='#dc2626'}
                        onMouseLeave={e=>e.currentTarget.style.color='#e0e0ea'}>✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── PAINEL LATERAL LEAD ── */}
      {selLead && (
        <div style={{ width:300, background:T.bg, borderLeft:`1px solid ${T.border}`, display:'flex', flexDirection:'column', flexShrink:0 }}>
          <div style={{ padding:'14px 16px 10px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, fontWeight:700, color:T.text }}>Detalhes</span>
            <button onClick={() => setSelLead(null)} style={{ background:'none', border:'none', color:T.textMuted, fontSize:18, cursor:'pointer' }}>✕</button>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:16 }}>
            {selLead.avatar_url && (
              <img src={selLead.avatar_url} alt="" style={{ width:56, height:56, borderRadius:'50%', objectFit:'cover', marginBottom:12 }} onError={e => e.target.style.display='none'} />
            )}
            <div style={{ fontSize:15, fontWeight:700, color:T.text, marginBottom:4 }}>{selLead.full_name}</div>
            <div style={{ fontSize:12, color:T.textSub, marginBottom:2 }}>{selLead.headline}</div>
            <div style={{ fontSize:12, color:T.textSub, marginBottom:12 }}>{selLead.current_company}</div>

            {selLead.is_disqualified && (
              <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 12px', marginBottom:12 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#dc2626', marginBottom:2 }}>🚫 Lead descartado</div>
                <div style={{ fontSize:11, color:'#7f1d1d' }}>{selLead.disqualified_reason}</div>
                <button onClick={() => requalify(selLead)} style={{ marginTop:8, background:'#fff', border:'1px solid #fca5a5', borderRadius:6, color:'#dc2626', padding:'4px 10px', fontSize:11 }}>↩ Reativar</button>
              </div>
            )}

            {selLead.ai_icp_score != null && (
              <div style={{ background:T.accentLight, borderRadius:8, padding:'10px 12px', marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:11, color:T.textSub, textTransform:'uppercase', fontWeight:700 }}>ICP Score</span>
                  <span style={{ fontSize:22, fontWeight:900, color:ICP(selLead.ai_icp_score), fontFamily:'monospace' }}>{selLead.ai_icp_score}</span>
                </div>
                {selLead.ai_icp_justification && <div style={{ fontSize:11, color:T.textSub, lineHeight:1.5 }}>{selLead.ai_icp_justification}</div>}
              </div>
            )}

            {selLead.ai_profile_summary && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:10, color:T.textMuted, textTransform:'uppercase', fontWeight:700, marginBottom:4 }}>Resumo</div>
                <div style={{ fontSize:12, color:T.textSub, lineHeight:1.6 }}>{selLead.ai_profile_summary}</div>
              </div>
            )}

            {selLead.ai_pain_points?.length > 0 && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:10, color:T.textMuted, textTransform:'uppercase', fontWeight:700, marginBottom:6 }}>Dores mapeadas</div>
                {selLead.ai_pain_points.map((p, i) => (
                  <div key={i} style={{ fontSize:11, color:T.textSub, padding:'3px 0', display:'flex', gap:6 }}>
                    <span style={{ color:'#dc2626' }}>•</span>{p}
                  </div>
                ))}
              </div>
            )}

            {selLead.ai_insights?.length > 0 && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:10, color:T.textMuted, textTransform:'uppercase', fontWeight:700, marginBottom:6 }}>Sugestão de abertura</div>
                <div style={{ fontSize:11, color:T.textSub, background:'#f8f8fc', borderRadius:7, padding:10, lineHeight:1.6, fontStyle:'italic' }}>"{selLead.ai_insights[0]}"</div>
              </div>
            )}

            {selLead.linkedin_url && (
              <a href={selLead.linkedin_url} target="_blank" rel="noreferrer"
                style={{ display:'block', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'8px 12px', textAlign:'center', color:'#2563eb', fontSize:12, fontWeight:600, textDecoration:'none', marginBottom:8 }}>
                Ver perfil no LinkedIn ↗
              </a>
            )}

            {!selLead.is_disqualified && (
              <button onClick={() => openDisqModal(selLead)}
                style={{ width:'100%', background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:8, color:'#dc2626', padding:'9px', fontSize:12, fontWeight:600 }}>
                🚫 Descartar este lead
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL ANALISAR TODOS ── */}
      {enrichAllModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:400 }}
          onClick={e => e.target===e.currentTarget && !enrichingAll && setEnrichAllModal(false)}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, width:420, boxShadow:'0 16px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize:16, fontWeight:700, color:'#1a1a2e', marginBottom:6 }}>🤖 Analisar todos com IA</div>
            <div style={{ fontSize:13, color:T.textSub, marginBottom:16, lineHeight:1.6 }}>
              <strong style={{ color:T.text }}>{pendingAnalysis} leads</strong> sem análise na lista <strong style={{ color:T.accent }}>{sel?.name}</strong>.
            </div>
            <label style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:T.textSub, marginBottom:20, cursor:'pointer' }}>
              <input type="checkbox" checked={enrichAllForce} onChange={e => setEnrichAllForce(e.target.checked)} />
              Re-analisar também os já analisados ({leads.filter(l=>l.ai_analyzed_at).length} leads)
            </label>

            {enrichAllResult && (
              <div style={{ background:enrichAllResult.success?'#f0faf4':'#fff5f5', border:`1px solid ${enrichAllResult.success?'#b8e8c8':'#ffd0d0'}`, borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13 }}>
                {enrichAllResult.success
                  ? <span style={{ color:'#059669' }}>✅ {enrichAllResult.message}</span>
                  : <span style={{ color:'#dc2626' }}>❌ {enrichAllResult.error || enrichAllResult.message}</span>}
              </div>
            )}

            {enrichingAll && (
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, color:T.accent, fontSize:13 }}>
                <div style={{ width:16, height:16, border:'2px solid #1e6b3a', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                Analisando leads... pode levar alguns minutos
              </div>
            )}

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => { if(!enrichingAll) setEnrichAllModal(false) }}
                style={{ flex:1, background:'#fff', border:`1px solid ${T.border}`, borderRadius:8, color:T.textSub, padding:11, fontSize:13 }}>
                {enrichAllResult ? 'Fechar' : 'Cancelar'}
              </button>
              {!enrichAllResult && (
                <button onClick={enrichAll} disabled={enrichingAll}
                  style={{ flex:2, background:enrichingAll?'#e0e0ea':'linear-gradient(135deg,#5b21b6,#7c3aed)', border:'none', borderRadius:8, color:enrichingAll?'#9a9ab0':'#fff', padding:11, fontSize:13, fontWeight:700 }}>
                  {enrichingAll ? 'Analisando...' : `🤖 Analisar ${enrichAllForce ? leads.length : pendingAnalysis} leads`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DESCARTAR ── */}
      {disqModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:400 }}
          onClick={e => e.target===e.currentTarget && !disqSaving && setDisqModal(null)}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, width:400, boxShadow:'0 16px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize:16, fontWeight:700, color:'#1a1a2e', marginBottom:6 }}>🚫 Descartar lead{disqModal==='batch'?'s':''}</div>
            <div style={{ fontSize:13, color:T.textSub, marginBottom:16, lineHeight:1.6 }}>
              {disqModal === 'batch'
                ? <><strong style={{ color:T.text }}>{selected.size} leads</strong> serão descartados e não entrarão em campanhas.</>
                : <><strong style={{ color:T.text }}>{disqModal.full_name}</strong> será descartado e removido das filas de campanhas.</>
              }
            </div>

            <div style={{ fontSize:11, color:T.textMuted, textTransform:'uppercase', fontWeight:700, marginBottom:8 }}>Motivo</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
              {DISQUALIFY_REASONS.map(r => (
                <button key={r} onClick={() => setDisqReason(r)}
                  style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${disqReason===r?'#dc2626':'#e0e0ea'}`, background:disqReason===r?'#fee2e2':'#fff', color:disqReason===r?'#dc2626':'#6a6a7a', fontSize:12, cursor:'pointer', fontWeight:disqReason===r?600:400 }}>
                  {r}
                </button>
              ))}
            </div>
            {disqReason === 'Outro' && (
              <input value={disqCustom} onChange={e => setDisqCustom(e.target.value)}
                placeholder="Descreva o motivo..." style={{ background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:'9px 12px', color:'#1a1a2e', fontSize:13, width:'100%', marginBottom:12 }} />
            )}

            <div style={{ display:'flex', gap:10, marginTop:4 }}>
              <button onClick={() => { if(!disqSaving) setDisqModal(null) }}
                style={{ flex:1, background:'#fff', border:`1px solid ${T.border}`, borderRadius:8, color:T.textSub, padding:11, fontSize:13 }}>Cancelar</button>
              <button onClick={confirmDisqualify}
                disabled={disqSaving || !disqReason || (disqReason==='Outro'&&!disqCustom.trim())}
                style={{ flex:2, background:(!disqReason||(disqReason==='Outro'&&!disqCustom.trim()))?'#e0e0ea':'#dc2626', border:'none', borderRadius:8, color:(!disqReason||(disqReason==='Outro'&&!disqCustom.trim()))?'#9a9ab0':'#fff', padding:11, fontSize:13, fontWeight:700 }}>
                {disqSaving ? 'Descartando...' : '🚫 Confirmar descarte'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  )
}
