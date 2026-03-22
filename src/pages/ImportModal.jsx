import { useState, useRef, useCallback } from 'react'
import { sb, SB_URL, SB_KEY, getAccessToken, getProfileId, COLORS } from '../config.js'

// ── Mapeamento fuzzy de colunas ────────────────────────────────────────────
const FIELD_ALIASES = {
  full_name:       ['nome', 'name', 'full_name', 'nome_completo', 'contact_name', 'contato', 'lead', 'pessoa'],
  headline:        ['cargo', 'title', 'job_title', 'position', 'cargo_atual', 'funcao', 'função', 'headline', 'posicao', 'posição', 'role'],
  current_company: ['empresa', 'company', 'company_name', 'empresa_atual', 'organization', 'organização', 'organizacao', 'companhia'],
  linkedin_url:    ['linkedin', 'linkedin_url', 'profile_url', 'linkedin_profile_url', 'perfil_linkedin', 'url_linkedin', 'linkedin_profile', 'perfil', 'link', 'url'],
  email:           ['email', 'e-mail', 'email_address', 'e_mail', 'mail'],
  phone:           ['telefone', 'phone', 'celular', 'mobile', 'whatsapp', 'fone'],
  location:        ['cidade', 'city', 'location', 'localização', 'localizacao', 'estado', 'state', 'local'],
}

const FIELD_LABELS = {
  full_name: 'Nome completo *',
  headline: 'Cargo',
  current_company: 'Empresa',
  linkedin_url: 'URL LinkedIn',
  email: 'Email',
  phone: 'Telefone',
  location: 'Cidade/Estado',
}

function normalize(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

function autoMapColumns(headers) {
  const mapping = {}
  const used = new Set()
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const h of headers) {
      const n = normalize(h)
      if (used.has(h)) continue
      if (aliases.some(a => n === a || n.includes(a) || a.includes(n))) {
        mapping[field] = h
        used.add(h)
        break
      }
    }
  }
  return mapping
}

// ── Parsers ─────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (!lines.length) return { headers: [], rows: [] }
  const splitLine = (line) => {
    const result = []; let cur = ''; let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++ } else { inQ = !inQ } }
      else if ((ch === ',' || ch === ';' || ch === '\t') && !inQ) { result.push(cur.trim()); cur = '' }
      else cur += ch
    }
    result.push(cur.trim())
    return result
  }
  const headers = splitLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim())
  const rows = lines.slice(1).map(l => {
    const vals = splitLine(l)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').replace(/^"|"$/g, '').trim() })
    return obj
  }).filter(r => Object.values(r).some(v => v))
  return { headers, rows }
}

async function parseXLSX(file) {
  const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if (!data.length) return { headers: [], rows: [] }
  const headers = data[0].map(h => String(h).trim())
  const rows = data.slice(1).map(r => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = String(r[i] ?? '').trim() })
    return obj
  }).filter(r => Object.values(r).some(v => v))
  return { headers, rows }
}

// ── Helpers Supabase ─────────────────────────────────────────────────────────
async function sbPost(path, body) {
  const token = getAccessToken()
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  const d = await r.json()
  if (!r.ok) throw new Error(d?.message || d?.error || r.status)
  return d
}

