export const DASHBOARD_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
<meta name="theme-color" content="#0b0f19" />
<title>Robo Filiados · Shopee + Mercado Livre + WhatsApp</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{
    font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif;
    background:
      radial-gradient(1200px 600px at -10% -10%, rgba(99,102,241,.18), transparent 60%),
      radial-gradient(1000px 500px at 110% -10%, rgba(236,72,153,.15), transparent 60%),
      radial-gradient(800px 600px at 50% 120%, rgba(16,185,129,.12), transparent 60%),
      #0b0f19;
    color:#e5e7eb; min-height:100vh;
  }
  .wrap{max-width:1180px;margin:0 auto;padding:28px 22px 60px}
  header.h{
    display:flex;align-items:center;justify-content:space-between;gap:16px;
    padding:18px 20px;border-radius:18px;
    background:linear-gradient(135deg,rgba(79,70,229,.22),rgba(168,85,247,.16) 45%,rgba(236,72,153,.14));
    border:1px solid rgba(148,163,184,.15);
    backdrop-filter: blur(8px);
    box-shadow:0 10px 30px rgba(0,0,0,.25);
  }
  .brand{display:flex;align-items:center;gap:14px}
  .logo{
    width:52px;height:52px;border-radius:14px;
    background:linear-gradient(135deg,#6366f1,#a855f7 55%,#ec4899);
    display:grid;place-items:center;color:white;font-weight:900;font-size:22px;
    box-shadow:0 10px 30px rgba(99,102,241,.35);
  }
  .title h1{margin:0;font-size:22px;letter-spacing:.2px;background:linear-gradient(90deg,#fff,#cbd5e1);-webkit-background-clip:text;background-clip:text;color:transparent}
  .title p{margin:2px 0 0;color:#94a3b8;font-size:13px}
  .status{display:flex;align-items:center;gap:10px;padding:8px 14px;border-radius:999px;border:1px solid rgba(74,222,128,.35);background:rgba(34,197,94,.08);color:#86efac;font-weight:600;font-size:13px}
  .status.bad{border-color:rgba(248,113,113,.4);background:rgba(239,68,68,.08);color:#fca5a5}
  .dot{width:9px;height:9px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 0 rgba(34,197,94,.6);animation:pulse 1.8s infinite}
  .status.bad .dot{background:#ef4444;box-shadow:0 0 0 0 rgba(239,68,68,.55);animation:pulseRed 1.8s infinite}
  @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,.55)}70%{box-shadow:0 0 0 12px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}
  @keyframes pulseRed{0%{box-shadow:0 0 0 0 rgba(239,68,68,.5)}70%{box-shadow:0 0 0 12px rgba(239,68,68,0)}100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}}
  .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:22px 0}
  @media(max-width:960px){.grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:560px){.grid{grid-template-columns:1fr}}
  .card{
    background:rgba(15,23,42,.65);border:1px solid rgba(148,163,184,.12);border-radius:16px;padding:16px 18px;
    box-shadow:0 8px 24px rgba(0,0,0,.2);
  }
  .card .lbl{color:#94a3b8;font-size:12px;letter-spacing:.3px;text-transform:uppercase}
  .card .val{margin-top:8px;font-weight:800;font-size:20px;color:#f8fafc;word-break:break-word}
  .pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700}
  .pill.indigo{background:rgba(99,102,241,.15);color:#a5b4fc;border:1px solid rgba(99,102,241,.3)}
  .pill.green{background:rgba(16,185,129,.15);color:#6ee7b7;border:1px solid rgba(16,185,129,.3)}
  .pill.amber{background:rgba(245,158,11,.15);color:#fcd34d;border:1px solid rgba(245,158,11,.3)}
  .pill.pink{background:rgba(236,72,153,.15);color:#f9a8d4;border:1px solid rgba(236,72,153,.3)}
  .section{margin-top:26px;background:rgba(15,23,42,.6);border:1px solid rgba(148,163,184,.12);border-radius:20px;padding:22px;box-shadow:0 10px 28px rgba(0,0,0,.22)}
  h2.s{margin:0 0 14px;font-size:17px;display:flex;align-items:center;gap:10px}
  h2.s .ico{display:grid;place-items:center;width:30px;height:30px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#a855f7);color:white;font-weight:900;font-size:15px}
  .cred-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px}
  .f{display:flex;flex-direction:column;gap:6px;grid-column:span 6}
  .f.full{grid-column:1 / -1}
  .f.w3{grid-column:span 3}
  .f.w4{grid-column:span 4}
  .f.w6{grid-column:span 6}
  .f.w8{grid-column:span 8}
  @media(max-width:880px){.f,.f.w3,.f.w4,.f.w6,.f.w8{grid-column:1/-1}}
  label.l{font-size:12.5px;color:#cbd5e1;font-weight:600}
  label.l small{color:#94a3b8;font-weight:500}
  input[type=text],input[type=password],input[type=url],input[type=number],select,textarea{
    width:100%;background:#0b1120;color:#e5e7eb;border:1px solid rgba(148,163,184,.2);padding:11px 12px;border-radius:12px;font-size:14px;
    outline:none;transition:.15s border-color,.15s background,.15s box-shadow;
  }
  textarea{min-height:110px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace}
  input:focus,select:focus,textarea:focus{border-color:rgba(99,102,241,.6);box-shadow:0 0 0 3px rgba(99,102,241,.2);background:#0b1225}
  .row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:14px}
  button{
    cursor:pointer;border:0;padding:11px 16px;border-radius:12px;font-weight:700;font-size:14px;
    transition:transform .06s ease, filter .15s ease, box-shadow .15s;
    display:inline-flex;align-items:center;gap:8px;
  }
  button:active{transform:translateY(1px)}
  button:disabled{opacity:.55;cursor:not-allowed}
  .b-primary{background:linear-gradient(135deg,#4f46e5,#8b5cf6 55%,#ec4899);color:white;box-shadow:0 10px 28px rgba(99,102,241,.3)}
  .b-success{background:linear-gradient(135deg,#059669,#10b981);color:white;box-shadow:0 10px 28px rgba(16,185,129,.28)}
  .b-ghost{background:rgba(148,163,184,.1);color:#cbd5e1;border:1px solid rgba(148,163,184,.2)}
  .b-warning{background:linear-gradient(135deg,#d97706,#f59e0b);color:#1b1200;box-shadow:0 10px 28px rgba(245,158,11,.25)}
  .result{margin-top:16px;border-radius:14px;padding:16px 18px;font-size:13.5px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-word;max-height:360px;overflow:auto;border:1px solid rgba(148,163,184,.15);background:#020617;color:#94a3b8}
  .result.ok{background:rgba(22,101,52,.12);border-color:rgba(34,197,94,.3);color:#86efac}
  .result.err{background:rgba(127,29,29,.12);border-color:rgba(248,113,113,.3);color:#fca5a5}
  table.endpoints{width:100%;border-collapse:separate;border-spacing:0;margin-top:14px;font-size:13.5px}
  table.endpoints th,table.endpoints td{padding:11px 12px;text-align:left;border-bottom:1px solid rgba(30,41,59,.8)}
  table.endpoints th{color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.3px;font-weight:700}
  table.endpoints tr:hover td{background:rgba(99,102,241,.05)}
  .pillm{display:inline-block;padding:3px 10px;border-radius:8px;font-weight:700;font-size:11.5px;letter-spacing:.3px}
  .mGET{background:rgba(59,130,246,.15);color:#93c5fd;border:1px solid rgba(59,130,246,.3)}
  .mPOST{background:rgba(16,185,129,.15);color:#6ee7b7;border:1px solid rgba(16,185,129,.3)}
  .mPATCH{background:rgba(245,158,11,.15);color:#fcd34d;border:1px solid rgba(245,158,11,.3)}
  .banner{
    margin:22px 0 0;padding:16px 18px;border-radius:16px;
    background:linear-gradient(135deg,rgba(88,28,135,.25),rgba(59,7,100,.18));
    border:1px solid rgba(168,85,247,.25);color:#e9d5ff
  }
  .banner h3{margin:0 0 6px;font-size:14.5px}
  .banner ul{margin:6px 0 0;padding-left:18px;line-height:1.55;color:#ddd6fe;font-size:13px}
  .banner code{color:#f5d0fe;background:rgba(217,70,239,.12);padding:2px 6px;border-radius:6px;border:1px solid rgba(244,114,182,.2)}
  .srv-ok{color:#86efac}.srv-bad{color:#fca5a5}
  .tabs{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
  .tab{padding:8px 12px;border-radius:10px;background:rgba(148,163,184,.08);border:1px solid rgba(148,163,184,.18);color:#cbd5e1;cursor:pointer;font-weight:700;font-size:13px;user-select:none}
  .tab.active{background:rgba(99,102,241,.22);border-color:rgba(99,102,241,.45);color:#c7d2fe}
  .subg{display:grid;grid-template-columns:repeat(12,1fr);gap:14px}
</style>
</head>
<body>
<div class="wrap">
  <header class="h">
    <div class="brand">
      <div class="logo">≋</div>
      <div class="title">
        <h1>Robo Filiados</h1>
        <p>Shopee · Mercado Livre · WhatsApp em massa</p>
      </div>
    </div>
    <div id="statusBadge" class="status"><span class="dot"></span><span id="badgeText">Iniciando…</span></div>
  </header>

  <div id="initErrorBox" style="display:none" class="banner" role="alert">
    <h3>⚠️ Erro na inicialização anterior (capturado e não quebrou a página)</h3>
    <p id="initMsg" style="margin:4px 0 8px"></p>
    <details style="margin-top:6px"><summary style="cursor:pointer;font-weight:700;color:#f5d0fe">Ver Stack Trace completo</summary>
      <pre id="initStack" style="white-space:pre-wrap;word-break:break-word;margin:10px 0 0;padding:12px;border-radius:12px;background:#1e0b3a;border:1px solid rgba(192,132,252,.25);color:#f3e8ff;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;max-height:260px;overflow:auto"></pre>
    </details>
  </div>

  <div class="grid">
    <div class="card"><div class="lbl">Ambiente</div><div class="val"><span id="envVal" class="pill indigo">—</span></div></div>
    <div class="card"><div class="lbl">Porta (fallback)</div><div class="val"><span id="portVal" class="pill green">3000</span></div></div>
    <div class="card"><div class="lbl">WhatsApp</div><div class="val"><span id="waVal" class="pill pink">—</span></div></div>
    <div class="card"><div class="lbl">Anti-Dupl (h)</div><div class="val"><span id="dupVal" class="pill amber">24h</span></div></div>
  </div>

  <section class="section">
    <h2 class="s"><span class="ico">▦</span>Painel de Credenciais para Automação (Shopee + ML + Evolution)</h2>
    <div style="color:#94a3b8;font-size:13.5px;margin:-6px 0 16px">Preencha abaixo as credenciais das plataformas. Salva em <b>memória singleton</b> (cold start Vercel apaga). Para permanentes, use Environment Variables no painel da Vercel/Firebase.</div>

    <div class="tabs" role="tablist">
      <button type="button" class="tab active" data-tab="shopee">🛍️ Shopee</button>
      <button type="button" class="tab" data-tab="ml">🟡 Mercado Livre</button>
      <button type="button" class="tab" data-tab="wa">💬 Evolution WhatsApp</button>
      <button type="button" class="tab" data-tab="gr">👥 Grupos</button>
    </div>

    <form id="cfgForm" autocomplete="off" onsubmit="event.preventDefault();">
      <div class="cred-grid">
        <div class="cred-pane subg" data-pane="shopee">
          <div class="f w6"><label class="l">Shopee App ID <small>(Portal Dev Shopee)</small></label><input name="shopee_app_id" type="text" placeholder="ex: 123456" /></div>
          <div class="f w6"><label class="l">Shopee App Secret <small>(obtido no mesmo portal)</small></label><input name="shopee_app_secret" type="password" placeholder="••••••••••••••••" /></div>
          <div class="f w8"><label class="l">Shopee Affiliate Tag <small>(ex: meu_nick_SSS_XXXX)</small></label><input name="shopee_tag" type="text" placeholder="sua_tag_affiliate" /></div>
          <div class="f w4"><label class="l">Ambiente Shopee</label>
            <select name="shopee_sandbox"><option value="production">Produção</option><option value="sandbox" selected>Modo Sandbox (teste)</option></select>
          </div>
        </div>

        <div class="cred-pane subg" data-pane="ml" style="display:none">
          <div class="f w6"><label class="l">ML Client ID <small>(Dev.Mercado Livre)</small></label><input name="ml_client_id" type="text" placeholder="ex: 1234567890123456" /></div>
          <div class="f w6"><label class="l">ML Client Secret</label><input name="ml_client_secret" type="password" placeholder="••••••••••••••••••••••" /></div>
          <div class="f full"><label class="l">ML Access Token <small>(fluxo OAuth 2.0 Apps.ML)</small></label><input name="ml_access_token" type="password" placeholder="APP_USR-••••••••••••••-•••••••••••••••••••" /></div>
          <div class="f w8"><label class="l">ML Affiliate Tag</label><input name="ml_tag" type="text" placeholder="MLB_SEUNICK_AFF" /></div>
          <div class="f w4"><label class="l">Ambiente ML</label>
            <select name="ml_sandbox"><option value="production">Produção</option><option value="sandbox" selected>Modo Sandbox (teste)</option></select>
          </div>
        </div>

        <div class="cred-pane subg" data-pane="wa" style="display:none">
          <div class="f w8"><label class="l">Evolution API Base URL <small>(com https://)</small></label><input name="evolution_url" type="url" placeholder="https://wa.seudominio.com.br" /></div>
          <div class="f w4"><label class="l">Evolution Instance Name</label><input name="evolution_instance" type="text" placeholder="robofiliados" /></div>
          <div class="f full"><label class="l">Evolution API Key <small>(Settings → API Keys)</small></label><input name="evolution_apikey" type="password" placeholder="Bearer que criou no Evolution" /></div>
        </div>

        <div class="cred-pane subg" data-pane="gr" style="display:none">
          <div class="f full">
            <label class="l">Grupos / Contatos (1 por linha) · formato JID:<br><small>Grupos: <code style="color:#c4b5fd">120363123456789012@g.us</code> · Contatos: <code style="color:#c4b5fd">5511999998888@c.us</code></small></label>
            <textarea name="groups" placeholder="1203630XXXXXXXXXX@g.us
5511999998888@c.us"></textarea>
          </div>
        </div>
      </div>

      <div class="row">
        <button id="saveBtn" type="button" class="b-primary">💾 Salvar Credenciais em Memória</button>
        <button id="campaignBtn" type="button" class="b-success">▶️ Autenticar, Buscar e Publicar Campanha Completa</button>
        <button id="healthBtn" type="button" class="b-ghost">🧪 Testar /health</button>
        <button id="groupsBtn" type="button" class="b-ghost">👥 Listar Grupos (Evolution)</button>
      </div>

      <div id="cfgResult" class="result" aria-live="polite">Aguardando ação. Clique em "💾 Salvar Credenciais" para começar ou "▶️ Campanha Completa" para o fluxo 3-em-1.</div>
    </form>
  </section>

  <section class="section">
    <h2 class="s"><span class="ico">▶</span>Acionar Campanha Manual (rápida, usa credenciais salvas acima)</h2>
    <div class="cred-grid">
      <div class="f w4"><label class="l">Plataforma</label>
        <select id="platforms">
          <option value="both">Shopee + Mercado Livre (ambas)</option>
          <option value="shopee">Somente Shopee</option>
          <option value="mercado_livre">Somente Mercado Livre</option>
        </select>
      </div>
      <div class="f w4"><label class="l">Palavra-chave Busca</label><input id="keyword" type="text" placeholder="ex: smartwatch infantil" /></div>
      <div class="f w4"><label class="l">Máx produtos/plataforma</label><input id="maxProducts" type="number" min="1" max="200" step="1" value="15" /></div>
    </div>
    <div class="row">
      <button id="runBtn" type="button" class="b-warning">🚀 Rodar Campanha (usa os grupos do painel acima)</button>
    </div>
    <div id="runResult" class="result" aria-live="polite">Resultado da campanha manual aparecerá aqui (JSON).</div>
  </section>

  <section class="section">
    <h2 class="s"><span class="ico">≡</span>Endpoints REST</h2>
    <table class="endpoints" aria-label="endpoints">
      <thead><tr><th>Método</th><th>Rota</th><th>Descrição</th></tr></thead>
      <tbody id="tbEndpoints"></tbody>
    </table>
  </section>

  <div class="banner">
    <h3>ℹ️ Avisos Serverless (Vercel/Firebase Functions)</h3>
    <ul>
      <li><b>Credenciais painel acima ficam só em memória</b>: Cold start (~30min sem tráfego) apaga. Use <code>Vercel/Firebase Env Vars</code> para fixar permanente.</li>
      <li><b>Sem workers BullMQ/SQLite persistente</b>: funções não tem estado compartilhado. Migre DB para <code>Supabase/Postgres (Neon)</code> / Firestore.</li>
      <li><b>Envio em massa (horários fixos / cron)</b>: use <code>Vercel Cron</code> ou <code>Cloud Scheduler</code> batendo em <code>/api/campaigns/run</code>.</li>
      <li><b>Sessões WhatsApp Baileys locais</b> não funcionam em efêmero. Use <code>Evolution API</code> em VM/Cloud Run com volume persistente.</li>
    </ul>
  </div>
</div>

<script>
(() => {
  // ----- tabs -----
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const target = t.dataset.tab;
      document.querySelectorAll('.cred-pane').forEach(p => {
        p.style.display = (p.dataset.pane === target) ? 'grid' : 'none';
      });
    });
  });

  function readCfg() {
    const f = document.getElementById('cfgForm');
    const fd = new FormData(f);
    const groups = (fd.get('groups') || '').toString().split(/\\r?\\n/).map(s => s.trim()).filter(Boolean);
    return {
      shopee: {
        appId: (fd.get('shopee_app_id') || '').toString(),
        appSecret: (fd.get('shopee_app_secret') || '').toString(),
        tag: (fd.get('shopee_tag') || '').toString(),
        sandbox: (fd.get('shopee_sandbox') || 'sandbox').toString() === 'sandbox',
      },
      mercadolivre: {
        clientId: (fd.get('ml_client_id') || '').toString(),
        clientSecret: (fd.get('ml_client_secret') || '').toString(),
        accessToken: (fd.get('ml_access_token') || '').toString(),
        tag: (fd.get('ml_tag') || '').toString(),
        sandbox: (fd.get('ml_sandbox') || 'sandbox').toString() === 'sandbox',
      },
      evolution: {
        apiUrl: (fd.get('evolution_url') || '').toString(),
        apiKey: (fd.get('evolution_apikey') || '').toString(),
        instanceName: (fd.get('evolution_instance') || '').toString(),
      },
      groups,
      groupsText: (fd.get('groups') || '').toString(),
    };
  }

  const endpoints = [
    { m:'GET',    r:'/',                   d:'Dashboard UI atual (esta página).' },
    { m:'GET',    r:'/api/health',         d:'Status do servidor + credenciais setadas.' },
    { m:'GET',    r:'/api/config',         d:'MÁSCARAS das credenciais (nunca retorna valores reais).' },
    { m:'POST',   r:'/api/config',         d:'Grava credenciais em memória singleton (shopee/ml/evolution/groups).' },
    { m:'POST',   r:'/api/campaigns/run',  d:'Inicia campanha (body JSON: platforms, keyword, maxProducts, groups).' },
    { m:'PATCH',  r:'/api/campaigns/:id/status', d:'Atualiza status campanha (pausar/continuar).' },
    { m:'GET',    r:'/api/products',       d:'Pesquisa produtos afiliados (query keyword, plataformas).' },
    { m:'GET',    r:'/api/groups',         d:'Lista grupos/contatos (Evolution API se configurado).' },
  ];
  const TBMAP = {GET:'mGET',POST:'mPOST',PATCH:'mPATCH'};
  const tb = document.getElementById('tbEndpoints');
  tb.innerHTML = endpoints.map(e => `
    <tr>
      <td><span class="pillm ${TBMAP[e.m]||'mGET'}">${e.m}</span></td>
      <td><a href="${e.r.startsWith('http')?e.r:e.r}" target="_blank" rel="noopener" style="color:#c7d2fe;text-decoration:none;font-family:ui-monospace,Menlo,monospace">${e.r}</a></td>
      <td style="color:#cbd5e1">${e.d}</td>
    </tr>
  `).join('');

  function setBadgeOk(txt, ok=true){
    const b=document.getElementById('statusBadge');
    b.classList.toggle('bad', !ok);
    document.getElementById('badgeText').textContent = txt;
  }

  function prettyResult(el, dataOrError, isError=false){
    const box = document.getElementById(el);
    if (!box) return;
    box.classList.toggle('ok', !isError);
    box.classList.toggle('err', isError);
    let content;
    try {
      content = (typeof dataOrError === 'string') ? dataOrError : JSON.stringify(dataOrError, null, 2);
    } catch(_) { content = String(dataOrError); }
    box.textContent = content;
  }

  async function safeFetch(url, opts={}){
    try {
      const r = await fetch(url, { credentials:'same-origin', ...opts, headers: { 'Content-Type':'application/json', ...(opts.headers||{}) } });
      const ctype = r.headers.get('content-type') || '';
      let body;
      if (ctype.includes('application/json')) body = await r.json();
      else body = await r.text();
      return { ok: r.ok, status: r.status, body };
    } catch (e) { return { ok:false, status: 0, body: { message: e.message, stack: e.stack } }; }
  }

  async function saveCfg(show = true){
    const cfg = readCfg();
    const r = await safeFetch('/api/config', { method:'POST', body: JSON.stringify(cfg) });
    if (show) prettyResult('cfgResult', r.ok ? r.body : { status:r.status, ...r.body }, !r.ok);
    return r;
  }

  document.getElementById('saveBtn').addEventListener('click', () => saveCfg(true));

  document.getElementById('healthBtn').addEventListener('click', async () => {
    const r = await safeFetch('/api/health');
    prettyResult('cfgResult', r.ok ? r.body : { status:r.status, ...r.body }, !r.ok);
  });

  document.getElementById('groupsBtn').addEventListener('click', async () => {
    const r = await safeFetch('/api/groups');
    prettyResult('cfgResult', r.ok ? r.body : { status:r.status, ...r.body }, !r.ok);
  });

  document.getElementById('runBtn').addEventListener('click', async () => {
    const platforms = document.getElementById('platforms').value;
    const keyword = document.getElementById('keyword').value.trim();
    const maxProducts = Math.max(1, parseInt(document.getElementById('maxProducts').value || '15', 10));
    const cfg = readCfg();
    const payload = {
      platforms,
      keyword: keyword || 'promoção relâmpago',
      maxProducts,
      groups: cfg.groups,
    };
    const r = await safeFetch('/api/campaigns/run', { method:'POST', body: JSON.stringify(payload) });
    prettyResult('runResult', r.ok ? r.body : { status:r.status, ...r.body }, !r.ok);
  });

  document.getElementById('campaignBtn').addEventListener('click', async () => {
    prettyResult('cfgResult', '[1/3] Salvando credenciais...');
    const r1 = await saveCfg(false);
    if (!r1.ok) { prettyResult('cfgResult', { etapa:'1/3 salvar', status:r1.status, ...r1.body }, true); return; }
    prettyResult('cfgResult', '[2/3] Confirmando máscaras via /api/config...');
    const r2 = await safeFetch('/api/config');
    if (!r2.ok) { prettyResult('cfgResult', { etapa:'2/3 masks', status:r2.status, ...r2.body }, true); return; }
    prettyResult('cfgResult', '[3/3] Rodando campanha /api/campaigns/run (isso pode levar alguns segundos)...');
    const platforms = document.getElementById('platforms').value;
    const keyword = document.getElementById('keyword').value.trim();
    const maxProducts = Math.max(1, parseInt(document.getElementById('maxProducts').value || '15', 10));
    const groups = readCfg().groups;
    const payload = { platforms, keyword: keyword || 'promoção relâmpago', maxProducts, groups };
    const r3 = await safeFetch('/api/campaigns/run', { method:'POST', body: JSON.stringify(payload) });
    const merged = {
      etapa:'3/3 finalizado',
      saveCredentials: r1.body,
      masks: r2.body,
      runCampaign: { status: r3.status, ok: r3.ok, body: r3.body },
    };
    prettyResult('cfgResult', merged, !r3.ok);
    prettyResult('runResult', r3.ok ? r3.body : { status:r3.status, ...r3.body }, !r3.ok);
  });

  // Start: auto health check
  setTimeout(async () => {
    const h = await safeFetch('/api/health');
    const ok = h.ok;
    setBadgeOk(ok ? 'Servidor Fastify OK' : 'Init falhou — leia banner acima', ok);
    const b = (ok && typeof h.body === 'object') ? h.body : {};
    const env = document.getElementById('envVal');
    const wa = document.getElementById('waVal');
    const port = document.getElementById('portVal');
    const dup = document.getElementById('dupVal');
    env.textContent = (b.env || b.NODE_ENV || 'production').toString().toUpperCase();
    port.textContent = String(b.port || b.PORT || '—');
    wa.textContent = (b.whatsapp || 'provider: ' + (b.whatsappProvider || 'evolution'));
    dup.textContent = (b.antiDuplicateHours || '24') + 'h';
    if (!ok) {
      const box = document.getElementById('initErrorBox');
      if (box) { box.style.display='block'; }
      const msg = document.getElementById('initMsg');
      const st = document.getElementById('initStack');
      msg.textContent = (b.message || (typeof h.body === 'string' ? h.body : 'Init Fastify falhou'));
      st.textContent = (b.stack || JSON.stringify(h.body, null, 2));
    }
  }, 400);
})();
</script>
</body>
</html>`;

export default DASHBOARD_HTML;
