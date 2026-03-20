import { useState, useEffect, useRef, useCallback } from 'react'
import { sb, getProfileId } from '../config.js'

// ─── Step type definitions ──────────────────────────────────────────────────
const STEP_TYPES = [
  { id: 'visit_profile',       label: 'Visitar Perfil',              icon: '👁',  color: '#3b82f6', desc: 'Visita o perfil do lead no LinkedIn' },
  { id: 'check_connection',    label: 'Verificar Conexão',           icon: '🔍', color: '#8b5cf6', desc: 'Verifica se já é conexão de 1º grau' },
  { id: 'send_connection',     label: 'Pedir Conexão',               icon: '🔗', color: '#10b981', desc: 'Envia pedido de conexão com nota' },
  { id: 'wait_connection',     label: 'Aguardar Conexão',            icon: '⏳', color: '#f59e0b', desc: 'Aguarda aceitação do pedido de conexão' },
  { id: 'send_message',        label: 'Enviar Mensagem',             icon: '💬', color: '#ec4899', desc: 'Envia mensagem direta via LinkedIn' },
  { id: 'connect_agent',       label: 'Conectar Agente',             icon: '🤖', color: '#06b6d4', desc: 'Passa conversa para um agente de IA' },
  { id: 'like_post',           label: 'Curtir Post',                 icon: '❤️', color: '#ef4444', desc: 'Curte o post mais recente do lead' },
  { id: 'comment_post',        label: 'Comentar Post',               icon: '✍️', color: '#f97316', desc: 'Comenta no post mais recente do lead' },
  { id: 'wait_time',           label: 'Aguardar Tempo',              icon: '⏱',  color: '#6b7280', desc: 'Aguarda X dias antes do próximo passo' },
  { id: 'wait_reply',          label: 'Aguardar Resposta',           icon: '💭', color: '#7c3aed', desc: 'Aguarda resposta do lead no chat' },
]

const stepTypeMap = Object.fromEntries(STEP_TYPES.map(s => [s.id, s]))

