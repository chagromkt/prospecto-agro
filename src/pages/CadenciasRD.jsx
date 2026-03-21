import { useState, useEffect } from 'react'
import { sb, getProfileId, SB_URL, SB_KEY, getAccessToken } from '../config.js'

const EDGE_URL = 'https://juabbkewrtbignqrufgp.supabase.co/functions/v1/rd-cadence'

const ACTION_TYPES = [
  { id: 'send_connection', icon: '🤝', label: 'Pedido de Conexão', desc: 'Envia convite + nota personalizada' },
  { id: 'send_message', icon: '💬', label: 'Mensagem Direta', desc: 'Envia mensagem LinkedIn (precisa ser 1º grau)' },
  { id: 'send_inmail', icon: '📨', label: 'InMail', desc: 'Mensagem paga para qualquer perfil' },
]

const STATUS_COLORS = {
  pending: '#9a9ab0', found: '#3b82f6', not_found: '#f59e0b',
  sent: '#059669', failed: '#dc2626', skipped: '#9a9ab0'
}
const STATUS_LABELS = {
  pending: 'Pendente', found: 'Encontrado', not_found: 'Não encontrado',
  sent: '✅ Enviado', failed: '❌ Falhou', skipped: 'Ignorado'
}

const VARS_HINT = '{nome} · {primeiro_nome} · {empresa} · {cargo} · {cidade} · {etapa}'
const EMPTY_FORM = { name: '', description: '', action_type: 'send_connection', message_template: '', connection_note: '' }

const inp = { background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:'9px 12px', color:'#1a1a2e', fontSize:13, width:'100%' }
const lbl = (t) => <div style={{ fontSize:11, color:'#9a9ab0', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5, fontWeight:600 }}>{t}</div>

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:400, padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:600, maxHeight:'90vh', overflow:'auto', boxShadow:'0 16px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 24px', borderBottom:'1px solid #f0f0f5', position:'sticky', top:0, background:'#fff', zIndex:1 }}>
          <h2 style={{ fontSize:16, fontWeight:700, color:'#1a1a2e' }}>{title}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, color:'#9a9ab0', cursor:'pointer' }}>×</button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} style={{ background:copied?'#f0faf4':'#f8f8fc', border:`1px solid ${copied?'#b8e8c8':'#e0e0ea'}`, borderRadius:6, color:copied?'#059669':'#6a6a7a', padding:'5px 12px', fontSize:12, cursor:'pointer', flexShrink:0, transition:'all 0.2s' }}>
      {copied ? '✓ Copiado!' : '📋 Copiar'}
    </button>
  )
}

