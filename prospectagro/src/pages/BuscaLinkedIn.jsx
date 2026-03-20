import { useState, useEffect } from 'react'
import { sb, PROFILE_ID } from '../config.js'

const N8N_SEARCH = 'https://n8n-webhook.chasocial.com.br/webhook/search-linkedin-leads'

const SEGMENT_KEYWORDS = {
  insumos: { title: 'Diretor Marketing', keywords: 'insumos agrícolas fertilizantes defensivos' },
  cooperativa: { title: 'Presidente Gerente', keywords: 'cooperativa agrícola agropecuária' },
  revenda: { title: 'Gerente Comercial', keywords: 'revenda agropecuária insumos' },
}

export default function BuscaLinkedIn() {
  const [lists, setLists] = useState([])
  const [accounts, setAccounts] = useState([])
  const [form, setForm] = useState({
    keywords: '',
    title: '',
    company: '',
    location: 'Brasil',
    list_id: '',
    account_id: '',
    limit: 20,
    enrich_with_ai: true,
  })
  const [searching, setSearching] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => {
    // Carrega listas
    sb(`lead_lists?profile_id=eq.${PROFILE_ID}&order=created_at.desc`)
      .then(d => { setLists(d); if (d.length) setForm(p => ({...p, list_id: d[0].id})) })
      .catch(() => {})

    // Carrega contas LinkedIn conectadas
    sb(`linkedin_accounts?profile_id=eq.${PROFILE_ID}&status=eq.active`)
      .then(d => { setAccounts(d); if (d.length) setForm(p => ({...p, account_id: d[0].unipile_account_id})) })
      .catch(() => {})

    // Histórico de buscas
    sb(`activity_log?profile_id=eq.${PROFILE_ID}&action_type=eq.lead_imported&order=created_at.desc&limit=10`)
      .then(setHistory).catch(() => {})
  }, [])

  const applyTemplate = (segment) => {
    const t = SEGMENT_KEYWORDS[segment]
    if (t) setForm(p => ({ ...p, title: t.title, keywords: t.keywords }))
  }

  const search = async () => {
    if (!form.list_id || !form.account_id) return
    setSearching(true)
    setResult(null)
    try {
      const res = await fetch(N8N_SEARCH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: PROFILE_ID, ...form })
      })
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setResult({ success: false, message: 'Erro de conexão com o servidor' })
    }
    setSearching(false)
  }

  const inp = { background: '#0a110b', border: '1px solid #1e3322', borderRadius: 8, padding: '10px 12px', color: '#c8d4c0', fontSize: 13, width: '100%' }
  const label = (text) => <div style={{ fontSize: 11, color: '#3d5a3d', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{text}</div>

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Formulário */}
      <div style={{ width: 400, background: '#0c160e', borderRight: '1px solid #162018', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid #162018' }}>
          <h1 style={{ fontSize: 18, color: '#c8b76a', fontWeight: 700, marginBottom: 4 }}>Buscar Leads no LinkedIn</h1>
          <p style={{ fontSize: 12, color: '#3d5a3d' }}>Filtre e importe leads direto do LinkedIn via Unipile</p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {/* Templates rápidos */}
          <div style={{ marginBottom: 20 }}>
            {label('Templates rápidos')}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[['Insumos', 'insumos'],['Cooperativa', 'cooperativa'],['Revenda', 'revenda']].map(([l, k]) => (
                <button key={k} onClick={() => applyTemplate(k)} style={{ background: '#0f2a18', border: '1px solid #1e4a28', borderRadius: 6, color: '#4a9e5c', padding: '5px 12px', fontSize: 12 }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Campos de busca */}
          <div style={{ marginBottom: 14 }}>
            {label('Palavras-chave')}
            <input value={form.keywords} onChange={e => setForm(p => ({...p, keywords: e.target.value}))} placeholder="Ex: agromarketing insumos" style={inp} />
          </div>

          <div style={{ marginBottom: 14 }}>
            {label('Cargo / Título')}
            <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder="Ex: Diretor de Marketing" style={inp} />
          </div>

          <div style={{ marginBottom: 14 }}>
            {label('Empresa')}
            <input value={form.company} onChange={e => setForm(p => ({...p, company: e.target.value}))} placeholder="Ex: Basf, Syngenta, Cooperativa..." style={inp} />
          </div>

          <div style={{ marginBottom: 14 }}>
            {label('Localização')}
            <input value={form.location} onChange={e => setForm(p => ({...p, location: e.target.value}))} placeholder="Ex: São Paulo, Mato Grosso..." style={inp} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              {label('Quantidade (máx 50)')}
              <input type="number" value={form.limit} onChange={e => setForm(p => ({...p, limit: Math.min(parseInt(e.target.value)||20, 50)}))} min={1} max={50} style={inp} />
            </div>
            <div>
              {label('Salvar na lista')}
              <select value={form.list_id} onChange={e => setForm(p => ({...p, list_id: e.target.value}))} style={inp}>
                <option value="">Selecione...</option>
                {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            {label('Conta LinkedIn')}
            <select value={form.account_id} onChange={e => setForm(p => ({...p, account_id: e.target.value}))} style={inp}>
              <option value="">Selecione...</option>
              {accounts.map(a => <option key={a.id} value={a.unipile_account_id}>{a.linkedin_name || a.unipile_account_id}</option>)}
            </select>
            {!accounts.length && (
              <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 6 }}>
                ⚠️ Nenhuma conta LinkedIn conectada
              </div>
            )}
          </div>

          {/* Enriquecer com IA */}
          <div style={{ background: '#0d1a0f', border: '1px solid #1e3322', borderRadius: 8, padding: 14, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, color: '#c8b76a', marginBottom: 3 }}>Analisar com IA automaticamente</div>
                <div style={{ fontSize: 11, color: '#3d5a3d' }}>Claude analisa ICP Score + dores de cada lead</div>
              </div>
              <button onClick={() => setForm(p => ({...p, enrich_with_ai: !p.enrich_with_ai}))} style={{ width: 40, height: 22, borderRadius: 11, background: form.enrich_with_ai ? '#2d6a3f' : '#1e3322', border: 'none', cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: form.enrich_with_ai ? 21 : 3, transition: 'all 0.2s' }} />
              </button>
            </div>
          </div>

          <button onClick={search} disabled={searching || !form.list_id || !form.account_id || (!form.keywords && !form.title)} style={{ width: '100%', background: searching || !form.list_id || !form.account_id ? '#0f2a18' : 'linear-gradient(135deg,#1e5c2c,#2d8a40)', border: 'none', borderRadius: 10, color: '#e8e4d9', padding: 14, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {searching ? (
              <><div style={{ width: 16, height: 16, border: '2px solid #4a9e5c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Buscando...</>
            ) : '🔍 Buscar e Importar Leads'}
          </button>
        </div>
      </div>

      {/* Resultado */}
      <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
        {result && (
          <div style={{ marginBottom: 32, animation: 'fadeIn 0.4s ease' }}>
            <div style={{ background: result.success ? '#0d2a18' : '#1a0f0f', border: `1px solid ${result.success ? '#2d6a3f' : '#4a1a1a'}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: result.success ? '#4ade80' : '#f87171', marginBottom: 12 }}>
                {result.success ? '✅ Busca concluída!' : '❌ Erro na busca'}
              </div>
              {result.success ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                  {[['Encontrados', result.total_found, '#4ade80'],['Importados', result.total_saved, '#3b82f6'],['Analisados com IA', result.enriched, '#f59e0b']].map(([l,v,c]) => (
                    <div key={l} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 36, fontWeight: 900, color: c, fontFamily: 'monospace' }}>{v || 0}</div>
                      <div style={{ fontSize: 11, color: '#3d5a3d', textTransform: 'uppercase', marginTop: 4 }}>{l}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: '#f87171' }}>{result.message}</p>
              )}
            </div>
            {result.success && (
              <div style={{ background: '#0d1a0f', border: '1px solid #162018', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 12, color: '#3d5a3d', marginBottom: 8 }}>Os leads foram importados para a lista selecionada. Acesse a tela de <strong style={{ color: '#c8b76a' }}>Listas de Leads</strong> para visualizá-los.</div>
              </div>
            )}
          </div>
        )}

        {!result && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 16, color: '#3d5a3d' }}>
            <div style={{ fontSize: 48 }}>🔍</div>
            <div style={{ fontSize: 16, color: '#5a7a5a' }}>Configure os filtros e clique em buscar</div>
            <div style={{ fontSize: 12, color: '#2d4a2d', textAlign: 'center', maxWidth: 320, lineHeight: 1.7 }}>
              A busca usa sua conta LinkedIn conectada via Unipile para encontrar leads com os critérios definidos e importa direto para a lista selecionada.
            </div>
            <div style={{ marginTop: 16, background: '#0d1a0f', border: '1px solid #162018', borderRadius: 10, padding: 16, maxWidth: 360 }}>
              <div style={{ fontSize: 11, color: '#3d5a3d', textTransform: 'uppercase', marginBottom: 10 }}>Dicas de busca</div>
              {[
                'Use o cargo exato: "Diretor de Marketing"',
                'Combine cargo + localização para resultados precisos',
                'Ative "Analisar com IA" para ICP Score automático',
                'Limite de 50 leads por busca para segurança da conta'
              ].map((tip, i) => (
                <div key={i} style={{ fontSize: 12, color: '#5a7a5a', padding: '4px 0', display: 'flex', gap: 8 }}>
                  <span style={{ color: '#2d6a3f' }}>▸</span>{tip}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
