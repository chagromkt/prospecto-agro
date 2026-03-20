import { useState, useEffect } from 'react'
import { sb, PROFILE_ID } from '../config.js'

const MetricCard = ({ label, value, color = '#4a9e5c', editable, onSave }) => {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const save = () => { onSave && onSave(val); setEditing(false) }
  return (
    <div style={{ background: '#0d1a0f', border: '1px solid #162018', borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 11, color: '#3d5a3d', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>{label}</div>
      {editing ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <input type="number" value={val} onChange={e => setVal(e.target.value)}
            style={{ width: 80, background: '#0a110b', border: '1px solid #1e3322', borderRadius: 6, padding: '4px 8px', color: '#c8b76a', fontSize: 20, fontWeight: 900 }} />
          <button onClick={save} style={{ background: '#1e4a28', border: 'none', borderRadius: 6, color: '#4a9e5c', padding: '4px 10px', fontSize: 12 }}>✓</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 32, fontWeight: 900, color, fontFamily: 'monospace' }}>{value}</span>
          {editable && <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', color: '#2d5a3d', fontSize: 12 }}>✎</button>}
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
      const data = await sb(`dashboard_summary?profile_id=eq.${PROFILE_ID}`)
      setMetrics(data?.[0] || {})
    } catch {
      setMetrics({ connections_this_week: 12, connections_this_month: 47, conversations_this_month: 23, comments_this_month: 89, meetings_this_month: 5, proposals_this_month: 3, sales_this_month: 1, revenue_this_month: 4800 })
    }
    setLoading(false)
  }

  const updateMetric = async (field, value) => {
    const today = new Date().toISOString().split('T')[0]
    try {
      await sb(`dashboard_metrics?profile_id=eq.${PROFILE_ID}&metric_date=eq.${today}`, {
        method: 'PATCH', body: JSON.stringify({ [field]: parseInt(value) }),
      })
      fetchMetrics()
    } catch {}
  }

  const m = metrics || {}

  return (
    <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, color: '#c8b76a', fontWeight: 700 }}>Dashboard</h1>
          <p style={{ fontSize: 12, color: '#3d5a3d', marginTop: 4 }}>Performance de prospecção no LinkedIn</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['week','month','year'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, background: filter === f ? '#1e4a28' : 'transparent', border: filter === f ? '1px solid #2d6a3f' : '1px solid #162018', color: filter === f ? '#c8b76a' : '#3d5a3d' }}>
              {f === 'week' ? 'Semana' : f === 'month' ? 'Mês' : 'Ano'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#3d5a3d' }}>Carregando...</div> : (<>
        <div style={{ fontSize: 11, color: '#2d4a2d', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Automático (LinkedIn)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
          <MetricCard label="Novas Conexões" value={filter === 'week' ? (m.connections_this_week || 0) : (m.connections_this_month || 0)} color="#4ade80" />
          <MetricCard label="Conversas Iniciadas" value={m.conversations_this_month || 0} color="#3b82f6" />
          <MetricCard label="Comentários" value={m.comments_this_month || 0} color="#f59e0b" />
          <MetricCard label="Campanhas Ativas" value={1} color="#ec4899" />
        </div>
        <div style={{ fontSize: 11, color: '#2d4a2d', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Manual <span style={{ color: '#1e3322' }}>(clique no lápis para editar)</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <MetricCard label="Reuniões Agendadas" value={m.meetings_this_month || 0} color="#10b981" editable onSave={v => updateMetric('meetings_booked', v)} />
          <MetricCard label="Propostas Enviadas" value={m.proposals_this_month || 0} color="#8b5cf6" editable onSave={v => updateMetric('proposals_sent', v)} />
          <MetricCard label="Vendas Fechadas" value={m.sales_this_month || 0} color="#facc15" editable onSave={v => updateMetric('sales_closed', v)} />
          <MetricCard label="Receita Gerada" value={`R$ ${Number(m.revenue_this_month || 0).toLocaleString('pt-BR')}`} color="#c8b76a" editable onSave={v => updateMetric('revenue_amount', v)} />
        </div>
        <div style={{ marginTop: 24, background: '#0d1a0f', border: '1px solid #162018', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, color: '#c8b76a', fontWeight: 700, marginBottom: 16 }}>Funil do Período</div>
          {[
            { label: 'Conexões', value: m.connections_this_month || 47, color: '#4ade80' },
            { label: 'Conversas', value: m.conversations_this_month || 23, color: '#3b82f6' },
            { label: 'Reuniões', value: m.meetings_this_month || 5, color: '#10b981' },
            { label: 'Propostas', value: m.proposals_this_month || 3, color: '#8b5cf6' },
            { label: 'Vendas', value: m.sales_this_month || 1, color: '#facc15' },
          ].map((item, i, arr) => {
            const max = arr[0].value || 1
            const pct = Math.round((item.value / max) * 100)
            return (
              <div key={item.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#7a9a7a' }}>{item.label}</span>
                  <span style={{ fontSize: 12, color: item.color, fontFamily: 'monospace', fontWeight: 700 }}>{item.value}</span>
                </div>
                <div style={{ height: 6, background: '#162018', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: 3, transition: 'width 0.8s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      </>)}
    </div>
  )
}
