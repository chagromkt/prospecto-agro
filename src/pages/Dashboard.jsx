import { useState, useEffect, useRef } from 'react'
import { sb, getProfileId, SB_URL, SB_KEY, getAccessToken } from '../config.js'

const MetricCard = ({ label, value, color = '#1e6b3a', editable, onSave, pulse }) => {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  useEffect(() => setVal(value), [value])
  const save = () => { onSave && onSave(val); setEditing(false) }
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e8e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
      {pulse && <div style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: '#10b981', animation: 'pulseDot 2s infinite' }} />}
      <div style={{ fontSize: 11, color: '#9a9ab0', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>{label}</div>
      {editing ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <input type="number" value={val} onChange={e => setVal(e.target.value)} style={{ width: 80, background: '#f8f8fc', border: '1px solid #e0e0ea', borderRadius: 6, padding: '4px 8px', color: '#1a1a2e', fontSize: 20, fontWeight: 900 }} />
          <button onClick={save} style={{ background: '#1e6b3a', border: 'none', borderRadius: 6, color: '#fff', padding: '4px 10px', fontSize: 12 }}>✓</button>
          <button onClick={() => setEditing(false)} style={{ background: '#f0f0f5', border: 'none', borderRadius: 6, color: '#6a6a7a', padding: '4px 10px', fontSize: 12 }}>✕</button>
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

const ActivityFeed = ({ activities }) => (
  <div style={{ background: '#ffffff', border: '1px solid #e8e8f0', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <div style={{ fontSize: 14, color: '#1a1a2e', fontWeight: 700 }}>Atividade Recente</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#10b981' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulseDot 2s infinite' }} />
        Tempo real
      </div>
    </div>
    {activities.length === 0
      ? <div style={{ textAlign: 'center', color: '#c0c0d0', fontSize: 12, padding: '16px 0' }}>Nenhuma atividade ainda</div>
      : activities.slice(0, 8).map((a, i) => (
        <div key={a.id || i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f5fa', animation: i === 0 ? 'fadeIn 0.3s ease' : 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: a.status === 'success' ? '#f0faf4' : '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
            {a.action_type === 'lead_imported' ? '🌱' : a.action_type === 'rd_station_push' ? '→' : a.action_type === 'connection_sent' ? '🔗' : a.action_type === 'message_sent' ? '💬' : '◎'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#2a2a3e', lineHeight: 1.4 }}>{a.description}</div>
            <div style={{ fontSize: 10, color: '#c0c0d0', marginTop: 2 }}>{new Date(a.created_at).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</div>
          </div>
          <div style={{ fontSize: 10, color: a.status === 'success' ? '#10b981' : '#dc2626', fontWeight: 600, flexShrink: 0 }}>{a.status === 'success' ? '✓' : '✕'}</div>
        </div>
      ))}
  </div>
)

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null)
  const [activities, setActivities] = useState([])
  const [filter, setFilter] = useState('month')
  const [loading, setLoading] = useState(true)
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const channelRef = useRef(null)

  useEffect(() => {
    fetchMetrics()
    fetchActivities()
    setupRealtime()
    return () => { if (channelRef.current) channelRef.current.close() }
  }, [])

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const data = await sb(`dashboard_summary?profile_id=eq.${getProfileId()}`)
      setMetrics(data?.[0] || {})
    } catch {
      setMetrics({ connections_this_week: 0, connections_this_month: 0, conversations_this_month: 0, comments_this_month: 0, meetings_this_month: 0, proposals_this_month: 0, sales_this_month: 0, revenue_this_month: 0 })
    }
    setLoading(false)
  }

  const fetchActivities = async () => {
    try {
      const data = await sb(`activity_log?profile_id=eq.${getProfileId()}&order=created_at.desc&limit=20`)
      setActivities(data || [])
    } catch { setActivities([]) }
  }

  const setupRealtime = () => {
    try {
      // Supabase Realtime via WebSocket
      const ws = new WebSocket(`wss://juabbkewrtbignqrufgp.supabase.co/realtime/v1/websocket?apikey=${SB_KEY}&vsn=1.0.0`)
      channelRef.current = ws

      ws.onopen = () => {
        setRealtimeConnected(true)
        // Subscribe ao canal de activity_log
        ws.send(JSON.stringify({
          topic: `realtime:public:activity_log:profile_id=eq.${getProfileId()}`,
          event: 'phx_join',
          payload: { config: { broadcast: { self: false }, presence: { key: '' }, postgres_changes: [{ event: 'INSERT', schema: 'public', table: 'activity_log', filter: `profile_id=eq.${getProfileId()}` }] } },
          ref: '1'
        }))
      }

      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data)
          if (data.event === 'postgres_changes' && data.payload?.data?.record) {
            const record = data.payload.data.record
            setActivities(prev => [record, ...prev.slice(0, 19)])
            // Atualiza métricas quando novos leads são importados
            if (record.action_type === 'lead_imported') {
              setTimeout(fetchMetrics, 1000)
            }
          }
          // Heartbeat
          if (data.event === 'phx_reply') {
            setTimeout(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: Date.now().toString() }))
              }
            }, 30000)
          }
        } catch {}
      }

      ws.onclose = () => { setRealtimeConnected(false) }
      ws.onerror = () => { setRealtimeConnected(false) }
    } catch { setRealtimeConnected(false) }
  }

  const updateMetric = async (field, value) => {
    const today = new Date().toISOString().split('T')[0]
    try {
      // UPSERT: cria ou atualiza o registro do dia
      await sb('dashboard_metrics', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ profile_id: getProfileId(), metric_date: today, [field]: parseInt(value) })
      })
      fetchMetrics()
    } catch {}
  }

  const m = metrics || {}
  const connections = filter === 'week' ? (m.connections_this_week||0) : (m.connections_this_month||0)

  return (
    <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', background: '#ffffff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, color: '#1a1a2e', fontWeight: 700 }}>Dashboard</h1>
          <p style={{ fontSize: 12, color: '#9a9ab0', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            Performance de prospecção no LinkedIn
            {realtimeConnected && <span style={{ fontSize: 10, color: '#10b981', background: '#f0faf4', padding: '1px 7px', borderRadius: 8, border: '1px solid #b0e8c8' }}>● ao vivo</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['week','Semana'],['month','Mês'],['year','Ano']].map(([f,l]) => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, background: filter === f ? '#1e6b3a' : '#ffffff', border: filter === f ? '1px solid #1e6b3a' : '1px solid #e0e0ea', color: filter === f ? '#ffffff' : '#6a6a7a' }}>{l}</button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#9a9ab0' }}>Carregando...</div> : (<>
        <div style={{ fontSize: 11, color: '#9a9ab0', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          Automático (LinkedIn)
          {realtimeConnected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulseDot 2s infinite' }} />}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
          <MetricCard label="Novas Conexões" value={connections} color="#1e6b3a" pulse={realtimeConnected} />
          <MetricCard label="Conversas Iniciadas" value={m.conversations_this_month||0} color="#2563eb" />
          <MetricCard label="Comentários" value={m.comments_this_month||0} color="#d97706" />
          <MetricCard label="Campanhas Ativas" value={1} color="#7c3aed" />
        </div>

        <div style={{ fontSize: 11, color: '#9a9ab0', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
          Manual <span style={{ color: '#c0c0d0', textTransform: 'none', letterSpacing: 0 }}>(clique no lápis para editar)</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
          <MetricCard label="Reuniões Agendadas" value={m.meetings_this_month||0} color="#059669" editable onSave={v => updateMetric('meetings_booked', v)} />
          <MetricCard label="Propostas Enviadas" value={m.proposals_this_month||0} color="#7c3aed" editable onSave={v => updateMetric('proposals_sent', v)} />
          <MetricCard label="Vendas Fechadas" value={m.sales_this_month||0} color="#d97706" editable onSave={v => updateMetric('sales_closed', v)} />
          <MetricCard label="Receita Gerada" value={`R$ ${Number(m.revenue_this_month||0).toLocaleString('pt-BR')}`} color="#1a1a2e" editable onSave={v => updateMetric('revenue_amount', v)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: '#ffffff', border: '1px solid #e8e8f0', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 14, color: '#1a1a2e', fontWeight: 700, marginBottom: 20 }}>Funil do Período</div>
            {[
              { label: 'Conexões', value: m.connections_this_month||0, color: '#1e6b3a' },
              { label: 'Conversas', value: m.conversations_this_month||0, color: '#2563eb' },
              { label: 'Reuniões', value: m.meetings_this_month||0, color: '#059669' },
              { label: 'Propostas', value: m.proposals_this_month||0, color: '#7c3aed' },
              { label: 'Vendas', value: m.sales_this_month||0, color: '#d97706' },
            ].map((item, i, arr) => {
              const pct = Math.round((item.value / Math.max(arr[0].value || 1, 1)) * 100)
              return (
                <div key={item.label} style={{ marginBottom: 14 }}>
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
          <ActivityFeed activities={activities} />
        </div>
      </>)}

      <style>{`
        @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
