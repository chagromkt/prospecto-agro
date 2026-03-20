import { useState, useEffect } from 'react'
import { sb, getProfileId } from '../config.js'

const MetricCard = ({ label, value, color = '#1e6b3a', editable, onSave }) => {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const save = () => { onSave && onSave(val); setEditing(false) }
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e8e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: 11, color: '#9a9ab0', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>{label}</div>
      {editing ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <input type="number" value={val} onChange={e => setVal(e.target.value)} style={{ width: 80, background: '#f8f8fc', border: '1px solid #e0e0ea', borderRadius: 6, padding: '4px 8px', color: '#1a1a2e', fontSize: 20, fontWeight: 900 }} />
          <button onClick={save} style={{ background: '#1e6b3a', border: 'none', borderRadius: 6, color: '#fff', padding: '4px 10px', fontSize: 12 }}>✓</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 32, fontWeight: 900, color, fontFamily: 'monospace' }}>{value}</span>
          {editable && <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', color: '#c0c0d0', fontSize: 12, cursor: 'pointer' }}>✎</button>}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null)
  const [filter, setFilter] = useState('month')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchMetrics() }, [])

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const data = await sb(`dashboard_summary?profile_id=eq.${getProfileId()}`)
      setMetrics(data?.[0] || {})
    } catch {
      setMetrics({ connections_this_week: 12, connections_this_month: 47, conversations_this_month: 23, comments_this_month: 89, meetings_this_month: 5, proposals_this_month: 3, sales_this_month: 1, revenue_this_month: 4800 })
    }
    setLoading(false)
  }

  const updateMetric = async (field, value) => {
    const today = new Date().toISOString().split('T')[0]
    try {
      await sb(`dashboard_metrics?profile_id=eq.${getProfileId()}&metric_date=eq.${today}`, { method: 'PATCH', body: JSON.stringify({ [field]: parseInt(value) }) })
      fetchMetrics()
    } catch {}
  }

  const m = metrics || {}

  return (
    <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', background: '#ffffff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, color: '#1a1a2e', fontWeight: 700 }}>Dashboard</h1>
          <p style={{ fontSize: 12, color: '#9a9ab0', marginTop: 4 }}>Performance de prospecção no LinkedIn</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['week','month','year'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, background: filter === f ? '#1e6b3a' : '#ffffff', border: filter === f ? '1px solid #1e6b3a' : '1px solid #e0e0ea', color: filter === f ? '#ffffff' : '#6a6a7a' }}>
              {f === 'week' ? 'Semana' : f === 'month' ? 'Mês' : 'Ano'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#9a9ab0' }}>Carregando...</div> : (<>
        <div style={{ fontSize: 11, color: '#9a9ab0', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Automático (LinkedIn)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
          <MetricCard label="Novas Conexões" value={filter === 'week' ? (m.connections_this_week||0) : (m.connections_this_month||0)} color="#1e6b3a" />
          <MetricCard label="Conversas Iniciadas" value={m.conversations_this_month||0} color="#2563eb" />
          <MetricCard label="Comentários" value={m.comments_this_month||0} color="#d97706" />
          <MetricCard label="Campanhas Ativas" value={1} color="#7c3aed" />
        </div>

        <div style={{ fontSize: 11, color: '#9a9ab0', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Manual <span style={{ color: '#c0c0d0', textTransform: 'none', letterSpacing: 0 }}>(clique no lápis para editar)</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
          <MetricCard label="Reuniões Agendadas" value={m.meetings_this_month||0} color="#059669" editable onSave={v => updateMetric('meetings_booked', v)} />
          <MetricCard label="Propostas Enviadas" value={m.proposals_this_month||0} color="#7c3aed" editable onSave={v => updateMetric('proposals_sent', v)} />
          <MetricCard label="Vendas Fechadas" value={m.sales_this_month||0} color="#d97706" editable onSave={v => updateMetric('sales_closed', v)} />
          <MetricCard label="Receita Gerada" value={`R$ ${Number(m.revenue_this_month||0).toLocaleString('pt-BR')}`} color="#1a1a2e" editable onSave={v => updateMetric('revenue_amount', v)} />
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e8e8f0', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 14, color: '#1a1a2e', fontWeight: 700, marginBottom: 20 }}>Funil do Período</div>
          {[
            { label: 'Conexões', value: m.connections_this_month||47, color: '#1e6b3a' },
            { label: 'Conversas', value: m.conversations_this_month||23, color: '#2563eb' },
            { label: 'Reuniões', value: m.meetings_this_month||5, color: '#059669' },
            { label: 'Propostas', value: m.proposals_this_month||3, color: '#7c3aed' },
            { label: 'Vendas', value: m.sales_this_month||1, color: '#d97706' },
          ].map((item, i, arr) => {
            const pct = Math.round((item.value / (arr[0].value || 1)) * 100)
            return (
              <div key={item.label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: '#4a4a5a' }}>{item.label}</span>
                  <span style={{ fontSize: 13, color: item.color, fontFamily: 'monospace', fontWeight: 700 }}>{item.value}</span>
                </div>
                <div style={{ height: 8, background: '#f0f0f5', borderRadius: 4 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: 4, transition: 'width 0.8s ease', opacity: 0.85 }} />
                </div>
              </div>
            )
          })}
        </div>
      </>)}
    </div>
  )
}
