import * as functions from 'firebase-functions';
import { IncomingMessage, ServerResponse } from 'http';
import fastify, {
  type FastifyInstance,
  type FastifyRequest as FReq,
  type FastifyReply as FRep,
} from 'fastify';

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Robo Filiados — Firebase Functions (SA-EAST1)</title>
<style>
  :root{--bg:#0b0f19;--card:#171f33;--border:#233054;--text:#e5e7eb;--muted:#94a3b8;--grad:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%);--green:#10b981}
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,Segoe UI,Roboto,Arial}
  header{padding:28px 36px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:14px;background:rgba(11,15,25,.75);backdrop-filter:blur(8px);position:sticky;top:0}
  .logo{width:46px;height:46px;border-radius:12px;background:var(--grad);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(99,102,241,.35)}
  h1{font-size:20px;margin:0} .sub{color:var(--muted);font-size:13px;margin-top:2px}
  main{max-width:1100px;margin:0 auto;padding:32px 36px 80px}
  .card{background:linear-gradient(180deg,var(--card) 0%,#1f2a45 100%);border:1px solid var(--border);border-radius:16px;padding:22px;margin-bottom:18px}
  h2{font-size:18px;margin:0 0 12px;color:#f8fafc}
  table{width:100%;border-collapse:collapse;font-size:13.5px}
  th{text-align:left;color:var(--muted);padding:8px 10px;border-bottom:1px solid var(--border)}
  td{padding:8px 10px;border-bottom:1px dashed var(--border)}
  code{background:#111827;border:1px solid var(--border);padding:2px 6px;border-radius:6px;font-size:12.5px;color:#f0abfc}
  a{color:#a5b4fc;text-decoration:none;font-weight:500}a:hover{text-decoration:underline}
  .pill{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700}
  .pill.get{background:rgba(59,130,246,.16);color:#93c5fd}.pill.post{background:rgba(16,185,129,.16);color:#6ee7b7}
  .badge{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:rgba(16,185,129,.12);color:#34d399;border:1px solid rgba(16,185,129,.3);font-size:12px;font-weight:600}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:22px}
  .mini .k{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.5px}.mini .v{font-size:22px;font-weight:700;margin-top:8px;color:#f8fafc}
</style>
</head>
<body>
<header>
  <div class="logo"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/></svg></div>
  <div><h1>Robo Filiados</h1><div class="sub">Backend Firebase Functions — região southamerica-east1</div></div>
  <div style="margin-left:auto"><span class="badge">Functions Gen2 · 512 MiB · 60s timeout</span></div>
</header>
<main>
<h2>Status do Runtime</h2>
<div class="grid">
  <div class="card mini"><div class="k">Região</div><div class="v">southamerica-east1</div></div>
  <div class="card mini"><div class="k">Memória</div><div class="v">512 MiB</div></div>
  <div class="card mini"><div class="k">Timeout</div><div class="v">60 segundos</div></div>
  <div class="card mini"><div class="k">Runtime</div><div class="v">Node.js 20</div></div>
</div>

<div class="card">
<h2>Endpoints disponíveis</h2>
<table>
  <thead><tr><th>Método</th><th>Rota</th><th>Descrição</th></tr></thead>
  <tbody>
    <tr><td><span class="pill get">GET</span></td><td><code>/</code></td><td>Este dashboard (HTML)</td></tr>
    <tr><td><span class="pill get">GET</span></td><td><code><a href="./api/health">/api/health</a></code></td><td>Uptime / memória / timestamp</td></tr>
    <tr><td><span class="pill post">POST</span></td><td><code>/api/campaigns/run</code></td><td>Dispara campanha (HTTP trigger). Use Cloud Scheduler para cron.</td></tr>
    <tr><td><span class="pill get">GET</span></td><td><code><a href="./api/groups">/api/groups</a></code></td><td>Lista grupos WhatsApp</td></tr>
  </tbody>
</table>
</div>

<div class="card" style="background:rgba(99,102,241,.08);border-color:rgba(99,102,241,.3)">
<h2 style="color:#a5b4fc">Limitações Serverless</h2>
<div style="color:#cbd5e1;font-size:13.5px;line-height:1.6">
  Workers BullMQ, Cron jobs e sessões Baileys <b>não rodam</b> persistentes em Cloud Functions.<br/>
  Substitua por: (1) <b>Cloud Scheduler → POST /api/campaigns/run</b>, (2) <b>Evolution API</b> (instância separada, sessões WA persistentes), (3) <b>Firestore ou Supabase Postgres</b> no lugar de SQLite.
</div>
</div>
</main>
</body>
</html>`;

let app: FastifyInstance | null = null;

async function buildApp(): Promise<FastifyInstance> {
  const server = fastify({ logger: false });

  server.get('/', async (_: FReq, reply: FRep) => {
    reply
      .type('text/html; charset=utf-8')
      .header('Cache-Control', 'no-store, no-cache, must-revalidate')
      .send(DASHBOARD_HTML);
  });

  server.get('/api/health', async (_: FReq, reply: FRep) => {
    reply.send({
      status: 'ok',
      uptime: process.uptime(),
      memoryBytes: process.memoryUsage().heapUsed,
      platform: process.platform,
      region: 'southamerica-east1',
      runtime: 'firebase-functions-gen2',
      nodeVersion: process.version,
      time: new Date().toISOString(),
    });
  });

  server.post('/api/campaigns/run', async (req: FReq, reply: FRep) => {
    const body = (req.body as Record<string, unknown>) || {};
    reply.status(202).send({
      accepted: true,
      receivedKeys: Object.keys(body),
      note: 'Serverless: workers/cron não rodam dentro de Functions. Use Cloud Scheduler invocando esta rota via HTTP.',
      time: new Date().toISOString(),
    });
  });

  server.get('/api/groups', async (_: FReq, reply: FRep) => {
    reply.send({ ok: true, data: [], note: 'Firestore-backed groups endpoint requer schema e collection separados.' });
  });

  await server.ready();
  return server;
}

export const api = functions
  .region('southamerica-east1')
  .runWith({ memory: '512MB' as const, timeoutSeconds: 60 })
  .https.onRequest(async (req: IncomingMessage, res: ServerResponse) => {
    if (!app) app = await buildApp();
    await app.ready();
    (app.server as any).emit('request', req, res);
  });
