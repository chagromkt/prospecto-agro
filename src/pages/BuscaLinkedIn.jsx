import { useState, useEffect } from 'react'
import { sb, getProfileId, SB_URL } from '../config.js'

const EDGE_SEARCH = 'https://juabbkewrtbignqrufgp.supabase.co/functions/v1/search-leads'

// Setores agro relevantes com IDs do LinkedIn
const AGRO_INDUSTRIES = [
  { id: '1', label: 'Agricultura' },
  { id: '40', label: 'Biotecnologia' },
  { id: '96', label: 'Alimentos e Bebidas' },
  { id: '25', label: 'Maquinário Agrícola' },
  { id: '3231', label: 'Fabricação de Defensivos' },
  { id: '37', label: 'Pecuária' },
  { id: '55', label: 'Veterinária' },
  { id: '17', label: 'Química' },
  { id: '2', label: 'Cooperativas / Associações' },
  { id: '4', label: 'Tecnologia da Informação' },
  { id: '94', label: 'Consultoria' },
]

const SENIORITY_OPTIONS = [
  { id: 'OWNER', label: 'Dono / Sócio' },
  { id: 'CXO', label: 'C-Level (CEO, CFO, CMO...)' },
  { id: 'VP', label: 'Vice-Presidente' },
  { id: 'DIRECTOR', label: 'Diretor' },
  { id: 'MANAGER', label: 'Gerente' },
  { id: 'SENIOR', label: 'Sênior / Especialista' },
  { id: 'ENTRY', label: 'Analista / Coordenador' },
  { id: 'TRAINING', label: 'Trainee / Estágio' },
]

const HEADCOUNT_OPTIONS = [
  { id: 'A', label: '1 pessoa' },
  { id: 'B', label: '2–10' },
  { id: 'C', label: '11–50' },
  { id: 'D', label: '51–200' },
  { id: 'E', label: '201–500' },
  { id: 'F', label: '501–1.000' },
  { id: 'G', label: '1.001–5.000' },
  { id: 'H', label: '5.001–10.000' },
  { id: 'I', label: '10.000+' },
]

const NETWORK_OPTIONS = [
  { id: 1, label: '1º grau (conexões)' },
  { id: 2, label: '2º grau' },
  { id: 3, label: '3º grau' },
]

const LANGUAGE_OPTIONS = [
  { id: 'pt', label: '🇧🇷 Português' },
  { id: 'en', label: '🇺🇸 Inglês' },
  { id: 'es', label: '🇪🇸 Espanhol' },
]

const TEMPLATES = [
  { label: '🌾 Insumos Agrícolas', apply: { keywords: 'insumos agrícolas fertilizantes defensivos', title: 'Gerente Diretor', seniority: ['DIRECTOR','MANAGER'], industry: ['1','3231','17'] } },
  { label: '🤝 Cooperativas', apply: { keywords: 'cooperativa agrícola agropecuária', title: 'Presidente Diretor Gestor', seniority: ['OWNER','CXO','DIRECTOR'], industry: ['2','1'] } },
  { label: '🏪 Revendas', apply: { keywords: 'revenda agropecuária distribuidora', title: 'Gerente Comercial Vendas', seniority: ['MANAGER','SENIOR'], industry: ['1','96'] } },
  { label: '🚜 Maquinário', apply: { keywords: 'máquinas agrícolas implementos tratores colheitadeiras', title: 'Diretor Gerente', seniority: ['DIRECTOR','MANAGER'], industry: ['25','1'] } },
  { label: '🐄 Pecuária', apply: { keywords: 'pecuária bovinos gado nutrição animal', title: 'Gerente Produtor Diretor', seniority: ['OWNER','DIRECTOR','MANAGER'], industry: ['37','55'] } },
  { label: '💻 AgroTech', apply: { keywords: 'agrotech agtech agriculture technology precision', title: 'CEO Fundador Diretor', seniority: ['OWNER','CXO','DIRECTOR'], industry: ['4','1','40'] } },
]

