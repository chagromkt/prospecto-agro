import { useState, useEffect } from 'react'
import { sb, getProfileId, SEG } from '../config.js'

const icpColor = s => s >= 75 ? '#059669' : s >= 50 ? '#d97706' : '#dc2626'

const EMPTY_EDIT = { full_name:'', headline:'', current_position:'', current_company:'', location:'', email:'', phone:'', linkedin_url:'' }

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterSeg, setFilterSeg] = useState('')
  const [filterScore, setFilterScore] = useState('')
  const [selLead, setSelLead] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState(EMPTY_EDIT)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const data = await sb(`leads?profile_id=eq.${getProfileId()}&order=ai_icp_score.desc.nullslast&limit=200`)
      setLeads(data || [])
    } catch { setLeads([]) }
    setLoading(false)
  }

  const openEdit = (lead) => {
    setEditForm({ full_name:lead.full_name||'', headline:lead.headline||'', current_position:lead.current_position||'', current_company:lead.current_company||'', location:lead.location||'', email:lead.email||'', phone:lead.phone||'', linkedin_url:lead.linkedin_url||'' })
    setEditMode(true)
  }

  const saveEdit = async () => {
    if (!selLead) return
    setSaving(true)
    try {
      await sb(`leads?id=eq.${selLead.id}`, { method:'PATCH', body: JSON.stringify(editForm) })
      setLeads(p => p.map(l => l.id===selLead.id ? {...l,...editForm} : l))
      setSelLead(prev => ({...prev,...editForm}))
      setEditMode(false)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const del = async (lead) => {
    if (!confirm(`Excluir lead "${lead.full_name}"? Esta ação não pode ser desfeita.`)) return
    setDeleting(lead.id)
    try {
      await sb(`lead_list_members?lead_id=eq.${lead.id}`, { method:'DELETE' })
      await sb(`leads?id=eq.${lead.id}`, { method:'DELETE' })
      setLeads(p => p.filter(l => l.id!==lead.id))
      if (selLead?.id===lead.id) setSelLead(null)
    } catch {}
    setDeleting(null)
  }

  const filtered = leads.filter(l => {
    const matchSearch = !search || l.full_name?.toLowerCase().includes(search.toLowerCase()) || l.current_company?.toLowerCase().includes(search.toLowerCase())
    const matchSeg = !filterSeg || l.detected_segment === filterSeg
    const matchScore = !filterScore || (filterScore==='alto' && (l.ai_icp_score||0)>=75) || (filterScore==='medio' && (l.ai_icp_score||0)>=50 && (l.ai_icp_score||0)<75) || (filterScore==='baixo' && (l.ai_icp_score||0)<50)
    return matchSearch && matchSeg && matchScore
  })

  const inp = { width:'100%', background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:'8px 12px', color:'#1a1a2e', fontSize:13, marginBottom:10, fontFamily:'Georgia, serif' }

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', background:'#ffffff' }}>
      {/* List */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'16px 24px', borderBottom:'1px solid #e8e8f0', display:'flex', alignItems:'center', gap:10 }}>
          <h1 style={{ fontSize:18, color:'#1a1a2e', fontWeight:700, flex:1 }}>Todos os Leads</h1>
          <span style={{ fontSize:11, color:'#9a9ab0', background:'#f0f0f5', padding:'2px 8px', borderRadius:10 }}>{filtered.length} total</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou empresa..." style={{ background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:'7px 12px', color:'#1a1a2e', fontSize:12, width:220 }} />
          <select value={filterSeg} onChange={e => setFilterSeg(e.target.value)} style={{ background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:'7px 10px', color:'#6a6a7a', fontSize:12 }}>
            <option value="">Todos segmentos</option>
            {Object.entries(SEG).map(([k,v]) => <option key={k} value={k}>{v.l}</option>)}
          </select>
          <select value={filterScore} onChange={e => setFilterScore(e.target.value)} style={{ background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:'7px 10px', color:'#6a6a7a', fontSize:12 }}>
            <option value="">Todos scores</option>
            <option value="alto">Alto (≥75)</option>
            <option value="medio">Médio (50-74)</option>
            <option value="baixo">Baixo (&lt;50)</option>
          </select>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'12px 24px' }}>
          {loading ? <div style={{ textAlign:'center', color:'#9a9ab0', padding:40 }}>Carregando...</div>
          : filtered.length === 0 ? <div style={{ textAlign:'center', color:'#c0c0d0', padding:40 }}>Nenhum lead encontrado</div>
          : filtered.map(lead => (
            <div key={lead.id} onClick={() => { setSelLead(selLead?.id===lead.id ? null : lead); setEditMode(false) }}
              style={{ background:selLead?.id===lead.id?'#f0f8f3':'#ffffff', border:`1px solid ${selLead?.id===lead.id?'#b8e8c8':'#e8e8f0'}`, borderRadius:10, padding:'10px 16px', marginBottom:5, cursor:'pointer', display:'grid', gridTemplateColumns:'40px 1fr 160px 80px 80px 60px', alignItems:'center', gap:12, boxShadow:'0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ textAlign:'center' }}>
                {lead.ai_icp_score ? <span style={{ fontSize:16, fontWeight:900, color:icpColor(lead.ai_icp_score), fontFamily:'monospace' }}>{lead.ai_icp_score}</span> : <span style={{ fontSize:11, color:'#c0c0d0' }}>—</span>}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'#1a1a2e', marginBottom:2 }}>{lead.full_name}</div>
                <div style={{ fontSize:11, color:'#9a9ab0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lead.headline}</div>
              </div>
              <div>
                <div style={{ fontSize:12, color:'#6a6a7a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lead.current_company}</div>
                <div style={{ fontSize:11, color:'#9a9ab0' }}>{lead.location}</div>
              </div>
              <div>
                {lead.detected_segment && SEG[lead.detected_segment]
                  ? <span style={{ fontSize:10, padding:'2px 7px', borderRadius:10, background:`${SEG[lead.detected_segment].c}15`, color:SEG[lead.detected_segment].c, fontWeight:600 }}>{SEG[lead.detected_segment].l}</span>
                  : null}
              </div>
              <div onClick={e => e.stopPropagation()}>
                <button onClick={() => { setSelLead(lead); openEdit(lead) }} style={{ background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:6, color:'#6a6a7a', padding:'3px 10px', fontSize:11, marginRight:4 }}>✎</button>
              </div>
              <div onClick={e => e.stopPropagation()}>
                <button onClick={() => del(lead)} disabled={deleting===lead.id} style={{ background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:6, color:'#dc2626', padding:'3px 10px', fontSize:11 }}>{deleting===lead.id?'...':'✕'}</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail / Edit panel */}
      {selLead && (
        <div style={{ width:300, background:'#f8f8fc', borderLeft:'1px solid #e8e8f0', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid #e8e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:11, color:'#9a9ab0', textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:600 }}>{editMode ? 'Editar Lead' : 'Perfil'}</span>
            <div style={{ display:'flex', gap:6 }}>
              {!editMode && <button onClick={() => openEdit(selLead)} style={{ background:'#f0f8f3', border:'1px solid #b8e8c8', borderRadius:6, color:'#1e6b3a', padding:'4px 10px', fontSize:11, fontWeight:600 }}>✎ Editar</button>}
              <button onClick={() => { setSelLead(null); setEditMode(false) }} style={{ background:'none', border:'none', color:'#c0c0d0', fontSize:18, cursor:'pointer' }}>✕</button>
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:16 }}>
            {editMode ? (
              <div>
                {[['Nome completo','full_name'],['Cargo / Headline','headline'],['Posição atual','current_position'],['Empresa','current_company'],['Localização','location'],['Email','email'],['Telefone','phone'],['URL LinkedIn','linkedin_url']].map(([label,key]) => (
                  <div key={key}>
                    <div style={{ fontSize:11, color:'#9a9ab0', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4, fontWeight:600 }}>{label}</div>
                    <input value={editForm[key]} onChange={e => setEditForm(p=>({...p,[key]:e.target.value}))} style={inp} />
                  </div>
                ))}
                <div style={{ display:'flex', gap:8, marginTop:8 }}>
                  <button onClick={() => setEditMode(false)} style={{ flex:1, background:'#fff', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:10, fontSize:12 }}>Cancelar</button>
                  <button onClick={saveEdit} disabled={saving} style={{ flex:2, background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:'#fff', padding:10, fontSize:12, fontWeight:700 }}>{saving?'Salvando...':'Salvar'}</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#fff', fontWeight:700, flexShrink:0 }}>{selLead.full_name?.[0]}</div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e' }}>{selLead.full_name}</div>
                    <div style={{ fontSize:11, color:'#6a6a7a', lineHeight:1.5 }}>{selLead.headline}</div>
                  </div>
                </div>
                {selLead.ai_icp_score && (
                  <div style={{ background:'#fff', border:'1px solid #e8e8f0', borderRadius:10, padding:12, marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <span style={{ fontSize:11, color:'#9a9ab0', fontWeight:600 }}>ICP Score</span>
                      <span style={{ fontSize:24, fontWeight:900, color:icpColor(selLead.ai_icp_score), fontFamily:'monospace' }}>{selLead.ai_icp_score}</span>
                    </div>
                    <p style={{ fontSize:11, color:'#6a6a7a', lineHeight:1.6 }}>{selLead.ai_icp_justification || selLead.ai_profile_summary}</p>
                  </div>
                )}
                {selLead.ai_pain_points?.length > 0 && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11, color:'#9a9ab0', fontWeight:600, textTransform:'uppercase', marginBottom:6 }}>Dores</div>
                    {selLead.ai_pain_points.map((p,i) => <div key={i} style={{ fontSize:11, color:'#6a6a7a', padding:'4px 0', borderBottom:'1px solid #f5f5fa', display:'flex', gap:6 }}><span style={{ color:'#1e6b3a' }}>▸</span>{p}</div>)}
                  </div>
                )}
                {[['Empresa',selLead.current_company],['Local',selLead.location],['Email',selLead.email||'—'],['Telefone',selLead.phone||'—']].map(([l,v]) => (
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #f5f5fa' }}>
                    <span style={{ fontSize:11, color:'#9a9ab0', fontWeight:600 }}>{l}</span>
                    <span style={{ fontSize:11, color:'#6a6a7a' }}>{v||'—'}</span>
                  </div>
                ))}
                <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:8 }}>
                  {selLead.linkedin_url && <a href={selLead.linkedin_url} target="_blank" rel="noreferrer" style={{ display:'block', background:'#f0f8f3', border:'1px solid #b8e8c8', borderRadius:8, color:'#1e6b3a', padding:10, fontSize:12, textAlign:'center', fontWeight:600 }}>Abrir LinkedIn ↗</a>}
                  <button onClick={() => del(selLead)} style={{ background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:8, color:'#dc2626', padding:10, fontSize:12 }}>Excluir lead</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
