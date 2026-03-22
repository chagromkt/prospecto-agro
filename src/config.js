export const SB_URL = 'https://juabbkewrtbignqrufgp.supabase.co'
export const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1YWJia2V3cnRiaWducXJ1ZmdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4OTg3ODEsImV4cCI6MjA4OTQ3NDc4MX0.KIi4KsbA6J-voPSuMMiI1azR4ESM73fP75YPYU54-IY'
export const N8N_LEAD = 'https://n8n-webhook.chasocial.com.br/webhook/enrich-lead'
export const N8N_COMPANY = 'https://n8n-webhook.chasocial.com.br/webhook/enrich-company'
export const N8N_SEARCH = 'https://n8n-webhook.chasocial.com.br/webhook/search-linkedin-leads'
export const N8N_RD = 'https://n8n-webhook.chasocial.com.br/webhook/push-rd-station'
export const N8N_CONTENT = 'https://n8n-webhook.chasocial.com.br/webhook/generate-content'
export const N8N_ACTIVATE = 'https://n8n-webhook.chasocial.com.br/webhook/activate-campaign'

let _session = null

export const setSession = (s) => {
  _session = s
  if (s) localStorage.setItem('pa_session', JSON.stringify(s))
}

export const getSession = () => {
  if (_session) return _session
  try {
    const stored = localStorage.getItem('pa_session')
    if (stored) { _session = JSON.parse(stored); return _session }
  } catch {}
  return null
}

export const getProfileId = () => {
  const s = getSession()
  return s?.user?.id || null
}

export const getAccessToken = () => {
  const s = getSession()
  return s?.access_token || SB_KEY
}

export const sb = async (path, opts = {}) => {
  const token = getAccessToken()
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers || {}),
    },
    ...opts,
  })
  if (!r.ok) {
    const txt = await r.text().catch(() => r.status.toString())
    throw new Error(`${r.status}: ${txt}`)
  }
  return r.status === 204 ? null : r.json()
}

export const SEG = {
  insumos: { l: 'Insumos', c: '#f59e0b' },
  cooperativa: { l: 'Cooperativa', c: '#10b981' },
  revenda: { l: 'Revenda', c: '#3b82f6' },
  outro: { l: 'Outro', c: '#8b5cf6' },
  agencia_marketing: { l: 'Agência', c: '#ec4899' },
}

export const ICP = s => s >= 75 ? '#4ade80' : s >= 50 ? '#facc15' : '#f87171'
export const COLORS = ['#1e6b3a','#f59e0b','#3b82f6','#ec4899','#8b5cf6','#ef4444','#06b6d4','#84cc16']

export const STEP_TYPES = [
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
  { id: 'webhook_trigger',  label: 'Webhook RD Station',   icon: '🔌', color: '#059669', desc: 'Entra leads via webhook do RD Station' },
]

export const NAV = [
  { id: 'dashboard',     icon: '📊', label: 'Dashboard' },
  { id: 'busca',         icon: '🔍', label: 'Buscar Leads' },
  { id: 'listas',        icon: '📋', label: 'Listas de Leads' },
  { id: 'leads',         icon: '👥', label: 'Leads' },
  { id: 'campanhas',     icon: '🚀', label: 'Campanhas' },
  { id: 'agentes',       icon: '🤖', label: 'Agentes' },
  { id: 'conteudo',      icon: '✍️', label: 'Conteúdo' },
  { id: 'mensagens',     icon: '💬', label: 'Mensagens' },
  { id: 'comentarios',   icon: '💭', label: 'Comentários' },
  { id: 'cadencias',     icon: '🔗', label: 'Cadências RD' },
  { id: 'configuracoes', icon: '⚙️', label: 'Configurações' },
]

export const MOCK_LEADS = [
  { id: 'l1', full_name: 'Ben Martin Balik', headline: 'CEO & Founder | CHA Agromkt', current_company: 'CHA Agromkt', location: 'Presidente Epitácio, SP', ai_icp_score: 95, ai_pain_points: ['Escalabilidade'], detected_segment: 'agencia_marketing', is_connection: false, rd_station_status: 'pending' },
]

export const MOCK_LISTS = [
  { id: 'm1', name: 'Revendas SP Interior', total_leads: 47, analyzed_leads: 32, color: '#1e6b3a' },
]
