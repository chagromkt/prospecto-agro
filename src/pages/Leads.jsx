import { useState, useEffect } from 'react'
import { sb, getProfileId, SEG, ICP, MOCK_LEADS } from '../config.js'

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [sel, setSel] = useState(null)
  const [search, setSearch] = useState('')
  const [segFilter, setSegFilter] = useState('all')
  const [scoreFilter, setScoreFilter] = useState('all')

  useEffect(() => {
    sb(`leads?profile_id=eq.${getProfileId()}&order=ai_icp_score.desc.nullslast&limit=100`)
      .then(setLeads).catch(() => setLeads(MOCK_LEADS))
  }, [])

  const filtered = leads.filter(l => {
    const matchSearch = l.full_name?.toLowerCase().includes(search.toLowerCase()) || l.current_company?.toLowerCase().includes(search.toLowerCase())
    const matchSeg = segFilter === 'all' || l.detected_segment === segFilter
    const matchScore = scoreFilter === 'all' || (scoreFilter === 'high' && l.ai_icp_score >= 75) || (scoreFilter === 'mid' && l.ai_icp_score >= 50 && l.ai_icp_score < 75) || (scoreFilter === 'low' && l.ai_icp_score < 50)
    return matchSearch && matchSeg && matchScore
  })

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e8e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <h1 style={{ fontSize: 20, color: '#1e6b3a', fontWeight: 700, flex: 1 }}>Todos os Leads</h1>
            <span style={{ fontSize: 11, color: '#1e6b3a', background: '#f8f8fc', border: '1px solid #e8e8f0', padding: '2px 10px', borderRadius: 10 }}>{leads.length} total</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou empresa..." style={{ flex: 1, background: '#f8f8fc', border: '1px solid #e0e0ea', borderRadius: 8, padding: '8px 14px', color: '#2a2a3e', fontSize: 13 }} />
            <select value={segFilter} onChange={e => setSegFilter(e.target.value)} style={{ background: '#f8f8fc', border: '1px solid #e0e0ea', borderRadius: 8, padding: '8px 12px', color: '#2a2a3e', fontSize: 12 }}>
              <option value="all">Todos segmentos</option>
              {Object.entries(SEG).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
            </select>
            <select value={scoreFilter} onChange={e => setScoreFilter(e.target.value)} style={{ background: '#f8f8fc', border: '1px solid #e0e0ea', borderRadius: 8, padding: '8px 12px', color: '#2a2a3e', fontSize: 12 }}>
              <option value="all">Todos scores</option>
              <option value="high">Alta (75+)</option>
              <option value="mid">Média (50-74)</option>
              <option value="low">Baixa (&lt;50)</option>
            </select>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {filtered.map((lead, i) => (
            <div key={lead.id} onClick={() => setSel(sel?.id === lead.id ? null : lead)} style={{ background: '#ffffff', border: `1px solid ${sel?.id === lead.id ? '#1e6b3a' : '#e8e8f0'}`, borderRadius: 10, padding: '14px 16px', marginBottom: 8, cursor: 'pointer', display: 'grid', gridTemplateColumns: '44px 1fr 160px 90px 100px 90px', alignItems: 'center', gap: 12, animation: `fadeIn 0.3s ease ${i * 0.03}s both` }}>
              <div style={{ textAlign: 'center' }}>
                {lead.ai_icp_score ? <div style={{ fontSize: 18, fontWeight: 900, color: ICP(lead.ai_icp_score), fontFamily: 'monospace' }}>{lead.ai_icp_score}</div> : <div style={{ fontSize: 11, color: '#c0c0d0' }}>—</div>}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e6b3a', marginBottom: 2 }}>{lead.full_name}</div>
                <div style={{ fontSize: 11, color: '#6a6a7a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.headline}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#4a4a5a' }}>{lead.current_company}</div>
                <div style={{ fontSize: 11, color: '#9a9ab0' }}>{lead.location}</div>
              </div>
              <div>
                {lead.detected_segment && SEG[lead.detected_segment]
                  ? <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: `${SEG[lead.detected_segment].c}20`, color: SEG[lead.detected_segment].c, border: `1px solid ${SEG[lead.detected_segment].c}40` }}>{SEG[lead.detected_segment].l}</span>
                  : '—'}
              </div>
              <div><span style={{ fontSize: 11, color: lead.is_connection ? '#059669' : '#9a9ab0' }}>{lead.is_connection ? '✓ Conexão' : 'Não conectado'}</span></div>
              <div><span style={{ fontSize: 11, color: lead.rd_station_status === 'sent' ? '#1e6b3a' : '#c0c0d0' }}>{lead.rd_station_status === 'sent' ? '✓ No RD' : 'Pendente'}</span></div>
            </div>
          ))}
        </div>
      </div>
      {sel && (
        <div style={{ width: 300, background: '#f8f8fc', borderLeft: '1px solid #e8e8f0', overflowY: 'auto' }}>
          <div style={{ padding: 16, borderBottom: '1px solid #e8e8f0', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#1e6b3a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Perfil</span>
            <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', color: '#9a9ab0', fontSize: 18 }}>✕</button>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e0e0ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#1e6b3a', flexShrink: 0 }}>{sel.full_name?.[0]}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1e6b3a', marginBottom: 3 }}>{sel.full_name}</div>
                <div style={{ fontSize: 11, color: '#6a6a7a', lineHeight: 1.5 }}>{sel.headline}</div>
              </div>
            </div>
            {sel.ai_icp_score && (
              <div style={{ background: '#ffffff', border: '1px solid #e0e0ea', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: '#9a9ab0', textTransform: 'uppercase' }}>ICP Score</span>
                  <span style={{ fontSize: 28, fontWeight: 900, color: ICP(sel.ai_icp_score), fontFamily: 'monospace' }}>{sel.ai_icp_score}</span>
                </div>
                <p style={{ fontSize: 12, color: '#4a4a5a', margin: 0, lineHeight: 1.6 }}>{sel.ai_icp_justification || sel.ai_profile_summary}</p>
              </div>
            )}
            {sel.ai_pain_points?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#9a9ab0', textTransform: 'uppercase', marginBottom: 8 }}>Dores</div>
                {sel.ai_pain_points.map((p, i) => <div key={i} style={{ fontSize: 12, color: '#4a4a5a', padding: '5px 0', borderBottom: '1px solid #f8f8fc', display: 'flex', gap: 8 }}><span style={{ color: '#1e6b3a' }}>▸</span>{p}</div>)}
              </div>
            )}
            {sel.linkedin_url && <a href={sel.linkedin_url} target="_blank" rel="noreferrer" style={{ display: 'block', background: '#f0f8f3', border: '1px solid #b8e8c8', borderRadius: 8, color: '#1e6b3a', padding: 10, fontSize: 12, textAlign: 'center', marginTop: 12 }}>Abrir LinkedIn ↗</a>}
          </div>
        </div>
      )}
    </div>
  )
}
