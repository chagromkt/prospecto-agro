import { useState, useEffect } from 'react'
import { sb, getProfileId } from '../config.js'

const TIMEZONES = [
  'America/Sao_Paulo','America/Manaus','America/Belem',
  'America/Fortaleza','America/Recife','America/Cuiaba'
]

const Section = ({ title, icon, children }) => (
  <div style={{ background:'#ffffff', border:'1px solid #e8e8f0', borderRadius:12, padding:24, marginBottom:16, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, paddingBottom:14, borderBottom:'1px solid #f0f0f5' }}>
      <span style={{ fontSize:20 }}>{icon}</span>
      <span style={{ fontSize:15, fontWeight:700, color:'#1a1a2e' }}>{title}</span>
    </div>
    {children}
  </div>
)

const Field = ({ label, hint, children }) => (
  <div style={{ marginBottom:16 }}>
    <div style={{ fontSize:11, color:'#9a9ab0', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5, fontWeight:600 }}>{label}</div>
    {children}
    {hint && <div style={{ fontSize:11, color:'#c0c0d0', marginTop:4 }}>{hint}</div>}
  </div>
)

const KeyInput = ({ value, onChange, placeholder, testStatus }) => {
  const [show, setShow] = useState(false)
  return (
    <div style={{ display:'flex', gap:8 }}>
      <div style={{ flex:1, position:'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || '••••••••••••••••••••••'}
          style={{ width:'100%', background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:'9px 38px 9px 12px', color:'#1a1a2e', fontSize:13, fontFamily:'monospace' }}
        />
        <button onClick={() => setShow(s => !s)}
          style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#9a9ab0', cursor:'pointer', fontSize:14 }}>
          {show ? '🙈' : '👁'}
        </button>
      </div>
      {testStatus && (
        <div style={{ display:'flex', alignItems:'center', padding:'0 12px', borderRadius:8, background:testStatus==='ok'?'#f0faf4':testStatus==='error'?'#fff5f5':'#f8f8fc', border:`1px solid ${testStatus==='ok'?'#b8e8c8':testStatus==='error'?'#ffd0d0':'#e0e0ea'}`, fontSize:12, color:testStatus==='ok'?'#059669':testStatus==='error'?'#dc2626':'#9a9ab0', flexShrink:0 }}>
          {testStatus==='ok'?'✓ OK':testStatus==='error'?'✕ Erro':testStatus==='testing'?'..':'—'}
        </div>
      )}
    </div>
  )
}

export default function Configuracoes() {
  const [cfg, setCfg] = useState({
    unipile_key:'', unipile_account_id:'',
    anthropic_key:'', openai_key:'',
    rd_station_token:'', rd_station_identifier:'',
    daily_connection_limit:30, daily_message_limit:50, daily_comment_limit:20,
    working_hours_start:8, working_hours_end:18,
    timezone:'America/Sao_Paulo'
  })
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testStatus, setTestStatus] = useState({})
  const [exists, setExists] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [s, p] = await Promise.all([
        sb(`settings?profile_id=eq.${getProfileId()}`),
        sb(`profiles?id=eq.${getProfileId()}`)
      ])
      if (s?.length) { setCfg(prev => ({ ...prev, ...s[0] })); setExists(true) }
      if (p?.length) setProfile(p[0])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = { ...cfg, profile_id: getProfileId() }
      if (exists) {
        await sb(`settings?profile_id=eq.${getProfileId()}`, { method:'PATCH', body:JSON.stringify(cfg) })
      } else {
        await sb('settings', { method:'POST', body:JSON.stringify(payload) })
        setExists(true)
      }
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const testUnipile = async () => {
    if (!cfg.unipile_key) return
    setTestStatus(s => ({...s, unipile:'testing'}))
    try {
      const r = await fetch(`https://api35.unipile.com:16513/api/v1/accounts`, {
        headers:{ 'X-API-KEY': cfg.unipile_key, 'Content-Type':'application/json' }
      })
      setTestStatus(s => ({...s, unipile: r.ok ? 'ok' : 'error'}))
    } catch { setTestStatus(s => ({...s, unipile:'error'})) }
  }

  const testAnthropic = async () => {
    if (!cfg.anthropic_key) return
    setTestStatus(s => ({...s, anthropic:'testing'}))
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{ 'x-api-key':cfg.anthropic_key, 'anthropic-version':'2023-06-01', 'Content-Type':'application/json' },
        body:JSON.stringify({ model:'claude-haiku-4-5-20251001', max_tokens:10, messages:[{role:'user',content:'hi'}] })
      })
      setTestStatus(s => ({...s, anthropic: r.ok ? 'ok' : 'error'}))
    } catch { setTestStatus(s => ({...s, anthropic:'error'})) }
  }

  const upd = (k, v) => setCfg(p => ({...p, [k]:v}))
  const inp = { width:'100%', background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, padding:'9px 12px', color:'#1a1a2e', fontSize:13 }

  if (loading) return <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#9a9ab0' }}>Carregando...</div>

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'28px 32px', background:'#f8f8fc' }}>
      <div style={{ maxWidth:680 }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:20, color:'#1a1a2e', fontWeight:700 }}>Configurações</h1>
            <p style={{ fontSize:12, color:'#9a9ab0', marginTop:4 }}>Integrações, limites e preferências do sistema</p>
          </div>
          <button onClick={save} disabled={saving}
            style={{ background:saved?'#059669':saving?'#e0e0ea':'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:saving?'#9a9ab0':'#fff', padding:'10px 24px', fontSize:13, fontWeight:700, transition:'all 0.3s' }}>
            {saved ? '✓ Salvo!' : saving ? 'Salvando...' : '💾 Salvar configurações'}
          </button>
        </div>

        {/* Perfil */}
        {profile && (
          <Section title="Perfil" icon="👤">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Nome">
                <input value={profile.full_name||''} readOnly style={{ ...inp, color:'#9a9ab0' }} />
              </Field>
              <Field label="Email">
                <input value={profile.email||''} readOnly style={{ ...inp, color:'#9a9ab0' }} />
              </Field>
            </div>
            <div style={{ background:'#f8f8fc', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#9a9ab0' }}>
              Para alterar nome ou email, acesse o Supabase Dashboard → Authentication.
            </div>
          </Section>
        )}

        {/* Unipile */}
        <Section title="Unipile — LinkedIn Integration" icon="🔗">
          <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#1d4ed8' }}>
            A chave Unipile é usada para visitar perfis, enviar conexões, mensagens, curtir e comentar posts automaticamente.
          </div>
          <Field label="API Key" hint="Encontre em: Unipile Dashboard → API Keys">
            <div style={{ display:'flex', gap:8 }}>
              <div style={{ flex:1 }}>
                <KeyInput value={cfg.unipile_key||''} onChange={v=>upd('unipile_key',v)} placeholder="uni_live_xxxx..." testStatus={testStatus.unipile} />
              </div>
              <button onClick={testUnipile} disabled={!cfg.unipile_key||testStatus.unipile==='testing'}
                style={{ background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:'9px 14px', fontSize:12, flexShrink:0 }}>
                Testar
              </button>
            </div>
          </Field>
          <Field label="Account ID (LinkedIn)" hint="ID da conta LinkedIn conectada no Unipile">
            <input value={cfg.unipile_account_id||''} onChange={e=>upd('unipile_account_id',e.target.value)}
              placeholder="vkBWhZzXRem_6xPe1kppKg" style={inp} />
          </Field>
        </Section>

        {/* Anthropic */}
        <Section title="Anthropic — IA de Texto" icon="🤖">
          <div style={{ background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#5b21b6' }}>
            Usada para enriquecer leads, gerar mensagens personalizadas, comentários e posts.
          </div>
          <Field label="API Key" hint="Encontre em: console.anthropic.com → API Keys">
            <div style={{ display:'flex', gap:8 }}>
              <div style={{ flex:1 }}>
                <KeyInput value={cfg.anthropic_key||''} onChange={v=>upd('anthropic_key',v)} placeholder="sk-ant-api03-xxxx..." testStatus={testStatus.anthropic} />
              </div>
              <button onClick={testAnthropic} disabled={!cfg.anthropic_key||testStatus.anthropic==='testing'}
                style={{ background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:'9px 14px', fontSize:12, flexShrink:0 }}>
                Testar
              </button>
            </div>
          </Field>
        </Section>

        {/* OpenAI */}
        <Section title="OpenAI — Geração de Imagens" icon="🎨">
          <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#166534' }}>
            Usada pelo W8 para gerar imagens com DALL-E 3 para os posts do LinkedIn.
          </div>
          <Field label="API Key" hint="Encontre em: platform.openai.com → API Keys">
            <KeyInput value={cfg.openai_key||''} onChange={v=>upd('openai_key',v)} placeholder="sk-proj-xxxx..." />
          </Field>
        </Section>

        {/* RD Station */}
        <Section title="RD Station Marketing" icon="📊">
          <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#c2410c' }}>
            Usado pelo W6 para enviar leads qualificados ao RD Station com ICP Score e dores mapeadas.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Token de acesso" hint="RD Station → Integrações → API → Token">
              <KeyInput value={cfg.rd_station_token||''} onChange={v=>upd('rd_station_token',v)} placeholder="seu-token-rd..." />
            </Field>
            <Field label="Identificador" hint="Email ou identificador único no RD">
              <input value={cfg.rd_station_identifier||''} onChange={e=>upd('rd_station_identifier',e.target.value)}
                placeholder="ben@chasocial.com.br" style={inp} />
            </Field>
          </div>
        </Section>

        {/* Limites diários */}
        <Section title="Limites Diários de Ações" icon="⚡">
          <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#92400e' }}>
            ⚠️ LinkedIn limita ~80-100 ações/dia no total. Recomendamos máx. 30-40 para segurança da conta.
          </div>
          {[
            ['daily_connection_limit', 'Pedidos de conexão/dia', 1, 50],
            ['daily_message_limit', 'Mensagens/dia', 1, 80],
            ['daily_comment_limit', 'Comentários/dia', 1, 50],
          ].map(([key, label, min, max]) => (
            <div key={key} style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:12, color:'#6a6a7a', fontWeight:600 }}>{label}</span>
                <span style={{ fontSize:16, fontWeight:900, color:'#1e6b3a', fontFamily:'monospace' }}>{cfg[key]}</span>
              </div>
              <input type="range" min={min} max={max} value={cfg[key]}
                onChange={e => upd(key, parseInt(e.target.value))}
                style={{ width:'100%', accentColor:'#1e6b3a' }} />
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#c0c0d0', marginTop:2 }}>
                <span>{min}</span><span>{max}</span>
              </div>
            </div>
          ))}
        </Section>

        {/* Horário de funcionamento */}
        <Section title="Horário de Operação" icon="🕐">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <Field label="Início">
              <select value={cfg.working_hours_start} onChange={e=>upd('working_hours_start',parseInt(e.target.value))} style={inp}>
                {Array.from({length:16},(_,i)=>i+6).map(h=><option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}
              </select>
            </Field>
            <Field label="Fim">
              <select value={cfg.working_hours_end} onChange={e=>upd('working_hours_end',parseInt(e.target.value))} style={inp}>
                {Array.from({length:16},(_,i)=>i+8).map(h=><option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}
              </select>
            </Field>
            <Field label="Fuso horário">
              <select value={cfg.timezone} onChange={e=>upd('timezone',e.target.value)} style={inp}>
                {TIMEZONES.map(t=><option key={t} value={t}>{t.replace('America/','')}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ background:'#f8f8fc', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#9a9ab0' }}>
            O motor de campanha só executa ações dentro deste horário. Fora dele, as execuções são adiadas para o próximo dia.
          </div>
        </Section>

        {/* Salvar bottom */}
        <div style={{ display:'flex', justifyContent:'flex-end', paddingBottom:32 }}>
          <button onClick={save} disabled={saving}
            style={{ background:saved?'#059669':saving?'#e0e0ea':'linear-gradient(135deg,#1e6b3a,#2d9e4f)', border:'none', borderRadius:8, color:saving?'#9a9ab0':'#fff', padding:'12px 32px', fontSize:14, fontWeight:700, transition:'all 0.3s' }}>
            {saved ? '✓ Configurações salvas!' : saving ? 'Salvando...' : '💾 Salvar configurações'}
          </button>
        </div>

      </div>
    </div>
  )
}
