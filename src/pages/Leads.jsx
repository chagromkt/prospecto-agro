import { useState, useEffect } from 'react'
import { sb, PROFILE_ID, SEG, ICP, MOCK_LEADS } from '../config.js'

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [sel, setSel] = useState(null)
  const [search, setSearch] = useState('')
  const [segFilter, setSegFilter] = useState('all')
  const [scoreFilter, setScoreFilter] = useState('all')

  useEffect(() => {
    sb(`leads?profile_id=eq.${PROFILE_ID}&order=ai_icp_score.desc.nullslast&limit=100`)
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
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #162018' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <h1 style={{ fontSize: 20, color: '#c8b76a', fontWeight: 700, flex: 1 }}>Todos os Leads</h1>
            <span style={{ fontSize: 11, color: '#3d6b4a', background: '#0f1a11', border: '1px solid #162018', padding: '2px 10px', borderRadius: 10 }}>{leads.length} total</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou empresa..." style={{ flex: 1, background: '#0f1a11', border: '1px solid #1e3322', borderRadius: 8, padding: '8px 14px', color: '#c8d4c0', fontSize: 13 }} />
            <select value={segFilter} onChange={e => setSegFilter(e.target.value)} style={{ background: '#0f1a11', border: '1px solid #1e3322', borderRadius: 8, padding: '8px 12px', color: '#c8d4c0', fontSize: 12 }}>
              <option value="all">Todos segmentos</option>
              {Object.entries(SEG).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
            </select>
            <select value={scoreFilter} onChange={e => setScoreFilter(e.target.value)} style={{ background: '#0f1a11', border: '1px solid #1e3322', borderRadius: 8, padding: '8px 12px', color: '#c8d4c0', fontSize: 12 }}>
              <option value="all">Todos scores</option>
              <option value="high">Alta (75+)</option>
              <option value="mid">Média (50-74)</option>
              <option value="low">Baixa (&lt;50)</option>
            </select>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {filtered.map((lead, i) => (
            <div key={lead.id} onClick={() => setSel(sel?.id === lead.id ? null : lead)} style={{ background: '#0d1a0f', border: `1px solid ${sel?.id === lead.id ? '#2d6a3f' : '#162018'}`, borderRadius: 10, padding: '14px 16px', marginBottom: 8, cursor: 'pointer', display: 'grid', gridTemplateColumns: '44px 1fr 160px 90px 100px 90px', alignItems: 'center', gap: 12, animation: `fadeIn 0.3s ease ${i * 0.03}s both` }}>
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
                  : '—'}
              </div>
              <div><span style={{ fontSize: 11, color: lead.is_connection ? '#4ade80' : '#3d5a3d' }}>{lead.is_connection ? '✓ Conexão' : 'Não conectado'}</span></div>
              <div><span style={{ fontSize: 11, color: lead.rd_station_status === 'sent' ? '#3d6b4a' : '#2d4a2d' }}>{lead.rd_station_status === 'sent' ? '✓ No RD' : 'Pendente'}</span></div>
            </div>
          ))}
        </div>
      </div>
      {sel && (
        <div style={{ width: 300, background: '#0a110b', borderLeft: '1px solid #162018', overflowY: 'auto' }}>
          <div style={{ padding: 16, borderBottom: '1px solid #162018', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#3d6b4a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Perfil</span>
            <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', color: '#3d5a3d', fontSize: 18 }}>✕</button>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1e3322', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#4a9e5c', flexShrink: 0 }}>{sel.full_name?.[0]}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#c8b76a', marginBottom: 3 }}>{sel.full_name}</div>
                <div style={{ fontSize: 11, color: '#5a7a5a', lineHeight: 1.5 }}>{sel.headline}</div>
              </div>
            </div>
            {sel.ai_icp_score && (
              <div style={{ background: '#0d1a0f', border: '1px solid #1e3322', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: '#3d5a3d', textTransform: 'uppercase' }}>ICP Score</span>
                  <span style={{ fontSize: 28, fontWeight: 900, color: ICP(sel.ai_icp_score), fontFamily: 'monospace' }}>{sel.ai_icp_score}</span>
                </div>
                <p style={{ fontSize: 12, color: '#7a9a7a', margin: 0, lineHeight: 1.6 }}>{sel.ai_icp_justification || sel.ai_profile_summary}</p>
              </div>
            )}
            {sel.ai_pain_points?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#3d5a3d', textTransform: 'uppercase', marginBottom: 8 }}>Dores</div>
                {sel.ai_pain_points.map((p, i) => <div key={i} style={{ fontSize: 12, color: '#7a9a7a', padding: '5px 0', borderBottom: '1px solid #0f1a11', display: 'flex', gap: 8 }}><span style={{ color: '#2d6a3f' }}>▸</span>{p}</div>)}
              </div>
            )}
            {sel.linkedin_url && <a href={sel.linkedin_url} target="_blank" rel="noreferrer" style={{ display: 'block', background: '#0f2a18', border: '1px solid #1e4a28', borderRadius: 8, color: '#4a9e5c', padding: 10, fontSize: 12, textAlign: 'center', marginTop: 12 }}>Abrir LinkedIn ↗</a>}
          </div>
        </div>
      )}
    </div>
  )
}
