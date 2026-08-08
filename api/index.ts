import { IncomingMessage, ServerResponse } from 'http';

type VercelRequest = IncomingMessage & {
  query: Record<string, string | string[] | undefined>;
  cookies: Record<string, string>;
  body: any;
};

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  send: (body: any) => VercelResponse;
  json: (body: any) => VercelResponse;
  redirect: (url: string) => VercelResponse;
};

let cachedServer: any = null;
let cachedInitError: { message: string; stack: string } | null = null;

async function getServerSafe() {
  if (cachedInitError) return null;
  if (cachedServer) return cachedServer;

  try {
    const { createServer } = await import('../src/config/server');
    const srv = createServer();
    await srv.ready();
    cachedServer = srv;
    return srv;
  } catch (e: any) {
    cachedInitError = {
      message: e?.message || String(e),
      stack: e?.stack || String(e),
    };
    return null;
  }
}

function escapeHtml(str: string) {
  return String(str).replace(/[&<>"']/g, (c: string) =>
    c === '&' ? '&amp;' :
    c === '<' ? '&lt;' :
    c === '>' ? '&gt;' :
    c === '"' ? '&quot;' :
    '&#39;',
  );
}

function FALLBACK_DASHBOARD(initErr: { message: string; stack: string } | null) {
  const errBanner = !initErr ? '' : `
  <div style="margin:18px 28px 0; padding:14px 18px; border-radius:12px; background:rgba(239,68,68,.12); border:1px solid rgba(239,68,68,.45); color:#fecaca; font-family:system-ui,Segoe UI,Roboto,Arial;">
    <div style="font-weight:800; color:#fca5a5; margin-bottom:6px; display:flex; align-items:center; gap:8px;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      Erro na inicialização do servidor (FUNCTION_INVOCATION_FAILED corrigido abaixo)
    </div>
    <div style="font-size:13.5px; line-height:1.6; margin-bottom:10px;">
      <b>Mensagem:</b> ${escapeHtml(initErr.message)}
    </div>
    <details style="background:#111827; padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,.08);">
      <summary style="cursor:pointer; color:#fca5a5; font-size:12.5px; font-weight:700;">Ver Stack Trace completo (${initErr.stack.split('\n').length} linhas)</summary>
      <pre style="margin-top:8px; white-space:pre-wrap; word-break:break-word; font-size:11.5px; color:#fecaca; line-height:1.55;">${escapeHtml(initErr.stack)}</pre>
    </details>
  </div>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Robo Filiados — Dashboard</title>
<style>
  :root{--bg:#0b0f19;--bg2:#111827;--card:#171f33;--card2:#1f2a45;--border:#233054;--text:#e5e7eb;--muted:#94a3b8;--grad:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%);--green:#10b981;--yellow:#f59e0b}
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,Segoe UI,Roboto,Arial; min-height:100vh; background: radial-gradient(1200px 600px at 10% -10%, rgba(99,102,241,.20), transparent 60%), radial-gradient(900px 500px at 90% 0%, rgba(236,72,153,.18), transparent 60%), var(--bg)}
  header{padding:26px 32px; border-bottom:1px solid var(--border); background:rgba(11,15,25,.75); backdrop-filter:blur(8px); position:sticky; top:0; z-index:10; display:flex; align-items:center; gap:14px}
  .logo{width:44px; height:44px; border-radius:12px; background:var(--grad); display:flex; align-items:center; justify-content:center; box-shadow:0 8px 24px rgba(99,102,241,.35)}
  h1{font-size:19px; margin:0} .sub{color:var(--muted); font-size:13px; margin-top:2px}
  .badge{margin-left:auto; display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:999px; background:rgba(${initErr ? '239,68,68' : '16,185,129'},${initErr ? '.12' : '.12'}); color:${initErr ? '#fca5a5' : '#34d399'}; border:1px solid rgba(${initErr ? '239,68,68' : '16,185,129'},${initErr ? '.45' : '.30'}); font-size:12px; font-weight:700}
  .dot{width:8px; height:8px; border-radius:50%; background:${initErr ? '#ef4444' : 'var(--green)'}; box-shadow:0 0 0 3px rgba(${initErr ? '239,68,68' : '16,185,129'},${initErr ? '.20' : '.18'}); animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.25);opacity:.7}}
  main{max-width:1240px; margin:0 auto; padding:28px 32px 80px}
  h2{font-size:17.5px; margin:0 0 14px; color:#f8fafc}
  .grid{display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:14px; margin-bottom:28px}
  .card{background:linear-gradient(180deg,var(--card) 0%,var(--card2) 100%); border:1px solid var(--border); border-radius:16px; padding:20px; transition:transform .15s ease, border-color .15s ease}
  .card:hover{transform:translateY(-2px); border-color:rgba(139,92,246,.55)}
  .k{color:var(--muted); font-size:12px; letter-spacing:.5px; text-transform:uppercase}
  .v{font-size:23px; font-weight:800; margin-top:8px; color:#f8fafc}
  .chip{display:inline-block; margin-top:10px; padding:3px 8px; border-radius:6px; background:rgba(99,102,241,.14); color:#a5b4fc; font-size:11.5px; font-weight:700}
  .layout{display:grid; grid-template-columns:1.2fr 1fr; gap:20px; margin-bottom:28px} @media(max-width:900px){.layout{grid-template-columns:1fr}}
  .panel{background:var(--card); border:1px solid var(--border); border-radius:16px; padding:22px}
  .row{display:flex; gap:10px; align-items:center; margin-bottom:10px}
  label{width:140px; color:var(--muted); font-size:13px; flex-shrink:0}
  input,select,textarea{flex:1; background:var(--bg2); border:1px solid var(--border); color:var(--text); border-radius:10px; padding:10px 12px; font-size:14px; outline:0; transition:border-color .15s}
  input:focus,select:focus,textarea:focus{border-color:#6366f1}
  textarea{min-height:100px; resize:vertical; font-family:inherit}
  .btn{display:inline-flex; align-items:center; justify-content:center; gap:8px; background:var(--grad); color:white; border:0; cursor:pointer; padding:11px 18px; border-radius:10px; font-weight:700; font-size:14px; box-shadow:0 8px 20px rgba(99,102,241,.30); transition:transform .15s, box-shadow .15s}
  .btn:hover{transform:translateY(-1px); box-shadow:0 12px 26px rgba(139,92,246,.35)}
  .btn.secondary{background:var(--bg2); border:1px solid var(--border); box-shadow:none; color:var(--text)}
  .actions{margin-top:14px; display:flex; gap:10px; flex-wrap:wrap}
  .out{margin-top:14px; padding:12px 14px; border-radius:10px; background:#0c1222; border:1px solid var(--border); color:#cbd5e1; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:12.5px; white-space:pre-wrap; word-break:break-word; min-height:50px}
  table{width:100%; border-collapse:collapse; font-size:13.5px}
  th{text-align:left; color:var(--muted); font-weight:700; padding:8px 10px; border-bottom:1px solid var(--border)}
  td{padding:8px 10px; border-bottom:1px dashed var(--border); color:#e2e8f0; vertical-align:top}
  code{background:var(--bg2); padding:2px 6px; border-radius:6px; font-size:12.5px; border:1px solid var(--border); color:#f0abfc}
  td a{color:#a5b4fc; text-decoration:none; font-weight:600} td a:hover{text-decoration:underline}
  .pill{display:inline-block; padding:2px 8px; border-radius:6px; font-size:11.5px; font-weight:800}
  .pill.get{background:rgba(59,130,246,.16); color:#93c5fd}
  .pill.post{background:rgba(16,185,129,.16); color:#6ee7b7}
  .warn{margin-top:16px; padding:12px 14px; border-radius:10px; background:rgba(99,102,241,.08); border:1px solid rgba(99,102,241,.30)}
  .warn b{color:#a5b4fc; font-size:12.5px} .warn p{margin:4px 0 0; color:#cbd5e1; font-size:13px; line-height:1.55}
  footer{text-align:center; color:var(--muted); font-size:12.5px; padding:20px; border-top:1px solid var(--border)}
</style>
</head>
<body>
${errBanner}
<header>
  <div class="logo"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/></svg></div>
  <div><h1>Robo Filiados</h1><div class="sub">Shopee · Mercado Livre · WhatsApp em massa</div></div>
  <span class="badge"><span class="dot"></span><span>${initErr ? 'Init falhou — leia banner acima' : (cachedServer ? 'Servidor Fastify OK' : 'Tentando inicializar Fastify...')}</span></span>
</header>
<main>
  <h2>Status Geral</h2>
  <div class="grid">
    <div class="card"><div class="k">Ambiente</div><div class="v">production</div><div class="chip">NODE_ENV</div></div>
    <div class="card"><div class="k">Região Vercel</div><div class="v">iad1</div><div class="chip">Washington, D.C.</div></div>
    <div class="card"><div class="k">Provider WhatsApp</div><div class="v">baileys / evolution</div><div class="chip">${initErr ? 'ver env vars' : 'sete WHATSAPP_PROVIDER'}</div></div>
    <div class="card"><div class="k">Anti-Duplicidade</div><div class="v">24 h</div><div class="chip">Janela Padrão</div></div>
  </div>

  <div class="layout">
    <div class="panel">
      <h2 style="margin-bottom:14px">Acionar Campanha Manual</h2>
      <div class="row"><label>Plataforma</label>
        <select id="fp"><option value="shopee">Shopee</option><option value="mercadolivre">Mercado Livre</option><option value="both">Ambas</option></select>
      </div>
      <div class="row"><label>Palavra-chave</label><input id="fk" type="text" placeholder="Ex: notebook, liquidificador" value="oferta do dia"/></div>
      <div class="row"><label>Máx. produtos</label><input id="fm" type="number" min="1" max="100" value="10"/></div>
      <div class="row"><label>Grupos (IDs)</label><textarea id="fg" placeholder="120363202345678901@g.us&#10;5511999998888@c.us"></textarea></div>
      <div class="actions">
        <button class="btn" onclick="run()">▶ Rodar Campanha</button>
        <button class="btn secondary" onclick="health()">❤ Testar /api/health</button>
        <button class="btn secondary" onclick="groups()">👥 Listar Grupos</button>
      </div>
      <div class="out" id="out">Clique em uma ação para ver resultado da API... (dica: se apareceu banner ERRO lá em cima, configure as Environment Variables no Vercel Dashboard > Settings > Environment Variables)</div>
    </div>

    <div class="panel">
      <h2 style="margin-bottom:14px">Endpoints da API</h2>
      <table>
        <thead><tr><th>Método</th><th>Rota</th><th>Descrição</th></tr></thead>
        <tbody>
          <tr><td><span class="pill get">GET</span></td><td><code>/</code></td><td>Este Dashboard HTML</td></tr>
          <tr><td><span class="pill get">GET</span></td><td><code><a href="/api/health" target="_blank">/api/health</a></code></td><td>Status + configurações carregadas</td></tr>
          <tr><td><span class="pill post">POST</span></td><td><code>/api/campaigns/run</code></td><td>Captura, formata e envia ofertas em massa</td></tr>
          <tr><td><span class="pill get">GET</span></td><td><code><a href="/api/groups" target="_blank">/api/groups</a></code></td><td>Lista grupos/contatos do WhatsApp</td></tr>
          <tr><td><span class="pill post">POST</span></td><td><code>/api/groups</code></td><td>Cadastrar novo grupo</td></tr>
          <tr><td><span class="pill get">GET</span></td><td><code><a href="/api/campaigns" target="_blank">/api/campaigns</a></code></td><td>Histórico de campanhas</td></tr>
          <tr><td><span class="pill get">GET</span></td><td><code><a href="/api/products" target="_blank">/api/products</a></code></td><td>Últimos produtos capturados</td></tr>
        </tbody>
      </table>
      <div class="warn"><b>Serverless Limitações:</b><p>Workers BullMQ, sessões Baileys persistentes e SQLite não vivem em Functions. Troque por: Cloud Scheduler (cron HTTP POST) + Evolution API (WA) + Supabase/Firestore (Postgres/SQL).</p></div>
    </div>
  </div>
</main>
<footer>Powered by <b>Fastify</b> rodando em <b>Vercel Serverless Functions @vercel/node</b>. Hard reload Ctrl+Shift+R.</footer>
<script>
const $=(i)=>document.getElementById(i);
function set(txt,ok=true){
  const el=$('out'); el.textContent=txt;
  el.style.borderColor = ok ? 'rgba(16,185,129,.4)' : 'rgba(239,68,68,.5)';
  el.style.color = ok ? '#d1fae5' : '#fee2e2';
}
async function health(){
  set('GET /api/health ...');
  try{
    const r=await fetch('/api/health',{cache:'no-store'});
    const t=await r.text(); let o; try{ o=JSON.stringify(JSON.parse(t),null,2) }catch{o=t}
    set('HTTP '+r.status+' '+(r.ok?'OK':'ERRO')+'\n\n'+o, r.ok);
  }catch(e){ set('ERRO fetch: '+e.message, false) }
}
async function groups(){
  set('GET /api/groups ...');
  try{
    const r=await fetch('/api/groups',{cache:'no-store'});
    const t=await r.text(); let o; try{ o=JSON.stringify(JSON.parse(t),null,2) }catch{o=t}
    set('HTTP '+r.status+' '+(r.ok?'OK':'ERRO')+'\n\n'+o, r.ok);
  }catch(e){ set('ERRO fetch: '+e.message, false) }
}
async function run(){
  const p = { platform: $('fp').value, keyword: $('fk').value, maxProducts: parseInt($('fm').value||'10',10), groups: $('fg').value.split('\n').map(s=>s.trim()).filter(Boolean) };
  set('POST /api/campaigns/run ...\nBody:\n'+JSON.stringify(p,null,2));
  try{
    const r=await fetch('/api/campaigns/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
    const t=await r.text(); let o; try{ o=JSON.stringify(JSON.parse(t),null,2) }catch{o=t}
    set('HTTP '+r.status+' '+(r.ok?'OK':'ERRO')+'\n\n'+o, r.ok);
  }catch(e){ set('ERRO fetch: '+e.message, false) }
}
setTimeout(health, 400);
</script>
</body>
</html>`;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const srv = await getServerSafe();

  if (!srv) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.end(FALLBACK_DASHBOARD(cachedInitError));
    return;
  }

  (srv.server as any).emit('request', req, res);
}
