import { useState, useEffect } from 'react'
import { sb, getProfileId, STEP_TYPES } from '../config.js'

const MOCK_CAMPS = [
  { id: 'c1', name: 'Revendas Agro — Abordagem Inicial', status: 'active', connections_sent: 23, messages_sent: 11, replies_received: 4, created_at: new Date().toISOString() },
  { id: 'c2', name: 'Cooperativas PR/SC', status: 'paused', connections_sent: 8, messages_sent: 3, replies_received: 1, created_at: new Date().toISOString() },
]

export default function Campanhas() {
  const [camps, setCamps] = useState([])
  const [sel, setSel] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [steps, setSteps] = useState([])
  const [newName, setNewName] = useState('')
  const [newObj, setNewObj] = useState('')
  const [dragging, setDragging] = useState(null)

  useEffect(() => {
    sb(`campaigns?profile_id=eq.${getProfileId()}&order=created_at.desc`)
      .then(d => { setCamps(d); if (d.length) setSel(d[0]) })
      .catch(() => { setCamps(MOCK_CAMPS); setSel(MOCK_CAMPS[0]) })
  }, [])

  const addStep = (type) => {
    setSteps(p => [...p, { id: `s${Date.now()}`, step_type: type.id, label: type.label, icon: type.icon, color: type.color, config: {} }])
  }

  const removeStep = (id) => setSteps(p => p.filter(s => s.id !== id))

  const createCampaign = async () => {
    if (!newName.trim()) return
    try {
      const camp = await sb('campaigns', { method: 'POST', body: JSON.stringify({ profile_id: getProfileId(), name: newName, objective: newObj, status: 'draft', daily_limit: 20 }) })
      const nc = Array.isArray(camp) ? camp[0] : camp
      for (let i = 0; i < steps.length; i++) {
        await sb('campaign_steps', { method: 'POST', body: JSON.stringify({ campaign_id: nc.id, step_order: i+1, step_type: steps[i].step_type, config: steps[i].config }) })
      }
      setCamps(p => [nc, ...p]); setSel(nc)
    } catch {
      const nc = { id: `c${Date.now()}`, name: newName, status: 'draft', connections_sent: 0, messages_sent: 0, replies_received: 0 }
      setCamps(p => [nc, ...p]); setSel(nc)
    }
    setShowNew(false); setNewName(''); setNewObj(''); setSteps([])
  }

  const toggleStatus = async (camp) => {
    const ns = camp.status === 'active' ? 'paused' : 'active'
    try { await sb(`campaigns?id=eq.${camp.id}`, { method: 'PATCH', body: JSON.stringify({ status: ns }) }) } catch {}
    setCamps(p => p.map(c => c.id === camp.id ? { ...c, status: ns } : c))
    if (sel?.id === camp.id) setSel(prev => ({ ...prev, status: ns }))
  }

  const statusColor = s => s === 'active' ? '#059669' : s === 'paused' ? '#f59e0b' : s === 'completed' ? '#3b82f6' : '#6a6a7a'
  const statusLabel = s => s === 'active' ? 'Ativa' : s === 'paused' ? 'Pausada' : s === 'completed' ? 'Concluída' : 'Rascunho'

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Campaign list */}
      <div style={{ width: 280, background: '#f8f8fc', borderRight: '1px solid #e8e8f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #e8e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#1e6b3a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Campanhas</span>
          <button onClick={() => setShowNew(true)} style={{ background: '#b8e8c8', border: 'none', borderRadius: 6, color: '#1e6b3a', padding: '4px 10px', fontSize: 12 }}>+ Nova</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {camps.map(c => (
            <div key={c.id} onClick={() => setSel(c)} style={{ padding: 14, borderRadius: 8, marginBottom: 6, cursor: 'pointer', background: sel?.id === c.id ? '#f0f8f3' : 'transparent', border: `1px solid ${sel?.id === c.id ? '#b8e8c8' : 'transparent'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: sel?.id === c.id ? '#1e6b3a' : '#a09070', fontWeight: 600, flex: 1, marginRight: 8, lineHeight: 1.4 }}>{c.name}</span>
                <span style={{ fontSize: 10, color: statusColor(c.status), background: `${statusColor(c.status)}15`, padding: '2px 6px', borderRadius: 8, flexShrink: 0 }}>{statusLabel(c.status)}</span>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[['🔗', c.connections_sent], ['💬', c.messages_sent], ['↩', c.replies_received]].map(([icon, v], i) => (
                  <span key={i} style={{ fontSize: 11, color: '#1e6b3a' }}>{icon} {v || 0}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Campaign detail */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        {!sel ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9a9ab0' }}>Selecione uma campanha</div> : (<>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <h2 style={{ fontSize: 20, color: '#1e6b3a', fontWeight: 700, marginBottom: 6 }}>{sel.name}</h2>
              <span style={{ fontSize: 12, color: statusColor(sel.status) }}>{statusLabel(sel.status)}</span>
            </div>
            <button onClick={() => toggleStatus(sel)} style={{ background: sel.status === 'active' ? 'transparent' : 'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border: sel.status === 'active' ? '1px solid #ffd0d0' : 'none', borderRadius: 8, color: sel.status === 'active' ? '#dc2626' : '#1a1a2e', padding: '8px 18px', fontSize: 13 }}>
              {sel.status === 'active' ? '⏸ Pausar' : '▶ Ativar'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
            {[['Conexões Enviadas', sel.connections_sent||0, '#10b981'],['Aceitas', sel.connections_accepted||0, '#059669'],['Mensagens', sel.messages_sent||0, '#3b82f6'],['Respostas', sel.replies_received||0, '#ec4899']].map(([l,v,c]) => (
              <div key={l} style={{ background: '#ffffff', border: '1px solid #e8e8f0', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 11, color: '#9a9ab0', marginBottom: 8 }}>{l}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: c, fontFamily: 'monospace' }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e8e8f0', borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 14, color: '#1e6b3a', fontWeight: 700, marginBottom: 20 }}>Fluxo da Campanha</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
              {(sel.steps || STEP_TYPES.slice(0,5)).map((step, i) => {
                const st = STEP_TYPES.find(s => s.id === (step.step_type || step.id)) || step
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ background: '#f8f8fc', border: `1px solid ${st.color}40`, borderRadius: 10, padding: '10px 14px', textAlign: 'center', minWidth: 100 }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{st.icon}</div>
                      <div style={{ fontSize: 11, color: st.color }}>{st.label}</div>
                    </div>
                    {i < 4 && <div style={{ fontSize: 18, color: '#e0e0ea', padding: '0 6px' }}>→</div>}
                  </div>
                )
              })}
            </div>
          </div>
        </>)}
      </div>

      {/* Modal nova campanha */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#ffffff', border: '1px solid #e0e0ea', borderRadius: 14, padding: 28, width: 600, maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 16, color: '#1e6b3a', marginBottom: 20, fontWeight: 700 }}>Nova Campanha</h2>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome da campanha..." style={{ width: '100%', background: '#f8f8fc', border: '1px solid #e0e0ea', borderRadius: 8, padding: 12, color: '#2a2a3e', fontSize: 14, marginBottom: 12 }} />
            <textarea value={newObj} onChange={e => setNewObj(e.target.value)} placeholder="Objetivo da campanha..." rows={2} style={{ width: '100%', background: '#f8f8fc', border: '1px solid #e0e0ea', borderRadius: 8, padding: 12, color: '#2a2a3e', fontSize: 13, resize: 'none', marginBottom: 20 }} />

            <div style={{ fontSize: 13, color: '#1e6b3a', fontWeight: 700, marginBottom: 12 }}>Builder de Fluxo</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {STEP_TYPES.map(st => (
                <button key={st.id} onClick={() => addStep(st)} style={{ background: `${st.color}15`, border: `1px solid ${st.color}40`, borderRadius: 8, padding: '6px 12px', color: st.color, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {st.icon} {st.label}
                </button>
              ))}
            </div>

            {steps.length > 0 && (
              <div style={{ background: '#f8f8fc', border: '1px solid #e8e8f0', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#9a9ab0', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Fluxo configurado</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
                  {steps.map((step, i) => (
                    <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ background: '#ffffff', border: `1px solid ${step.color}40`, borderRadius: 8, padding: '8px 12px', textAlign: 'center', position: 'relative' }}>
                        <button onClick={() => removeStep(step.id)} style={{ position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: '50%', background: '#ffd0d0', border: 'none', color: '#dc2626', fontSize: 10, lineHeight: '16px' }}>✕</button>
                        <div style={{ fontSize: 16 }}>{step.icon}</div>
                        <div style={{ fontSize: 10, color: step.color, marginTop: 2 }}>{step.label}</div>
                        {step.step_type === 'wait' && (
                          <input type="number" defaultValue={1} min={1} onChange={e => setSteps(p => p.map(s => s.id === step.id ? { ...s, config: { days: parseInt(e.target.value) } } : s))} style={{ width: 40, marginTop: 4, background: '#f8f8fc', border: '1px solid #e0e0ea', borderRadius: 4, padding: '2px 4px', color: '#f59e0b', fontSize: 11, textAlign: 'center' }} />
                        )}
                      </div>
                      {i < steps.length - 1 && <div style={{ fontSize: 16, color: '#e0e0ea', padding: '0 4px' }}>→</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowNew(false); setSteps([]) }} style={{ flex: 1, background: 'transparent', border: '1px solid #e0e0ea', borderRadius: 8, color: '#6a6a7a', padding: 10, fontSize: 13 }}>Cancelar</button>
              <button onClick={createCampaign} style={{ flex: 2, background: 'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border: 'none', borderRadius: 8, color: '#1a1a2e', padding: 10, fontSize: 13 }}>Criar Campanha</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
