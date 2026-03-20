import { useState, useEffect } from 'react'
import { sb, getProfileId, N8N_SEARCH } from '../config.js'


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
    sb(`lead_lists?profile_id=eq.${getProfileId()}&order=created_at.desc`)
      .then(d => { setLists(d); if (d.length) setForm(p => ({...p, list_id: d[0].id})) })
      .catch(() => {})

    // Carrega contas LinkedIn conectadas
    sb(`linkedin_accounts?profile_id=eq.${getProfileId()}&status=eq.active`)
      .then(d => { setAccounts(d); if (d.length) setForm(p => ({...p, account_id: d[0].unipile_account_id})) })
      .catch(() => {})

    // Histórico de buscas
    sb(`activity_log?profile_id=eq.${getProfileId()}&action_type=eq.lead_imported&order=created_at.desc&limit=10`)
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
        body: JSON.stringify({ profile_id: getProfileId(), ...form })
      })
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setResult({ success: false, message: 'Erro de conexão com o servidor' })
    }
    setSearching(false)
  }

  const inp = { background: '#f8f8fc', border: '1px solid #e0e0ea', borderRadius: 8, padding: '10px 12px', color: '#2a2a3e', fontSize: 13, width: '100%' }
  const label = (text) => <div style={{ fontSize: 11, color: '#9a9ab0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{text}</div>

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Formulário */}
      <div style={{ width: 400, background: '#f8f8fc', borderRight: '1px solid #e8e8f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid #e8e8f0' }}>
          <h1 style={{ fontSize: 18, color: '#1e6b3a', fontWeight: 700, marginBottom: 4 }}>Buscar Leads no LinkedIn</h1>
          <p style={{ fontSize: 12, color: '#9a9ab0' }}>Filtre e importe leads direto do LinkedIn via Unipile</p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {/* Templates rápidos */}
          <div style={{ marginBottom: 20 }}>
            {label('Templates rápidos')}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[['Insumos', 'insumos'],['Cooperativa', 'cooperativa'],['Revenda', 'revenda']].map(([l, k]) => (
                <button key={k} onClick={() => applyTemplate(k)} style={{ background: '#f0f8f3', border: '1px solid #b8e8c8', borderRadius: 6, color: '#1e6b3a', padding: '5px 12px', fontSize: 12 }}>
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
          <div style={{ background: '#ffffff', border: '1px solid #e0e0ea', borderRadius: 8, padding: 14, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, color: '#1e6b3a', marginBottom: 3 }}>Analisar com IA automaticamente</div>
                <div style={{ fontSize: 11, color: '#9a9ab0' }}>Claude analisa ICP Score + dores de cada lead</div>
              </div>
              <button onClick={() => setForm(p => ({...p, enrich_with_ai: !p.enrich_with_ai}))} style={{ width: 40, height: 22, borderRadius: 11, background: form.enrich_with_ai ? '#1e6b3a' : '#e0e0ea', border: 'none', cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: form.enrich_with_ai ? 21 : 3, transition: 'all 0.2s' }} />
              </button>
            </div>
          </div>

          <button onClick={search} disabled={searching || !form.list_id || !form.account_id || (!form.keywords && !form.title)} style={{ width: '100%', background: searching || !form.list_id || !form.account_id ? '#f0f8f3' : 'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border: 'none', borderRadius: 10, color: '#1a1a2e', padding: 14, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {searching ? (
              <><div style={{ width: 16, height: 16, border: '2px solid #1e6b3a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Buscando...</>
            ) : '🔍 Buscar e Importar Leads'}
          </button>
        </div>
      </div>

      {/* Resultado */}
      <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
        {result && (
          <div style={{ marginBottom: 32, animation: 'fadeIn 0.4s ease' }}>
            <div style={{ background: result.success ? '#f0faf4' : '#fff5f5', border: `1px solid ${result.success ? '#1e6b3a' : '#ffd0d0'}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: result.success ? '#059669' : '#dc2626', marginBottom: 12 }}>
                {result.success ? '✅ Busca concluída!' : '❌ Erro na busca'}
              </div>
              {result.success ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                  {[['Encontrados', result.total_found, '#059669'],['Importados', result.total_saved, '#3b82f6'],['Analisados com IA', result.enriched, '#f59e0b']].map(([l,v,c]) => (
                    <div key={l} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 36, fontWeight: 900, color: c, fontFamily: 'monospace' }}>{v || 0}</div>
                      <div style={{ fontSize: 11, color: '#9a9ab0', textTransform: 'uppercase', marginTop: 4 }}>{l}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: '#dc2626' }}>{result.message}</p>
              )}
            </div>
            {result.success && (
              <div style={{ background: '#ffffff', border: '1px solid #e8e8f0', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 12, color: '#9a9ab0', marginBottom: 8 }}>Os leads foram importados para a lista selecionada. Acesse a tela de <strong style={{ color: '#1e6b3a' }}>Listas de Leads</strong> para visualizá-los.</div>
              </div>
            )}
          </div>
        )}

        {!result && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 16, color: '#9a9ab0' }}>
            <div style={{ fontSize: 48 }}>🔍</div>
            <div style={{ fontSize: 16, color: '#6a6a7a' }}>Configure os filtros e clique em buscar</div>
            <div style={{ fontSize: 12, color: '#c0c0d0', textAlign: 'center', maxWidth: 320, lineHeight: 1.7 }}>
              A busca usa sua conta LinkedIn conectada via Unipile para encontrar leads com os critérios definidos e importa direto para a lista selecionada.
            </div>
            <div style={{ marginTop: 16, background: '#ffffff', border: '1px solid #e8e8f0', borderRadius: 10, padding: 16, maxWidth: 360 }}>
              <div style={{ fontSize: 11, color: '#9a9ab0', textTransform: 'uppercase', marginBottom: 10 }}>Dicas de busca</div>
              {[
                'Use o cargo exato: "Diretor de Marketing"',
                'Combine cargo + localização para resultados precisos',
                'Ative "Analisar com IA" para ICP Score automático',
                'Limite de 50 leads por busca para segurança da conta'
              ].map((tip, i) => (
                <div key={i} style={{ fontSize: 12, color: '#6a6a7a', padding: '4px 0', display: 'flex', gap: 8 }}>
                  <span style={{ color: '#1e6b3a' }}>▸</span>{tip}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
