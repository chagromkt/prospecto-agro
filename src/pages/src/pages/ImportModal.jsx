import { useState, useRef, useCallback, useEffect } from 'react'
import { SB_URL, SB_KEY, getAccessToken, getProfileId, COLORS } from '../config.js'

// ── Carrega SheetJS via script tag (evita quebrar o build do Vite) ────────────
let xlsxLib = null
function loadXLSX() {
  return new Promise((resolve, reject) => {
    if (xlsxLib) { resolve(xlsxLib); return }
    if (window.XLSX) { xlsxLib = window.XLSX; resolve(xlsxLib); return }
    const s = document.createElement('script')
    s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
    s.onload = () => { xlsxLib = window.XLSX; resolve(xlsxLib) }
    s.onerror = () => reject(new Error('Falha ao carregar biblioteca XLSX'))
    document.head.appendChild(s)
  })
}

// ── Mapeamento fuzzy de colunas ────────────────────────────────────────────────
const FIELD_ALIASES = {
  full_name:       ['nome', 'name', 'full_name', 'nome_completo', 'contact_name', 'contato', 'lead', 'pessoa'],
  headline:        ['cargo', 'title', 'job_title', 'position', 'cargo_atual', 'funcao', 'funcção', 'headline', 'posicao', 'posição', 'role'],
  current_company: ['empresa', 'company', 'company_name', 'empresa_atual', 'organization', 'organizacao', 'companhia'],
  linkedin_url:    ['linkedin', 'linkedin_url', 'profile_url', 'linkedin_profile_url', 'perfil_linkedin', 'url_linkedin', 'linkedin_profile', 'perfil', 'link_linkedin'],
  email:           ['email', 'e-mail', 'email_address', 'mail'],
  phone:           ['telefone', 'phone', 'celular', 'mobile', 'whatsapp', 'fone'],
  location:        ['cidade', 'city', 'location', 'localizacao', 'estado', 'state', 'local'],
}

const FIELD_LABELS = {
  full_name:       'Nome completo *',
  headline:        'Cargo',
  current_company: 'Empresa',
  linkedin_url:    'URL LinkedIn',
  email:           'Email',
  phone:           'Telefone',
  location:        'Cidade/Estado',
}

function normalize(s) {
  return String(s || '').toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

function autoMapColumns(headers) {
  const mapping = {}
  const used = new Set()
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const h of headers) {
      if (used.has(h)) continue
      const n = normalize(h)
      if (aliases.some(a => n === a || n.includes(a) || a.includes(n))) {
        mapping[field] = h; used.add(h); break
      }
    }
  }
  return mapping
}

// ── Parsers ───────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (!lines.length) return { headers: [], rows: [] }
  const delim = (lines[0].match(/\t/g) || []).length > (lines[0].match(/;/g) || []).length
    ? ((lines[0].match(/\t/g) || []).length > (lines[0].match(/,/g) || []).length ? '\t' : ',')
    : ((lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',')

  const splitLine = (line) => {
    const result = []; let cur = ''; let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++ } else { inQ = !inQ } }
      else if (ch === delim && !inQ) { result.push(cur.trim()); cur = '' }
      else cur += ch
    }
    result.push(cur.trim()); return result
  }
  const headers = splitLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim())
  const rows = lines.slice(1)
    .map(l => {
      const vals = splitLine(l)
      const obj = {}
      headers.forEach((h, i) => { obj[h] = (vals[i] || '').replace(/^"|"$/g, '').trim() })
      return obj
    })
    .filter(r => Object.values(r).some(v => v))
  return { headers, rows }
}

async function parseXLSX(file) {
  const XLSX = await loadXLSX()
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if (!data.length) return { headers: [], rows: [] }
  const headers = data[0].map(h => String(h).trim()).filter(Boolean)
  const rows = data.slice(1)
    .map(r => {
      const obj = {}
      headers.forEach((h, i) => { obj[h] = String(r[i] ?? '').trim() })
      return obj
    })
    .filter(r => Object.values(r).some(v => v))
  return { headers, rows }
}

// ── REST helpers ──────────────────────────────────────────────────────────────
async function sbPost(path, body) {
  const token = getAccessToken()
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: SB_KEY, Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json', Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  const d = await r.json()
  if (!r.ok) throw new Error(d?.message || d?.error || `HTTP ${r.status}`)
  return d
}

