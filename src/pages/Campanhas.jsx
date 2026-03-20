import { useState, useEffect } from 'react'
import { sb, getProfileId } from '../config.js'

// ─── Step types ───────────────────────────────────────────────────────────────
const STEP_TYPES = [
  { id: 'visit_profile',    label: 'Visitar Perfil',       icon: '👁',  color: '#3b82f6', desc: 'Visita o perfil do lead no LinkedIn' },
  { id: 'check_connection', label: 'Verificar Conexão',    icon: '🔍', color: '#8b5cf6', desc: 'Verifica se já é conexão de 1º grau' },
  { id: 'send_connection',  label: 'Pedir Conexão',        icon: '🔗', color: '#10b981', desc: 'Envia pedido de conexão com nota' },
  { id: 'wait_connection',  label: 'Aguardar Conexão',     icon: '⏳', color: '#f59e0b', desc: 'Aguarda aceitação do pedido' },
  { id: 'send_message',     label: 'Enviar Mensagem',      icon: '💬', color: '#ec4899', desc: 'Envia mensagem direta no LinkedIn' },
  { id: 'connect_agent',    label: 'Conectar Agente',      icon: '🤖', color: '#06b6d4', desc: 'Passa conversa para agente de IA' },
  { id: 'like_post',        label: 'Curtir Post',          icon: '❤️', color: '#ef4444', desc: 'Curte o post mais recente do lead' },
  { id: 'comment_post',     label: 'Comentar Post',        icon: '✍️', color: '#f97316', desc: 'Comenta no post mais recente do lead' },
  { id: 'wait_time',        label: 'Aguardar Tempo',       icon: '⏱',  color: '#6b7280', desc: 'Aguarda X dias antes do próximo passo' },
  { id: 'wait_reply',       label: 'Aguardar Resposta',    icon: '💭', color: '#7c3aed', desc: 'Aguarda resposta do lead no chat' },
  { id: 'condition',        label: 'Condição (IF)',         icon: '⬡',  color: '#0ea5e9', desc: 'Divide o fluxo em dois caminhos' },
]
const typeMap = Object.fromEntries(STEP_TYPES.map(s => [s.id, s]))

const CONDITIONS = [
  { id: 'is_connection',    label: 'É conexão de 1º grau?' },
  { id: 'accepted_invite',  label: 'Aceitou o pedido de conexão?' },
  { id: 'replied_message',  label: 'Respondeu a mensagem?' },
  { id: 'icp_score_gte',    label: 'ICP Score ≥ X?' },
  { id: 'has_email',        label: 'Tem email cadastrado?' },
  { id: 'has_phone',        label: 'Tem telefone cadastrado?' },
  { id: 'sent_to_rd',       label: 'Já enviado ao RD Station?' },
  { id: 'segment_is',       label: 'Segmento é?' },
]