// ─── Node component ──────────────────────────────────────────────────────────
const FlowNode = ({ step, index, selected, onClick, onDelete, isLast }) => {
  const type = stepTypeMap[step.type] || { label: step.type, icon: '?', color: '#9a9ab0' }
  const sel = selected

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Connector line from above */}
      {index > 0 && (
        <div style={{ width: 2, height: 24, background: 'linear-gradient(to bottom, #e0e0ea, #c8c8d8)', flexShrink: 0 }} />
      )}

      {/* Node */}
      <div
        onClick={onClick}
        style={{
          width: 280, background: sel ? '#f0f8f3' : '#ffffff',
          border: `2px solid ${sel ? type.color : '#e8e8f0'}`,
          borderRadius: 12, padding: '12px 16px', cursor: 'pointer',
          boxShadow: sel ? `0 4px 20px ${type.color}25` : '0 2px 8px rgba(0,0,0,0.06)',
          transition: 'all 0.15s', position: 'relative',
          display: 'flex', alignItems: 'center', gap: 12
        }}
        onMouseEnter={e => { if (!sel) e.currentTarget.style.borderColor = type.color + '80' }}
        onMouseLeave={e => { if (!sel) e.currentTarget.style.borderColor = '#e8e8f0' }}
      >
        {/* Step number */}
        <div style={{ position: 'absolute', top: -10, left: 12, background: type.color, color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 700, fontFamily: 'monospace' }}>
          {index + 1}
        </div>

        {/* Icon bubble */}
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${type.color}15`, border: `1px solid ${type.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
          {type.icon}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 2 }}>{type.label}</div>
          <div style={{ fontSize: 11, color: '#9a9ab0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {step.config?.message ? `"${step.config.message.substring(0, 40)}..."` :
             step.config?.wait_days ? `${step.config.wait_days} dias` :
             step.config?.note ? `Nota: ${step.config.note.substring(0, 30)}...` :
             type.desc}
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          style={{ background: 'none', border: 'none', color: '#e0e0ea', fontSize: 16, cursor: 'pointer', padding: 4, flexShrink: 0, lineHeight: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
          onMouseLeave={e => e.currentTarget.style.color = '#e0e0ea'}
        >✕</button>
      </div>

      {/* Add step button between nodes */}
      {!isLast && (
        <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
          <div style={{ width: 2, height: 16, background: '#e0e0ea' }} />
        </div>
      )}
    </div>
  )
}

// ─── Step config panel ───────────────────────────────────────────────────────
const StepConfig = ({ step, onUpdate, agents }) => {
  const type = stepTypeMap[step.type] || {}
  const cfg = step.config || {}

  const upd = (key, val) => onUpdate({ ...step, config: { ...cfg, [key]: val } })

  const inp = { width: '100%', background: '#f8f8fc', border: '1px solid #e0e0ea', borderRadius: 8, padding: '9px 12px', color: '#1a1a2e', fontSize: 13, marginBottom: 12 }
  const lbl = (t) => <div style={{ fontSize: 11, color: '#9a9ab0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{t}</div>

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: `${type.color}15`, border: `1px solid ${type.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{type.icon}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{type.label}</div>
          <div style={{ fontSize: 11, color: '#9a9ab0' }}>{type.desc}</div>
        </div>
      </div>

      {/* Send Connection */}
      {step.type === 'send_connection' && (<>
        {lbl('Nota de conexão (opcional, máx 300 caracteres)')}
        <textarea value={cfg.note || ''} onChange={e => upd('note', e.target.value)} placeholder="Ex: Olá {nome}, vi seu trabalho em {empresa} e gostaria de conectar..." maxLength={300} rows={4} style={{ ...inp, resize: 'vertical', fontFamily: 'Georgia, serif' }} />
        <div style={{ fontSize: 11, color: '#c0c0d0', marginTop: -8, marginBottom: 12 }}>{(cfg.note || '').length}/300 caracteres</div>
        {lbl('Variáveis disponíveis')}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {['{nome}','{empresa}','{cargo}','{cidade}'].map(v => (
            <button key={v} onClick={() => upd('note', (cfg.note || '') + v)} style={{ background: '#f0f8f3', border: '1px solid #b8e8c8', borderRadius: 6, color: '#1e6b3a', padding: '3px 10px', fontSize: 12 }}>{v}</button>
          ))}
        </div>
      </>)}

      {/* Send Message */}
      {step.type === 'send_message' && (<>
        {lbl('Mensagem')}
        <textarea value={cfg.message || ''} onChange={e => upd('message', e.target.value)} placeholder="Ex: Olá {nome}! Vi que você atua em {empresa}. Tenho algo que pode te interessar..." rows={5} style={{ ...inp, resize: 'vertical', fontFamily: 'Georgia, serif' }} />
        {lbl('Variáveis disponíveis')}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {['{nome}','{empresa}','{cargo}','{cidade}','{segmento}'].map(v => (
            <button key={v} onClick={() => upd('message', (cfg.message || '') + v)} style={{ background: '#f0f8f3', border: '1px solid #b8e8c8', borderRadius: 6, color: '#1e6b3a', padding: '3px 10px', fontSize: 12 }}>{v}</button>
          ))}
        </div>
        {lbl('Só envia se for conexão de 1º grau?')}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[['Sim','true'],['Não (InMail)','false']].map(([l, v]) => (
            <button key={v} onClick={() => upd('only_connections', v === 'true')} style={{ flex: 1, padding: '7px', borderRadius: 8, border: `1px solid ${cfg.only_connections?.toString() === v ? '#1e6b3a' : '#e0e0ea'}`, background: cfg.only_connections?.toString() === v ? '#f0f8f3' : '#fff', color: cfg.only_connections?.toString() === v ? '#1e6b3a' : '#6a6a7a', fontSize: 12 }}>{l}</button>
          ))}
        </div>
      </>)}

      {/* Comment Post */}
      {step.type === 'comment_post' && (<>
        {lbl('Comentário')}
        <textarea value={cfg.comment || ''} onChange={e => upd('comment', e.target.value)} placeholder="Ex: Excelente perspectiva sobre {tema}! Concordo totalmente..." rows={3} style={{ ...inp, resize: 'vertical', fontFamily: 'Georgia, serif' }} />
        {lbl('Gerar com IA?')}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[['Sim, gerar automaticamente','true'],['Não, usar texto fixo','false']].map(([l, v]) => (
            <button key={v} onClick={() => upd('ai_generate', v === 'true')} style={{ flex: 1, padding: '7px', borderRadius: 8, border: `1px solid ${(cfg.ai_generate?.toString() ?? 'true') === v ? '#1e6b3a' : '#e0e0ea'}`, background: (cfg.ai_generate?.toString() ?? 'true') === v ? '#f0f8f3' : '#fff', color: (cfg.ai_generate?.toString() ?? 'true') === v ? '#1e6b3a' : '#6a6a7a', fontSize: 12 }}>{l}</button>
          ))}
        </div>
      </>)}

      {/* Wait Time */}
      {step.type === 'wait_time' && (<>
        {lbl('Aguardar quantos dias?')}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <input type="range" min={1} max={30} value={cfg.wait_days || 1} onChange={e => upd('wait_days', parseInt(e.target.value))} style={{ flex: 1, accentColor: '#1e6b3a' }} />
          <div style={{ fontSize: 20, fontWeight: 900, color: '#1e6b3a', fontFamily: 'monospace', minWidth: 40, textAlign: 'center' }}>{cfg.wait_days || 1}</div>
          <div style={{ fontSize: 12, color: '#9a9ab0' }}>dias</div>
        </div>
        {lbl('Horário de envio')}
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={cfg.send_hour || '9'} onChange={e => upd('send_hour', e.target.value)} style={{ ...inp, marginBottom: 0, flex: 1 }}>
            {Array.from({length: 13}, (_,i) => i + 8).map(h => <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}
          </select>
          <select value={cfg.timezone || 'America/Sao_Paulo'} onChange={e => upd('timezone', e.target.value)} style={{ ...inp, marginBottom: 0, flex: 2 }}>
            <option value="America/Sao_Paulo">São Paulo (BRT)</option>
            <option value="America/Manaus">Manaus (AMT)</option>
            <option value="America/Belem">Belém (BRT)</option>
          </select>
        </div>
      </>)}

      {/* Wait Connection */}
      {step.type === 'wait_connection' && (<>
        {lbl('Aguardar até quantos dias?')}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <input type="range" min={1} max={30} value={cfg.wait_days || 7} onChange={e => upd('wait_days', parseInt(e.target.value))} style={{ flex: 1, accentColor: '#1e6b3a' }} />
          <div style={{ fontSize: 20, fontWeight: 900, color: '#f59e0b', fontFamily: 'monospace', minWidth: 40, textAlign: 'center' }}>{cfg.wait_days || 7}</div>
          <div style={{ fontSize: 12, color: '#9a9ab0' }}>dias</div>
        </div>
        {lbl('Se não aceitar em X dias, o que fazer?')}
        <select value={cfg.on_timeout || 'skip'} onChange={e => upd('on_timeout', e.target.value)} style={inp}>
          <option value="skip">Pular para próximo lead</option>
          <option value="continue">Continuar o fluxo mesmo assim</option>
          <option value="stop">Parar campanha para este lead</option>
        </select>
      </>)}

      {/* Wait Reply */}
      {step.type === 'wait_reply' && (<>
        {lbl('Aguardar resposta por até quantos dias?')}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <input type="range" min={1} max={30} value={cfg.wait_days || 3} onChange={e => upd('wait_days', parseInt(e.target.value))} style={{ flex: 1, accentColor: '#1e6b3a' }} />
          <div style={{ fontSize: 20, fontWeight: 900, color: '#7c3aed', fontFamily: 'monospace', minWidth: 40, textAlign: 'center' }}>{cfg.wait_days || 3}</div>
          <div style={{ fontSize: 12, color: '#9a9ab0' }}>dias</div>
        </div>
        {lbl('Se não responder, o que fazer?')}
        <select value={cfg.on_timeout || 'continue'} onChange={e => upd('on_timeout', e.target.value)} style={inp}>
          <option value="continue">Continuar o fluxo</option>
          <option value="stop">Parar campanha para este lead</option>
          <option value="skip">Pular para próximo lead</option>
        </select>
        {lbl('Se responder, o que fazer?')}
        <select value={cfg.on_reply || 'connect_agent'} onChange={e => upd('on_reply', e.target.value)} style={inp}>
          <option value="connect_agent">Conectar agente de IA</option>
          <option value="notify">Notificar e pausar campanha</option>
          <option value="continue">Continuar o fluxo</option>
        </select>
      </>)}

      {/* Connect Agent */}
      {step.type === 'connect_agent' && (<>
        {lbl('Selecionar agente')}
        <select value={cfg.agent_id || ''} onChange={e => upd('agent_id', e.target.value)} style={inp}>
          <option value="">Selecione um agente...</option>
          {(agents || []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {lbl('Ativar quando?')}
        <select value={cfg.trigger || 'immediately'} onChange={e => upd('trigger', e.target.value)} style={inp}>
          <option value="immediately">Imediatamente</option>
          <option value="on_reply">Quando o lead responder</option>
          <option value="on_connection">Quando aceitar conexão</option>
        </select>
      </>)}

      {/* Check Connection / Visit Profile / Like Post — sem config extra */}
      {['check_connection', 'visit_profile', 'like_post'].includes(step.type) && (
        <div style={{ background: '#f8f8fc', borderRadius: 10, padding: 14, fontSize: 13, color: '#6a6a7a', lineHeight: 1.7 }}>
          <strong style={{ color: '#1a1a2e' }}>Ação automática</strong><br />
          Este passo é executado automaticamente pelo motor de campanha via Unipile. Nenhuma configuração necessária.
        </div>
      )}
    </div>
  )
}

// ─── Main Campanhas page ─────────────────────────────────────────────────────
export default function Campanhas() {
  const [campaigns, setCampaigns] = useState([])
  const [selCampaign, setSelCampaign] = useState(null)
  const [steps, setSteps] = useState([])
  const [selStep, setSelStep] = useState(null)
  const [selStepIdx, setSelStepIdx] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [insertIdx, setInsertIdx] = useState(null)
  const [newName, setNewName] = useState('')
  const [agents, setAgents] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [leads, setLeads] = useState([])
  const [showStartModal, setShowStartModal] = useState(false)
  const [selectedListId, setSelectedListId] = useState('')
  const [lists, setLists] = useState([])

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const [cData, aData] = await Promise.all([
        sb(`campaigns?profile_id=eq.${getProfileId()}&order=created_at.desc`),
        sb(`agents?profile_id=eq.${getProfileId()}&is_active=eq.true`)
      ])
      setCampaigns(cData || [])
      setAgents(aData || [])
      if (cData?.length) selectCampaign(cData[0])
    } catch {}
  }

  const selectCampaign = async (c) => {
    setSelCampaign(c)
    setSelStep(null)
    setSelStepIdx(null)
    try {
      const stepsData = await sb(`campaign_steps?campaign_id=eq.${c.id}&order=step_order.asc`)
      setSteps(stepsData || [])
    } catch { setSteps([]) }
  }

  const createCampaign = async () => {
    if (!newName.trim()) return
    try {
      const data = await sb('campaigns', { method: 'POST', body: JSON.stringify({ profile_id: getProfileId(), name: newName, status: 'draft', total_steps: 0 }) })
      const nc = Array.isArray(data) ? data[0] : data
      setCampaigns(p => [nc, ...p])
      selectCampaign(nc)
    } catch {}
    setShowNew(false); setNewName('')
  }

  const addStep = async (typeId, atIdx) => {
    if (!selCampaign) return
    const idx = atIdx !== undefined ? atIdx : steps.length
    const newStep = {
      campaign_id: selCampaign.id,
      step_order: idx + 1,
      type: typeId,
      config: {},
      status: 'pending'
    }
    try {
      const data = await sb('campaign_steps', { method: 'POST', body: JSON.stringify(newStep) })
      const created = Array.isArray(data) ? data[0] : data
      const newSteps = [...steps.slice(0, idx), created, ...steps.slice(idx)]
      // Renumera
      const renumbered = newSteps.map((s, i) => ({ ...s, step_order: i + 1 }))
      setSteps(renumbered)
      setSelStep(created); setSelStepIdx(idx)
      // Atualiza total_steps
      await sb(`campaigns?id=eq.${selCampaign.id}`, { method: 'PATCH', body: JSON.stringify({ total_steps: renumbered.length }) })
    } catch {}
    setShowPalette(false)
  }

  const deleteStep = async (idx) => {
    const step = steps[idx]
    try {
      await sb(`campaign_steps?id=eq.${step.id}`, { method: 'DELETE' })
      const newSteps = steps.filter((_, i) => i !== idx)
      setSteps(newSteps)
      if (selStepIdx === idx) { setSelStep(null); setSelStepIdx(null) }
    } catch {}
  }

  const updateStep = async (updatedStep) => {
    setSteps(p => p.map(s => s.id === updatedStep.id ? updatedStep : s))
    setSelStep(updatedStep)
    try {
      await sb(`campaign_steps?id=eq.${updatedStep.id}`, { method: 'PATCH', body: JSON.stringify({ config: updatedStep.config }) })
    } catch {}
  }

  const saveFlow = async () => {
    setSaving(true)
    try {
      for (let i = 0; i < steps.length; i++) {
        await sb(`campaign_steps?id=eq.${steps[i].id}`, { method: 'PATCH', body: JSON.stringify({ step_order: i + 1, config: steps[i].config }) })
      }
      await sb(`campaigns?id=eq.${selCampaign.id}`, { method: 'PATCH', body: JSON.stringify({ total_steps: steps.length }) })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch {}
    setSaving(false)
  }

  const toggleStatus = async (status) => {
    try {
      await sb(`campaigns?id=eq.${selCampaign.id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setSelCampaign(p => ({ ...p, status }))
      setCampaigns(p => p.map(c => c.id === selCampaign.id ? { ...c, status } : c))
    } catch {}
  }

  const deleteCampaign = async () => {
    if (!confirm(`Excluir "${selCampaign.name}"?`)) return
    try {
      await sb(`campaign_steps?campaign_id=eq.${selCampaign.id}`, { method: 'DELETE' })
      await sb(`campaigns?id=eq.${selCampaign.id}`, { method: 'DELETE' })
      const rest = campaigns.filter(c => c.id !== selCampaign.id)
      setCampaigns(rest)
      setSelCampaign(null); setSteps([])
    } catch {}
  }

  const statusColors = { active: '#059669', paused: '#d97706', draft: '#9a9ab0', completed: '#3b82f6' }
  const statusLabels = { active: 'Ativa', paused: 'Pausada', draft: 'Rascunho', completed: 'Concluída' }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#ffffff', fontFamily: 'Georgia, serif' }}>

      {/* ── Left: Campaign list ── */}
      <div style={{ width: 240, background: '#f8f8fc', borderRight: '1px solid #e8e8f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #e8e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#9a9ab0', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Campanhas</span>
          <button onClick={() => setShowNew(true)} style={{ background: '#1e6b3a', border: 'none', borderRadius: 6, color: '#fff', padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>+ Nova</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {campaigns.length === 0 && <div style={{ padding: 16, textAlign: 'center', color: '#c0c0d0', fontSize: 12 }}>Nenhuma campanha ainda</div>}
          {campaigns.map(c => (
            <div key={c.id} onClick={() => selectCampaign(c)} style={{ padding: '10px 12px', borderRadius: 8, marginBottom: 4, cursor: 'pointer', background: selCampaign?.id === c.id ? '#ffffff' : 'transparent', border: `1px solid ${selCampaign?.id === c.id ? '#e0e0ea' : 'transparent'}`, boxShadow: selCampaign?.id === c.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none' }}>
              <div style={{ fontSize: 13, fontWeight: selCampaign?.id === c.id ? 600 : 400, color: selCampaign?.id === c.id ? '#1a1a2e' : '#6a6a7a', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: statusColors[c.status] || '#9a9ab0', background: `${statusColors[c.status]}15`, padding: '2px 7px', borderRadius: 8, fontWeight: 600 }}>
                  {statusLabels[c.status] || c.status}
                </span>
                <span style={{ fontSize: 10, color: '#c0c0d0' }}>{c.total_steps || 0} passos</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Center: Flow canvas ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {!selCampaign ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#9a9ab0' }}>
            <div style={{ fontSize: 40 }}>⟳</div>
            <div style={{ fontSize: 14 }}>Selecione ou crie uma campanha</div>
          </div>
        ) : (<>
          {/* Toolbar */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #e8e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>{selCampaign.name}</div>
              <div style={{ fontSize: 11, color: '#9a9ab0', marginTop: 2 }}>{steps.length} passos no fluxo</div>
            </div>

            {/* Status toggle */}
            <div style={{ display: 'flex', gap: 6 }}>
              {selCampaign.status !== 'active'
                ? <button onClick={() => toggleStatus('active')} disabled={steps.length === 0} style={{ background: '#f0faf4', border: '1px solid #b8e8c8', borderRadius: 8, color: '#1e6b3a', padding: '6px 14px', fontSize: 12, fontWeight: 600 }}>▶ Ativar</button>
                : <button onClick={() => toggleStatus('paused')} style={{ background: '#fff8f0', border: '1px solid #fcd8a0', borderRadius: 8, color: '#d97706', padding: '6px 14px', fontSize: 12, fontWeight: 600 }}>⏸ Pausar</button>
              }
            </div>

            <button onClick={saveFlow} disabled={saving} style={{ background: saving ? '#e0e0ea' : '#1e6b3a', border: 'none', borderRadius: 8, color: saving ? '#9a9ab0' : '#ffffff', padding: '7px 18px', fontSize: 13, fontWeight: 600 }}>
              {saved ? '✓ Salvo!' : saving ? 'Salvando...' : '💾 Salvar fluxo'}
            </button>

            <button onClick={deleteCampaign} style={{ background: '#fff5f5', border: '1px solid #ffd0d0', borderRadius: 8, color: '#dc2626', padding: '7px 12px', fontSize: 12 }}>Excluir</button>
          </div>

          {/* Canvas */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 320, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

              {/* Start node */}
              <div style={{ background: '#f0faf4', border: '2px solid #b8e8c8', borderRadius: 12, padding: '10px 24px', marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1e6b3a' }} />
                <span style={{ fontSize: 12, color: '#1e6b3a', fontWeight: 600 }}>INÍCIO DA CAMPANHA</span>
              </div>
              {steps.length > 0 && <div style={{ width: 2, height: 24, background: '#b8e8c8' }} />}

              {/* Steps */}
              {steps.map((step, i) => (
                <div key={step.id} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <FlowNode
                    step={step} index={i}
                    selected={selStepIdx === i}
                    onClick={() => { setSelStep(step); setSelStepIdx(i) }}
                    onDelete={() => deleteStep(i)}
                    isLast={i === steps.length - 1}
                  />
                  {/* Add step button between nodes */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 2, height: 16, background: '#e0e0ea' }} />
                    <button
                      onClick={() => { setInsertIdx(i + 1); setShowPalette(true) }}
                      style={{ width: 24, height: 24, borderRadius: '50%', background: '#f8f8fc', border: '1px dashed #c0c0d0', color: '#c0c0d0', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#1e6b3a'; e.currentTarget.style.color = '#1e6b3a'; e.currentTarget.style.background = '#f0faf4' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#c0c0d0'; e.currentTarget.style.color = '#c0c0d0'; e.currentTarget.style.background = '#f8f8fc' }}
                    >+</button>
                    <div style={{ width: 2, height: 16, background: '#e0e0ea' }} />
                  </div>
                </div>
              ))}

              {/* Add first step / Add step at end */}
              <button
                onClick={() => { setInsertIdx(steps.length); setShowPalette(true) }}
                style={{ width: 280, padding: '12px', borderRadius: 12, border: '2px dashed #c8c8d8', background: '#f8f8fc', color: '#9a9ab0', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#1e6b3a'; e.currentTarget.style.color = '#1e6b3a'; e.currentTarget.style.background = '#f0faf4' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#c8c8d8'; e.currentTarget.style.color = '#9a9ab0'; e.currentTarget.style.background = '#f8f8fc' }}
              >
                <span style={{ fontSize: 18 }}>+</span>
                {steps.length === 0 ? 'Adicionar primeiro passo' : 'Adicionar passo ao final'}
              </button>

              {/* End node */}
              {steps.length > 0 && (<>
                <div style={{ width: 2, height: 24, background: '#e0e0ea' }} />
                <div style={{ background: '#f5f5fa', border: '2px solid #e0e0ea', borderRadius: 12, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#9a9ab0' }} />
                  <span style={{ fontSize: 12, color: '#9a9ab0', fontWeight: 600 }}>FIM DO FLUXO</span>
                </div>
              </>)}
            </div>
          </div>
        </>)}
      </div>

      {/* ── Right: Step config ── */}
      <div style={{ width: 320, background: '#f8f8fc', borderLeft: '1px solid #e8e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selStep ? (<>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e8e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#9a9ab0', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Configurar passo {selStepIdx + 1}</span>
            <button onClick={() => { setSelStep(null); setSelStepIdx(null) }} style={{ background: 'none', border: 'none', color: '#c0c0d0', fontSize: 18, cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <StepConfig step={selStep} onUpdate={updateStep} agents={agents} />
          </div>
        </>) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#c0c0d0', padding: 24 }}>
            <div style={{ fontSize: 32 }}>⚙️</div>
            <div style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>Clique em um passo do fluxo para configurar</div>
          </div>
        )}
      </div>

      {/* ── Palette modal ── */}
      {showPalette && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 520, boxShadow: '0 12px 48px rgba(0,0,0,0.15)', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, color: '#1a1a2e', fontWeight: 700 }}>Adicionar passo</h2>
              <button onClick={() => setShowPalette(false)} style={{ background: 'none', border: 'none', color: '#9a9ab0', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {STEP_TYPES.map(type => (
                <button key={type.id} onClick={() => addStep(type.id, insertIdx)} style={{ background: '#f8f8fc', border: '1px solid #e8e8f0', borderRadius: 12, padding: '14px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = type.color; e.currentTarget.style.background = `${type.color}08` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e8f0'; e.currentTarget.style.background = '#f8f8fc' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: `${type.color}15`, border: `1px solid ${type.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{type.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 2 }}>{type.label}</div>
                    <div style={{ fontSize: 11, color: '#9a9ab0', lineHeight: 1.4 }}>{type.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── New campaign modal ── */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', border: '1px solid #e8e8f0', borderRadius: 14, padding: 28, width: 360, boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }}>
            <h2 style={{ fontSize: 16, color: '#1a1a2e', marginBottom: 20, fontWeight: 700 }}>Nova Campanha</h2>
            <div style={{ fontSize: 11, color: '#9a9ab0', marginBottom: 6, textTransform: 'uppercase', fontWeight: 600 }}>Nome</div>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Prospecção Insumos SP" autoFocus onKeyDown={e => e.key === 'Enter' && createCampaign()}
              style={{ width: '100%', background: '#f8f8fc', border: '1px solid #e0e0ea', borderRadius: 8, padding: 12, color: '#1a1a2e', fontSize: 14, marginBottom: 20 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, background: '#fff', border: '1px solid #e0e0ea', borderRadius: 8, color: '#6a6a7a', padding: 10, fontSize: 13 }}>Cancelar</button>
              <button onClick={createCampaign} style={{ flex: 2, background: 'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border: 'none', borderRadius: 8, color: '#fff', padding: 10, fontSize: 13, fontWeight: 700 }}>Criar Campanha</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}
