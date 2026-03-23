import { useState, useEffect } from 'react'
import { sb, getProfileId, getAccessToken, SB_URL, SB_KEY } from '../config.js'

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
    unipile_key:'', unipile_account_id:'', unipile_dsn:'',
    evolution_api_url:'', evolution_api_key:'', evolution_instance:'',
    anthropic_key:'', openai_key:'',
    rd_station_token:'', rd_station_identifier:'',
    gpt_model:'gpt-4o-mini',
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
      // Remove campos nulos/vazios que podem causar conflito
      Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] === null) delete payload[k] })
      payload.profile_id = getProfileId() // garante sempre presente

      // Upsert: cria se não existe, atualiza se existe — via header Prefer
      const token = getAccessToken()
      const res = await fetch(`${SB_URL}/rest/v1/settings`, {
        method: 'POST',
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation,resolution=merge-duplicates',
        },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`${res.status}: ${err}`)
      }
      setExists(true)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      console.error('Settings save error:', e)
      alert(`Erro ao salvar: ${e.message}`)
    }
    setSaving(false)
  }

  const testUnipile = async () => {
    if (!cfg.unipile_key) return
    setTestStatus(s => ({...s, unipile:'testing'}))
    try {
      // Chama via Edge Function para evitar CORS block no browser
      const r = await fetch(`https://juabbkewrtbignqrufgp.supabase.co/functions/v1/test-unipile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: cfg.unipile_key, account_id: cfg.unipile_account_id })
      })
      const d = await r.json().catch(() => ({}))
      setTestStatus(s => ({...s, unipile: d.ok ? 'ok' : 'error'}))
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
            Configure suas credenciais do Unipile. Cada conta tem uma URL DSN única fornecida no painel do Unipile.
          </div>

          <Field label="DSN (URL da API)" hint="Encontre em: Unipile Dashboard → Configurações. Ex: api33.unipile.com:16348">
            <input value={cfg.unipile_dsn||''} onChange={e=>upd('unipile_dsn',e.target.value)}
              placeholder="api33.unipile.com:16348" style={inp} />
          </Field>

          <Field label="API Key" hint="Encontre em: Unipile Dashboard → API Keys">
            <div style={{ display:'flex', gap:8 }}>
              <div style={{ flex:1 }}>
                <KeyInput value={cfg.unipile_key||''} onChange={v=>upd('unipile_key',v)} placeholder="XXXX.XXXXXXXXXXXXXXXXX=" testStatus={testStatus.unipile} />
              </div>
              <button onClick={testUnipile} disabled={!cfg.unipile_key||!cfg.unipile_dsn||testStatus.unipile==='testing'}
                style={{ background:'#f8f8fc', border:'1px solid #e0e0ea', borderRadius:8, color:'#6a6a7a', padding:'9px 14px', fontSize:12, flexShrink:0 }}>
                {testStatus.unipile==='testing' ? '...' : testStatus.unipile==='ok' ? '✅' : testStatus.unipile==='error' ? '❌' : 'Testar'}
              </button>
            </div>
          </Field>

          <Field label="Account ID (LinkedIn)" hint="ID da conta LinkedIn conectada no Unipile">
            <input value={cfg.unipile_account_id||''} onChange={e=>upd('unipile_account_id',e.target.value)}
              placeholder="vkBWhZzXRem_6xPe1kppKg" style={inp} />
          </Field>

          <div style={{ background:'#f8f8fc', border:'1px solid #e8e8f0', borderRadius:8, padding:'10px 14px', fontSize:11, color:'#6a6a7a', lineHeight:1.8 }}>
            <strong style={{ color:'#1a1a2e' }}>Como encontrar seus dados:</strong><br/>
            1. Acessa <strong>app.unipile.com</strong> → sua conta<br/>
            2. <strong>DSN</strong>: mostrado em "API Access" (ex: api33.unipile.com:16348)<br/>
            3. <strong>API Key</strong>: em "API Keys" → cria ou copia a chave<br/>
            4. <strong>Account ID</strong>: em "Connected Accounts" → clica na conta LinkedIn
          </div>
        </Section>

        {/* AI status banner */}
        {(cfg.openai_key || cfg.anthropic_key) && (
          <div style={{ background:'#f0faf4', border:'1px solid #b8e8c8', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:20 }}>{cfg.openai_key ? '🟢' : '🟡'}</span>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#1e6b3a' }}>
                IA ativa: {cfg.openai_key ? `OpenAI ${cfg.gpt_model||'gpt-4o-mini'}` : 'Anthropic Claude Haiku'}
              </div>
              <div style={{ fontSize:11, color:'#6a6a7a' }}>
                {cfg.openai_key ? 'GPT será usado para comentários, mensagens e enriquecimento. Claude como backup.' : 'Configure a chave OpenAI para usar GPT no lugar do Claude.'}
              </div>
            </div>
          </div>
        )}

        {/* Anthropic */}
        <Section title="Anthropic — IA de Texto (fallback)" icon="🤖">
          <div style={{ background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#5b21b6' }}>
            Alternativa ao GPT. Se ambas estiverem configuradas, OpenAI é usada por padrão.
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
        <Section title="OpenAI (GPT) — IA Principal" icon="🤖">
          <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#166534' }}>
            Usada para gerar textos, comentários, mensagens e imagens (DALL-E 3). Recomendada como IA principal.
          </div>
          <Field label="API Key" hint="Encontre em: platform.openai.com → API Keys">
            <KeyInput value={cfg.openai_key||''} onChange={v=>upd('openai_key',v)} placeholder="sk-proj-xxxx..." />
          </Field>
          <Field label="Modelo GPT" hint="gpt-4o-mini é o mais rápido e barato para comentários e mensagens">
            <select value={cfg.gpt_model||'gpt-4o-mini'} onChange={e=>upd('gpt_model',e.target.value)} style={inp}>
              <option value="gpt-4o-mini">gpt-4o-mini — Rápido e econômico ✓ Recomendado</option>
              <option value="gpt-4o">gpt-4o — Mais inteligente (mais caro)</option>
              <option value="gpt-4-turbo">gpt-4-turbo</option>
            </select>
          </Field>
        </Section>

        {/* RD Station */}
        <Section title="RD Station — Integração" icon="🔗">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            <Field label="Token de acesso" hint="RD Station → Integrações → API → Token">
              <KeyInput value={cfg.rd_station_token||''} onChange={v=>upd('rd_station_token',v)} placeholder="seu-token-rd..." />
            </Field>
            <Field label="Identificador" hint="Email ou identificador único no RD">
              <input value={cfg.rd_station_identifier||''} onChange={e=>upd('rd_station_identifier',e.target.value)}
                placeholder="ben@chasocial.com.br" style={inp} />
            </Field>
          </div>

          {/* Como configurar no RD */}
          <div style={{ background:'#f0faf4', border:'1px solid #b8e8c8', borderRadius:10, padding:14, marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#1e6b3a', marginBottom:10 }}>
              🔌 Como conectar o RD Station às campanhas
            </div>
            <div style={{ fontSize:12, color:'#4a4a5a', lineHeight:1.8 }}>
              <div><strong>1.</strong> No flow builder de uma campanha, adicione o step <strong>"Webhook RD Station"</strong></div>
              <div><strong>2.</strong> Copie a URL gerada automaticamente para aquela campanha</div>
              <div><strong>3.</strong> No RD Station → <strong>Automações → Ação "Enviar Webhook"</strong></div>
              <div><strong>4.</strong> Cole a URL e configure o payload JSON com as variáveis do contato</div>
              <div><strong>5.</strong> Quando um lead mudar de etapa, ele é localizado no LinkedIn e entra na campanha automaticamente</div>
            </div>
          </div>

          {/* Payload de referência */}
          <Field label="Payload JSON de referência — use no RD Station">
            <div style={{ background:'#1a1a2e', borderRadius:8, padding:12, position:'relative' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('{\n  "nome": "{{contact.name}}",\n  "empresa": "{{contact.company}}",\n  "cargo": "{{contact.job_title}}",\n  "cidade": "{{contact.city}}",\n  "email": "{{contact.email}}",\n  "telefone": "{{contact.mobile_phone}}",\n  "etapa": "{{deal.stage_name}}"\n}')
                  const btn = document.getElementById('copy-rd-payload')
                  if (btn) { btn.textContent = '✓ Copiado!'; setTimeout(() => { btn.textContent = '📋 Copiar' }, 2000) }
                }}
                id="copy-rd-payload"
                style={{ position:'absolute', top:8, right:8, background:'#f0faf4', border:'1px solid #b8e8c8', borderRadius:6, color:'#059669', padding:'3px 10px', fontSize:11, cursor:'pointer' }}>
                📋 Copiar
              </button>
              <pre style={{ fontSize:11, color:'#a8ffa8', margin:0, lineHeight:1.7 }}>{`{
  "nome": "{{contact.name}}",
  "empresa": "{{contact.company}}",
  "cargo": "{{contact.job_title}}",
  "cidade": "{{contact.city}}",
  "email": "{{contact.email}}",
  "telefone": "{{contact.mobile_phone}}",
  "etapa": "{{deal.stage_name}}"
}`}</pre>
            </div>
          </Field>
        </Section>

        {/* Evolution API — WhatsApp */}
        <Section title="WhatsApp — Evolution API" icon="💚">
          <div style={{ background:'#f0fff4', border:'1px solid #b8e8c8', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#128C7E' }}>
            Integre com a Evolution API para enviar mensagens, imagens, vídeos e áudios via WhatsApp nas campanhas e cadências.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <Field label="URL da API" hint="Ex: https://evo.suaempresa.com.br">
                <input value={cfg.evolution_api_url||''} onChange={e=>upd('evolution_api_url',e.target.value)}
                  placeholder="https://evolution.suaempresa.com.br" style={inp} />
              </Field>
            </div>
            <Field label="API Key (Global)" hint="Chave global da Evolution API">
              <KeyInput value={cfg.evolution_api_key||''} onChange={v=>upd('evolution_api_key',v)} placeholder="sua-api-key..." />
            </Field>
            <Field label="Nome da Instância" hint="Nome da instância WhatsApp conectada">
              <input value={cfg.evolution_instance||''} onChange={e=>upd('evolution_instance',e.target.value)}
                placeholder="minha-instancia" style={inp} />
            </Field>
          </div>

          {/* Botão de teste */}
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <button
              onClick={async () => {
                if (!cfg.evolution_api_url || !cfg.evolution_api_key || !cfg.evolution_instance) return
                setTestStatus(s => ({...s, evolution:'testing'}))
                try {
                  const r = await fetch(`https://juabbkewrtbignqrufgp.supabase.co/functions/v1/test-evolution`, {
                    method:'POST',
                    headers:{'Content-Type':'application/json'},
                    body: JSON.stringify({ url: cfg.evolution_api_url, key: cfg.evolution_api_key, instance: cfg.evolution_instance })
                  })
                  const d = await r.json().catch(() => ({}))
                  setTestStatus(s => ({...s, evolution: d.ok ? 'ok' : 'error'}))
                } catch { setTestStatus(s => ({...s, evolution:'error'})) }
              }}
              disabled={!cfg.evolution_api_url||!cfg.evolution_api_key||!cfg.evolution_instance||testStatus.evolution==='testing'}
              style={{ background:'#f0fff4', border:'1px solid #b8e8c8', borderRadius:8, color:'#128C7E', padding:'9px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              {testStatus.evolution==='testing' ? '...' : testStatus.evolution==='ok' ? '✅ Conectado!' : testStatus.evolution==='error' ? '❌ Erro' : '🔌 Testar conexão'}
            </button>
            {testStatus.evolution==='ok' && <span style={{ fontSize:12, color:'#059669' }}>Instância ativa e pronta para envio</span>}
            {testStatus.evolution==='error' && <span style={{ fontSize:12, color:'#dc2626' }}>Verifique a URL, API Key e nome da instância</span>}
          </div>

          <div style={{ background:'#f8f8fc', border:'1px solid #e8e8f0', borderRadius:8, padding:'10px 14px', marginTop:12, fontSize:11, color:'#6a6a7a', lineHeight:1.8 }}>
            <strong style={{ color:'#1a1a2e' }}>Como configurar:</strong><br/>
            1. Acesse seu servidor Evolution API<br/>
            2. <strong>URL</strong>: endereço base da sua instalação (sem /api/v1)<br/>
            3. <strong>API Key</strong>: chave global em <code>Settings → Global API Key</code><br/>
            4. <strong>Instância</strong>: nome da instância WhatsApp já conectada e autenticada
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