// ─── FlowNode ─────────────────────────────────────────────────────────────────
const FlowNode = ({ step, index, selected, onClick, onDelete }) => {
  const t = typeMap[step.step_type] || { label: step.step_type, icon: '?', color: '#9a9ab0' }
  const isIf = step.step_type === 'condition'
  const condLabel = CONDITIONS.find(c => c.id === step.config?.condition)?.label || ''

  if (isIf) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {index > 0 && <div style={{ width: 2, height: 24, background: '#e0e0ea' }} />}
        {/* Diamond IF node */}
        <div
          onClick={onClick}
          style={{
            position: 'relative', width: 200, height: 80,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {/* Diamond shape */}
          <div style={{
            width: 140, height: 60,
            background: selected ? '#eff6ff' : '#ffffff',
            border: `2px solid ${selected ? '#0ea5e9' : '#bfdbfe'}`,
            transform: 'rotate(45deg)',
            borderRadius: 8,
            boxShadow: selected ? '0 4px 20px #0ea5e920' : '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'all 0.15s',
          }} />
          {/* Label inside */}
          <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
            <div style={{ fontSize: 16 }}>⬡</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0ea5e9' }}>SE / IF</div>
          </div>
          {/* Delete */}
          <button onClick={e => { e.stopPropagation(); onDelete() }} style={{ position: 'absolute', top: 2, right: 2, background: 'none', border: 'none', color: '#e0e0ea', fontSize: 14, cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
            onMouseLeave={e => e.currentTarget.style.color = '#e0e0ea'}>✕</button>
          {/* Step number */}
          <div style={{ position: 'absolute', top: 0, left: 0, background: '#0ea5e9', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>{index + 1}</div>
        </div>

        {/* Condition label */}
        {condLabel && (
          <div style={{ fontSize: 11, color: '#0ea5e9', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '2px 10px', marginTop: 4, marginBottom: 4 }}>
            {condLabel}
          </div>
        )}

        {/* YES / NO branches */}
        <div style={{ display: 'flex', gap: 80, marginTop: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#f0faf4', border: '1px solid #b8e8c8', borderRadius: 6, padding: '2px 10px', marginBottom: 4 }}>✓ SIM</div>
            <div style={{ width: 2, height: 20, background: '#b8e8c8' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', border: '2px solid #f0faf4' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fff5f5', border: '1px solid #ffd0d0', borderRadius: 6, padding: '2px 10px', marginBottom: 4 }}>✕ NÃO</div>
            <div style={{ width: 2, height: 20, background: '#ffd0d0' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', border: '2px solid #fff5f5' }} />
          </div>
        </div>
        {/* Reconnect lines */}
        <div style={{ display: 'flex', gap: 80, alignItems: 'flex-end' }}>
          <div style={{ width: 2, height: 28, background: '#e0e0ea' }} />
          <div style={{ width: 2, height: 28, background: '#e0e0ea' }} />
        </div>
        <div style={{ width: 80, height: 2, background: '#e0e0ea', marginBottom: 0 }} />
        <div style={{ width: 2, height: 16, background: '#e0e0ea' }} />
        <div style={{ fontSize: 10, color: '#9a9ab0', marginBottom: 4 }}>Continua o fluxo</div>
      </div>
    )
  }

  // Normal node
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {index > 0 && <div style={{ width: 2, height: 24, background: '#e0e0ea' }} />}
      <div
        onClick={onClick}
        style={{
          width: 280, background: selected ? `${t.color}08` : '#ffffff',
          border: `2px solid ${selected ? t.color : '#e8e8f0'}`,
          borderRadius: 12, padding: '12px 16px', cursor: 'pointer',
          boxShadow: selected ? `0 4px 20px ${t.color}20` : '0 2px 8px rgba(0,0,0,0.05)',
          transition: 'all 0.15s', position: 'relative',
          display: 'flex', alignItems: 'center', gap: 12
        }}
        onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = t.color + '60' }}
        onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = '#e8e8f0' }}
      >
        <div style={{ position: 'absolute', top: -10, left: 12, background: t.color, color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>{index + 1}</div>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${t.color}15`, border: `1px solid ${t.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{t.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 2 }}>{t.label}</div>
          <div style={{ fontSize: 11, color: '#9a9ab0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {step.config?.message ? `"${step.config.message.substring(0, 38)}..."` :
             step.config?.wait_days ? `${step.config.wait_days} dias` :
             step.config?.note ? `"${step.config.note.substring(0, 38)}..."` : t.desc}
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete() }} style={{ background: 'none', border: 'none', color: '#e0e0ea', fontSize: 16, cursor: 'pointer', padding: 4, flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
          onMouseLeave={e => e.currentTarget.style.color = '#e0e0ea'}>✕</button>
      </div>
    </div>
  )
}

// ─── StepConfig ───────────────────────────────────────────────────────────────
const StepConfig = ({ step, onUpdate, agents }) => {
  const t = typeMap[step.step_type] || {}
  const cfg = step.config || {}
  const upd = (k, v) => onUpdate({ ...step, config: { ...cfg, [k]: v } })
  const inp = { width: '100%', background: '#f8f8fc', border: '1px solid #e0e0ea', borderRadius: 8, padding: '9px 12px', color: '#1a1a2e', fontSize: 13, marginBottom: 12, fontFamily: 'Georgia, serif' }
  const lbl = (tx) => <div style={{ fontSize: 11, color: '#9a9ab0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{tx}</div>
  const vars = ['{nome}','{empresa}','{cargo}','{cidade}','{segmento}']

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #f0f0f5' }}>
        <div style={{ width: 38, height: 38, borderRadius: 9, background: `${t.color}15`, border: `1px solid ${t.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{t.icon}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{t.label}</div>
          <div style={{ fontSize: 11, color: '#9a9ab0' }}>{t.desc}</div>
        </div>
      </div>

      {/* CONDITION / IF */}
      {step.step_type === 'condition' && (<>
        {lbl('Qual condição verificar?')}
        <select value={cfg.condition || ''} onChange={e => upd('condition', e.target.value)} style={inp}>
          <option value="">Selecione...</option>
          {CONDITIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>

        {cfg.condition === 'icp_score_gte' && (<>
          {lbl('ICP Score mínimo')}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <input type="range" min={0} max={100} step={5} value={cfg.threshold || 75} onChange={e => upd('threshold', parseInt(e.target.value))} style={{ flex: 1, accentColor: '#0ea5e9' }} />
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0ea5e9', fontFamily: 'monospace', minWidth: 40, textAlign: 'center' }}>{cfg.threshold || 75}</div>
          </div>
        </>)}

        {cfg.condition === 'segment_is' && (<>
          {lbl('Segmento')}
          <select value={cfg.segment || ''} onChange={e => upd('segment', e.target.value)} style={inp}>
            <option value="">Selecione...</option>
            {[['insumos','Insumos'],['cooperativa','Cooperativa'],['revenda','Revenda'],['agencia_marketing','Agência'],['outro','Outro']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </>)}

        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', marginBottom: 8 }}>Lógica do fluxo</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>✓</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>SIM — condição verdadeira</div>
                <div style={{ fontSize: 11, color: '#6a6a7a' }}>Executa o próximo passo do fluxo</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>✕</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>NÃO — condição falsa</div>
                <div style={{ fontSize: 11, color: '#6a6a7a' }}>Pula para o passo configurado abaixo</div>
              </div>
            </div>
          </div>
        </div>

        {lbl('Se NÃO (falso) — o que fazer?')}
        <select value={cfg.on_false || 'stop'} onChange={e => upd('on_false', e.target.value)} style={inp}>
          <option value="stop">Parar campanha para este lead</option>
          <option value="skip">Pular para o próximo lead</option>
          <option value="jump_to_end">Ir para o último passo do fluxo</option>
        </select>
      </>)}

      {/* SEND CONNECTION */}
      {step.step_type === 'send_connection' && (<>
        {lbl('Nota (opcional, máx 300 chars)')}
        <textarea value={cfg.note || ''} onChange={e => upd('note', e.target.value)} placeholder="Ex: Olá {nome}, vi seu trabalho em {empresa}..." maxLength={300} rows={4} style={{ ...inp, resize: 'vertical' }} />
        <div style={{ fontSize: 11, color: '#c0c0d0', marginTop: -8, marginBottom: 12 }}>{(cfg.note||'').length}/300</div>
        {lbl('Variáveis')}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {vars.slice(0,4).map(v => <button key={v} onClick={() => upd('note', (cfg.note||'')+v)} style={{ background: '#f0f8f3', border: '1px solid #b8e8c8', borderRadius: 6, color: '#1e6b3a', padding: '3px 10px', fontSize: 12 }}>{v}</button>)}
        </div>
      </>)}

      {/* SEND MESSAGE */}
      {step.step_type === 'send_message' && (<>
        {lbl('Mensagem')}
        <textarea value={cfg.message || ''} onChange={e => upd('message', e.target.value)} placeholder="Ex: Olá {nome}! Vi que você atua em {empresa}..." rows={5} style={{ ...inp, resize: 'vertical' }} />
        {lbl('Variáveis')}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {vars.map(v => <button key={v} onClick={() => upd('message', (cfg.message||'')+v)} style={{ background: '#f0f8f3', border: '1px solid #b8e8c8', borderRadius: 6, color: '#1e6b3a', padding: '3px 10px', fontSize: 12 }}>{v}</button>)}
        </div>
        {lbl('Só para conexões de 1º grau?')}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[['Sim','true'],['Não (InMail)','false']].map(([l,v]) => (
            <button key={v} onClick={() => upd('only_connections', v==='true')} style={{ flex:1, padding:'7px', borderRadius:8, border:`1px solid ${(cfg.only_connections?.toString()??'true')===v?'#1e6b3a':'#e0e0ea'}`, background:(cfg.only_connections?.toString()??'true')===v?'#f0f8f3':'#fff', color:(cfg.only_connections?.toString()??'true')===v?'#1e6b3a':'#6a6a7a', fontSize:12 }}>{l}</button>
          ))}
        </div>
      </>)}

      {/* WAIT TIME */}
      {step.step_type === 'wait_time' && (<>
        {lbl('Aguardar quantos dias?')}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <input type="range" min={1} max={30} value={cfg.wait_days||1} onChange={e => upd('wait_days', parseInt(e.target.value))} style={{ flex:1, accentColor:'#1e6b3a' }} />
          <div style={{ fontSize:22, fontWeight:900, color:'#1e6b3a', fontFamily:'monospace', minWidth:40, textAlign:'center' }}>{cfg.wait_days||1}</div>
          <span style={{ fontSize:12, color:'#9a9ab0' }}>dias</span>
        </div>
        {lbl('Horário de envio')}
        <select value={cfg.send_hour||'9'} onChange={e => upd('send_hour', e.target.value)} style={inp}>
          {Array.from({length:13},(_,i)=>i+8).map(h=><option key={h} value={h}>{String(h).padStart(2,'0')}:00 BRT</option>)}
        </select>
      </>)}

      {/* WAIT CONNECTION */}
      {step.step_type === 'wait_connection' && (<>
        {lbl('Aguardar até quantos dias?')}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <input type="range" min={1} max={30} value={cfg.wait_days||7} onChange={e => upd('wait_days', parseInt(e.target.value))} style={{ flex:1, accentColor:'#f59e0b' }} />
          <div style={{ fontSize:22, fontWeight:900, color:'#f59e0b', fontFamily:'monospace', minWidth:40, textAlign:'center' }}>{cfg.wait_days||7}</div>
          <span style={{ fontSize:12, color:'#9a9ab0' }}>dias</span>
        </div>
        {lbl('Se não aceitar, o que fazer?')}
        <select value={cfg.on_timeout||'skip'} onChange={e => upd('on_timeout', e.target.value)} style={inp}>
          <option value="skip">Pular para próximo lead</option>
          <option value="continue">Continuar o fluxo mesmo assim</option>
          <option value="stop">Parar campanha para este lead</option>
        </select>
      </>)}

      {/* WAIT REPLY */}
      {step.step_type === 'wait_reply' && (<>
        {lbl('Aguardar até quantos dias?')}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <input type="range" min={1} max={30} value={cfg.wait_days||3} onChange={e => upd('wait_days', parseInt(e.target.value))} style={{ flex:1, accentColor:'#7c3aed' }} />
          <div style={{ fontSize:22, fontWeight:900, color:'#7c3aed', fontFamily:'monospace', minWidth:40, textAlign:'center' }}>{cfg.wait_days||3}</div>
          <span style={{ fontSize:12, color:'#9a9ab0' }}>dias</span>
        </div>
        {lbl('Se responder')}
        <select value={cfg.on_reply||'connect_agent'} onChange={e => upd('on_reply', e.target.value)} style={inp}>
          <option value="connect_agent">Conectar agente de IA</option>
          <option value="notify">Notificar e pausar</option>
          <option value="continue">Continuar o fluxo</option>
        </select>
        {lbl('Se NÃO responder')}
        <select value={cfg.on_timeout||'continue'} onChange={e => upd('on_timeout', e.target.value)} style={inp}>
          <option value="continue">Continuar o fluxo</option>
          <option value="stop">Parar campanha</option>
          <option value="skip">Pular lead</option>
        </select>
      </>)}

      {/* COMMENT POST */}
      {step.step_type === 'comment_post' && (<>
        {lbl('Gerar com IA?')}
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          {[['Sim, gerar automaticamente','true'],['Não, usar texto fixo','false']].map(([l,v]) => (
            <button key={v} onClick={() => upd('ai_generate', v==='true')} style={{ flex:1, padding:'7px', borderRadius:8, border:`1px solid ${(cfg.ai_generate?.toString()??'true')===v?'#1e6b3a':'#e0e0ea'}`, background:(cfg.ai_generate?.toString()??'true')===v?'#f0f8f3':'#fff', color:(cfg.ai_generate?.toString()??'true')===v?'#1e6b3a':'#6a6a7a', fontSize:12 }}>{l}</button>
          ))}
        </div>
        {(cfg.ai_generate?.toString() ?? 'true') === 'false' && (<>
          {lbl('Texto do comentário')}
          <textarea value={cfg.comment||''} onChange={e => upd('comment', e.target.value)} rows={3} style={{ ...inp, resize:'vertical' }} />
        </>)}
      </>)}

      {/* CONNECT AGENT */}
      {step.step_type === 'connect_agent' && (<>
        {lbl('Agente')}
        <select value={cfg.agent_id||''} onChange={e => upd('agent_id', e.target.value)} style={inp}>
          <option value="">Selecione um agente...</option>
          {(agents||[]).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {lbl('Ativar quando?')}
        <select value={cfg.trigger||'immediately'} onChange={e => upd('trigger', e.target.value)} style={inp}>
          <option value="immediately">Imediatamente</option>
          <option value="on_reply">Quando o lead responder</option>
          <option value="on_connection">Quando aceitar conexão</option>
        </select>
      </>)}

      {/* AUTO steps */}
      {['check_connection','visit_profile','like_post'].includes(step.step_type) && (
        <div style={{ background:'#f8f8fc', borderRadius:10, padding:14, fontSize:13, color:'#6a6a7a', lineHeight:1.7 }}>
          <strong style={{ color:'#1a1a2e' }}>Ação automática</strong><br/>
          Executada pelo motor de campanha via Unipile. Sem configuração necessária.
        </div>
      )}
    </div>
  )
}

// ─── Add Step Button ──────────────────────────────────────────────────────────
const AddBtn = ({ onClick }) => (
  <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
    <div style={{ width:2, height:16, background:'#e0e0ea' }} />
    <button onClick={onClick} style={{ width:26, height:26, borderRadius:'50%', background:'#f8f8fc', border:'1px dashed #c0c0d0', color:'#c0c0d0', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1, transition:'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor='#1e6b3a'; e.currentTarget.style.color='#1e6b3a'; e.currentTarget.style.background='#f0faf4' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor='#c0c0d0'; e.currentTarget.style.color='#c0c0d0'; e.currentTarget.style.background='#f8f8fc' }}>
      +
    </button>
    <div style={{ width:2, height:16, background:'#e0e0ea' }} />
  </div>
)

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Campanhas() {
  const [campaigns, setCampaigns] = useState([])
  const [sel, setSel] = useState(null)
  const [steps, setSteps] = useState([])
  const [selStep, setSelStep] = useState(null)
  const [selIdx, setSelIdx] = useState(null)
  const [agents, setAgents] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [insertIdx, setInsertIdx] = useState(null)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    const pid = getProfileId()
    if (!pid) { console.warn('getProfileId null'); return }
    try {
      const [c, a] = await Promise.all([
        sb(`campaigns?profile_id=eq.${pid}&order=created_at.desc`),
        sb(`agents?profile_id=eq.${pid}`),
      ])
      setCampaigns(c || []); setAgents(a || [])
      if (c?.length) await loadSteps(c[0])
    } catch (e) { console.error('load error', e) }
  }

  const loadSteps = async (c) => {
    setSel(c); setSelStep(null); setSelIdx(null)
    try {
      const s = await sb(`campaign_steps?campaign_id=eq.${c.id}&order=step_order.asc`)
      setSteps(s || [])
    } catch { setSteps([]) }
  }

  const createCampaign = async () => {
    const pid = getProfileId()
    if (!pid || !newName.trim()) return
    try {
      const data = await sb('campaigns', { method:'POST', body: JSON.stringify({ profile_id:pid, name:newName, status:'draft', total_steps:0 }) })
      const nc = Array.isArray(data) ? data[0] : data
      setCampaigns(p => [nc, ...p]); await loadSteps(nc)
    } catch (e) { console.error('create campaign error', e) }
    setShowNew(false); setNewName('')
  }

  const addStep = async (typeId, atIdx) => {
    if (!sel) return
    const idx = atIdx ?? steps.length
    const newStep = { campaign_id: sel.id, step_order: idx+1, step_type: typeId, config: {} }
    try {
      const data = await sb('campaign_steps', { method:'POST', body: JSON.stringify(newStep) })
      const created = Array.isArray(data) ? data[0] : data
      const list = [...steps.slice(0,idx), created, ...steps.slice(idx)].map((s,i) => ({...s, step_order:i+1}))
      setSteps(list); setSelStep(created); setSelIdx(idx)
      await sb(`campaigns?id=eq.${sel.id}`, { method:'PATCH', body: JSON.stringify({ total_steps: list.length }) })
    } catch (e) { console.error('add step error', e) }
    setShowPalette(false)
  }

  const deleteStep = async (idx) => {
    const step = steps[idx]
    try {
      await sb(`campaign_steps?id=eq.${step.id}`, { method:'DELETE' })
      const list = steps.filter((_,i) => i!==idx)
      setSteps(list)
      if (selIdx === idx) { setSelStep(null); setSelIdx(null) }
    } catch (e) { console.error('delete step error', e) }
  }

  const updateStep = async (updated) => {
    setSteps(p => p.map(s => s.id===updated.id ? updated : s))
    setSelStep(updated)
    try {
      await sb(`campaign_steps?id=eq.${updated.id}`, { method:'PATCH', body: JSON.stringify({ config: updated.config }) })
    } catch {}
  }

  const saveFlow = async () => {
    setSaving(true)
    try {
      for (let i=0; i<steps.length; i++) {
        await sb(`campaign_steps?id=eq.${steps[i].id}`, { method:'PATCH', body: JSON.stringify({ step_order:i+1, config:steps[i].config }) })
      }
      await sb(`campaigns?id=eq.${sel.id}`, { method:'PATCH', body: JSON.stringify({ total_steps: steps.length }) })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch (e) { console.error('save error', e) }
    setSaving(false)
  }

  const toggleStatus = async (status) => {
    try {
      await sb(`campaigns?id=eq.${sel.id}`, { method:'PATCH', body: JSON.stringify({ status }) })
      setSel(p => ({...p, status}))
      setCampaigns(p => p.map(c => c.id===sel.id ? {...c, status} : c))
    } catch {}
  }

  const deleteCampaign = async () => {
    if (!confirm(`Excluir "${sel.name}"?`)) return
    try {
      await sb(`campaign_steps?campaign_id=eq.${sel.id}`, { method:'DELETE' })
      await sb(`campaigns?id=eq.${sel.id}`, { method:'DELETE' })
      const rest = campaigns.filter(c => c.id !== sel.id)
      setCampaigns(rest); setSel(null); setSteps([])
    } catch {}
  }

  const statusC = { active:'#059669', paused:'#d97706', draft:'#9a9ab0', completed:'#3b82f6' }
  const statusL = { active:'Ativa', paused:'Pausada', draft:'Rascunho', completed:'Concluída' }

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', background:'#ffffff', fontFamily:'Georgia, serif' }}>

      {/* Campaign list */}
      <div style={{ width:240, background:'#f8f8fc', borderRight:'1px solid #e8e8f0', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'16px 16px 12px', borderBottom:'1px solid #e8e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:11, color:'#9a9ab0', letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:600 }}>Campanhas</span>
          <button onClick={() => setShowNew(true)} style={{ background:'#1e6b3a', border:'none', borderRadius:6, color:'#fff', padding:'4px 10px', fontSize:12, fontWeight:600 }}>+ Nova</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:8 }}>
          {campaigns.length === 0 && <div style={{ padding:16, textAlign:'center', color:'#c0c0d0', fontSize:12 }}>Nenhuma campanha ainda</div>}
          {campaigns.map(c => (
            <div key={c.id} onClick={() => loadSteps(c)} style={{ padding:'10px 12px', borderRadius:8, marginBottom:4, cursor:'pointer', background:sel?.id===c.id?'#ffffff':'transparent', border:`1px solid ${sel?.id===c.id?'#e0e0ea':'transparent'}`, boxShadow:sel?.id===c.id?'0 1px 3px rgba(0,0,0,0.06)':'none' }}>
              <div style={{ fontSize:13, fontWeight:sel?.id===c.id?600:400, color:sel?.id===c.id?'#1a1a2e':'#6a6a7a', marginBottom:5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:10, color:statusC[c.status]||'#9a9ab0', background:`${statusC[c.status]||'#9a9ab0'}15`, padding:'2px 7px', borderRadius:8, fontWeight:600 }}>{statusL[c.status]||c.status}</span>
                <span style={{ fontSize:10, color:'#c0c0d0' }}>{c.total_steps||0} passos</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Flow canvas */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {!sel ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, color:'#c0c0d0' }}>
            <div style={{ fontSize:40 }}>⟳</div>
            <div style={{ fontSize:14 }}>Selecione ou crie uma campanha</div>
          </div>
        ) : (<>
          {/* Toolbar */}
          <div style={{ padding:'12px 20px', borderBottom:'1px solid #e8e8f0', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, fontWeight:700, color:'#1a1a2e' }}>{sel.name}</div>
              <div style={{ fontSize:11, color:'#9a9ab0', marginTop:2 }}>{steps.length} passos</div>
            </div>
            {sel.status !== 'active'
              ? <button onClick={() => toggleStatus('active')} disabled={steps.length===0} style={{ background:'#f0faf4', border:'1px solid #b8e8c8', borderRadius:8, color:'#1e6b3a', padding:'6px 14px', fontSize:12, fontWeight:600 }}>▶ Ativar</button>
              : <button onClick={() => toggleStatus('paused')} style={{ background:'#fff8f0', border:'1px solid #fcd8a0', borderRadius:8, color:'#d97706', padding:'6px 14px', fontSize:12, fontWeight:600 }}>⏸ Pausar</button>}
            <button onClick={saveFlow} disabled={saving} style={{ background:saving?'#e0e0ea':'#1e6b3a', border:'none', borderRadius:8, color:saving?'#9a9ab0':'#fff', padding:'7px 18px', fontSize:13, fontWeight:600 }}>
              {saved ? '✓ Salvo!' : saving ? 'Salvando...' : '💾 Salvar'}
            </button>
            <button onClick={deleteCampaign} style={{ background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:8, color:'#dc2626', padding:'7px 12px', fontSize:12 }}>Excluir</button>
          </div>

          {/* Canvas */}
          <div style={{ flex:1, overflowY:'auto', padding:'32px 40px', display:'flex', justifyContent:'center' }}>
            <div style={{ width:340, display:'flex', flexDirection:'column', alignItems:'center' }}>
              {/* Start */}
              <div style={{ background:'#f0faf4', border:'2px solid #b8e8c8', borderRadius:12, padding:'8px 24px', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#1e6b3a' }} />
                <span style={{ fontSize:12, color:'#1e6b3a', fontWeight:600 }}>INÍCIO DA CAMPANHA</span>
              </div>

              {steps.length > 0 && <div style={{ width:2, height:20, background:'#b8e8c8' }} />}

              {steps.map((step, i) => (
                <div key={step.id} style={{ width:'100%', display:'flex', flexDirection:'column', alignItems:'center' }}>
                  <FlowNode
                    step={step} index={i}
                    selected={selIdx === i}
                    onClick={() => { setSelStep(step); setSelIdx(i) }}
                    onDelete={() => deleteStep(i)}
                  />
                  <AddBtn onClick={() => { setInsertIdx(i+1); setShowPalette(true) }} />
                </div>
              ))}

              {/* Add first / end button */}
              <button
                onClick={() => { setInsertIdx(steps.length); setShowPalette(true) }}
                style={{ width:280, padding:'12px', borderRadius:12, border:'2px dashed #c8c8d8', background:'#f8f8fc', color:'#9a9ab0', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='#1e6b3a'; e.currentTarget.style.color='#1e6b3a'; e.currentTarget.style.background='#f0faf4' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='#c8c8d8'; e.currentTarget.style.color='#9a9ab0'; e.currentTarget.style.background='#f8f8fc' }}>
                <span style={{ fontSize:18 }}>+</span>{steps.length===0 ? 'Adicionar primeiro passo' : 'Adicionar ao final'}
              </button>

              {steps.length > 0 && (<>
                <div style={{ width:2, height:24, background:'#e0e0ea' }} />
                <div style={{ background:'#f5f5fa', border:'2px solid #e0e0ea', borderRadius:12, padding:'8px 24px', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'#9a9ab0' }} />
                  <span style={{ fontSize:12, color:'#9a9ab0', fontWeight:600 }}>FIM DO FLUXO</span>
                </div>
              </>)}
            </div>
          </div>
        </>)}
      </div>

      {/* Config panel */}
      <div style={{ width:320, background:'#f8f8fc', borderLeft:'1px solid #e8e8f0', display:'flex', flexDirection:'column' }}>
        {selStep ? (<>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid #e8e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:11, color:'#9a9ab0', textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:600 }}>Passo {selIdx+1}</span>
            <button onClick={() => { setSelStep(null); setSelIdx(null) }} style={{ background:'none', border:'none', color:'#c0c0d0', fontSize:18, cursor:'pointer' }}>✕</button>
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            <StepConfig step={selStep} onUpdate={updateStep} agents={agents} />
          </div>
        </>) : (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, color:'#c0c0d0', padding:24 }}>
            <div style={{ fontSize:32 }}>⚙️</div>
            <div style={{ fontSize:13, textAlign:'center', lineHeight:1.6 }}>Clique em um passo para configurar</div>
          </div>
        )}
      </div>

      {/* Palette modal */}
      {showPalette && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }} onClick={() => setShowPalette(false)}>
          <div style={{ background:'#fff', borderRadius:16, padding:28, width:540, boxShadow:'0 12px 48px rgba(0,0,0,0.15)', maxHeight:'80vh', display:'flex', flexDirection:'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:16, color:'#1a1a2e', fontWeight:700 }}>Adicionar passo</h2>
              <button onClick={() => setShowPalette(false)} style={{ background:'none', border:'none', color:'#9a9ab0', fontSize:20, cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ overflowY:'auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {STEP_TYPES.map(type => (
                <button key={type.id} onClick={() => addStep(type.id, insertIdx)} style={{ background:'#f8f8fc', border:`1px solid ${type.id==='condition'?'#bae6fd':'#e8e8f0'}`, borderRadius:12, padding:'14px', textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center', gap:12, transition:'all 0.15s', position:'relative' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=type.color; e.currentTarget.style.background=`${type.color}08` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=type.id==='condition'?'#bae6fd':'#e8e8f0'; e.currentTarget.style.background='#f8f8fc' }}>
                  {type.id === 'condition' && <div style={{ position:'absolute', top:6, right:8, fontSize:9, color:'#0ea5e9', fontWeight:700, background:'#eff6ff', padding:'1px 6px', borderRadius:4 }}>IF</div>}
                  <div style={{ width:38, height:38, borderRadius:9, background:`${type.color}15`, border:`1px solid ${type.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{type.icon}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#1a1a2e', marginBottom:2 }}>{type.label}</div>
                    <div style={{ fontSize:11, color:'#9a9ab0', lineHeight:1.4 }}>{type.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New campaign modal */}
      {showNew && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
          <div style={{ background:'#fff', border:'1px solid #e8e8f0', borderRadius:14, padding:28, width:360, boxShadow:'0 8px 40px rgba(0,0,0,0.12)' }}>
            <h2 style={{ fontSize:16, color:'#1a1a2e', marginBottom:20, fontWeight:700 }}>Nova Campanha</h2>
            <div style={{ fontSize:11, color:'#9a9ab0', marginBottom:6, textTransform:'uppercase', fontWeight:600 }}>Nome</div>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Prospecção Insumos SP" autoFocus onKeyDown={e => e.key==='Enter' && createCampaign()}
              style={{ width:'100%', background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:12, color:'#1a1a2e', fontSize:14, marginBottom:20 }} />
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setShowNew(false)} style={{ flex:1, background:'#fff', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:10, fontSize:13 }}>Cancelar</button>
              <button onClick={createCampaign} style={{ flex:2, background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:'#fff', padding:10, fontSize:13, fontWeight:700 }}>Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
