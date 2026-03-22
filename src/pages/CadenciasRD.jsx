import { useState, useEffect } from 'react'
import { sb, getProfileId, SB_URL, SB_KEY, getAccessToken, STEP_TYPES } from '../config.js'

const EDGE_URL = 'https://juabbkewrtbignqrufgp.supabase.co/functions/v1/rd-cadence'

// Step types disponíveis para cadências (inclui find_lead + send_inmail exclusivos)
const CADENCE_STEP_TYPES = [
  { id: 'find_lead',        label: 'Buscar Lead',       icon: '🔍', color: '#8b5cf6', desc: 'Localiza o contato no LinkedIn pelo nome/empresa do RD' },
  { id: 'visit_profile',    label: 'Visitar Perfil',    icon: '👁',  color: '#3b82f6', desc: 'Visita o perfil (gera notificação)' },
  { id: 'send_connection',  label: 'Pedir Conexão',     icon: '🤝', color: '#10b981', desc: 'Envia pedido de conexão com nota personalizada' },
  { id: 'send_message',     label: 'Enviar Mensagem',   icon: '💬', color: '#ec4899', desc: 'Mensagem direta LinkedIn (precisa ser 1º grau)' },
  { id: 'send_inmail',      label: 'InMail',            icon: '📨', color: '#f97316', desc: 'Mensagem paga para qualquer perfil' },
  { id: 'wait',             label: 'Aguardar',          icon: '⏳', color: '#f59e0b', desc: 'Espera N dias antes de continuar' },
  { id: 'wait_connection',  label: 'Aguardar Conexão',  icon: '⏱',  color: '#d97706', desc: 'Aguarda o lead aceitar a conexão (recheck por hora)' },
  { id: 'wait_reply',       label: 'Aguardar Resposta', icon: '💭', color: '#0ea5e9', desc: 'Aguarda resposta antes de continuar' },
  { id: 'condition',        label: 'Condição',          icon: '🔀', color: '#6366f1', desc: 'Divide o fluxo por condição (é conexão, respondeu, etc.)' },
]

const VARS_HINT = '{nome} · {primeiro_nome} · {empresa} · {cargo} · {cidade} · {etapa}'

const STATUS_COLORS = {
  pending:'#9a9ab0', waiting:'#d97706', in_progress:'#3b82f6',
  found:'#3b82f6', not_found:'#f59e0b', sent:'#059669',
  completed:'#059669', failed:'#dc2626', skipped:'#9a9ab0'
}
const STATUS_LABELS = {
  pending:'Pendente', waiting:'Aguardando', in_progress:'Processando',
  found:'Encontrado', not_found:'Não encontrado', sent:'✅ Enviado',
  completed:'✅ Concluído', failed:'❌ Falhou', skipped:'Ignorado'
}

function CopyBtn({ text }) {
  const [c, setC] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000) }}
      style={{ background:c?'#f0faf4':'#f8f8fc', border:`1px solid ${c?'#b8e8c8':'#e0e0ea'}`, borderRadius:6, color:c?'#059669':'#6a6a7a', padding:'5px 12px', fontSize:12, cursor:'pointer', flexShrink:0 }}>
      {c ? '✓ Copiado!' : '📋 Copiar'}
    </button>
  )
}

