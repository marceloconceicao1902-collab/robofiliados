export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Robo Filiados — Shopee & Mercado Livre</title>
<style>
  :root {
    --bg: #0b0f19;
    --bg2: #111827;
    --card: #171f33;
    --card2: #1f2a45;
    --primary: #6366f1;
    --primary2: #8b5cf6;
    --green: #10b981;
    --red: #ef4444;
    --yellow: #f59e0b;
    --text: #e5e7eb;
    --muted: #94a3b8;
    --border: #233054;
    --grad: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
  }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; background: var(--bg); color: var(--text); font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
  body {
    min-height: 100vh;
    background:
      radial-gradient(1200px 600px at 10% -10%, rgba(99,102,241,0.20), transparent 60%),
      radial-gradient(900px 500px at 90% 0%, rgba(236,72,153,0.18), transparent 60%),
      var(--bg);
  }
  header {
    padding: 28px 36px;
    display:flex; align-items:center; justify-content:space-between;
    border-bottom: 1px solid var(--border);
    backdrop-filter: blur(8px);
    position: sticky; top: 0; z-index: 10;
    background: rgba(11,15,25,0.75);
  }
  .brand { display:flex; align-items:center; gap: 14px; }
  .logo {
    width:46px; height:46px; border-radius: 12px;
    background: var(--grad);
    display:flex; align-items:center; justify-content:center;
    box-shadow: 0 8px 24px rgba(99,102,241,0.35);
  }
  h1 { font-size: 20px; margin: 0; letter-spacing: 0.2px; }
  .sub { color: var(--muted); font-size: 13px; margin-top: 2px; }
  .badge {
    display:inline-flex; align-items:center; gap:6px;
    padding: 6px 10px; border-radius: 999px;
    background: rgba(16,185,129,0.12); color: #34d399;
    border: 1px solid rgba(16,185,129,0.30);
    font-size: 12px; font-weight: 600;
  }
  .dot { width:8px; height:8px; border-radius:50%; background: var(--green); box-shadow: 0 0 0 3px rgba(16,185,129,0.18); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100% { transform: scale(1); opacity: 1 } 50% { transform: scale(1.25); opacity: 0.7 } }

  main { padding: 32px 36px 80px; max-width: 1240px; margin: 0 auto; }
  h2 { font-size: 18px; margin: 0 0 16px; color: #f8fafc; }
  .grid-cards {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px; margin-bottom: 32px;
  }
  .card {
    background: linear-gradient(180deg, var(--card) 0%, var(--card2) 100%);
    border: 1px solid var(--border);
    border-radius: 16px; padding: 20px;
    transition: transform 0.15s ease, border-color 0.15s ease;
  }
  .card:hover { transform: translateY(-2px); border-color: rgba(139,92,246,0.5); }
  .k { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  .v { font-size: 24px; font-weight: 700; margin-top: 8px; color: #f8fafc; }
  .chip { display:inline-block; margin-top:10px; padding: 3px 8px; border-radius: 6px; background: rgba(99,102,241,0.14); color: #a5b4fc; font-size: 11px; font-weight: 600; }

  .layout { display:grid; grid-template-columns: 1.2fr 1fr; gap: 20px; margin-bottom: 32px; }
  @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
  .panel {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px; padding: 22px;
  }
  .form-row { display:flex; gap:10px; align-items:center; margin-bottom: 10px; }
  label { width: 140px; color: var(--muted); font-size: 13px; }
  input, select, textarea {
    flex: 1; background: var(--bg2); border: 1px solid var(--border);
    color: var(--text); border-radius: 10px; padding: 10px 12px;
    font-size: 14px; outline: none; transition: border-color 0.15s;
  }
  input:focus, select:focus, textarea:focus { border-color: var(--primary); }
  textarea { min-height: 100px; resize: vertical; font-family: inherit; }
  .btn {
    display:inline-flex; align-items:center; justify-content:center; gap:8px;
    background: var(--grad); color: white; border: 0; cursor:pointer;
    padding: 11px 18px; border-radius: 10px; font-weight: 600; font-size: 14px;
    box-shadow: 0 8px 20px rgba(99,102,241,0.30);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .btn:hover { transform: translateY(-1px); box-shadow: 0 12px 26px rgba(139,92,246,0.35); }
  .btn.secondary { background: var(--bg2); border: 1px solid var(--border); box-shadow:none; color: var(--text); }
  .actions { margin-top: 14px; display:flex; gap:10px; flex-wrap:wrap; }
  .result {
    margin-top: 14px; padding: 12px 14px; border-radius: 10px;
    background: #0c1222; border: 1px solid var(--border); color: #cbd5e1;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 12.5px; white-space: pre-wrap; word-break: break-word; min-height: 50px;
  }
  .result.ok { border-color: rgba(16,185,129,0.4); }
  .result.err { border-color: rgba(239,68,68,0.4); }

  table { width:100%; border-collapse: collapse; font-size: 13.5px; }
  th { text-align:left; color: var(--muted); font-weight:600; padding: 10px 10px; border-bottom: 1px solid var(--border); }
  td { padding: 10px 10px; border-bottom: 1px dashed var(--border); color: #e2e8f0; vertical-align: top; }
  code { background: var(--bg2); padding: 2px 6px; border-radius: 6px; font-size: 12.5px; border: 1px solid var(--border); color: #f0abfc; }
  td a { color: #a5b4fc; text-decoration: none; font-weight: 500; }
  td a:hover { text-decoration: underline; }
  .pill { display:inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight:700; }
  .pill.get  { background: rgba(59,130,246,0.16); color: #93c5fd; }
  .pill.post { background: rgba(16,185,129,0.16); color: #6ee7b7; }
  .pill.put  { background: rgba(245,158,11,0.16); color: #fcd34d; }
  .pill.del  { background: rgba(239,68,68,0.16); color: #fca5a5; }

  footer { text-align:center; color: var(--muted); font-size: 12.5px; padding: 20px; border-top: 1px solid var(--border); }
  footer b { color: var(--text); }
</style>
</head>
<body>
<header>
  <div class="brand">
    <div class="logo" aria-hidden="true">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/>
      </svg>
    </div>
    <div>
      <h1>Robo Filiados</h1>
      <div class="sub">Shopee · Mercado Livre · WhatsApp em massa</div>
    </div>
  </div>
  <div id="status"><span class="badge"><span class="dot"></span><span id="statustxt">Verificando API...</span></span></div>
</header>

<main>
  <h2>Status Geral</h2>
  <div class="grid-cards">
    <div class="card"><div class="k">Ambiente</div><div class="v" id="env-val">—</div><div class="chip">NODE_ENV</div></div>
    <div class="card"><div class="k">Porta (Interna)</div><div class="v" id="port-val">—</div><div class="chip">Serviço HTTP</div></div>
    <div class="card"><div class="k">Provider WhatsApp</div><div class="v" id="wap-val">—</div><div class="chip">Evolution / Baileys</div></div>
    <div class="card"><div class="k">Anti-Duplicidade</div><div class="v" id="dup-val">— h</div><div class="chip">Janela de Bloqueio</div></div>
  </div>

  <div class="layout">
    <div class="panel">
      <h2 style="margin-bottom:14px;">Acionar Campanha Manual</h2>
      <div class="form-row"><label>Plataforma</label>
        <select id="fplat"><option value="shopee">Shopee</option><option value="mercadolivre">Mercado Livre</option><option value="both">Ambas</option></select>
      </div>
      <div class="form-row"><label>Palavra-chave</label>
        <input id="fkw" type="text" placeholder="Ex: notebook, smartphone, liquidificador" value="oferta do dia"/>
      </div>
      <div class="form-row"><label>Máx. produtos</label>
        <input id="fmax" type="number" min="1" max="100" value="10"/>
      </div>
      <div class="form-row"><label>Grupos (IDs, um por linha)</label>
        <textarea id="fgrp" placeholder="Ex:&#10;120363202345678901@g.us&#10;5511999998888@c.us"></textarea>
      </div>
      <div class="actions">
        <button class="btn" onclick="runCampaign()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 4 20 12 6 20 6 4"/></svg>
          Rodar Campanha
        </button>
        <button class="btn secondary" onclick="health()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          Testar /health
        </button>
        <button class="btn secondary" onclick="groups()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Listar Grupos
        </button>
      </div>
      <div class="result" id="out">Clique em qualquer ação para ver a resposta da API aqui...</div>
    </div>

    <div class="panel">
      <h2 style="margin-bottom:14px;">Endpoints da API</h2>
      <table>
        <thead><tr><th>Método</th><th>Rota</th><th>Descrição</th></tr></thead>
        <tbody>
          <tr><td><span class="pill get">GET</span></td><td><code><a href="/api/health" target="_blank">/api/health</a></code></td><td>Status do serviço e configurações</td></tr>
          <tr><td><span class="pill post">POST</span></td><td><code>/api/campaigns/run</code></td><td>Captura ofertas + formata + envia em massa</td></tr>
          <tr><td><span class="pill get">GET</span></td><td><code><a href="/api/groups" target="_blank">/api/groups</a></code></td><td>Lista grupos/contatos do WhatsApp</td></tr>
          <tr><td><span class="pill get">GET</span></td><td><code><a href="/api/campaigns" target="_blank">/api/campaigns</a></code></td><td>Histórico de campanhas</td></tr>
          <tr><td><span class="pill post">POST</span></td><td><code>/api/groups</code></td><td>Cadastrar novo grupo</td></tr>
          <tr><td><span class="pill get">GET</span></td><td><code><a href="/api/products" target="_blank">/api/products</a></code></td><td>Últimos produtos capturados</td></tr>
        </tbody>
      </table>
      <div style="margin-top:16px; padding:12px 14px; border-radius:10px; background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.25);">
        <div style="color:#a5b4fc; font-size:12.5px; font-weight:700; margin-bottom:4px;">⚠️ Serverless — Limitações</div>
        <div style="color:#cbd5e1; font-size:13px; line-height:1.55;">
          Cron jobs e Workers BullMQ <b>não rodam</b> em serverless. Troque por: Vercel Cron (HTTP triggers) + Evolution API (sessões WhatsApp persistentes) + Supabase/Firestore (substituir SQLite).
        </div>
      </div>
    </div>
  </div>
</main>
<footer>
  <div><b>Robo Filiados</b> — API rodando em <code id="vhost">host</code> · <span id="vtime">-</span></div>
</footer>

<script>
const $ = (id) => document.getElementById(id);

function setResult(txt, ok=true) {
  const el = $('out');
  el.textContent = txt;
  el.classList.toggle('ok', ok);
  el.classList.toggle('err', !ok);
}

async function health() {
  setResult('GET /api/health ...');
  try {
    const r = await fetch('/api/health', { cache: 'no-store' });
    const t = await r.text();
    let out;
    try { out = JSON.stringify(JSON.parse(t), null, 2); } catch { out = t; }
    setResult((r.ok ? 'HTTP '+r.status+' OK\n\n' : 'HTTP '+r.status+' ERRO\n\n') + out, r.ok);

    try {
      const j = JSON.parse(t);
      if (j.env)       $('env-val').textContent = j.env;
      if (j.port)      $('port-val').textContent = j.port;
      if (j.whatsapp)  $('wap-val').textContent  = j.whatsapp;
      if (j.antiDuplicateHours) $('dup-val').textContent = j.antiDuplicateHours + ' h';
      if (j.time)      $('vtime').textContent    = new Date(j.time).toLocaleString('pt-BR');
      if (j.status === 'ok' || r.ok) {
        $('statustxt').textContent = 'API Online';
      }
    } catch {}
  } catch (e) {
    setResult('ERRO: ' + e.message, false);
    $('statustxt').textContent = 'Indisponível';
  }
}

async function groups() {
  setResult('GET /api/groups ...');
  try {
    const r = await fetch('/api/groups');
    const t = await r.text();
    let out; try { out = JSON.stringify(JSON.parse(t), null, 2); } catch { out = t; }
    setResult((r.ok ? 'HTTP '+r.status+' OK\n\n' : 'HTTP '+r.status+' ERRO\n\n') + out, r.ok);
  } catch (e) { setResult('ERRO: ' + e.message, false); }
}

async function runCampaign() {
  const payload = {
    platform: $('fplat').value,
    keyword:  $('fkw').value,
    maxProducts: parseInt($('fmax').value || '10', 10),
    groups: $('fgrp').value.split('\n').map(s=>s.trim()).filter(Boolean),
  };
  setResult('POST /api/campaigns/run ...\nBody:\n' + JSON.stringify(payload, null, 2));
  try {
    const r = await fetch('/api/campaigns/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const t = await r.text();
    let out; try { out = JSON.stringify(JSON.parse(t), null, 2); } catch { out = t; }
    setResult((r.ok ? 'HTTP '+r.status+' OK\n\nRESPOSTA:\n' : 'HTTP '+r.status+' ERRO\n\n') + out, r.ok);
  } catch (e) { setResult('ERRO: ' + e.message, false); }
}

// Boot
$('vhost').textContent = location.host;
health();
</script>
</body>
</html>
`;