const EMPTY_FORM = {
  mode: 'filters', // 'filters' | 'url'
  url: '',
  api: 'classic',
  keywords: '',
  title: '',
  first_name: '',
  last_name: '',
  company: '',
  location: 'Brasil',
  network_distance: [],
  seniority: [],
  industry: [],
  company_headcount: [],
  profile_language: ['pt'],
  tenure_min: '',
  has_email: false,
  open_profile: false,
  limit: 25,
  list_id: '',
  account_id: '',
  enrich_with_ai: true,
}

const inp = { background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:'9px 12px', color:'#1a1a2e', fontSize:13, width:'100%' }
const lbl = (t) => <div style={{ fontSize:11, color:'#9a9ab0', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5, fontWeight:600 }}>{t}</div>

function ToggleGroup({ options, value, onChange, multi = true }) {
  const toggle = (id) => {
    if (!multi) return onChange(value === id ? '' : id)
    if (value.includes(id)) onChange(value.filter(x => x !== id))
    else onChange([...value, id])
  }
  const isActive = (id) => multi ? value.includes(id) : value === id
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
      {options.map(o => (
        <button key={o.id} onClick={() => toggle(o.id)}
          style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${isActive(o.id)?'#1e6b3a':'#e0e0ea'}`, background:isActive(o.id)?'#1e6b3a':'#fff', color:isActive(o.id)?'#fff':'#6a6a7a', fontSize:12, cursor:'pointer', transition:'all 0.15s', fontWeight:isActive(o.id)?600:400 }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom:16 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', background:'none', border:'none', cursor:'pointer', padding:'6px 0', borderBottom:'1px solid #f0f0f5' }}>
        <span style={{ fontSize:11, color:'#6a6a7a', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>{title}</span>
        <span style={{ color:'#c0c0d0', fontSize:14 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ paddingTop:12 }}>{children}</div>}
    </div>
  )
}

export default function BuscaLinkedIn() {
  const [lists, setLists] = useState([])
  const [accounts, setAccounts] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [searching, setSearching] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [hasSettings, setHasSettings] = useState(null)

  useEffect(() => {
    Promise.all([
      sb(`lead_lists?profile_id=eq.${getProfileId()}&order=created_at.desc`).catch(() => []),
      sb(`linkedin_accounts?profile_id=eq.${getProfileId()}&status=eq.active`).catch(() => []),
      sb(`activity_log?profile_id=eq.${getProfileId()}&action_type=eq.lead_imported&order=created_at.desc&limit=5`).catch(() => []),
      sb(`settings?profile_id=eq.${getProfileId()}`).catch(() => []),
    ]).then(([lsts, accs, hist, cfgs]) => {
      setLists(lsts)
      setAccounts(accs)
      setHistory(hist)
      const cfg = cfgs?.[0]
      setHasSettings(!!(cfg?.unipile_key && cfg?.unipile_account_id))
      if (lsts.length) setForm(p => ({...p, list_id: lsts[0].id}))
      if (accs.length) setForm(p => ({...p, account_id: accs[0].unipile_account_id}))
    })
  }, [])

  const upd = (k, v) => setForm(p => ({...p, [k]: v}))

  const applyTemplate = (tpl) => {
    setForm(p => ({ ...p, ...tpl.apply, mode: 'filters' }))
  }

  const clearFilters = () => {
    setForm(p => ({ ...EMPTY_FORM, list_id: p.list_id, account_id: p.account_id }))
    setResult(null)
  }

  const activeFiltersCount = () => {
    let n = 0
    if (form.keywords) n++
    if (form.title) n++
    if (form.company) n++
    if (form.location && form.location !== 'Brasil') n++
    if (form.first_name || form.last_name) n++
    if (form.network_distance.length) n++
    if (form.seniority.length) n++
    if (form.industry.length) n++
    if (form.company_headcount.length) n++
    if (form.profile_language.length && !(form.profile_language.length === 1 && form.profile_language[0] === 'pt')) n++
    if (form.tenure_min) n++
    if (form.has_email) n++
    if (form.open_profile) n++
    return n
  }

  const search = async () => {
    if (!form.list_id) { alert('Selecione uma lista para salvar os leads'); return }
    setSearching(true)
    setResult(null)
    try {
      const payload = {
        profile_id: getProfileId(),
        list_id: form.list_id,
        enrich_with_ai: form.enrich_with_ai,
        limit: form.limit,
        account_id: form.account_id,
        ...(form.mode === 'url'
          ? { url: form.url }
          : {
              api: form.api,
              keywords: form.keywords,
              title: form.title,
              first_name: form.first_name,
              last_name: form.last_name,
              company: form.company,
              location: form.location,
              network_distance: form.network_distance,
              seniority: form.seniority,
              industry: form.industry,
              company_headcount: form.company_headcount,
              profile_language: form.profile_language,
              tenure_min: form.tenure_min || null,
              has_email: form.has_email || undefined,
              open_profile: form.open_profile || undefined,
            })
      }
      const res = await fetch(EDGE_SEARCH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      setResult(data)
      if (data.success) {
        const updated = await sb(`activity_log?profile_id=eq.${getProfileId()}&action_type=eq.lead_imported&order=created_at.desc&limit=5`).catch(() => [])
        setHistory(updated)
      }
    } catch (e) {
      setResult({ success: false, message: 'Erro de conexão: ' + e.message })
    }
    setSearching(false)
  }

  const canSearch = form.list_id && (form.mode === 'url' ? form.url : (form.keywords || form.title || form.company || form.first_name))

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', background:'#ffffff' }}>

      {/* ── PAINEL ESQUERDO ── */}
      <div style={{ width:420, background:'#f8f8fc', borderRight:'1px solid #e8e8f0', display:'flex', flexDirection:'column', flexShrink:0 }}>

        {/* Header */}
        <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid #e8e8f0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <h1 style={{ fontSize:17, color:'#1e6b3a', fontWeight:800, marginBottom:2 }}>Buscar Leads no LinkedIn</h1>
              <p style={{ fontSize:11, color:'#9a9ab0' }}>Importe leads diretamente via Unipile</p>
            </div>
            {activeFiltersCount() > 0 && (
              <button onClick={clearFilters} style={{ fontSize:11, color:'#dc2626', background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:6, padding:'4px 10px', cursor:'pointer' }}>
                ✕ Limpar ({activeFiltersCount()})
              </button>
            )}
          </div>

          {/* Modo: URL vs Filtros */}
          <div style={{ display:'flex', background:'#f0f0f5', borderRadius:8, padding:3, marginTop:12, gap:2 }}>
            {[['filters','🎯 Filtros'],['url','🔗 Colar URL']].map(([id,l]) => (
              <button key={id} onClick={() => upd('mode', id)}
                style={{ flex:1, padding:'6px 0', borderRadius:6, border:'none', background:form.mode===id?'#fff':'transparent', color:form.mode===id?'#1a1a2e':'#9a9ab0', fontSize:12, fontWeight:form.mode===id?700:400, cursor:'pointer', boxShadow:form.mode===id?'0 1px 3px rgba(0,0,0,0.08)':'none' }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Aviso sem settings */}
        {hasSettings === false && (
          <div style={{ margin:'12px 16px 0', background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#c2410c' }}>
            ⚠️ Configure a chave Unipile em <strong>⚙️ Configurações</strong> antes de buscar.
          </div>
        )}

        <div style={{ flex:1, overflowY:'auto', padding:'16px 16px 0' }}>

          {form.mode === 'url' ? (
            /* ── MODO URL ── */
            <div>
              <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:12, color:'#1d4ed8' }}>
                Cole qualquer URL de busca do LinkedIn (pesquisa salva, Sales Navigator, Recruiter, etc.)
              </div>
              {lbl('URL da busca do LinkedIn')}
              <textarea value={form.url} onChange={e => upd('url', e.target.value)}
                placeholder="https://www.linkedin.com/search/results/people/?keywords=agromarketing..."
                rows={4} style={{ ...inp, resize:'vertical', fontFamily:'monospace', fontSize:12 }} />
            </div>
          ) : (
            /* ── MODO FILTROS ── */
            <div>
              {/* Templates */}
              <Section title="Templates Agro" defaultOpen={true}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                  {TEMPLATES.map(t => (
                    <button key={t.label} onClick={() => applyTemplate(t)}
                      style={{ background:'#f0f8f3', border:'1px solid #b8e8c8', borderRadius:8, color:'#1e6b3a', padding:'7px 10px', fontSize:11, fontWeight:600, cursor:'pointer', textAlign:'left' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </Section>

              {/* API tipo */}
              <Section title="Tipo de Conta LinkedIn" defaultOpen={false}>
                <ToggleGroup multi={false} value={form.api} onChange={v => upd('api', v || 'classic')}
                  options={[
                    { id:'classic', label:'Classic / Premium' },
                    { id:'sales_navigator', label:'Sales Navigator' },
                    { id:'recruiter', label:'Recruiter' },
                  ]} />
              </Section>

              {/* Busca básica */}
              <Section title="Busca Principal" defaultOpen={true}>
                <div style={{ marginBottom:10 }}>
                  {lbl('Palavras-chave')}
                  <input value={form.keywords} onChange={e => upd('keywords', e.target.value)}
                    placeholder="Ex: agromarketing insumos fertilizantes" style={inp} />
                </div>
                <div style={{ marginBottom:10 }}>
                  {lbl('Cargo / Título')}
                  <input value={form.title} onChange={e => upd('title', e.target.value)}
                    placeholder="Ex: Diretor de Marketing, Gerente Comercial" style={inp} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                  <div>
                    {lbl('Primeiro nome')}
                    <input value={form.first_name} onChange={e => upd('first_name', e.target.value)} placeholder="Ex: João" style={inp} />
                  </div>
                  <div>
                    {lbl('Sobrenome')}
                    <input value={form.last_name} onChange={e => upd('last_name', e.target.value)} placeholder="Ex: Silva" style={inp} />
                  </div>
                </div>
                <div>
                  {lbl('Empresa')}
                  <input value={form.company} onChange={e => upd('company', e.target.value)}
                    placeholder="Ex: Basf, Syngenta, Corteva..." style={inp} />
                </div>
              </Section>

              {/* Localização */}
              <Section title="Localização" defaultOpen={true}>
                <input value={form.location} onChange={e => upd('location', e.target.value)}
                  placeholder="Ex: Brasil, São Paulo, Mato Grosso, Goiás..." style={inp} />
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:8 }}>
                  {['Brasil','São Paulo','Mato Grosso','Goiás','Paraná','Minas Gerais','Rio Grande do Sul'].map(l => (
                    <button key={l} onClick={() => upd('location', l)}
                      style={{ padding:'3px 10px', borderRadius:14, border:`1px solid ${form.location===l?'#1e6b3a':'#e0e0ea'}`, background:form.location===l?'#1e6b3a':'#fff', color:form.location===l?'#fff':'#6a6a7a', fontSize:11, cursor:'pointer' }}>{l}</button>
                  ))}
                </div>
              </Section>

              {/* Grau de conexão */}
              <Section title="Grau de Conexão" defaultOpen={false}>
                <ToggleGroup options={NETWORK_OPTIONS} value={form.network_distance} onChange={v => upd('network_distance', v)} />
              </Section>

              {/* Senioridade */}
              <Section title="Senioridade" defaultOpen={true}>
                <ToggleGroup options={SENIORITY_OPTIONS} value={form.seniority} onChange={v => upd('seniority', v)} />
              </Section>

              {/* Setor */}
              <Section title="Setor / Indústria" defaultOpen={true}>
                <ToggleGroup options={AGRO_INDUSTRIES} value={form.industry} onChange={v => upd('industry', v)} />
              </Section>

              {/* Porte da empresa */}
              <Section title="Porte da Empresa" defaultOpen={false}>
                <ToggleGroup options={HEADCOUNT_OPTIONS} value={form.company_headcount} onChange={v => upd('company_headcount', v)} />
              </Section>

              {/* Idioma do perfil */}
              <Section title="Idioma do Perfil" defaultOpen={false}>
                <ToggleGroup options={LANGUAGE_OPTIONS} value={form.profile_language} onChange={v => upd('profile_language', v)} />
              </Section>

              {/* Avançado */}
              <Section title="Filtros Avançados" defaultOpen={false}>
                <div style={{ marginBottom:10 }}>
                  {lbl('Tempo mínimo no cargo atual (anos)')}
                  <input type="number" min={0} max={20} value={form.tenure_min}
                    onChange={e => upd('tenure_min', e.target.value)}
                    placeholder="Ex: 2 (mínimo 2 anos no cargo)" style={inp} />
                </div>
                <div style={{ display:'flex', gap:16 }}>
                  <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'#4a4a5a' }}>
                    <input type="checkbox" checked={form.has_email} onChange={e => upd('has_email', e.target.checked)} />
                    Tem e-mail visível
                  </label>
                  <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'#4a4a5a' }}>
                    <input type="checkbox" checked={form.open_profile} onChange={e => upd('open_profile', e.target.checked)} />
                    Open Profile
                  </label>
                </div>
              </Section>
            </div>
          )}

          {/* Configurações de importação */}
          <div style={{ background:'#fff', border:'1px solid #e8e8f0', borderRadius:10, padding:14, marginTop:4 }}>
            <div style={{ fontSize:11, color:'#6a6a7a', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Configurações de Importação</div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                {lbl('Quantidade (máx 50)')}
                <input type="number" value={form.limit} min={1} max={50}
                  onChange={e => upd('limit', Math.min(parseInt(e.target.value)||20, 50))} style={inp} />
              </div>
              <div>
                {lbl('Salvar na lista')}
                <select value={form.list_id} onChange={e => upd('list_id', e.target.value)} style={inp}>
                  <option value="">Selecione...</option>
                  {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>

            {accounts.length > 1 && (
              <div style={{ marginBottom:10 }}>
                {lbl('Conta LinkedIn')}
                <select value={form.account_id} onChange={e => upd('account_id', e.target.value)} style={inp}>
                  {accounts.map(a => <option key={a.id} value={a.unipile_account_id}>{a.linkedin_name || a.unipile_account_id}</option>)}
                </select>
              </div>
            )}

            {/* Toggle IA */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderTop:'1px solid #f0f0f5' }}>
              <div>
                <div style={{ fontSize:13, color:'#1a1a2e', fontWeight:600, marginBottom:2 }}>Analisar com IA</div>
                <div style={{ fontSize:11, color:'#9a9ab0' }}>ICP Score + segmento + dores</div>
              </div>
              <button onClick={() => upd('enrich_with_ai', !form.enrich_with_ai)}
                style={{ width:40, height:22, borderRadius:11, background:form.enrich_with_ai?'#1e6b3a':'#e0e0ea', border:'none', cursor:'pointer', position:'relative', transition:'all 0.2s', flexShrink:0 }}>
                <div style={{ width:16, height:16, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left:form.enrich_with_ai?21:3, transition:'all 0.2s' }} />
              </button>
            </div>
          </div>

          <div style={{ height:16 }} />
        </div>

        {/* Botão buscar */}
        <div style={{ padding:'12px 16px', borderTop:'1px solid #e8e8f0', background:'#f8f8fc' }}>
          <button onClick={search} disabled={searching || !canSearch || hasSettings === false}
            style={{ width:'100%', background:(!canSearch||searching||hasSettings===false)?'#e0e0ea':'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:10, color:(!canSearch||searching)?'#9a9ab0':'#fff', padding:'13px 0', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:10, cursor:(!canSearch||searching)?'not-allowed':'pointer' }}>
            {searching
              ? <><div style={{ width:16,height:16,border:'2px solid #9a9ab0',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite' }} />Buscando...</>
              : <>🔍 Buscar e Importar Leads</>}
          </button>
          {!canSearch && !searching && (
            <div style={{ fontSize:11, color:'#9a9ab0', textAlign:'center', marginTop:6 }}>
              {form.mode === 'url' ? 'Cole uma URL do LinkedIn' : 'Preencha keywords, cargo ou empresa'}
            </div>
          )}
        </div>
      </div>

      {/* ── PAINEL DIREITO ── */}
      <div style={{ flex:1, padding:'28px 32px', overflowY:'auto' }}>

        {/* Resultado */}
        {result && (
          <div style={{ marginBottom:28, animation:'fadeIn 0.3s ease' }}>
            <div style={{ background:result.success?'#f0faf4':'#fff5f5', border:`1px solid ${result.success?'#b8e8c8':'#ffd0d0'}`, borderRadius:12, padding:24, marginBottom:16 }}>
              <div style={{ fontSize:16, fontWeight:700, color:result.success?'#059669':'#dc2626', marginBottom:14 }}>
                {result.success ? '✅ Busca concluída!' : '❌ Erro na busca'}
              </div>
              {result.success ? (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
                  {[['Encontrados', result.total_found,'#059669'],['Importados', result.total_saved,'#3b82f6'],['Analisados c/ IA', result.enriched,'#f59e0b']].map(([l,v,c]) => (
                    <div key={l} style={{ textAlign:'center', background:'#fff', borderRadius:10, padding:'16px 8px' }}>
                      <div style={{ fontSize:40, fontWeight:900, color:c, fontFamily:'monospace' }}>{v ?? 0}</div>
                      <div style={{ fontSize:11, color:'#9a9ab0', textTransform:'uppercase', marginTop:4 }}>{l}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize:13, color:'#dc2626', margin:0 }}>{result.message}</p>
              )}
            </div>
            {result.success && (
              <div style={{ background:'#fff', border:'1px solid #e8e8f0', borderRadius:10, padding:'12px 16px', fontSize:12, color:'#6a6a7a' }}>
                Leads importados para a lista selecionada. Veja em <strong style={{ color:'#1e6b3a' }}>Listas de Leads</strong>.
                {result.enriched > 0 && <span> ICP Score calculado para {result.enriched} leads.</span>}
              </div>
            )}
          </div>
        )}

        {/* Estado vazio */}
        {!result && (
          <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
            <div style={{ textAlign:'center', color:'#c0c0d0', padding:'40px 0' }}>
              <div style={{ fontSize:52, marginBottom:12 }}>🔍</div>
              <div style={{ fontSize:16, color:'#6a6a7a', marginBottom:6 }}>Configure os filtros e busque leads</div>
              <div style={{ fontSize:12, color:'#c0c0d0', maxWidth:340, margin:'0 auto', lineHeight:1.7 }}>
                Use templates agro para começar rápido ou construa filtros precisos com setor, senioridade, porte da empresa e grau de conexão.
              </div>
            </div>

            {/* Dicas */}
            <div style={{ background:'#fff', border:'1px solid #e8e8f0', borderRadius:12, padding:20, maxWidth:500, margin:'0 auto', width:'100%' }}>
              <div style={{ fontSize:12, color:'#9a9ab0', textTransform:'uppercase', fontWeight:700, letterSpacing:'0.08em', marginBottom:12 }}>💡 Como usar</div>
              {[
                ['🎯 Templates', 'Clique num template agro para preencher os filtros automaticamente'],
                ['🔗 Colar URL', 'Copie qualquer URL de busca do LinkedIn e cole no modo "Colar URL"'],
                ['🏷️ Setor', 'Filtre por indústria para leads mais precisos no agronegócio'],
                ['👑 Senioridade', 'Combine cargo + senioridade para atingir decisores'],
                ['🤖 IA', 'Com IA ativada, cada lead recebe ICP Score, segmento e dores mapeadas'],
              ].map(([icon, tip], i) => (
                <div key={i} style={{ display:'flex', gap:10, padding:'6px 0', borderBottom:i<4?'1px solid #f8f8fc':'none' }}>
                  <span style={{ fontSize:16, flexShrink:0 }}>{icon.split(' ')[0]}</span>
                  <div>
                    <span style={{ fontSize:12, fontWeight:600, color:'#1a1a2e' }}>{icon.split(' ').slice(1).join(' ')}: </span>
                    <span style={{ fontSize:12, color:'#6a6a7a' }}>{tip}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Histórico */}
            {history.length > 0 && (
              <div style={{ maxWidth:500, margin:'0 auto', width:'100%' }}>
                <div style={{ fontSize:11, color:'#9a9ab0', textTransform:'uppercase', fontWeight:700, marginBottom:10 }}>Últimas buscas</div>
                {history.map((h, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f8f8fc', fontSize:12 }}>
                    <span style={{ color:'#4a4a5a' }}>{h.description}</span>
                    <span style={{ color:'#c0c0d0' }}>{new Date(h.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}