async function sbGet(path) {
  const token = getAccessToken()
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  return r.json()
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function ImportModal({ onClose, onImported }) {
  const [step, setStep] = useState('upload') // upload | preview | importing | done
  const [file, setFile] = useState(null)
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [mapping, setMapping] = useState({})
  const [listName, setListName] = useState('')
  const [listDesc, setListDesc] = useState('')
  const [listColor, setListColor] = useState(COLORS?.[0] || '#1e6b3a')
  const [parseError, setParseError] = useState('')
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  const handleFile = useCallback(async (f) => {
    if (!f) return
    setParseError(''); setParsing(true); setFile(f)
    try {
      let parsed
      if (f.name.endsWith('.csv') || f.type === 'text/csv' || f.type === 'text/plain') {
        const text = await f.text()
        parsed = parseCSV(text)
      } else {
        parsed = await parseXLSX(f)
      }
      if (!parsed.headers.length) throw new Error('Arquivo vazio ou formato inválido')
      setHeaders(parsed.headers)
      setRows(parsed.rows)
      setMapping(autoMapColumns(parsed.headers))
      // Pre-fill list name from filename
      const base = f.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
      setListName(base.charAt(0).toUpperCase() + base.slice(1))
      setStep('preview')
    } catch(e) {
      setParseError(e.message || 'Erro ao ler arquivo')
    }
    setParsing(false)
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  // ── Importação real ──────────────────────────────────────────────────────
  const doImport = async () => {
    if (!listName.trim()) return
    if (!mapping.full_name) return
    setImporting(true); setStep('importing'); setProgress(0)

    const pid = getProfileId()
    const stats = { total: rows.length, imported: 0, duplicates: 0, invalid: 0, errors: [] }

    try {
      // 1. Cria a lista
      setProgress(5)
      const listData = await sbPost('lead_lists', {
        profile_id: pid,
        name: listName.trim(),
        description: listDesc.trim() || null,
        color: listColor,
        total_leads: 0,
        analyzed_leads: 0,
      })
      const listId = (Array.isArray(listData) ? listData[0] : listData).id

      // 2. Prepara linhas válidas
      const validRows = []
      for (const row of rows) {
        const name = row[mapping.full_name]?.trim()
        if (!name) { stats.invalid++; continue }
        validRows.push({
          full_name: name,
          headline: mapping.headline ? row[mapping.headline]?.trim() || null : null,
          current_company: mapping.current_company ? row[mapping.current_company]?.trim() || null : null,
          linkedin_url: mapping.linkedin_url ? normalizeLinkedIn(row[mapping.linkedin_url]?.trim()) : null,
          email: mapping.email ? row[mapping.email]?.trim() || null : null,
          phone: mapping.phone ? row[mapping.phone]?.trim() || null : null,
          location: mapping.location ? row[mapping.location]?.trim() || null : null,
        })
      }

      setProgress(15)

      // 3. Dedup por linkedin_url (batch de 50)
      const existingUrls = new Set()
      const existingNameCompany = new Set()

      const urlsToCheck = validRows.map(r => r.linkedin_url).filter(Boolean)
      for (let i = 0; i < urlsToCheck.length; i += 50) {
        const batch = urlsToCheck.slice(i, i + 50)
        const encoded = batch.map(u => encodeURIComponent(u)).join(',')
        const existing = await sbGet(`leads?profile_id=eq.${pid}&linkedin_url=in.(${batch.map(u => `"${u}"`).join(',')})&select=linkedin_url,full_name,current_company`)
        if (Array.isArray(existing)) existing.forEach(e => { if (e.linkedin_url) existingUrls.add(e.linkedin_url) })
      }

      // Dedup por nome+empresa para rows sem linkedin_url
      const rowsWithoutUrl = validRows.filter(r => !r.linkedin_url)
      if (rowsWithoutUrl.length) {
        for (let i = 0; i < rowsWithoutUrl.length; i += 50) {
          const batch = rowsWithoutUrl.slice(i, i + 50)
          const names = [...new Set(batch.map(r => r.full_name).filter(Boolean))]
          if (!names.length) continue
          const existing = await sbGet(`leads?profile_id=eq.${pid}&full_name=in.(${names.map(n => `"${n.replace(/"/g, '\\"')}"`).join(',')})&select=full_name,current_company`)
          if (Array.isArray(existing)) {
            existing.forEach(e => {
              const key = `${normalize(e.full_name)}|${normalize(e.current_company)}`
              existingNameCompany.add(key)
            })
          }
        }
      }

      setProgress(30)

      // 4. Separa novos vs duplicados
      const toInsert = []
      for (const row of validRows) {
        if (row.linkedin_url && existingUrls.has(row.linkedin_url)) { stats.duplicates++; continue }
        if (!row.linkedin_url) {
          const key = `${normalize(row.full_name)}|${normalize(row.current_company)}`
          if (existingNameCompany.has(key)) { stats.duplicates++; continue }
        }
        toInsert.push(row)
      }

      // 5. Insere leads em batches de 25
      const insertedIds = []
      const BATCH = 25
      for (let i = 0; i < toInsert.length; i += BATCH) {
        const batch = toInsert.slice(i, i + BATCH).map(r => ({
          ...r,
          profile_id: pid,
          source: 'import',
        }))
        try {
          const created = await sbPost('leads', batch)
          if (Array.isArray(created)) created.forEach(l => insertedIds.push(l.id))
          else if (created?.id) insertedIds.push(created.id)
          stats.imported += batch.length
        } catch(e) {
          stats.errors.push(`Batch ${i}-${i+BATCH}: ${e.message}`)
          stats.invalid += batch.length
        }
        setProgress(30 + Math.round((i / toInsert.length) * 50))
      }

      // 6. Insere lead_list_members em batches de 50
      for (let i = 0; i < insertedIds.length; i += 50) {
        const batch = insertedIds.slice(i, i + 50).map(lid => ({
          list_id: listId,
          lead_id: lid,
        }))
        try { await sbPost('lead_list_members', batch) } catch(e) {
          stats.errors.push(`Members batch ${i}: ${e.message}`)
        }
        setProgress(80 + Math.round((i / insertedIds.length) * 15))
      }

      // 7. Atualiza contagem da lista
      const token = getAccessToken()
      await fetch(`${SB_URL}/rest/v1/lead_lists?id=eq.${listId}`, {
        method: 'PATCH',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ total_leads: insertedIds.length }),
      })

      setProgress(100)
      setResult({ ...stats, listId, listName: listName.trim() })
      setStep('done')
      if (onImported) onImported({ id: listId, name: listName.trim(), total_leads: insertedIds.length })
    } catch(e) {
      stats.errors.push(e.message)
      setResult({ ...stats, fatalError: e.message })
      setStep('done')
    }
    setImporting(false)
  }

  function normalizeLinkedIn(url) {
    if (!url) return null
    url = url.trim()
    if (!url.startsWith('http')) url = 'https://' + url
    try {
      const u = new URL(url)
      return u.origin + u.pathname.replace(/\/$/, '')
    } catch { return url || null }
  }

  // ── Estilos base ─────────────────────────────────────────────────────────
  const inp = { background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:'9px 12px', color:'#1a1a2e', fontSize:13, width:'100%', boxSizing:'border-box' }
  const lbl = (t, req) => (
    <div style={{ fontSize:11, color:'#9a9ab0', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:5, fontWeight:700 }}>
      {t}{req && <span style={{ color:'#dc2626' }}> *</span>}
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:680, maxHeight:'92vh', overflow:'auto', boxShadow:'0 20px 70px rgba(0,0,0,0.22)', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ padding:'18px 24px', borderBottom:'1px solid #f0f0f5', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'#fff', zIndex:1 }}>
          <div>
            <h2 style={{ fontSize:17, fontWeight:800, color:'#1a1a2e', margin:0 }}>📥 Importar Lista</h2>
            <div style={{ fontSize:11, color:'#9a9ab0', marginTop:2 }}>
              {step === 'upload' && 'Envie um arquivo Excel ou CSV'}
              {step === 'preview' && `${rows.length} linhas detectadas · mapeie as colunas`}
              {step === 'importing' && 'Importando leads...'}
              {step === 'done' && 'Importação concluída'}
            </div>
          </div>
          {step !== 'importing' && (
            <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, color:'#9a9ab0', cursor:'pointer', lineHeight:1 }}>×</button>
          )}
        </div>

        <div style={{ padding:24, flex:1 }}>

          {/* ── UPLOAD ── */}
          {step === 'upload' && (
            <div>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border:`2px dashed ${dragging ? '#1e6b3a' : '#d0d0e0'}`,
                  borderRadius:14,
                  padding:'48px 24px',
                  textAlign:'center',
                  cursor:'pointer',
                  background:dragging ? '#f0faf4' : '#fafafa',
                  transition:'all 0.2s',
                  marginBottom:16,
                }}
              >
                <div style={{ fontSize:40, marginBottom:12 }}>📁</div>
                <div style={{ fontSize:15, fontWeight:700, color:'#1a1a2e', marginBottom:6 }}>
                  Arraste o arquivo aqui ou clique para selecionar
                </div>
                <div style={{ fontSize:12, color:'#9a9ab0' }}>Suporta .xlsx, .xls e .csv</div>
                {parsing && <div style={{ marginTop:12, fontSize:13, color:'#1e6b3a', fontWeight:600 }}>⏳ Lendo arquivo...</div>}
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,text/csv"
                style={{ display:'none' }}
                onChange={e => handleFile(e.target.files[0])} />
              {parseError && (
                <div style={{ background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:10, padding:12, fontSize:13, color:'#dc2626' }}>
                  ❌ {parseError}
                </div>
              )}
              <div style={{ background:'#f8f8fc', borderRadius:10, padding:14, fontSize:12, color:'#6a6a7a', lineHeight:1.8 }}>
                <div style={{ fontWeight:700, color:'#1a1a2e', marginBottom:6 }}>Colunas mínimas esperadas:</div>
                <div>• <b>Nome</b> — nome completo do lead (obrigatório)</div>
                <div>• <b>Cargo / Title</b> — cargo ou função</div>
                <div>• <b>Empresa / Company</b> — nome da empresa</div>
                <div>• <b>LinkedIn</b> — URL do perfil no LinkedIn</div>
                <div style={{ marginTop:6, color:'#9a9ab0' }}>O sistema detecta automaticamente variações nos nomes das colunas.</div>
              </div>
            </div>
          )}

          {/* ── PREVIEW / CONFIGURAÇÃO ── */}
          {step === 'preview' && (
            <div>
              {/* Nome e descrição da lista */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                <div style={{ gridColumn:'1/-1' }}>
                  {lbl('Nome da lista', true)}
                  <input value={listName} onChange={e => setListName(e.target.value)}
                    placeholder="Ex: Gerentes de Cooperativas GO" style={inp} autoFocus />
                </div>
                <div>
                  {lbl('Descrição (opcional)')}
                  <input value={listDesc} onChange={e => setListDesc(e.target.value)}
                    placeholder="Origem, contexto..." style={inp} />
                </div>
                <div>
                  {lbl('Cor da lista')}
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:2 }}>
                    {(COLORS || ['#1e6b3a','#3b82f6','#f59e0b','#ec4899','#8b5cf6','#ef4444','#06b6d4','#10b981']).map(c => (
                      <div key={c} onClick={() => setListColor(c)}
                        style={{ width:24, height:24, borderRadius:'50%', background:c, cursor:'pointer', border:listColor===c?'3px solid #1a1a2e':'2px solid transparent', transition:'all 0.15s' }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Mapeamento de colunas */}
              <div style={{ marginBottom:16 }}>
                {lbl('Mapeamento de colunas')}
                <div style={{ background:'#f8f8fc', borderRadius:10, padding:14 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 24px 1fr', gap:8, alignItems:'center', marginBottom:8 }}>
                    <div style={{ fontSize:10, color:'#9a9ab0', fontWeight:700, textTransform:'uppercase' }}>Campo interno</div>
                    <div />
                    <div style={{ fontSize:10, color:'#9a9ab0', fontWeight:700, textTransform:'uppercase' }}>Coluna do arquivo</div>
                  </div>
                  {Object.entries(FIELD_LABELS).map(([field, label]) => (
                    <div key={field} style={{ display:'grid', gridTemplateColumns:'1fr 24px 1fr', gap:8, alignItems:'center', marginBottom:6 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'#1a1a2e' }}>{label}</div>
                      <div style={{ textAlign:'center', color:'#9a9ab0', fontSize:16 }}>→</div>
                      <select value={mapping[field] || ''} onChange={e => setMapping(p => ({...p, [field]: e.target.value || undefined}))}
                        style={{ ...inp, padding:'6px 8px', fontSize:12 }}>
                        <option value="">— não importar —</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                {!mapping.full_name && (
                  <div style={{ fontSize:12, color:'#dc2626', marginTop:6 }}>⚠️ O campo Nome é obrigatório — selecione a coluna correspondente.</div>
                )}
              </div>

              {/* Preview das primeiras linhas */}
              <div style={{ marginBottom:16 }}>
                {lbl(`Preview — primeiras ${Math.min(5, rows.length)} de ${rows.length} linhas`)}
                <div style={{ overflowX:'auto', borderRadius:10, border:'1px solid #e8e8f0' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                    <thead>
                      <tr style={{ background:'#f8f8fc' }}>
                        {Object.entries(FIELD_LABELS).filter(([f]) => mapping[f]).map(([f, l]) => (
                          <th key={f} style={{ padding:'8px 10px', textAlign:'left', color:'#9a9ab0', fontWeight:700, textTransform:'uppercase', fontSize:9, whiteSpace:'nowrap' }}>{l.replace(' *','')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((row, i) => (
                        <tr key={i} style={{ borderTop:'1px solid #f0f0f5' }}>
                          {Object.keys(FIELD_LABELS).filter(f => mapping[f]).map(f => (
                            <td key={f} style={{ padding:'8px 10px', color:'#4a4a5a', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {row[mapping[f]] || <span style={{ color:'#d0d0d0' }}>—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Ações */}
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => { setStep('upload'); setFile(null); setRows([]); setHeaders([]) }}
                  style={{ flex:1, background:'#fff', border:'1px solid #e0e0ea', borderRadius:9, color:'#6a6a7a', padding:12, fontSize:13 }}>
                  ← Trocar arquivo
                </button>
                <button onClick={doImport}
                  disabled={!listName.trim() || !mapping.full_name}
                  style={{ flex:2, background:(!listName.trim()||!mapping.full_name)?'#e0e0ea':'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:9, color:(!listName.trim()||!mapping.full_name)?'#9a9ab0':'#fff', padding:12, fontSize:14, fontWeight:800, cursor:(!listName.trim()||!mapping.full_name)?'not-allowed':'pointer' }}>
                  Importar {rows.length} leads →
                </button>
              </div>
            </div>
          )}

          {/* ── IMPORTANDO ── */}
          {step === 'importing' && (
            <div style={{ textAlign:'center', padding:'32px 0' }}>
              <div style={{ fontSize:40, marginBottom:16 }}>⏳</div>
              <div style={{ fontSize:16, fontWeight:700, color:'#1a1a2e', marginBottom:8 }}>Importando leads...</div>
              <div style={{ fontSize:13, color:'#9a9ab0', marginBottom:24 }}>Não feche esta janela</div>
              <div style={{ background:'#f0f0f5', borderRadius:99, height:8, overflow:'hidden', maxWidth:320, margin:'0 auto 12px' }}>
                <div style={{ height:'100%', background:'linear-gradient(90deg,#1e6b3a,#2d9e4f)', borderRadius:99, width:`${progress}%`, transition:'width 0.4s' }} />
              </div>
              <div style={{ fontSize:12, color:'#9a9ab0' }}>{progress}%</div>
            </div>
          )}

          {/* ── RESULTADO ── */}
          {step === 'done' && result && (
            <div>
              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{ fontSize:48, marginBottom:8 }}>{result.fatalError ? '❌' : '✅'}</div>
                <div style={{ fontSize:18, fontWeight:800, color:'#1a1a2e' }}>
                  {result.fatalError ? 'Erro na importação' : 'Importação concluída!'}
                </div>
                {!result.fatalError && (
                  <div style={{ fontSize:13, color:'#6a6a7a', marginTop:4 }}>
                    Lista <b>"{result.listName}"</b> criada com sucesso
                  </div>
                )}
              </div>

              {/* Cards de resultado */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
                {[
                  ['Total lido', result.total, '#6a6a7a'],
                  ['Importados', result.imported, '#059669'],
                  ['Duplicados', result.duplicates, '#f59e0b'],
                  ['Inválidos', result.invalid, '#dc2626'],
                ].map(([l, v, c]) => (
                  <div key={l} style={{ background:'#f8f8fc', border:`1px solid ${c}22`, borderRadius:10, padding:'14px 10px', textAlign:'center' }}>
                    <div style={{ fontSize:28, fontWeight:900, color:c, fontFamily:'monospace' }}>{v}</div>
                    <div style={{ fontSize:10, color:'#9a9ab0', textTransform:'uppercase', fontWeight:700, marginTop:3 }}>{l}</div>
                  </div>
                ))}
              </div>

              {result.errors?.length > 0 && (
                <div style={{ background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:10, padding:12, marginBottom:16 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#dc2626', marginBottom:6 }}>Erros encontrados:</div>
                  {result.errors.map((e, i) => <div key={i} style={{ fontSize:11, color:'#dc2626' }}>• {e}</div>)}
                </div>
              )}

              {result.duplicates > 0 && (
                <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:10, padding:12, fontSize:12, color:'#92400e', marginBottom:16 }}>
                  ⚠️ {result.duplicates} lead{result.duplicates > 1 ? 's foram ignorados por' : ' foi ignorado por'} já exist{result.duplicates > 1 ? 'irem' : 'ir'} no sistema (dedup por URL LinkedIn ou Nome+Empresa).
                </div>
              )}

              <div style={{ display:'flex', gap:10 }}>
                <button onClick={onClose}
                  style={{ flex:1, background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:9, color:'#fff', padding:13, fontSize:14, fontWeight:800 }}>
                  Ver lista importada
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
