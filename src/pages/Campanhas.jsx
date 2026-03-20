import { useState, useEffect } from 'react'
import { sb, getProfileId } from '../config.js'

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
  { id: 'is_connection',   label: 'É conexão de 1º grau?' },
  { id: 'accepted_invite', label: 'Aceitou o pedido de conexão?' },
  { id: 'replied_message', label: 'Respondeu a mensagem?' },
  { id: 'icp_score_gte',   label: 'ICP Score ≥ X?' },
  { id: 'has_email',       label: 'Tem email cadastrado?' },
  { id: 'has_phone',       label: 'Tem telefone cadastrado?' },
  { id: 'sent_to_rd',      label: 'Já enviado ao RD Station?' },
  { id: 'segment_is',      label: 'Segmento é?' },
]

// ─── Flow Node ────────────────────────────────────────────────────────────────
const FlowNode = ({ step, index, selected, leadsCount, onClick, onDelete }) => {
  const t = typeMap[step.step_type] || { label: step.step_type, icon: '?', color: '#9a9ab0' }
  const isIf = step.step_type === 'condition'
  const condLabel = CONDITIONS.find(c => c.id === step.config?.condition)?.label || ''

  if (isIf) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
      {index > 0 && <div style={{ width:2, height:24, background:'#e0e0ea' }} />}
      <div onClick={onClick} style={{ position:'relative', width:220, height:90, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
        <div style={{ width:140, height:60, background:selected?'#eff6ff':'#ffffff', border:`2px solid ${selected?'#0ea5e9':'#bfdbfe'}`, transform:'rotate(45deg)', borderRadius:8, boxShadow:selected?'0 4px 20px #0ea5e920':'0 2px 8px rgba(0,0,0,0.06)', transition:'all 0.15s' }} />
        <div style={{ position:'absolute', textAlign:'center', pointerEvents:'none' }}>
          <div style={{ fontSize:16 }}>⬡</div>
          <div style={{ fontSize:11, fontWeight:700, color:'#0ea5e9' }}>SE / IF</div>
        </div>
        {leadsCount > 0 && <div style={{ position:'absolute', top:-8, right:-8, background:'#0ea5e9', color:'#fff', borderRadius:12, padding:'1px 7px', fontSize:10, fontWeight:700 }}>{leadsCount}</div>}
        <button onClick={e=>{e.stopPropagation();onDelete()}} style={{ position:'absolute', top:2, right:2, background:'none', border:'none', color:'#e0e0ea', fontSize:14, cursor:'pointer' }}
          onMouseEnter={e=>e.currentTarget.style.color='#dc2626'} onMouseLeave={e=>e.currentTarget.style.color='#e0e0ea'}>✕</button>
        <div style={{ position:'absolute', top:0, left:0, background:'#0ea5e9', color:'#fff', borderRadius:20, padding:'1px 8px', fontSize:10, fontWeight:700 }}>{index+1}</div>
      </div>
      {condLabel && <div style={{ fontSize:11, color:'#0ea5e9', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:6, padding:'2px 10px', margin:'4px 0' }}>{condLabel}</div>}
      <div style={{ display:'flex', gap:80 }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#059669', background:'#f0faf4', border:'1px solid #b8e8c8', borderRadius:6, padding:'2px 10px', marginBottom:4 }}>✓ SIM</div>
          <div style={{ width:2, height:20, background:'#b8e8c8' }} />
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#059669' }} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#dc2626', background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:6, padding:'2px 10px', marginBottom:4 }}>✕ NÃO</div>
          <div style={{ width:2, height:20, background:'#ffd0d0' }} />
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#dc2626' }} />
        </div>
      </div>
      <div style={{ display:'flex', gap:80 }}><div style={{ width:2, height:20, background:'#e0e0ea' }} /><div style={{ width:2, height:20, background:'#e0e0ea' }} /></div>
      <div style={{ width:80, height:2, background:'#e0e0ea' }} />
      <div style={{ width:2, height:12, background:'#e0e0ea' }} />
      <div style={{ fontSize:10, color:'#9a9ab0', marginBottom:4 }}>Continua o fluxo</div>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
      {index > 0 && <div style={{ width:2, height:24, background:'#e0e0ea' }} />}
      <div onClick={onClick} style={{ width:280, background:selected?`${t.color}08`:'#ffffff', border:`2px solid ${selected?t.color:'#e8e8f0'}`, borderRadius:12, padding:'12px 16px', cursor:'pointer', boxShadow:selected?`0 4px 20px ${t.color}20`:'0 2px 8px rgba(0,0,0,0.05)', transition:'all 0.15s', position:'relative', display:'flex', alignItems:'center', gap:12 }}
        onMouseEnter={e=>{if(!selected)e.currentTarget.style.borderColor=t.color+'60'}}
        onMouseLeave={e=>{if(!selected)e.currentTarget.style.borderColor='#e8e8f0'}}>
        <div style={{ position:'absolute', top:-10, left:12, background:t.color, color:'#fff', borderRadius:20, padding:'1px 8px', fontSize:10, fontWeight:700 }}>{index+1}</div>
        {/* Lead count badge */}
        {leadsCount > 0 && <div style={{ position:'absolute', top:-10, right:12, background:'#1a1a2e', color:'#fff', borderRadius:20, padding:'1px 8px', fontSize:10, fontWeight:700 }}>👤 {leadsCount}</div>}
        <div style={{ width:40, height:40, borderRadius:10, background:`${t.color}15`, border:`1px solid ${t.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{t.icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#1a1a2e', marginBottom:2 }}>{t.label}</div>
          <div style={{ fontSize:11, color:'#9a9ab0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {step.config?.message?`"${step.config.message.substring(0,38)}..."`:step.config?.wait_days?`${step.config.wait_days} dias`:step.config?.note?`"${step.config.note.substring(0,38)}..."`:t.desc}
          </div>
        </div>
        <button onClick={e=>{e.stopPropagation();onDelete()}} style={{ background:'none', border:'none', color:'#e0e0ea', fontSize:16, cursor:'pointer', padding:4, flexShrink:0 }}
          onMouseEnter={e=>e.currentTarget.style.color='#dc2626'} onMouseLeave={e=>e.currentTarget.style.color='#e0e0ea'}>✕</button>
      </div>
    </div>
  )
}

// ─── Step Config ──────────────────────────────────────────────────────────────
const StepConfig = ({ step, onUpdate, agents }) => {
  const t = typeMap[step.step_type] || {}
  const cfg = step.config || {}
  const upd = (k, v) => onUpdate({ ...step, config: { ...cfg, [k]: v } })
  const inp = { width:'100%', background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:'9px 12px', color:'#1a1a2e', fontSize:13, marginBottom:12, fontFamily:'Georgia, serif' }
  const lbl = (tx) => <div style={{ fontSize:11, color:'#9a9ab0', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{tx}</div>
  const vars = ['{nome}','{empresa}','{cargo}','{cidade}','{segmento}']

  return (
    <div style={{ padding:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, paddingBottom:16, borderBottom:'1px solid #f0f0f5' }}>
        <div style={{ width:38, height:38, borderRadius:9, background:`${t.color}15`, border:`1px solid ${t.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{t.icon}</div>
        <div><div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e' }}>{t.label}</div><div style={{ fontSize:11, color:'#9a9ab0' }}>{t.desc}</div></div>
      </div>

      {step.step_type === 'condition' && (<>
        {lbl('Condição')}
        <select value={cfg.condition||''} onChange={e=>upd('condition',e.target.value)} style={inp}>
          <option value="">Selecione...</option>
          {CONDITIONS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        {cfg.condition==='icp_score_gte' && (<>
          {lbl('ICP Score mínimo')}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
            <input type="range" min={0} max={100} step={5} value={cfg.threshold||75} onChange={e=>upd('threshold',parseInt(e.target.value))} style={{ flex:1, accentColor:'#0ea5e9' }} />
            <span style={{ fontSize:22, fontWeight:900, color:'#0ea5e9', fontFamily:'monospace', minWidth:40 }}>{cfg.threshold||75}</span>
          </div>
        </>)}
        {cfg.condition==='segment_is' && (<>
          {lbl('Segmento')}
          <select value={cfg.segment||''} onChange={e=>upd('segment',e.target.value)} style={inp}>
            <option value="">Selecione...</option>
            {[['insumos','Insumos'],['cooperativa','Cooperativa'],['revenda','Revenda'],['agencia_marketing','Agência'],['outro','Outro']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
        </>)}
        <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:10, padding:14, marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#0369a1', marginBottom:8 }}>Lógica</div>
          <div style={{ fontSize:11, color:'#6a6a7a', lineHeight:1.7 }}><strong style={{color:'#059669'}}>SIM</strong> → próximo passo<br/><strong style={{color:'#dc2626'}}>NÃO</strong> → ação abaixo</div>
        </div>
        {lbl('Se NÃO (falso)')}
        <select value={cfg.on_false||'stop'} onChange={e=>upd('on_false',e.target.value)} style={inp}>
          <option value="stop">Parar campanha para este lead</option>
          <option value="skip">Pular para o próximo lead</option>
          <option value="jump_to_end">Ir para o último passo</option>
        </select>
      </>)}

      {step.step_type === 'send_connection' && (<>
        {lbl('Nota (opcional, máx 300 chars)')}
        <textarea value={cfg.note||''} onChange={e=>upd('note',e.target.value)} maxLength={300} rows={4} placeholder="Ex: Olá {nome}, vi seu trabalho em {empresa}..." style={{ ...inp, resize:'vertical' }} />
        <div style={{ fontSize:11, color:'#c0c0d0', marginTop:-8, marginBottom:12 }}>{(cfg.note||'').length}/300</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
          {vars.slice(0,4).map(v=><button key={v} onClick={()=>upd('note',(cfg.note||'')+v)} style={{ background:'#f0f8f3', border:'1px solid #b8e8c8', borderRadius:6, color:'#1e6b3a', padding:'3px 10px', fontSize:12 }}>{v}</button>)}
        </div>
      </>)}

      {step.step_type === 'send_message' && (<>
        {lbl('Mensagem')}
        <textarea value={cfg.message||''} onChange={e=>upd('message',e.target.value)} rows={5} placeholder="Ex: Olá {nome}! Vi que você atua em {empresa}..." style={{ ...inp, resize:'vertical' }} />
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
          {vars.map(v=><button key={v} onClick={()=>upd('message',(cfg.message||'')+v)} style={{ background:'#f0f8f3', border:'1px solid #b8e8c8', borderRadius:6, color:'#1e6b3a', padding:'3px 10px', fontSize:12 }}>{v}</button>)}
        </div>
        {lbl('Só para conexões de 1º grau?')}
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          {[['Sim','true'],['Não (InMail)','false']].map(([l,v])=>(
            <button key={v} onClick={()=>upd('only_connections',v==='true')} style={{ flex:1, padding:'7px', borderRadius:8, border:`1px solid ${(cfg.only_connections?.toString()??'true')===v?'#1e6b3a':'#e0e0ea'}`, background:(cfg.only_connections?.toString()??'true')===v?'#f0f8f3':'#fff', color:(cfg.only_connections?.toString()??'true')===v?'#1e6b3a':'#6a6a7a', fontSize:12 }}>{l}</button>
          ))}
        </div>
      </>)}

      {step.step_type === 'wait_time' && (<>
        {lbl('Aguardar quantos dias?')}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <input type="range" min={1} max={30} value={cfg.wait_days||1} onChange={e=>upd('wait_days',parseInt(e.target.value))} style={{ flex:1, accentColor:'#1e6b3a' }} />
          <span style={{ fontSize:22, fontWeight:900, color:'#1e6b3a', fontFamily:'monospace', minWidth:36 }}>{cfg.wait_days||1}</span>
          <span style={{ fontSize:12, color:'#9a9ab0' }}>dias</span>
        </div>
        {lbl('Horário de envio')}
        <select value={cfg.send_hour||'9'} onChange={e=>upd('send_hour',e.target.value)} style={inp}>
          {Array.from({length:13},(_,i)=>i+8).map(h=><option key={h} value={h}>{String(h).padStart(2,'0')}:00 BRT</option>)}
        </select>
      </>)}

      {step.step_type === 'wait_connection' && (<>
        {lbl('Aguardar até quantos dias?')}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <input type="range" min={1} max={30} value={cfg.wait_days||7} onChange={e=>upd('wait_days',parseInt(e.target.value))} style={{ flex:1, accentColor:'#f59e0b' }} />
          <span style={{ fontSize:22, fontWeight:900, color:'#f59e0b', fontFamily:'monospace', minWidth:36 }}>{cfg.wait_days||7}</span>
          <span style={{ fontSize:12, color:'#9a9ab0' }}>dias</span>
        </div>
        {lbl('Se não aceitar, o que fazer?')}
        <select value={cfg.on_timeout||'skip'} onChange={e=>upd('on_timeout',e.target.value)} style={inp}>
          <option value="skip">Pular para próximo lead</option>
          <option value="continue">Continuar mesmo assim</option>
          <option value="stop">Parar para este lead</option>
        </select>
      </>)}

      {step.step_type === 'wait_reply' && (<>
        {lbl('Aguardar até quantos dias?')}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <input type="range" min={1} max={30} value={cfg.wait_days||3} onChange={e=>upd('wait_days',parseInt(e.target.value))} style={{ flex:1, accentColor:'#7c3aed' }} />
          <span style={{ fontSize:22, fontWeight:900, color:'#7c3aed', fontFamily:'monospace', minWidth:36 }}>{cfg.wait_days||3}</span>
          <span style={{ fontSize:12, color:'#9a9ab0' }}>dias</span>
        </div>
        {lbl('Se responder')}
        <select value={cfg.on_reply||'connect_agent'} onChange={e=>upd('on_reply',e.target.value)} style={inp}>
          <option value="connect_agent">Conectar agente de IA</option>
          <option value="notify">Notificar e pausar</option>
          <option value="continue">Continuar o fluxo</option>
        </select>
        {lbl('Se NÃO responder')}
        <select value={cfg.on_timeout||'continue'} onChange={e=>upd('on_timeout',e.target.value)} style={inp}>
          <option value="continue">Continuar o fluxo</option>
          <option value="stop">Parar campanha</option>
          <option value="skip">Pular lead</option>
        </select>
      </>)}

      {step.step_type === 'comment_post' && (<>
        {lbl('Gerar com IA?')}
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          {[['Sim, gerar automaticamente','true'],['Não, usar texto fixo','false']].map(([l,v])=>(
            <button key={v} onClick={()=>upd('ai_generate',v==='true')} style={{ flex:1, padding:'7px', borderRadius:8, border:`1px solid ${(cfg.ai_generate?.toString()??'true')===v?'#1e6b3a':'#e0e0ea'}`, background:(cfg.ai_generate?.toString()??'true')===v?'#f0f8f3':'#fff', color:(cfg.ai_generate?.toString()??'true')===v?'#1e6b3a':'#6a6a7a', fontSize:12 }}>{l}</button>
          ))}
        </div>
        {(cfg.ai_generate?.toString()??'true')==='false' && (<>
          {lbl('Texto fixo')}
          <textarea value={cfg.comment||''} onChange={e=>upd('comment',e.target.value)} rows={3} style={{ ...inp, resize:'vertical' }} />
        </>)}
      </>)}

      {step.step_type === 'connect_agent' && (<>
        {lbl('Agente')}
        <select value={cfg.agent_id||''} onChange={e=>upd('agent_id',e.target.value)} style={inp}>
          <option value="">Selecione um agente...</option>
          {(agents||[]).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {lbl('Ativar quando?')}
        <select value={cfg.trigger||'immediately'} onChange={e=>upd('trigger',e.target.value)} style={inp}>
          <option value="immediately">Imediatamente</option>
          <option value="on_reply">Quando o lead responder</option>
          <option value="on_connection">Quando aceitar conexão</option>
        </select>
      </>)}

      {['check_connection','visit_profile','like_post'].includes(step.step_type) && (
        <div style={{ background:'#f8f8fc', borderRadius:10, padding:14, fontSize:13, color:'#6a6a7a', lineHeight:1.7 }}>
          <strong style={{ color:'#1a1a2e' }}>Ação automática</strong><br/>Executada via Unipile. Sem configuração necessária.
        </div>
      )}
    </div>
  )
}

const AddBtn = ({ onClick }) => (
  <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
    <div style={{ width:2, height:16, background:'#e0e0ea' }} />
    <button onClick={onClick} style={{ width:26, height:26, borderRadius:'50%', background:'#f8f8fc', border:'1px dashed #c0c0d0', color:'#c0c0d0', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1, transition:'all 0.15s' }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor='#1e6b3a';e.currentTarget.style.color='#1e6b3a';e.currentTarget.style.background='#f0faf4'}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor='#c0c0d0';e.currentTarget.style.color='#c0c0d0';e.currentTarget.style.background='#f8f8fc'}}>+</button>
    <div style={{ width:2, height:16, background:'#e0e0ea' }} />
  </div>
)

// ─── Campaign Settings Modal ──────────────────────────────────────────────────
const SettingsModal = ({ campaign, lists, accounts, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: campaign.name || '',
    objective: campaign.objective || '',
    context: campaign.context || '',
    lead_list_id: campaign.lead_list_id || '',
    linkedin_account_id: campaign.linkedin_account_id || '',
    daily_limit: campaign.daily_limit || 20,
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await sb(`campaigns?id=eq.${campaign.id}`, { method:'PATCH', body: JSON.stringify(form) })
      onSave({ ...campaign, ...form })
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const inp = { width:'100%', background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:'9px 12px', color:'#1a1a2e', fontSize:13, marginBottom:12, fontFamily:'Georgia, serif' }
  const lbl = (t) => <div style={{ fontSize:11, color:'#9a9ab0', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6, fontWeight:600 }}>{t}</div>

  const selList = lists.find(l => l.id === form.lead_list_id)

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
      <div style={{ background:'#fff', borderRadius:16, width:480, maxHeight:'85vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 16px 56px rgba(0,0,0,0.18)' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #e8e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h2 style={{ fontSize:16, color:'#1a1a2e', fontWeight:700 }}>Configurações da Campanha</h2>
            <div style={{ fontSize:11, color:'#9a9ab0', marginTop:2 }}>{campaign.name}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#c0c0d0', fontSize:20, cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ overflowY:'auto', padding:24, flex:1 }}>
          {lbl('Nome da campanha')}
          <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} style={inp} />

          {lbl('Lista de leads alvo')}
          <select value={form.lead_list_id} onChange={e=>setForm(p=>({...p,lead_list_id:e.target.value}))} style={inp}>
            <option value="">Selecione uma lista...</option>
            {lists.map(l=><option key={l.id} value={l.id}>{l.name} ({l.total_leads||0} leads)</option>)}
          </select>
          {selList && (
            <div style={{ background:'#f0faf4', border:'1px solid #b8e8c8', borderRadius:8, padding:'8px 12px', marginTop:-8, marginBottom:12, fontSize:11, color:'#1e6b3a' }}>
              ✓ {selList.total_leads||0} leads disponíveis · {selList.analyzed_leads||0} analisados com IA
            </div>
          )}

          {lbl('Conta LinkedIn')}
          <select value={form.linkedin_account_id} onChange={e=>setForm(p=>({...p,linkedin_account_id:e.target.value}))} style={inp}>
            <option value="">Selecione uma conta...</option>
            {accounts.map(a=><option key={a.id} value={a.id}>{a.linkedin_name||a.unipile_account_id}</option>)}
          </select>

          {lbl('Limite diário de ações')}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
            <input type="range" min={1} max={100} value={form.daily_limit} onChange={e=>setForm(p=>({...p,daily_limit:parseInt(e.target.value)}))} style={{ flex:1, accentColor:'#1e6b3a' }} />
            <span style={{ fontSize:22, fontWeight:900, color:'#1e6b3a', fontFamily:'monospace', minWidth:40, textAlign:'center' }}>{form.daily_limit}</span>
            <span style={{ fontSize:12, color:'#9a9ab0' }}>por dia</span>
          </div>
          <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:8, padding:'8px 12px', marginBottom:16, fontSize:11, color:'#92400e' }}>
            ⚠️ LinkedIn limita ~80-100 ações/dia. Recomendamos máx. 30-40 para segurança da conta.
          </div>

          {lbl('Objetivo (opcional)')}
          <textarea value={form.objective} onChange={e=>setForm(p=>({...p,objective:e.target.value}))} rows={2} placeholder="Ex: Marcar reuniões com diretores de marketing de insumos" style={{ ...inp, resize:'vertical' }} />

          {lbl('Contexto adicional para IA (opcional)')}
          <textarea value={form.context} onChange={e=>setForm(p=>({...p,context:e.target.value}))} rows={3} placeholder="Ex: Estamos lançando um novo serviço de agromarketing digital..." style={{ ...inp, resize:'vertical' }} />
        </div>
        <div style={{ padding:'16px 24px', borderTop:'1px solid #e8e8f0', display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, background:'#fff', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:11, fontSize:13 }}>Cancelar</button>
          <button onClick={save} disabled={saving} style={{ flex:2, background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:'#fff', padding:11, fontSize:13, fontWeight:700 }}>
            {saving ? 'Salvando...' : '💾 Salvar configurações'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Campanhas() {
  const [campaigns, setCampaigns] = useState([])
  const [sel, setSel] = useState(null)
  const [steps, setSteps] = useState([])
  const [executions, setExecutions] = useState([])
  const [selStep, setSelStep] = useState(null)
  const [selIdx, setSelIdx] = useState(null)
  const [agents, setAgents] = useState([])
  const [lists, setLists] = useState([])
  const [accounts, setAccounts] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [insertIdx, setInsertIdx] = useState(null)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('flow') // flow | progress

  useEffect(() => { load() }, [])

  const load = async () => {
    const pid = getProfileId()
    if (!pid) return
    try {
      const [c, a, l, ac] = await Promise.all([
        sb(`campaigns?profile_id=eq.${pid}&order=created_at.desc`),
        sb(`agents?profile_id=eq.${pid}`),
        sb(`lead_lists?profile_id=eq.${pid}&order=created_at.desc`),
        sb(`linkedin_accounts?profile_id=eq.${pid}&status=eq.active`),
      ])
      setCampaigns(c||[]); setAgents(a||[]); setLists(l||[]); setAccounts(ac||[])
      if (c?.length) await loadCampaign(c[0])
    } catch (e) { console.error('load', e) }
  }

  const loadCampaign = async (c) => {
    setSel(c); setSelStep(null); setSelIdx(null); setTab('flow')
    try {
      const [s, ex] = await Promise.all([
        sb(`campaign_steps?campaign_id=eq.${c.id}&order=step_order.asc`),
        sb(`campaign_executions?campaign_id=eq.${c.id}&select=id,status,current_step_id`)
      ])
      setSteps(s||[]); setExecutions(ex||[])
    } catch { setSteps([]); setExecutions([]) }
  }

  // Count leads per step
  const leadsPerStep = steps.reduce((acc, step) => {
    acc[step.id] = executions.filter(e => e.current_step_id === step.id).length
    return acc
  }, {})

  // Execution summary
  const execSummary = {
    total: executions.length,
    pending: executions.filter(e => e.status === 'pending').length,
    waiting: executions.filter(e => e.status === 'waiting').length,
    completed: executions.filter(e => e.status === 'completed').length,
    error: executions.filter(e => e.status === 'error').length,
  }

  const createCampaign = async () => {
    const pid = getProfileId()
    if (!pid || !newName.trim()) return
    try {
      const data = await sb('campaigns', { method:'POST', body: JSON.stringify({ profile_id:pid, name:newName, status:'draft', total_steps:0, daily_limit:20 }) })
      const nc = Array.isArray(data) ? data[0] : data
      setCampaigns(p=>[nc,...p]); await loadCampaign(nc)
    } catch (e) { console.error(e) }
    setShowNew(false); setNewName('')
  }

  const addStep = async (typeId, atIdx) => {
    if (!sel) return
    const idx = atIdx ?? steps.length
    const newStep = { campaign_id:sel.id, step_order:idx+1, step_type:typeId, config:{} }
    try {
      const data = await sb('campaign_steps', { method:'POST', body:JSON.stringify(newStep) })
      const created = Array.isArray(data) ? data[0] : data
      const list = [...steps.slice(0,idx), created, ...steps.slice(idx)].map((s,i)=>({...s,step_order:i+1}))
      setSteps(list); setSelStep(created); setSelIdx(idx)
      await sb(`campaigns?id=eq.${sel.id}`, { method:'PATCH', body:JSON.stringify({total_steps:list.length}) })
    } catch (e) { console.error(e) }
    setShowPalette(false)
  }

  const deleteStep = async (idx) => {
    const step = steps[idx]
    try {
      await sb(`campaign_steps?id=eq.${step.id}`, { method:'DELETE' })
      const list = steps.filter((_,i)=>i!==idx)
      setSteps(list)
      if (selIdx===idx) { setSelStep(null); setSelIdx(null) }
    } catch (e) { console.error(e) }
  }

  const updateStep = async (updated) => {
    setSteps(p=>p.map(s=>s.id===updated.id?updated:s))
    setSelStep(updated)
    try { await sb(`campaign_steps?id=eq.${updated.id}`, { method:'PATCH', body:JSON.stringify({config:updated.config}) }) } catch {}
  }

  const saveFlow = async () => {
    setSaving(true)
    try {
      for (let i=0; i<steps.length; i++) await sb(`campaign_steps?id=eq.${steps[i].id}`, { method:'PATCH', body:JSON.stringify({step_order:i+1,config:steps[i].config}) })
      await sb(`campaigns?id=eq.${sel.id}`, { method:'PATCH', body:JSON.stringify({total_steps:steps.length}) })
      setSaved(true); setTimeout(()=>setSaved(false),2000)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const toggleStatus = async (status) => {
    try {
      await sb(`campaigns?id=eq.${sel.id}`, { method:'PATCH', body:JSON.stringify({status}) })
      setSel(p=>({...p,status})); setCampaigns(p=>p.map(c=>c.id===sel.id?{...c,status}:c))
    } catch {}
  }

  const deleteCampaign = async () => {
    if (!confirm(`Excluir "${sel.name}"?`)) return
    try {
      await sb(`campaign_steps?campaign_id=eq.${sel.id}`, { method:'DELETE' })
      await sb(`campaigns?id=eq.${sel.id}`, { method:'DELETE' })
      const rest = campaigns.filter(c=>c.id!==sel.id)
      setCampaigns(rest); setSel(null); setSteps([]); setExecutions([])
    } catch {}
  }

  const handleSettingsSave = (updated) => {
    setSel(updated); setCampaigns(p=>p.map(c=>c.id===updated.id?updated:c)); setShowSettings(false)
  }

  const statusC = { active:'#059669', paused:'#d97706', draft:'#9a9ab0', completed:'#3b82f6' }
  const statusL = { active:'Ativa', paused:'Pausada', draft:'Rascunho', completed:'Concluída' }
  const selListName = sel?.lead_list_id ? lists.find(l=>l.id===sel.lead_list_id)?.name : null

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', background:'#ffffff', fontFamily:'Georgia, serif' }}>

      {/* Campaign list */}
      <div style={{ width:240, background:'#f8f8fc', borderRight:'1px solid #e8e8f0', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'16px 16px 12px', borderBottom:'1px solid #e8e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:11, color:'#9a9ab0', letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:600 }}>Campanhas</span>
          <button onClick={()=>setShowNew(true)} style={{ background:'#1e6b3a', border:'none', borderRadius:6, color:'#fff', padding:'4px 10px', fontSize:12, fontWeight:600 }}>+ Nova</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:8 }}>
          {campaigns.length===0 && <div style={{ padding:16, textAlign:'center', color:'#c0c0d0', fontSize:12 }}>Nenhuma campanha</div>}
          {campaigns.map(c=>(
            <div key={c.id} onClick={()=>loadCampaign(c)} style={{ padding:'10px 12px', borderRadius:8, marginBottom:4, cursor:'pointer', background:sel?.id===c.id?'#ffffff':'transparent', border:`1px solid ${sel?.id===c.id?'#e0e0ea':'transparent'}`, boxShadow:sel?.id===c.id?'0 1px 3px rgba(0,0,0,0.06)':'none' }}>
              <div style={{ fontSize:13, fontWeight:sel?.id===c.id?600:400, color:sel?.id===c.id?'#1a1a2e':'#6a6a7a', marginBottom:5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:10, color:statusC[c.status]||'#9a9ab0', background:`${statusC[c.status]||'#9a9ab0'}15`, padding:'2px 7px', borderRadius:8, fontWeight:600 }}>{statusL[c.status]||c.status}</span>
                <span style={{ fontSize:10, color:'#c0c0d0' }}>{c.total_steps||0} passos</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main area */}
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
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ fontSize:16, fontWeight:700, color:'#1a1a2e' }}>{sel.name}</div>
                {selListName && <span style={{ fontSize:11, color:'#1e6b3a', background:'#f0faf4', border:'1px solid #b8e8c8', borderRadius:6, padding:'2px 8px' }}>📋 {selListName}</span>}
              </div>
              <div style={{ fontSize:11, color:'#9a9ab0', marginTop:2 }}>{steps.length} passos · {execSummary.total} leads no fluxo</div>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', background:'#f0f0f5', borderRadius:8, padding:3, gap:2 }}>
              {[['flow','Fluxo'],['progress','Progresso']].map(([id,l])=>(
                <button key={id} onClick={()=>setTab(id)} style={{ padding:'5px 14px', borderRadius:6, border:'none', background:tab===id?'#fff':'transparent', color:tab===id?'#1a1a2e':'#9a9ab0', fontSize:12, fontWeight:tab===id?600:400, boxShadow:tab===id?'0 1px 3px rgba(0,0,0,0.08)':'none' }}>{l}</button>
              ))}
            </div>

            <button onClick={()=>setShowSettings(true)} style={{ background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:'7px 12px', fontSize:12, display:'flex', alignItems:'center', gap:6 }}>⚙️ Config</button>

            {sel.status!=='active'
              ? <button onClick={()=>toggleStatus('active')} disabled={steps.length===0||!sel.lead_list_id} title={!sel.lead_list_id?'Configure uma lista antes de ativar':''} style={{ background:sel.lead_list_id&&steps.length>0?'#f0faf4':'#f5f5fa', border:`1px solid ${sel.lead_list_id&&steps.length>0?'#b8e8c8':'#e0e0ea'}`, borderRadius:8, color:sel.lead_list_id&&steps.length>0?'#1e6b3a':'#c0c0d0', padding:'6px 14px', fontSize:12, fontWeight:600 }}>▶ Ativar</button>
              : <button onClick={()=>toggleStatus('paused')} style={{ background:'#fff8f0', border:'1px solid #fcd8a0', borderRadius:8, color:'#d97706', padding:'6px 14px', fontSize:12, fontWeight:600 }}>⏸ Pausar</button>}

            <button onClick={saveFlow} disabled={saving} style={{ background:saving?'#e0e0ea':'#1e6b3a', border:'none', borderRadius:8, color:saving?'#9a9ab0':'#fff', padding:'7px 18px', fontSize:13, fontWeight:600 }}>
              {saved?'✓ Salvo!':saving?'Salvando...':'💾 Salvar'}
            </button>
            <button onClick={deleteCampaign} style={{ background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:8, color:'#dc2626', padding:'7px 12px', fontSize:12 }}>✕</button>
          </div>

          {tab === 'flow' ? (
            /* Flow canvas */
            <div style={{ flex:1, overflowY:'auto', padding:'32px 40px', display:'flex', justifyContent:'center' }}>
              <div style={{ width:340, display:'flex', flexDirection:'column', alignItems:'center' }}>
                {/* Alert if no list */}
                {!sel.lead_list_id && (
                  <div style={{ width:280, background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#92400e', display:'flex', gap:8, alignItems:'center' }}>
                    <span>⚠️</span>
                    <div>Nenhuma lista selecionada. <button onClick={()=>setShowSettings(true)} style={{ background:'none', border:'none', color:'#1e6b3a', cursor:'pointer', fontWeight:700, fontSize:12, padding:0 }}>Configurar agora →</button></div>
                  </div>
                )}

                <div style={{ background:'#f0faf4', border:'2px solid #b8e8c8', borderRadius:12, padding:'8px 24px', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'#1e6b3a' }} />
                  <span style={{ fontSize:12, color:'#1e6b3a', fontWeight:600 }}>INÍCIO DA CAMPANHA</span>
                </div>

                {steps.length>0 && <div style={{ width:2, height:20, background:'#b8e8c8' }} />}

                {steps.map((step,i)=>(
                  <div key={step.id} style={{ width:'100%', display:'flex', flexDirection:'column', alignItems:'center' }}>
                    <FlowNode step={step} index={i} selected={selIdx===i} leadsCount={leadsPerStep[step.id]||0} onClick={()=>{setSelStep(step);setSelIdx(i)}} onDelete={()=>deleteStep(i)} />
                    <AddBtn onClick={()=>{setInsertIdx(i+1);setShowPalette(true)}} />
                  </div>
                ))}

                <button onClick={()=>{setInsertIdx(steps.length);setShowPalette(true)}} style={{ width:280, padding:'12px', borderRadius:12, border:'2px dashed #c8c8d8', background:'#f8f8fc', color:'#9a9ab0', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all 0.15s' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='#1e6b3a';e.currentTarget.style.color='#1e6b3a';e.currentTarget.style.background='#f0faf4'}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='#c8c8d8';e.currentTarget.style.color='#9a9ab0';e.currentTarget.style.background='#f8f8fc'}}>
                  <span style={{ fontSize:18 }}>+</span>{steps.length===0?'Adicionar primeiro passo':'Adicionar ao final'}
                </button>

                {steps.length>0 && (<>
                  <div style={{ width:2, height:24, background:'#e0e0ea' }} />
                  <div style={{ background:'#f5f5fa', border:'2px solid #e0e0ea', borderRadius:12, padding:'8px 24px', display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:'#9a9ab0' }} />
                    <span style={{ fontSize:12, color:'#9a9ab0', fontWeight:600 }}>FIM DO FLUXO</span>
                  </div>
                </>)}
              </div>
            </div>
          ) : (
            /* Progress tab */
            <div style={{ flex:1, overflowY:'auto', padding:'24px 32px' }}>
              {/* Summary cards */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:28 }}>
                {[['Total no fluxo',execSummary.total,'#1a1a2e'],['Aguardando ação',execSummary.waiting,'#f59e0b'],['Concluídos',execSummary.completed,'#059669'],['Com erro',execSummary.error,'#dc2626']].map(([l,v,c])=>(
                  <div key={l} style={{ background:'#ffffff', border:'1px solid #e8e8f0', borderRadius:12, padding:16, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize:11, color:'#9a9ab0', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>{l}</div>
                    <div style={{ fontSize:28, fontWeight:900, color:c, fontFamily:'monospace' }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Leads per step */}
              <div style={{ background:'#ffffff', border:'1px solid #e8e8f0', borderRadius:12, padding:24, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e', marginBottom:20 }}>Leads por etapa do fluxo</div>

                {steps.length === 0 ? (
                  <div style={{ textAlign:'center', color:'#c0c0d0', padding:24, fontSize:13 }}>Nenhum passo configurado ainda</div>
                ) : steps.map((step, i) => {
                  const t = typeMap[step.step_type] || { label:step.step_type, icon:'?', color:'#9a9ab0' }
                  const count = leadsPerStep[step.id] || 0
                  const pct = execSummary.total > 0 ? Math.round((count / execSummary.total) * 100) : 0
                  return (
                    <div key={step.id} style={{ marginBottom:14, display:'flex', alignItems:'center', gap:14 }}>
                      {/* Step indicator */}
                      <div style={{ width:36, height:36, borderRadius:9, background:`${t.color}15`, border:`1px solid ${t.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{t.icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                          <div>
                            <span style={{ fontSize:12, fontWeight:600, color:'#1a1a2e' }}>Passo {i+1} — {t.label}</span>
                            {step.config?.wait_days && <span style={{ fontSize:11, color:'#9a9ab0', marginLeft:8 }}>{step.config.wait_days} dias</span>}
                          </div>
                          <span style={{ fontSize:14, fontWeight:900, color:count>0?t.color:'#c0c0d0', fontFamily:'monospace' }}>{count}</span>
                        </div>
                        <div style={{ height:8, background:'#f0f0f5', borderRadius:4 }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:t.color, borderRadius:4, transition:'width 0.6s ease', opacity:0.8 }} />
                        </div>
                      </div>
                      <div style={{ fontSize:11, color:'#9a9ab0', minWidth:36, textAlign:'right' }}>{pct}%</div>
                    </div>
                  )
                })}

                {execSummary.total === 0 && steps.length > 0 && (
                  <div style={{ background:'#f8f8fc', borderRadius:10, padding:14, fontSize:12, color:'#9a9ab0', textAlign:'center', marginTop:8 }}>
                    Nenhum lead no fluxo ainda. Ative a campanha para começar.
                  </div>
                )}
              </div>
            </div>
          )}
        </>)}
      </div>

      {/* Step config panel */}
      <div style={{ width:320, background:'#f8f8fc', borderLeft:'1px solid #e8e8f0', display:'flex', flexDirection:'column' }}>
        {selStep && tab==='flow' ? (<>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid #e8e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:11, color:'#9a9ab0', textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:600 }}>Passo {selIdx+1}</span>
            <button onClick={()=>{setSelStep(null);setSelIdx(null)}} style={{ background:'none', border:'none', color:'#c0c0d0', fontSize:18, cursor:'pointer' }}>✕</button>
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            <StepConfig step={selStep} onUpdate={updateStep} agents={agents} />
          </div>
        </>) : (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, color:'#c0c0d0', padding:24 }}>
            <div style={{ fontSize:32 }}>{tab==='progress'?'📊':'⚙️'}</div>
            <div style={{ fontSize:13, textAlign:'center', lineHeight:1.6 }}>{tab==='progress'?'Acompanhe o progresso na aba ao lado':'Clique em um passo para configurar'}</div>
          </div>
        )}
      </div>

      {/* Palette */}
      {showPalette && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }} onClick={()=>setShowPalette(false)}>
          <div style={{ background:'#fff', borderRadius:16, padding:28, width:540, boxShadow:'0 12px 48px rgba(0,0,0,0.15)', maxHeight:'80vh', display:'flex', flexDirection:'column' }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:16, color:'#1a1a2e', fontWeight:700 }}>Adicionar passo</h2>
              <button onClick={()=>setShowPalette(false)} style={{ background:'none', border:'none', color:'#9a9ab0', fontSize:20, cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ overflowY:'auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {STEP_TYPES.map(type=>(
                <button key={type.id} onClick={()=>addStep(type.id,insertIdx)} style={{ background:'#f8f8fc', border:`1px solid ${type.id==='condition'?'#bae6fd':'#e8e8f0'}`, borderRadius:12, padding:'14px', textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center', gap:12, transition:'all 0.15s', position:'relative' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=type.color;e.currentTarget.style.background=`${type.color}08`}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=type.id==='condition'?'#bae6fd':'#e8e8f0';e.currentTarget.style.background='#f8f8fc'}}>
                  {type.id==='condition' && <div style={{ position:'absolute', top:6, right:8, fontSize:9, color:'#0ea5e9', fontWeight:700, background:'#eff6ff', padding:'1px 6px', borderRadius:4 }}>IF</div>}
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
          <div style={{ background:'#fff', border:'1px solid #e8e8f0', borderRadius:14, padding:28, width:380, boxShadow:'0 8px 40px rgba(0,0,0,0.12)' }}>
            <h2 style={{ fontSize:16, color:'#1a1a2e', marginBottom:20, fontWeight:700 }}>Nova Campanha</h2>
            <div style={{ fontSize:11, color:'#9a9ab0', marginBottom:6, textTransform:'uppercase', fontWeight:600 }}>Nome</div>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Ex: Prospecção Insumos SP" autoFocus onKeyDown={e=>e.key==='Enter'&&createCampaign()}
              style={{ width:'100%', background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:12, color:'#1a1a2e', fontSize:14, marginBottom:20 }} />
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setShowNew(false)} style={{ flex:1, background:'#fff', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:10, fontSize:13 }}>Cancelar</button>
              <button onClick={createCampaign} style={{ flex:2, background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:'#fff', padding:10, fontSize:13, fontWeight:700 }}>Criar</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && sel && (
        <SettingsModal campaign={sel} lists={lists} accounts={accounts} onClose={()=>setShowSettings(false)} onSave={handleSettingsSave} />
      )}
    </div>
  )
}