// ── Step Node no flow ────────────────────────────────────────────────────────
function StepNode({ step, index, selected, onClick, onDelete, totalSteps }) {
  const type = CADENCE_STEP_TYPES.find(t => t.id === step.step_type)
  const isLast = index === totalSteps - 1
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:0 }}>
      <div onClick={onClick} style={{
        width:220, background:selected?'#f0faf4':'#fff',
        border:`2px solid ${selected?'#1e6b3a':'#e8e8f0'}`,
        borderRadius:12, padding:'12px 14px', cursor:'pointer',
        boxShadow:selected?'0 2px 12px rgba(30,107,58,0.15)':'0 1px 4px rgba(0,0,0,0.06)',
        position:'relative', transition:'all 0.15s'
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:`${type?.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
              {type?.icon || '?'}
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#1a1a2e' }}>{type?.label || step.step_type}</div>
              {step.step_type === 'wait' && step.config?.days && (
                <div style={{ fontSize:10, color:'#9a9ab0' }}>{step.config.days} dia{step.config.days > 1 ? 's' : ''}</div>
              )}
              {step.step_type === 'condition' && step.config?.condition && (
                <div style={{ fontSize:10, color:'#9a9ab0' }}>{step.config.condition}</div>
              )}
              {(step.step_type === 'send_message' || step.step_type === 'send_inmail' || step.step_type === 'send_connection') && step.config?.message && (
                <div style={{ fontSize:10, color:'#9a9ab0', maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {step.config.message.substring(0, 40)}...
                </div>
              )}
            </div>
          </div>
          <button onClick={e => { e.stopPropagation(); onDelete() }}
            style={{ background:'none', border:'none', color:'#e0e0ea', fontSize:16, cursor:'pointer', lineHeight:1, padding:'0 2px' }}
            onMouseEnter={e => e.currentTarget.style.color='#dc2626'}
            onMouseLeave={e => e.currentTarget.style.color='#e0e0ea'}>×</button>
        </div>
        <div style={{ position:'absolute', top:'50%', left:-12, transform:'translateY(-50%)', fontSize:11, color:'#c0c0d0', fontWeight:700 }}>
          {index + 1}
        </div>
      </div>
      {!isLast && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:0 }}>
          <div style={{ width:2, height:18, background:'#e0e0ea' }} />
          <div style={{ width:0, height:0, borderLeft:'5px solid transparent', borderRight:'5px solid transparent', borderTop:'6px solid #e0e0ea' }} />
        </div>
      )}
    </div>
  )
}

// ── Configuração de um step ──────────────────────────────────────────────────
function StepConfig({ step, onUpdate }) {
  const type = CADENCE_STEP_TYPES.find(t => t.id === step.step_type)
  const cfg = step.config || {}
  const set = (k, v) => onUpdate({ ...step, config: { ...cfg, [k]: v } })

  const inp = { background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:'8px 10px', color:'#1a1a2e', fontSize:13, width:'100%' }
  const lbl = (t) => <div style={{ fontSize:10, color:'#9a9ab0', textTransform:'uppercase', fontWeight:700, marginBottom:5 }}>{t}</div>

  return (
    <div style={{ padding:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
        <div style={{ fontSize:18 }}>{type?.icon}</div>
        <div style={{ fontSize:13, fontWeight:700, color:'#1a1a2e' }}>{type?.label}</div>
      </div>
      <div style={{ fontSize:11, color:'#9a9ab0', marginBottom:16, lineHeight:1.5 }}>{type?.desc}</div>

      {step.step_type === 'find_lead' && (
        <div style={{ background:'#f0faf4', borderRadius:8, padding:10, fontSize:12, color:'#1e6b3a', lineHeight:1.6 }}>
          🔍 Busca o lead no LinkedIn usando o nome e empresa do payload do RD Station.<br/>
          Sem configuração necessária — cria o lead automaticamente se encontrado.
        </div>
      )}

      {step.step_type === 'wait' && (<>
        {lbl('Dias de espera')}
        <input type="number" min={1} max={30} value={cfg.days||1} onChange={e => set('days', parseInt(e.target.value)||1)} style={{ ...inp, marginBottom:0 }} />
      </>)}

      {step.step_type === 'condition' && (<>
        {lbl('Condição')}
        <select value={cfg.condition||'is_connection'} onChange={e => set('condition', e.target.value)} style={{ ...inp, marginBottom:12 }}>
          <option value="is_connection">É 1º grau de conexão</option>
          <option value="has_replied">Respondeu no LinkedIn</option>
          <option value="has_email">Tem email no cadastro</option>
        </select>
        {lbl('Se falso (on_false)')}
        <select value={cfg.on_false||'stop'} onChange={e => set('on_false', e.target.value)} style={inp}>
          <option value="stop">Parar sequência</option>
          <option value="continue">Continuar próximo step</option>
        </select>
        <div style={{ fontSize:11, color:'#9a9ab0', marginTop:8, lineHeight:1.5 }}>
          Se verdadeiro → avança para o próximo step.<br/>
          Se falso → para ou continua conforme configurado.
        </div>
      </>)}

      {step.step_type === 'send_connection' && (<>
        {lbl('Nota da conexão (máx 300 chars)')}
        <textarea value={cfg.message||''} onChange={e => set('message', e.target.value.substring(0,300))}
          rows={3} placeholder={`Olá {primeiro_nome}! Vi que você trabalha na {empresa}...`}
          style={{ ...inp, resize:'vertical', marginBottom:4 }} />
        <div style={{ fontSize:11, color:'#9a9ab0' }}>Variáveis: {VARS_HINT} · {(cfg.message||'').length}/300</div>
      </>)}

      {(step.step_type === 'send_message' || step.step_type === 'send_inmail') && (<>
        {lbl('Template da mensagem')}
        <textarea value={cfg.message||''} onChange={e => set('message', e.target.value)}
          rows={6} placeholder={`Olá {primeiro_nome},\n\nTrabalhamos com marketing no agronegócio e vi que você é {cargo} na {empresa}...`}
          style={{ ...inp, resize:'vertical', marginBottom:4 }} />
        <div style={{ fontSize:11, color:'#9a9ab0' }}>Variáveis: {VARS_HINT}</div>
        <div style={{ fontSize:11, color:'#9a9ab0', marginTop:6 }}>
          Deixe vazio → IA gera mensagem personalizada automaticamente.
        </div>
      </>)}

      {(step.step_type === 'wait_connection' || step.step_type === 'wait_reply') && (
        <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:8, padding:10, fontSize:12, color:'#c2410c', lineHeight:1.6 }}>
          ⏱ O motor verifica a condição a cada hora. A sequência avança automaticamente quando a condição for atendida.
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Componente principal
// ══════════════════════════════════════════════════════════════════════════════
export default function CadenciasRD() {
  const [cadences, setCadences] = useState([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState(null)
  const [steps, setSteps] = useState([])
  const [selStep, setSelStep] = useState(null)
  const [selIdx, setSelIdx] = useState(null)
  const [showPalette, setShowPalette] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [executions, setExecutions] = useState([])
  const [loadingExecs, setLoadingExecs] = useState(false)
  const [testPayload, setTestPayload] = useState('{\n  "nome": "João Silva",\n  "empresa": "Cooperativa ABC",\n  "cargo": "Gerente Comercial",\n  "cidade": "Goiânia\",\n  "email": "joao@coop.com",\n  "etapa": "Prospecção"\n}')
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)
  const [view, setView] = useState('builder') // 'builder' | 'log'
  const [showNewForm, setShowNewForm] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', description: '', rd_event_name: '' })

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const data = await sb(`cadence_actions?profile_id=eq.${getProfileId()}&order=created_at.desc`).catch(() => [])
    setCadences(data || [])
    setLoading(false)
  }

  const selectCadence = async (c) => {
    setSel(c); setSelStep(null); setSelIdx(null); setTestResult(null)
    // Carrega steps
    const data = await sb(`cadence_steps?cadence_id=eq.${c.id}&order=step_order.asc`).catch(() => [])
    setSteps(data || [])
    // Carrega execuções
    loadExecs(c.id)
  }

  const loadExecs = async (cadenceId) => {
    setLoadingExecs(true)
    const data = await sb(
      `cadence_executions?cadence_action_id=eq.${cadenceId}&order=executed_at.desc&limit=50`
    ).catch(() => [])
    setExecutions(data || [])
    setLoadingExecs(false)
  }

  const createCadence = async () => {
    if (!newForm.name.trim()) return
    const token = getAccessToken()
    const r = await fetch(`${SB_URL}/rest/v1/cadence_actions`, {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ ...newForm, profile_id: getProfileId(), is_active: false })
    })
    const data = await r.json()
    const created = Array.isArray(data) ? data[0] : data
    setCadences(p => [created, ...p])
    setShowNewForm(false)
    setNewForm({ name: '', description: '', rd_event_name: '' })
    selectCadence(created)
  }

  const deleteCadence = async (c) => {
    if (!confirm(`Excluir "${c.name}"? Histórico será perdido.`)) return
    await sb(`cadence_actions?id=eq.${c.id}`, { method:'DELETE' })
    setCadences(p => p.filter(x => x.id !== c.id))
    if (sel?.id === c.id) { setSel(null); setSteps([]) }
  }

  const toggleActive = async (c) => {
    await sb(`cadence_actions?id=eq.${c.id}`, { method:'PATCH', body: JSON.stringify({ is_active: !c.is_active }) })
    const updated = { ...c, is_active: !c.is_active }
    setCadences(p => p.map(x => x.id === c.id ? updated : x))
    if (sel?.id === c.id) setSel(updated)
  }

  // ── Step management ──────────────────────────────────────────────────────
  const addStep = async (typeId) => {
    if (!sel) return
    const idx = steps.length
    const newStep = { cadence_id: sel.id, step_order: idx + 1, step_type: typeId, config: {} }
    const token = getAccessToken()
    const r = await fetch(`${SB_URL}/rest/v1/cadence_steps`, {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(newStep)
    })
    const data = await r.json()
    const created = Array.isArray(data) ? data[0] : data
    const list = [...steps, created]
    setSteps(list)
    setSelStep(created); setSelIdx(idx)
    setShowPalette(false)
    // Salva links automaticamente
    await saveStepLinks(list)
  }

  const deleteStep = async (idx) => {
    const step = steps[idx]
    await sb(`cadence_steps?id=eq.${step.id}`, { method:'DELETE' })
    const list = steps.filter((_,i) => i !== idx).map((s,i) => ({...s, step_order: i+1}))
    setSteps(list)
    if (selIdx === idx) { setSelStep(null); setSelIdx(null) }
    await saveStepLinks(list)
  }

  const updateStep = async (updated) => {
    setSteps(p => p.map(s => s.id === updated.id ? updated : s))
    setSelStep(updated)
    await sb(`cadence_steps?id=eq.${updated.id}`, { method:'PATCH', body: JSON.stringify({ config: updated.config }) })
  }

  const saveStepLinks = async (list) => {
    for (let i = 0; i < list.length; i++) {
      const s = list[i]
      const nextS = list[i + 1] || null
      const patch = {
        step_order: i + 1,
        next_step_id: s.step_type === 'condition' ? null : (nextS?.id || null),
        true_step_id: s.step_type === 'condition' ? (nextS?.id || null) : null,
        false_step_id: null
      }
      await sb(`cadence_steps?id=eq.${s.id}`, { method:'PATCH', body: JSON.stringify(patch) })
    }
    // Atualiza first_step_id e total_steps na cadência
    if (sel) {
      const firstId = list[0]?.id || null
      await sb(`cadence_actions?id=eq.${sel.id}`, {
        method:'PATCH',
        body: JSON.stringify({ first_step_id: firstId, total_steps: list.length })
      })
      setSel(p => ({...p, first_step_id: firstId, total_steps: list.length}))
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    }
  }

  const saveFlow = async () => {
    setSaving(true)
    await saveStepLinks(steps)
    setSaving(false)
  }

  // ── Teste ─────────────────────────────────────────────────────────────────
  const testWebhook = async () => {
    if (!sel) return
    setTesting(true); setTestResult(null)
    try {
      let body; try { body = JSON.parse(testPayload) } catch { setTestResult({ error: 'JSON inválido' }); setTesting(false); return }
      const r = await fetch(`${EDGE_URL}/${sel.id}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
      const d = await r.json()
      setTestResult(d)
      if (d.success) loadExecs(sel.id)
    } catch(e) { setTestResult({ error: e.message }) }
    setTesting(false)
  }

  const webhookUrl = (c) => `${EDGE_URL}/${c.id}`

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', background:'#ffffff' }}>

      {/* ── LISTA ESQUERDA ── */}
      <div style={{ width:260, borderRight:'1px solid #e8e8f0', display:'flex', flexDirection:'column', flexShrink:0, background:'#f8f8fc' }}>
        <div style={{ padding:'14px 14px 10px', borderBottom:'1px solid #e8e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:'#1a1a2e' }}>Cadências RD</div>
            <div style={{ fontSize:10, color:'#9a9ab0' }}>Fluxos disparados pelo RD CRM</div>
          </div>
          <button onClick={() => setShowNewForm(true)}
            style={{ background:'#1e6b3a', border:'none', borderRadius:7, color:'#fff', padding:'5px 12px', fontSize:12, fontWeight:700 }}>+ Nova</button>
        </div>

        {showNewForm && (
          <div style={{ padding:12, borderBottom:'1px solid #e8e8f0', background:'#fff' }}>
            <input value={newForm.name} onChange={e => setNewForm(p=>({...p,name:e.target.value}))}
              placeholder="Nome da cadência" autoFocus
              style={{ width:'100%', background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:7, padding:'7px 10px', fontSize:12, marginBottom:6 }}
              onKeyDown={e => e.key==='Enter' && createCadence()} />
            <input value={newForm.rd_event_name} onChange={e => setNewForm(p=>({...p,rd_event_name:e.target.value}))}
              placeholder="Etapa do RD que dispara (opcional)"
              style={{ width:'100%', background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:7, padding:'7px 10px', fontSize:12, marginBottom:8 }} />
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={createCadence} style={{ flex:2, background:'#1e6b3a', border:'none', borderRadius:7, color:'#fff', padding:'6px', fontSize:12, fontWeight:700 }}>Criar</button>
              <button onClick={() => setShowNewForm(false)} style={{ flex:1, background:'#f0f0f5', border:'none', borderRadius:7, color:'#6a6a7a', padding:'6px', fontSize:12 }}>✕</button>
            </div>
          </div>
        )}

        <div style={{ flex:1, overflowY:'auto', padding:10 }}>
          {loading ? <div style={{ textAlign:'center', color:'#9a9ab0', padding:20, fontSize:12 }}>Carregando...</div>
          : cadences.length === 0 ? (
            <div style={{ textAlign:'center', color:'#c0c0d0', padding:24, fontSize:12 }}>
              <div style={{ fontSize:28, marginBottom:8 }}>🔗</div>
              Crie sua primeira cadência
            </div>
          ) : cadences.map(c => (
            <div key={c.id} onClick={() => selectCadence(c)}
              style={{ background:sel?.id===c.id?'#fff':'transparent', border:`1px solid ${sel?.id===c.id?'#b8e8c8':'transparent'}`, borderRadius:9, padding:'10px 12px', marginBottom:4, cursor:'pointer', transition:'all 0.12s' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#1a1a2e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</div>
                  {c.rd_event_name && <div style={{ fontSize:10, color:'#9a9ab0', marginTop:2 }}>↩ {c.rd_event_name}</div>}
                  <div style={{ fontSize:10, color:'#9a9ab0', marginTop:2 }}>
                    {c.total_steps||0} steps · {c.total_executions||0} disparos
                  </div>
                </div>
                <div style={{ display:'flex', gap:4, flexShrink:0, marginLeft:6 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => toggleActive(c)} title={c.is_active?'Pausar':'Ativar'}
                    style={{ width:32, height:18, borderRadius:9, background:c.is_active?'#1e6b3a':'#e0e0ea', border:'none', cursor:'pointer', position:'relative' }}>
                    <div style={{ width:12, height:12, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left:c.is_active?17:3, transition:'all 0.2s' }} />
                  </button>
                  <button onClick={() => deleteCadence(c)}
                    style={{ background:'none', border:'none', color:'#e0e0ea', fontSize:14, cursor:'pointer', padding:'0 2px' }}
                    onMouseEnter={e=>e.currentTarget.style.color='#dc2626'}
                    onMouseLeave={e=>e.currentTarget.style.color='#e0e0ea'}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PAINEL PRINCIPAL ── */}
      {!sel ? (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, color:'#c0c0d0' }}>
          <div style={{ fontSize:48 }}>🔗</div>
          <div style={{ fontSize:15, color:'#6a6a7a' }}>Selecione ou crie uma cadência</div>
          <div style={{ background:'#f8f8fc', border:'1px solid #e8e8f0', borderRadius:12, padding:20, maxWidth:420, fontSize:12, color:'#6a6a7a', lineHeight:1.9 }}>
            <div style={{ fontWeight:700, color:'#1a1a2e', marginBottom:10 }}>Como funciona:</div>
            <div>1. Crie uma cadência e monte o fluxo de steps</div>
            <div>2. Copie a URL do webhook gerada</div>
            <div>3. No RD Station → Automação → "Enviar Webhook" → cole a URL</div>
            <div>4. Configure o payload JSON com as variáveis do contato</div>
            <div>5. Quando o lead mudar de etapa, o motor executa o fluxo automaticamente</div>
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

          {/* ── FLOW BUILDER (centro) ── */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            {/* Header */}
            <div style={{ padding:'10px 16px', borderBottom:'1px solid #e8e8f0', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:800, color:'#1a1a2e' }}>{sel.name}</div>
                <div style={{ fontSize:11, color:'#9a9ab0' }}>
                  <span style={{ color:sel.is_active?'#059669':'#9a9ab0' }}>{sel.is_active?'● Ativa':'○ Pausada'}</span>
                  {sel.rd_event_name && <span> · dispara em "{sel.rd_event_name}"</span>}
                </div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => setView(view==='builder'?'log':'builder')}
                  style={{ background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:7, color:'#6a6a7a', padding:'5px 12px', fontSize:11 }}>
                  {view==='builder' ? '📋 Logs' : '🔧 Builder'}
                </button>
                <button onClick={saveFlow} disabled={saving}
                  style={{ background:saved?'#059669':saving?'#e0e0ea':'#1e6b3a', border:'none', borderRadius:7, color:'#fff', padding:'5px 14px', fontSize:11, fontWeight:700 }}>
                  {saved ? '✓ Salvo' : saving ? 'Salvando...' : 'Salvar fluxo'}
                </button>
              </div>
            </div>

            {view === 'builder' ? (
              <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
                {/* Canvas do flow */}
                <div style={{ flex:1, overflowY:'auto', padding:24, display:'flex', flexDirection:'column', alignItems:'center' }}>
                  {/* URL do webhook */}
                  <div style={{ background:'#1a1a2e', borderRadius:10, padding:'10px 14px', marginBottom:20, width:'100%', maxWidth:400, display:'flex', gap:8, alignItems:'center' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:9, color:'#6a6a8a', textTransform:'uppercase', fontWeight:700, marginBottom:3 }}>URL Webhook — cole no RD Station</div>
                      <code style={{ fontSize:10, color:'#a8ffa8', wordBreak:'break-all' }}>{webhookUrl(sel)}</code>
                    </div>
                    <CopyBtn text={webhookUrl(sel)} />
                  </div>

                  {/* Trigger badge */}
                  <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:20, padding:'5px 16px', fontSize:11, color:'#2563eb', fontWeight:600, marginBottom:16 }}>
                    ⚡ RD Station webhook {sel.rd_event_name ? `— etapa "${sel.rd_event_name}"` : ''}
                  </div>

                  {steps.length > 0 && (
                    <div style={{ width:2, height:14, background:'#e0e0ea', marginBottom:0 }} />
                  )}

                  {/* Steps */}
                  {steps.map((step, i) => (
                    <StepNode
                      key={step.id} step={step} index={i}
                      selected={selIdx === i}
                      totalSteps={steps.length}
                      onClick={() => { setSelStep(step); setSelIdx(i) }}
                      onDelete={() => deleteStep(i)}
                    />
                  ))}

                  {/* Botão adicionar step */}
                  <div style={{ marginTop:steps.length > 0 ? 8 : 16 }}>
                    {showPalette ? (
                      <div style={{ background:'#fff', border:'1px solid #e8e8f0', borderRadius:12, padding:12, width:320, boxShadow:'0 4px 20px rgba(0,0,0,0.1)' }}>
                        <div style={{ fontSize:11, color:'#9a9ab0', textTransform:'uppercase', fontWeight:700, marginBottom:10 }}>Escolha um step</div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                          {CADENCE_STEP_TYPES.map(type => (
                            <button key={type.id} onClick={() => addStep(type.id)}
                              style={{ background:'#f8f8fc', border:'1px solid #e8e8f0', borderRadius:9, padding:'8px 10px', cursor:'pointer', textAlign:'left', display:'flex', gap:7, alignItems:'center' }}>
                              <span style={{ fontSize:16 }}>{type.icon}</span>
                              <span style={{ fontSize:11, fontWeight:600, color:'#1a1a2e' }}>{type.label}</span>
                            </button>
                          ))}
                        </div>
                        <button onClick={() => setShowPalette(false)}
                          style={{ marginTop:10, width:'100%', background:'#f0f0f5', border:'none', borderRadius:7, color:'#6a6a7a', padding:6, fontSize:11 }}>Cancelar</button>
                      </div>
                    ) : (
                      <button onClick={() => setShowPalette(true)}
                        style={{ background:'#f8f8fc', border:'2px dashed #e0e0ea', borderRadius:10, color:'#9a9ab0', padding:'10px 24px', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:18 }}>+</span> Adicionar step
                      </button>
                    )}
                  </div>
                </div>

                {/* Painel de config do step selecionado */}
                {selStep && (
                  <div style={{ width:280, borderLeft:'1px solid #e8e8f0', overflowY:'auto', background:'#fafafa' }}>
                    <div style={{ padding:'10px 16px', borderBottom:'1px solid #e8e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:12, fontWeight:700, color:'#1a1a2e' }}>Configurar step</span>
                      <button onClick={() => { setSelStep(null); setSelIdx(null) }}
                        style={{ background:'none', border:'none', color:'#9a9ab0', fontSize:16, cursor:'pointer' }}>×</button>
                    </div>
                    <StepConfig step={selStep} onUpdate={updateStep} />
                  </div>
                )}
              </div>
            ) : (
              /* ── LOGS ── */
              <div style={{ flex:1, overflowY:'auto', padding:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#1a1a2e' }}>
                    Histórico de execuções
                    {executions.length > 0 && <span style={{ fontSize:11, color:'#9a9ab0', fontWeight:400, marginLeft:8 }}>({executions.length})</span>}
                  </div>
                  <button onClick={() => loadExecs(sel.id)} style={{ background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:7, color:'#6a6a7a', padding:'4px 10px', fontSize:11 }}>🔄 Atualizar</button>
                </div>
                {loadingExecs ? <div style={{ color:'#9a9ab0', fontSize:13 }}>Carregando...</div>
                : executions.length === 0 ? (
                  <div style={{ color:'#c0c0d0', fontSize:13, padding:'20px 0', textAlign:'center' }}>
                    <div style={{ fontSize:28, marginBottom:8 }}>📋</div>
                    Nenhuma execução ainda. Dispare o webhook ou clique em "Testar" para começar.
                  </div>
                ) : (
                  <div style={{ border:'1px solid #e8e8f0', borderRadius:10, overflow:'hidden' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead>
                        <tr style={{ background:'#f8f8fc' }}>
                          {['Data','Nome','Empresa','Etapa CRM','Status','Detalhe'].map(h => (
                            <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, color:'#9a9ab0', textTransform:'uppercase', fontWeight:700 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {executions.map((e, i) => (
                          <tr key={e.id} style={{ borderTop:'1px solid #f0f0f5', background:i%2?'#fafafa':'#fff' }}>
                            <td style={{ padding:'9px 12px', color:'#9a9ab0', whiteSpace:'nowrap' }}>
                              {new Date(e.executed_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
                            </td>
                            <td style={{ padding:'9px 12px', fontWeight:600, color:'#1a1a2e' }}>{e.rd_contact_name||'—'}</td>
                            <td style={{ padding:'9px 12px', color:'#6a6a7a' }}>{e.rd_contact_company||'—'}</td>
                            <td style={{ padding:'9px 12px', color:'#6a6a7a' }}>{e.rd_stage_name||'—'}</td>
                            <td style={{ padding:'9px 12px' }}>
                              <span style={{ fontSize:11, color:STATUS_COLORS[e.status]||'#9a9ab0', background:`${STATUS_COLORS[e.status]||'#9a9ab0'}18`, padding:'2px 8px', borderRadius:8, fontWeight:600, whiteSpace:'nowrap' }}>
                                {STATUS_LABELS[e.status]||e.status}
                              </span>
                            </td>
                            <td style={{ padding:'9px 12px', color:'#9a9ab0', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {e.message_sent ? e.message_sent.substring(0,60) : e.error_message ? <span style={{ color:'#dc2626' }}>{e.error_message}</span> : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── PAINEL DIREITO: Webhook + Teste ── */}
          <div style={{ width:280, borderLeft:'1px solid #e8e8f0', display:'flex', flexDirection:'column', overflowY:'auto', background:'#fafafa' }}>
            <div style={{ padding:'10px 14px', borderBottom:'1px solid #e8e8f0' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#1a1a2e', textTransform:'uppercase', letterSpacing:'0.06em' }}>Configuração & Teste</div>
            </div>

            <div style={{ padding:14 }}>
              {/* Payload esperado */}
              <div style={{ fontSize:10, color:'#9a9ab0', textTransform:'uppercase', fontWeight:700, marginBottom:6 }}>Payload RD Station</div>
              <div style={{ background:'#1a1a2e', borderRadius:8, padding:10, marginBottom:4 }}>
                <pre style={{ fontSize:10, color:'#a8ffa8', margin:0, lineHeight:1.7 }}>{`{
  "nome": "{{contact.name}}",
  "empresa": "{{contact.company}}",
  "cargo": "{{contact.job_title}}",
  "cidade": "{{contact.city}}",
  "email": "{{contact.email}}",
  "telefone": "{{contact.phone}}",
  "etapa": "{{deal.stage_name}}"
}`}</pre>
              </div>
              <CopyBtn text={`{\n  "nome": "{{contact.name}}",\n  "empresa": "{{contact.company}}",\n  "cargo": "{{contact.job_title}}",\n  "cidade": "{{contact.city}}",\n  "email": "{{contact.email}}",\n  "telefone": "{{contact.phone}}",\n  "etapa": "{{deal.stage_name}}"\n}`} />

              <div style={{ height:1, background:'#e8e8f0', margin:'14px 0' }} />

              {/* Teste */}
              <div style={{ fontSize:10, color:'#9a9ab0', textTransform:'uppercase', fontWeight:700, marginBottom:6 }}>🧪 Testar webhook</div>
              <textarea value={testPayload} onChange={e => setTestPayload(e.target.value)}
                rows={8} style={{ width:'100%', background:'#fff', border:'1px solid #e0e0ea', borderRadius:7, padding:'8px 10px', color:'#1a1a2e', fontSize:11, fontFamily:'monospace', resize:'vertical', marginBottom:8 }} />
              <button onClick={testWebhook} disabled={testing}
                style={{ width:'100%', background:testing?'#e0e0ea':'#d97706', border:'none', borderRadius:8, color:testing?'#9a9ab0':'#fff', padding:'8px', fontSize:12, fontWeight:700 }}>
                {testing ? '⏳ Testando...' : '▶ Disparar teste'}
              </button>
              {testResult && (
                <div style={{ marginTop:10, background:testResult.success?'#f0faf4':'#fff5f5', border:`1px solid ${testResult.success?'#b8e8c8':'#ffd0d0'}`, borderRadius:8, padding:10 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:testResult.success?'#059669':'#dc2626', marginBottom:6 }}>
                    {testResult.success ? `✅ ${testResult.mode === 'flow' ? 'Fluxo iniciado!' : 'Executado!'}` : '❌ Falhou'}
                  </div>
                  <pre style={{ fontSize:10, color:'#4a4a5a', margin:0, overflow:'auto', maxHeight:160 }}>
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}

              {/* Métricas */}
              <div style={{ height:1, background:'#e8e8f0', margin:'14px 0' }} />
              <div style={{ display:'flex', gap:10 }}>
                {[['Disparos', sel.total_executions||0,'#6a6a7a'],['Encontrados', sel.total_found||0,'#3b82f6'],['Enviados', sel.total_sent||0,'#059669']].map(([l,v,c]) => (
                  <div key={l} style={{ flex:1, textAlign:'center', background:'#fff', border:'1px solid #e8e8f0', borderRadius:8, padding:'8px 4px' }}>
                    <div style={{ fontSize:18, fontWeight:900, color:c, fontFamily:'monospace' }}>{v}</div>
                    <div style={{ fontSize:9, color:'#c0c0d0', textTransform:'uppercase' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
