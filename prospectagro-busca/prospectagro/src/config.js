export const SB_URL = 'https://juabbkewrtbignqrufgp.supabase.co'
export const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1YWJia2V3cnRiaWducXJ1ZmdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4OTg3ODEsImV4cCI6MjA4OTQ3NDc4MX0.KIi4KsbA6J-voPSuMMiI1azR4ESM73fP75YPYU54-IY'
export const PROFILE_ID = '00000000-0000-0000-0000-000000000001'
export const N8N_LEAD = 'https://n8n-webhook.chasocial.com.br/webhook/enrich-lead'
export const N8N_COMPANY = 'https://n8n-webhook.chasocial.com.br/webhook/enrich-company'
export const N8N_SEARCH = 'https://n8n-webhook.chasocial.com.br/webhook/search-linkedin-leads'

export const sb = async (path, opts = {}) => {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
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
export const COLORS = ['#2d6a3f','#f59e0b','#3b82f6','#ec4899','#8b5cf6','#ef4444','#06b6d4','#84cc16']

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
  { id: 'dashboard',      icon: '◈', label: 'Dashboard' },
  { id: 'busca',          icon: '🔍', label: 'Buscar Leads' },
  { id: 'listas',         icon: '▤', label: 'Listas de Leads' },
  { id: 'leads',          icon: '◎', label: 'Leads' },
  { id: 'campanhas',      icon: '⟳', label: 'Campanhas' },
  { id: 'agentes',        icon: '◉', label: 'Agentes' },
  { id: 'conteudo',       icon: '✦', label: 'Conteúdo' },
  { id: 'comentarios',    icon: '◌', label: 'Comentários' },
]

export const MOCK_LEADS = [
  { id: 'l1', full_name: 'Ben Martin Balik', headline: 'CEO & Founder | CHA Agromkt', current_company: 'CHA Agromkt', location: 'Presidente Epitácio, SP', ai_icp_score: 95, ai_profile_summary: 'CEO e fundador da CHA Agromkt, especialista em agromarketing.', ai_pain_points: ['Escalabilidade', 'Diferenciação'], detected_segment: 'agencia_marketing', is_connection: false, rd_station_status: 'pending', linkedin_url: 'https://linkedin.com/in/benmartinbalik' },
  { id: 'l2', full_name: 'Carlos Eduardo Mendonça', headline: 'Diretor de Marketing | AgroNutri', current_company: 'AgroNutri Insumos', location: 'Ribeirão Preto, SP', ai_icp_score: 88, ai_profile_summary: 'Diretor de marketing com 12 anos no agronegócio.', ai_pain_points: ['CPL alto', 'Integração M+V'], detected_segment: 'insumos', is_connection: true, rd_station_status: 'sent', linkedin_url: '' },
  { id: 'l3', full_name: 'Ana Lucia Ferreira', headline: 'Gestora Comercial | Cooperativa Verde Campo', current_company: 'Cooperativa Verde Campo', location: 'Cascavel, PR', ai_icp_score: 72, ai_profile_summary: 'Gestora comercial em cooperativa agrícola.', ai_pain_points: ['Retenção de associados'], detected_segment: 'cooperativa', is_connection: false, rd_station_status: 'pending', linkedin_url: '' },
  { id: 'l4', full_name: 'Roberto Alves', headline: 'Gerente de Vendas | AgriSul', current_company: 'AgriSul Revenda', location: 'Sorriso, MT', ai_icp_score: 61, ai_profile_summary: 'Gerente comercial em revenda no MT.', ai_pain_points: ['Metas de vendas'], detected_segment: 'revenda', is_connection: false, rd_station_status: 'pending', linkedin_url: '' },
]

export const MOCK_LISTS = [
  { id: 'm1', name: 'Revendas SP Interior', total_leads: 47, analyzed_leads: 32, color: '#2d6a3f' },
  { id: 'm2', name: 'Cooperativas PR/SC', total_leads: 23, analyzed_leads: 18, color: '#f59e0b' },
  { id: 'm3', name: 'Gestores Insumos MT', total_leads: 61, analyzed_leads: 55, color: '#3b82f6' },
]