async function sbGet(path) {
  const token = getAccessToken()
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  return r.json()
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

// ── Componente ────────────────────────────────────────────────────────────────
export default function ImportModal({ onClose, onImported }) {
  const [step, setStep]       = useState('upload') // upload | preview | importing | done
  const [rows, setRows]       = useState([])
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({})
  const [listName, setListName]   = useState('')
  const [listDesc, setListDesc]   = useState('')
  const [listColor, setListColor] = useState(COLORS?.[0] || '#1e6b3a')
  const [parseError, setParseError] = useState('')
  const [parsing, setParsing]   = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult]     = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  // Pré-carrega SheetJS silenciosamente
  useEffect(() => { loadXLSX().catch(() => {}) }, [])

  const handleFile = useCallback(async (f) => {
    if (!f) return
    setParseError(''); setParsing(true)
    try {
      let parsed
      const isCSV = f.name.toLowerCase().endsWith('.csv') || f.type === 'text/csv' || f.type === 'text/plain'
      if (isCSV) {
        const text = await f.text()
        parsed = parseCSV(text)
      } else {
        parsed = await parseXLSX(f)
      }
      if (!parsed.headers.length) throw new Error('Arquivo vazio ou sem colunas detectáveis.')
      if (!parsed.rows.length)    throw new Error('Nenhuma linha de dados encontrada.')
      setHeaders(parsed.headers)
      setRows(parsed.rows)
      setMapping(autoMapColumns(parsed.headers))
      const base = f.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
      setListName(base.charAt(0).toUpperCase() + base.slice(1))
      setStep('preview')
    } catch(e) {
      setParseError(e.message || 'Erro ao ler arquivo.')
    }
    setParsing(false)
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]; if (f) handleFile(f)
  }, [handleFile])

  // ── Importação ──────────────────────────────────────────────────────────────
  const doImport = async () => {
    if (!listName.trim() || !mapping.full_name) return
    setStep('importing'); setProgress(0)
    const pid = getProfileId()
    const stats = { total: rows.length, imported: 0, duplicates: 0, invalid: 0, errors: [] }

    try {
      // 1. Cria a lista
      setProgress(5)
      const listData = await sbPost('lead_lists', {
        profile_id: pid, name: listName.trim(),
        description: listDesc.trim() || null, color: listColor,
        total_leads: 0, analyzed_leads: 0,
      })
      const listId = (Array.isArray(listData) ? listData[0] : listData).id

      // 2. Valida e prepara linhas
      const validRows = []
      for (const row of rows) {
        const name = mapping.full_name ? row[mapping.full_name]?.trim() : ''
        if (!name) { stats.invalid++; continue }
        validRows.push({
          full_name:       name,
          headline:        mapping.headline        ? row[mapping.headline]?.trim()        || null : null,
          current_company: mapping.current_company ? row[mapping.current_company]?.trim() || null : null,
          linkedin_url:    mapping.linkedin_url    ? normalizeLinkedIn(row[mapping.linkedin_url]?.trim()) : null,
          email:           mapping.email           ? row[mapping.email]?.trim()           || null : null,
          phone:           mapping.phone           ? row[mapping.phone]?.trim()           || null : null,
          location:        mapping.location        ? row[mapping.location]?.trim()        || null : null,
        })
      }
      setProgress(15)

      // 3. Dedup por linkedin_url
      const existingUrls = new Set()
      const existingNameCompany = new Set()
      const urlsToCheck = [...new Set(validRows.map(r => r.linkedin_url).filter(Boolean))]
      for (let i = 0; i < urlsToCheck.length; i += 50) {
        const batch = urlsToCheck.slice(i, i + 50)
        const qs = batch.map(u => `"${u.replace(/"/g, '\\"')}"`).join(',')
        const existing = await sbGet(`leads?profile_id=eq.${pid}&linkedin_url=in.(${qs})&select=linkedin_url`)
        if (Array.isArray(existing)) existing.forEach(e => { if (e.linkedin_url) existingUrls.add(e.linkedin_url) })
      }

      // 4. Dedup por nome+empresa (para rows sem linkedin_url)
      const rowsNoUrl = validRows.filter(r => !r.linkedin_url)
      if (rowsNoUrl.length) {
        const names = [...new Set(rowsNoUrl.map(r => r.full_name).filter(Boolean))]
        for (let i = 0; i < names.length; i += 50) {
          const batch = names.slice(i, i + 50)
          const qs = batch.map(n => `"${n.replace(/"/g, '\\"')}"`).join(',')
          const existing = await sbGet(`leads?profile_id=eq.${pid}&full_name=in.(${qs})&select=full_name,current_company`)
          if (Array.isArray(existing)) {
            existing.forEach(e => {
              existingNameCompany.add(`${normalize(e.full_name)}|${normalize(e.current_company)}`)
            })
          }
        }
      }
      setProgress(30)

      // 5. Filtra duplicados
      const toInsert = []
      for (const row of validRows) {
        if (row.linkedin_url && existingUrls.has(row.linkedin_url)) { stats.duplicates++; continue }
        if (!row.linkedin_url) {
          const key = `${normalize(row.full_name)}|${normalize(row.current_company)}`
          if (existingNameCompany.has(key)) { stats.duplicates++; continue }
        }
        toInsert.push(row)
      }

      // 6. Insere leads em batches de 25
      const insertedIds = []
      const BATCH = 25
      for (let i = 0; i < toInsert.length; i += BATCH) {
        const batch = toInsert.slice(i, i + BATCH).map(r => ({ ...r, profile_id: pid, source: 'import' }))
        try {
          const created = await sbPost('leads', batch)
          if (Array.isArray(created)) created.forEach(l => { if (l.id) insertedIds.push(l.id) })
          else if (created?.id) insertedIds.push(created.id)
          stats.imported += batch.length
        } catch(e) {
          stats.errors.push(`Lote ${i + 1}–${Math.min(i + BATCH, toInsert.length)}: ${e.message}`)
          stats.invalid += batch.length
        }
        setProgress(30 + Math.round(((i + BATCH) / Math.max(toInsert.length, 1)) * 50))
      }

      // 7. Insere membros da lista
      for (let i = 0; i < insertedIds.length; i += 50) {
        const batch = insertedIds.slice(i, i + 50).map(lid => ({ list_id: listId, lead_id: lid }))
        try { await sbPost('lead_list_members', batch) }
        catch(e) { stats.errors.push(`Membros lote ${i}: ${e.message}`) }
      }
      setProgress(90)

      // 8. Atualiza contagem
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
      setResult({ ...stats, fatalError: e.message })
      setStep('done')
    }
  }

  // ── Estilos ───────────────────────────────────────────────────────────────
  const inp = { background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:'9px 12px', color:'#1a1a2e', fontSize:13, width:'100%', boxSizing:'border-box' }
  const lbl = (t) => <div style={{ fontSize:11, color:'#9a9ab0', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:5, fontWeight:700 }}>{t}</div>
  const colors = COLORS || ['#1e6b3a','#3b82f6','#f59e0b','#ec4899','#8b5cf6','#ef4444','#06b6d4','#10b981']

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, padding:16 }}
      onClick={e => e.target === e.currentTarget && step !== 'importing' && onClose()}
    >
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:680, maxHeight:'92vh', overflow:'auto', boxShadow:'0 20px 70px rgba(0,0,0,0.22)', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ padding:'18px 24px', borderBottom:'1px solid #f0f0f5', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'#fff', zIndex:1 }}>
          <div>
            <h2 style={{ fontSize:17, fontWeight:800, color:'#1a1a2e', margin:0 }}>📥 Importar Lista</h2>
            <div style={{ fontSize:11, color:'#9a9ab0', marginTop:2 }}>
              {step === 'upload'    && 'Envie um arquivo Excel ou CSV'}
              {step === 'preview'   && `${rows.length} linhas detectadas — configure e importe`}
              {step === 'importing' && 'Importando, aguarde...'}
              {step === 'done'      && 'Importação finalizada'}
            </div>
          </div>
          {step !== 'importing' && (
            <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, color:'#9a9ab0', cursor:'pointer' }}>×</button>
          )}
        </div>

        <div style={{ padding:24, flex:1 }}>

          {/* ── UPLOAD ── */}
          {step === 'upload' && (
            <>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => !parsing && fileRef.current?.click()}
                style={{ border:`2px dashed ${dragging?'#1e6b3a':'#d0d0e0'}`, borderRadius:14, padding:'48px 24px', textAlign:'center', cursor:'pointer', background:dragging?'#f0faf4':'#fafafa', transition:'all 0.2s', marginBottom:16 }}
              >
                <div style={{ fontSize:40, marginBottom:12 }}>{parsing ? '⏳' : '📁'}</div>
                <div style={{ fontSize:15, fontWeight:700, color:'#1a1a2e', marginBottom:6 }}>
                  {parsing ? 'Lendo arquivo...' : 'Arraste o arquivo aqui ou clique para selecionar'}
                </div>
                <div style={{ fontSize:12, color:'#9a9ab0' }}>Aceita .xlsx, .xls e .csv</div>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,text/csv" style={{ display:'none' }}
                onChange={e => handleFile(e.target.files[0])} />

              {parseError && (
                <div style={{ background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:10, padding:12, fontSize:13, color:'#dc2626', marginBottom:16 }}>
                  ❌ {parseError}
                </div>
              )}

              <div style={{ background:'#f8f8fc', borderRadius:10, padding:14, fontSize:12, color:'#6a6a7a', lineHeight:1.9 }}>
                <div style={{ fontWeight:700, color:'#1a1a2e', marginBottom:6 }}>Colunas esperadas (detecção automática):</div>
                <div>• <b>Nome</b> / name — nome do lead (obrigatório)</div>
                <div>• <b>Cargo</b> / title / job_title</div>
                <div>• <b>Empresa</b> / company</div>
                <div>• <b>LinkedIn</b> / linkedin_url / perfil</div>
                <div>• Email, Telefone, Cidade (opcionais)</div>
              </div>
            </>
          )}

          {/* ── PREVIEW ── */}
          {step === 'preview' && (
            <>
              {/* Nome e configuração da lista */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:18 }}>
                <div style={{ gridColumn:'1/-1' }}>
                  {lbl('Nome da lista *')}
                  <input value={listName} onChange={e => setListName(e.target.value)}
                    placeholder="Ex: Gerentes Cooperativas GO" style={inp} autoFocus />
                </div>
                <div>
                  {lbl('Descrição (opcional)')}
                  <input value={listDesc} onChange={e => setListDesc(e.target.value)}
                    placeholder="Origem, contexto..." style={inp} />
                </div>
                <div>
                  {lbl('Cor')}
                  <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginTop:4 }}>
                    {colors.map(c => (
                      <div key={c} onClick={() => setListColor(c)}
                        style={{ width:24, height:24, borderRadius:'50%', background:c, cursor:'pointer', border:listColor===c?'3px solid #1a1a2e':'2px solid transparent', transition:'all 0.15s' }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Mapeamento */}
              <div style={{ marginBottom:16 }}>
                {lbl('Mapeamento de colunas')}
                <div style={{ background:'#f8f8fc', borderRadius:10, padding:12 }}>
                  {Object.entries(FIELD_LABELS).map(([field, label]) => (
                    <div key={field} style={{ display:'grid', gridTemplateColumns:'160px 20px 1fr', gap:8, alignItems:'center', marginBottom:6 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'#1a1a2e' }}>{label}</div>
                      <div style={{ textAlign:'center', color:'#c0c0d0' }}>→</div>
                      <select value={mapping[field] || ''}
                        onChange={e => setMapping(p => ({ ...p, [field]: e.target.value || undefined }))}
                        style={{ ...inp, padding:'6px 8px', fontSize:12 }}>
                        <option value="">— não importar —</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                {!mapping.full_name && (
                  <div style={{ fontSize:12, color:'#dc2626', marginTop:6 }}>
                    ⚠️ Selecione a coluna de <b>Nome</b> — é obrigatória.
                  </div>
                )}
              </div>

              {/* Preview tabela */}
              <div style={{ marginBottom:18 }}>
                {lbl(`Preview — ${Math.min(5, rows.length)} de ${rows.length} linhas`)}
                <div style={{ overflowX:'auto', borderRadius:10, border:'1px solid #e8e8f0' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                    <thead>
                      <tr style={{ background:'#f8f8fc' }}>
                        {Object.entries(FIELD_LABELS).filter(([f]) => mapping[f]).map(([f, l]) => (
                          <th key={f} style={{ padding:'8px 10px', textAlign:'left', color:'#9a9ab0', fontWeight:700, textTransform:'uppercase', fontSize:9, whiteSpace:'nowrap' }}>
                            {l.replace(' *', '')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((row, i) => (
                        <tr key={i} style={{ borderTop:'1px solid #f0f0f5' }}>
                          {Object.keys(FIELD_LABELS).filter(f => mapping[f]).map(f => (
                            <td key={f} style={{ padding:'7px 10px', color:'#4a4a5a', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {row[mapping[f]] || <span style={{ color:'#d0d0d0' }}>—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => { setStep('upload'); setRows([]); setHeaders([]) }}
                  style={{ flex:1, background:'#fff', border:'1px solid #e0e0ea', borderRadius:9, color:'#6a6a7a', padding:12, fontSize:13 }}>
                  ← Trocar arquivo
                </button>
                <button onClick={doImport}
                  disabled={!listName.trim() || !mapping.full_name}
                  style={{ flex:2, background:(!listName.trim()||!mapping.full_name)?'#e0e0ea':'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:9, color:(!listName.trim()||!mapping.full_name)?'#9a9ab0':'#fff', padding:12, fontSize:14, fontWeight:800, cursor:(!listName.trim()||!mapping.full_name)?'not-allowed':'pointer' }}>
                  Importar {rows.length} leads →
                </button>
              </div>
            </>
          )}

          {/* ── IMPORTANDO ── */}
          {step === 'importing' && (
            <div style={{ textAlign:'center', padding:'36px 0' }}>
              <div style={{ fontSize:40, marginBottom:16 }}>⏳</div>
              <div style={{ fontSize:16, fontWeight:700, color:'#1a1a2e', marginBottom:6 }}>Importando leads...</div>
              <div style={{ fontSize:12, color:'#9a9ab0', marginBottom:28 }}>Não feche esta janela</div>
              <div style={{ background:'#f0f0f5', borderRadius:99, height:8, overflow:'hidden', maxWidth:320, margin:'0 auto 10px' }}>
                <div style={{ height:'100%', background:'linear-gradient(90deg,#1e6b3a,#2d9e4f)', borderRadius:99, width:`${progress}%`, transition:'width 0.5s' }} />
              </div>
              <div style={{ fontSize:12, color:'#9a9ab0' }}>{progress}%</div>
            </div>
          )}

          {/* ── RESULTADO ── */}
          {step === 'done' && result && (
            <>
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

              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
                {[
                  ['Total lido',  result.total,      '#6a6a7a'],
                  ['Importados',  result.imported,   '#059669'],
                  ['Duplicados',  result.duplicates, '#f59e0b'],
                  ['Inválidos',   result.invalid,    '#dc2626'],
                ].map(([l, v, c]) => (
                  <div key={l} style={{ background:'#f8f8fc', border:`1px solid ${c}22`, borderRadius:10, padding:'14px 10px', textAlign:'center' }}>
                    <div style={{ fontSize:28, fontWeight:900, color:c, fontFamily:'monospace' }}>{v}</div>
                    <div style={{ fontSize:10, color:'#9a9ab0', textTransform:'uppercase', fontWeight:700, marginTop:3 }}>{l}</div>
                  </div>
                ))}
              </div>

              {result.duplicates > 0 && (
                <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:10, padding:12, fontSize:12, color:'#92400e', marginBottom:14 }}>
                  ⚠️ {result.duplicates} lead{result.duplicates > 1 ? 's foram ignorados' : ' foi ignorado'} por já existir no sistema (dedup por LinkedIn URL ou Nome+Empresa).
                </div>
              )}

              {result.errors?.length > 0 && (
                <div style={{ background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:10, padding:12, marginBottom:14 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#dc2626', marginBottom:6 }}>Erros encontrados:</div>
                  {result.errors.map((e, i) => <div key={i} style={{ fontSize:11, color:'#dc2626' }}>• {e}</div>)}
                </div>
              )}

              {result.fatalError && (
                <div style={{ background:'#fff5f5', border:'1px solid #ffd0d0', borderRadius:10, padding:12, fontSize:13, color:'#dc2626', marginBottom:14 }}>
                  Erro fatal: {result.fatalError}
                </div>
              )}

              <button onClick={onClose}
                style={{ width:'100%', background:'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:9, color:'#fff', padding:13, fontSize:14, fontWeight:800 }}>
                Ver lista importada
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
