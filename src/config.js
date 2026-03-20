export const SB_URL = 'https://juabbkewrtbignqrufgp.supabase.co'
export const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1YWJia2V3cnRiaWducXJ1ZmdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4OTg3ODEsImV4cCI6MjA4OTQ3NDc4MX0.KIi4KsbA6J-voPSuMMiI1azR4ESM73fP75YPYU54-IY'
export const N8N_LEAD = 'https://n8n-webhook.chasocial.com.br/webhook/enrich-lead'
export const N8N_COMPANY = 'https://n8n-webhook.chasocial.com.br/webhook/enrich-company'
export const N8N_SEARCH = 'https://n8n-webhook.chasocial.com.br/webhook/search-linkedin-leads'

// Auth state — gerenciado pelo App.jsx
let _session = null
export const setSession = (s) => { _session = s }
export const getSession = () => _session
export const getProfileId = () => _session?.user?.id || null
export const getAccessToken = () => _session?.access_token || SB_KEY

// API Supabase — usa token do usuário logado quando disponível
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
  if (!r.ok) throw new Error(r.status)
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
  { id: 'visit_profile',    label: 'Visitar Perfil',     icon: '👁',  color: '#3b82f6' },
  { id: 'check_connection', label: 'Verificar Conexão',  icon: '🔍', color: '#8b5cf6' },
  { id: 'send_connection',  label: 'Pedir Conexão',      icon: '🔗', color: '#10b981' },
  { id: 'wait',             label: 'Aguardar',           icon: '⏳', color: '#f59e0b' },
  { id: 'send_message',     label: 'Enviar Mensagem',    icon: '💬', color: '#ec4899' },
  { id: 'connect_agent',    label: 'Conectar Agente',    icon: '🤖', color: '#06b6d4' },
  { id: 'like_post',        label: 'Curtir Post',        icon: '❤️', color: '#ef4444' },
  { id: 'comment_post',     label: 'Comentar Post',      icon: '✍️', color: '#f97316' },
]

export const NAV = [
  { id: 'dashboard',   icon: '◈', label: 'Dashboard' },
  { id: 'busca',       icon: '🔍', label: 'Buscar Leads' },
  { id: 'listas',      icon: '▤', label: 'Listas de Leads' },
  { id: 'leads',       icon: '◎', label: 'Leads' },
  { id: 'campanhas',   icon: '⟳', label: 'Campanhas' },
  { id: 'agentes',     icon: '◉', label: 'Agentes' },
  { id: 'conteudo',    icon: '✦', label: 'Conteúdo' },
  { id: 'comentarios', icon: '◌', label: 'Comentários' },
]

export const MOCK_LEADS = [
  { id: 'l1', full_name: 'Ben Martin Balik', headline: 'CEO & Founder | CHA Agromkt', current_company: 'CHA Agromkt', location: 'Presidente Epitácio, SP', ai_icp_score: 95, ai_profile_summary: 'CEO e fundador da CHA Agromkt.', ai_pain_points: ['Escalabilidade', 'Diferenciação'], detected_segment: 'agencia_marketing', is_connection: false, rd_station_status: 'pending' },
  { id: 'l2', full_name: 'Carlos Eduardo Mendonça', headline: 'Diretor de Marketing | AgroNutri', current_company: 'AgroNutri Insumos', location: 'Ribeirão Preto, SP', ai_icp_score: 88, ai_pain_points: ['CPL alto'], detected_segment: 'insumos', is_connection: true, rd_station_status: 'sent' },
]

export const MOCK_LISTS = [
  { id: 'm1', name: 'Revendas SP Interior', total_leads: 47, analyzed_leads: 32, color: '#1e6b3a' },
  { id: 'm2', name: 'Cooperativas PR/SC', total_leads: 23, analyzed_leads: 18, color: '#f59e0b' },
]