export default function CadenciasRD() {
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedAction, setSelectedAction] = useState(null)
  const [executions, setExecutions] = useState([])
  const [loadingExecs, setLoadingExecs] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [testPayload, setTestPayload] = useState('{\n  "nome": "João Silva",\n  "empresa": "Cooperativa ABC",\n  "cargo": "Gerente Comercial",\n  "cidade": "Goiânia",\n  "etapa": "Proposta"\n}')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const data = await sb(`cadence_actions?profile_id=eq.${getProfileId()}&order=created_at.desc`).catch(() => [])
    setActions(data || [])
    setLoading(false)
  }

  const loadExecs = async (actionId) => {
    setLoadingExecs(true)
    const data = await sb(`cadence_executions?cadence_action_id=eq.${actionId}&order=executed_at.desc&limit=50`).catch(() => [])
    setExecutions(data || [])
    setLoadingExecs(false)
  }

  const upd = (k, v) => setForm(p => ({...p, [k]: v}))

  const openCreate = () => {
    setForm(EMPTY_FORM); setEditingId(null); setShowForm(true)
  }

  const openEdit = (a) => {
    setForm({ name: a.name, description: a.description||'', action_type: a.action_type, message_template: a.message_template||'', connection_note: a.connection_note||'' })
    setEditingId(a.id); setShowForm(true)
  }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = { ...form, profile_id: getProfileId() }
      if (editingId) {
        await sb(`cadence_actions?id=eq.${editingId}`, { method:'PATCH', body: JSON.stringify(form) })
        setActions(p => p.map(a => a.id === editingId ? {...a, ...form} : a))
      } else {
        const token = getAccessToken()
        const r = await fetch(`${SB_URL}/rest/v1/cadence_actions`, {
          method: 'POST',
          headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation,resolution=merge-duplicates' },
          body: JSON.stringify(payload)
        })
        const created = await r.json()
        setActions(p => [Array.isArray(created) ? created[0] : created, ...p])
      }
      setShowForm(false)
    } catch(e) { console.error(e) }
    setSaving(false)
  }

  const toggleActive = async (a) => {
    await sb(`cadence_actions?id=eq.${a.id}`, { method:'PATCH', body: JSON.stringify({ is_active: !a.is_active }) })
    setActions(p => p.map(x => x.id === a.id ? {...x, is_active: !x.is_active} : x))
  }

  const deleteAction = async (a) => {
    if (!confirm(`Excluir "${a.name}"? Isso remove o histórico de execuções também.`)) return
    await sb(`cadence_actions?id=eq.${a.id}`, { method:'DELETE' })
    setActions(p => p.filter(x => x.id !== a.id))
    if (selectedAction?.id === a.id) setSelectedAction(null)
  }

  const openDetail = (a) => {
    setSelectedAction(a); setTestResult(null)
    loadExecs(a.id)
  }

  const testWebhook = async () => {
    if (!selectedAction) return
    setTestResult('testing')
    try {
      let body
      try { body = JSON.parse(testPayload) } catch { setTestResult({ error: 'JSON inválido no payload de teste' }); return }
      const r = await fetch(`${EDGE_URL}/${selectedAction.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const d = await r.json()
      setTestResult(d)
    } catch(e) { setTestResult({ error: e.message }) }
  }

  const webhookUrl = (a) => `${EDGE_URL}/${a.id}`

  const actionType = (id) => ACTION_TYPES.find(t => t.id === id)

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', background:'#ffffff' }}>

      {/* ── LISTA DE AÇÕES ── */}
      <div style={{ width:400, borderRight:'1px solid #e8e8f0', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid #e8e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h1 style={{ fontSize:17, fontWeight:800, color:'#1a1a2e' }}>Cadências RD Station</h1>
            <p style={{ fontSize:11, color:'#9a9ab0', marginTop:2 }}>Webhooks disparados pelo RD CRM</p>
          </div>
          <button onClick={openCreate} style={{ background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:'#fff', padding:'8px 16px', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            + Nova
          </button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:16 }}>
          {loading ? <div style={{ textAlign:'center', color:'#9a9ab0', padding:40 }}>Carregando...</div>
          : actions.length === 0 ? (
            <div style={{ textAlign:'center', color:'#c0c0d0', padding:40 }}>
              <div style={{ fontSize:36, marginBottom:12 }}>🔗</div>
              <div style={{ fontSize:14, marginBottom:6 }}>Nenhuma cadência criada</div>
              <div style={{ fontSize:12, lineHeight:1.6 }}>Crie uma ação, copie a URL<br/>e cole na automação do RD Station</div>
            </div>
          ) : actions.map(a => {
            const type = actionType(a.action_type)
            const isSelected = selectedAction?.id === a.id
            return (
              <div key={a.id} onClick={() => openDetail(a)}
                style={{ background:isSelected?'#f0faf4':'#fff', border:`1px solid ${isSelected?'#b8e8c8':'#e8e8f0'}`, borderRadius:10, padding:14, marginBottom:10, cursor:'pointer', transition:'all 0.15s' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e', marginBottom:3 }}>{a.name}</div>
                    <div style={{ fontSize:12, color:'#6a6a7a' }}>{type?.icon} {type?.label}</div>
                  </div>
                  {/* Toggle ativo/pausado */}
                  <button onClick={e => { e.stopPropagation(); toggleActive(a) }}
                    style={{ width:36, height:20, borderRadius:10, background:a.is_active?'#1e6b3a':'#e0e0ea', border:'none', cursor:'pointer', position:'relative', flexShrink:0 }}>
                    <div style={{ width:14, height:14, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left:a.is_active?19:3, transition:'all 0.2s' }} />
                  </button>
                </div>
                {/* Métricas */}
                <div style={{ display:'flex', gap:12 }}>
                  {[['Disparos', a.total_executions||0,'#6a6a7a'],['Encontrados', a.total_found||0,'#3b82f6'],['Enviados', a.total_sent||0,'#059669']].map(([l,v,c]) => (
                    <div key={l} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:18, fontWeight:900, color:c, fontFamily:'monospace' }}>{v}</div>
                      <div style={{ fontSize:10, color:'#c0c0d0', textTransform:'uppercase' }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── DETALHE / LOG ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>
        {!selectedAction ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:16, color:'#c0c0d0' }}>
            <div style={{ fontSize:48 }}>🔗</div>
            <div style={{ fontSize:16, color:'#6a6a7a' }}>Selecione uma cadência para ver detalhes</div>
            <div style={{ background:'#f8f8fc', border:'1px solid #e8e8f0', borderRadius:12, padding:20, maxWidth:480, width:'100%' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#6a6a7a', textTransform:'uppercase', marginBottom:12 }}>Como funciona</div>
              {[
                ['1', 'Crie uma ação de cadência com o template da mensagem'],
                ['2', 'Copie a URL do webhook gerada automaticamente'],
                ['3', 'No RD Station → Automação → Ação "Enviar Webhook" → cole a URL'],
                ['4', 'Configure o payload com as variáveis do contato'],
                ['5', 'Quando um lead mudar de etapa, o RD dispara → ProspectAgro encontra no LinkedIn e executa'],
              ].map(([n, t]) => (
                <div key={n} style={{ display:'flex', gap:10, padding:'7px 0', borderBottom:n<'5'?'1px solid #f8f8fc':'none' }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:'#1e6b3a', color:'#fff', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{n}</div>
                  <div style={{ fontSize:12, color:'#6a6a7a', lineHeight:1.5 }}>{t}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {/* Header da ação */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                  <h2 style={{ fontSize:18, fontWeight:800, color:'#1a1a2e' }}>{selectedAction.name}</h2>
                  <span style={{ fontSize:11, background:selectedAction.is_active?'#f0faf4':'#f5f5fa', color:selectedAction.is_active?'#059669':'#9a9ab0', border:`1px solid ${selectedAction.is_active?'#b8e8c8':'#e0e0ea'}`, borderRadius:12, padding:'2px 10px', fontWeight:600 }}>
                    {selectedAction.is_active ? '● Ativa' : '○ Pausada'}
                  </span>
                </div>
                <div style={{ fontSize:13, color:'#6a6a7a' }}>{actionType(selectedAction.action_type)?.icon} {actionType(selectedAction.action_type)?.label}</div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => openEdit(selectedAction)} style={{ background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:'7px 14px', fontSize:12 }}>✎ Editar</button>
                <button onClick={() => deleteAction(selectedAction)} style={{ background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:8, color:'#dc2626', padding:'7px 14px', fontSize:12 }}>Excluir</button>
              </div>
            </div>

            {/* URL do Webhook */}
            <div style={{ background:'#1a1a2e', borderRadius:10, padding:16, marginBottom:20 }}>
              <div style={{ fontSize:11, color:'#6a6a8a', textTransform:'uppercase', fontWeight:700, marginBottom:8 }}>URL do Webhook — cole no RD Station</div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <code style={{ flex:1, fontSize:12, color:'#a8ffa8', background:'rgba(255,255,255,0.05)', padding:'8px 12px', borderRadius:6, wordBreak:'break-all' }}>
                  {webhookUrl(selectedAction)}
                </code>
                <CopyButton text={webhookUrl(selectedAction)} />
              </div>
            </div>

            {/* Payload esperado */}
            <div style={{ background:'#f8f8fc', border:'1px solid #e8e8f0', borderRadius:10, padding:16, marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#6a6a7a', textTransform:'uppercase', marginBottom:10 }}>Payload JSON esperado (configurar no RD Station)</div>
              <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                <pre style={{ flex:1, fontSize:12, color:'#4a4a5a', margin:0, lineHeight:1.7 }}>{`{
  "nome": "{{contact.name}}",
  "empresa": "{{contact.company}}",
  "cargo": "{{contact.job_title}}",
  "cidade": "{{contact.city}}",
  "email": "{{contact.email}}",
  "telefone": "{{contact.mobile_phone}}",
  "etapa": "{{deal.stage_name}}"
}`}</pre>
                <CopyButton text={`{\n  "nome": "{{contact.name}}",\n  "empresa": "{{contact.company}}",\n  "cargo": "{{contact.job_title}}",\n  "cidade": "{{contact.city}}",\n  "email": "{{contact.email}}",\n  "telefone": "{{contact.mobile_phone}}",\n  "etapa": "{{deal.stage_name}}"\n}`} />
              </div>
            </div>

            {/* Template configurado */}
            {(selectedAction.message_template || selectedAction.connection_note) && (
              <div style={{ background:'#fff', border:'1px solid #e8e8f0', borderRadius:10, padding:16, marginBottom:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#6a6a7a', textTransform:'uppercase', marginBottom:8 }}>
                  {selectedAction.action_type === 'send_connection' ? 'Nota da Conexão' : 'Template da Mensagem'}
                </div>
                <div style={{ fontSize:13, color:'#4a4a5a', lineHeight:1.7, whiteSpace:'pre-wrap', background:'#f8f8fc', borderRadius:8, padding:12 }}>
                  {selectedAction.action_type === 'send_connection' ? selectedAction.connection_note : selectedAction.message_template}
                </div>
              </div>
            )}

            {/* Testar webhook */}
            <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:10, padding:16, marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#92400e', textTransform:'uppercase', marginBottom:10 }}>🧪 Testar Webhook</div>
              <textarea value={testPayload} onChange={e => setTestPayload(e.target.value)}
                rows={7} style={{ ...inp, fontFamily:'monospace', fontSize:12, marginBottom:10, resize:'vertical' }} />
              <button onClick={testWebhook} disabled={testResult==='testing'}
                style={{ background:testResult==='testing'?'#e0e0ea':'#d97706', border:'none', borderRadius:8, color:testResult==='testing'?'#9a9ab0':'#fff', padding:'9px 20px', fontSize:13, fontWeight:700 }}>
                {testResult==='testing' ? '⏳ Testando...' : '▶ Disparar teste'}
              </button>
              {testResult && testResult !== 'testing' && (
                <div style={{ marginTop:12, background:testResult.success?'#f0faf4':'#fff5f5', border:`1px solid ${testResult.success?'#b8e8c8':'#ffd0d0'}`, borderRadius:8, padding:12 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:testResult.success?'#059669':'#dc2626', marginBottom:6 }}>
                    {testResult.success ? '✅ Sucesso!' : '❌ Falhou'}
                  </div>
                  <pre style={{ fontSize:11, color:'#4a4a5a', margin:0, overflow:'auto' }}>
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Log de execuções */}
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e', marginBottom:12 }}>
                Histórico de Execuções
                {executions.length > 0 && <span style={{ fontSize:12, color:'#9a9ab0', fontWeight:400, marginLeft:8 }}>({executions.length} registros)</span>}
              </div>
              {loadingExecs ? <div style={{ color:'#9a9ab0', fontSize:13 }}>Carregando...</div>
              : executions.length === 0 ? (
                <div style={{ color:'#c0c0d0', fontSize:13, padding:'20px 0' }}>Nenhum disparo registrado ainda.</div>
              ) : (
                <div style={{ border:'1px solid #e8e8f0', borderRadius:10, overflow:'hidden' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead>
                      <tr style={{ background:'#f8f8fc' }}>
                        {['Data','Nome','Empresa','Cargo','Status','Mensagem'].map(h => (
                          <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:10, color:'#9a9ab0', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.06em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {executions.map((e, i) => (
                        <tr key={e.id} style={{ borderTop:'1px solid #f0f0f5', background:i%2?'#fafafa':'#fff' }}>
                          <td style={{ padding:'10px 12px', color:'#9a9ab0', whiteSpace:'nowrap' }}>
                            {new Date(e.executed_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
                          </td>
                          <td style={{ padding:'10px 12px', fontWeight:600, color:'#1a1a2e' }}>{e.rd_contact_name || '—'}</td>
                          <td style={{ padding:'10px 12px', color:'#6a6a7a' }}>{e.rd_contact_company || '—'}</td>
                          <td style={{ padding:'10px 12px', color:'#6a6a7a' }}>{e.rd_contact_title || '—'}</td>
                          <td style={{ padding:'10px 12px' }}>
                            <span style={{ fontSize:11, color:STATUS_COLORS[e.status]||'#9a9ab0', background:`${STATUS_COLORS[e.status]}18`, padding:'2px 8px', borderRadius:8, fontWeight:600, whiteSpace:'nowrap' }}>
                              {STATUS_LABELS[e.status]||e.status}
                            </span>
                          </td>
                          <td style={{ padding:'10px 12px', color:'#9a9ab0', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {e.message_sent ? e.message_sent.substring(0,50)+'...' : e.error_message ? <span style={{ color:'#dc2626' }}>{e.error_message}</span> : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL CRIAR / EDITAR ── */}
      {showForm && (
        <Modal title={editingId ? 'Editar Ação' : 'Nova Ação de Cadência'} onClose={() => setShowForm(false)}>
          <div style={{ marginBottom:16 }}>
            {lbl('Nome da ação')}
            <input value={form.name} onChange={e => upd('name', e.target.value)}
              placeholder="Ex: Conexão Gerentes Cooperativa" style={inp} />
          </div>

          <div style={{ marginBottom:16 }}>
            {lbl('Tipo de ação')}
            <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:8 }}>
              {ACTION_TYPES.map(t => (
                <label key={t.id} onClick={() => upd('action_type', t.id)}
                  style={{ display:'flex', gap:12, padding:'12px 14px', background:form.action_type===t.id?'#f0faf4':'#f8f8fc', border:`1px solid ${form.action_type===t.id?'#1e6b3a':'#e0e0ea'}`, borderRadius:9, cursor:'pointer', transition:'all 0.15s' }}>
                  <span style={{ fontSize:20 }}>{t.icon}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#1a1a2e' }}>{t.label}</div>
                    <div style={{ fontSize:11, color:'#9a9ab0' }}>{t.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {form.action_type === 'send_connection' && (
            <div style={{ marginBottom:16 }}>
              {lbl('Nota do pedido de conexão (máx 300 chars)')}
              <textarea value={form.connection_note} onChange={e => upd('connection_note', e.target.value.substring(0,300))}
                placeholder={`Olá {primeiro_nome}! Vi que você trabalha na {empresa} e queria conectar.`}
                rows={3} style={{ ...inp, resize:'vertical' }} />
              <div style={{ fontSize:11, color:'#9a9ab0', marginTop:4 }}>Variáveis: {VARS_HINT} · {form.connection_note?.length||0}/300</div>
            </div>
          )}

          {(form.action_type === 'send_message' || form.action_type === 'send_inmail') && (
            <div style={{ marginBottom:16 }}>
              {lbl('Template da mensagem')}
              <textarea value={form.message_template} onChange={e => upd('message_template', e.target.value)}
                placeholder={`Olá {primeiro_nome}, vi que você é {cargo} na {empresa}.\n\nTrabalhamos com marketing para agronegócio e acredito que...`}
                rows={6} style={{ ...inp, resize:'vertical' }} />
              <div style={{ fontSize:11, color:'#9a9ab0', marginTop:4 }}>Variáveis: {VARS_HINT}</div>
            </div>
          )}

          <div style={{ marginBottom:20 }}>
            {lbl('Descrição / Observação (opcional)')}
            <input value={form.description} onChange={e => upd('description', e.target.value)}
              placeholder="Ex: Dispara quando lead entra na etapa Prospecção" style={inp} />
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => setShowForm(false)} style={{ flex:1, background:'#fff', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:12, fontSize:13 }}>Cancelar</button>
            <button onClick={save} disabled={saving || !form.name.trim()}
              style={{ flex:2, background:!form.name.trim()?'#e0e0ea':'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:!form.name.trim()?'#9a9ab0':'#fff', padding:12, fontSize:13, fontWeight:700 }}>
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : '✓ Criar ação'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
