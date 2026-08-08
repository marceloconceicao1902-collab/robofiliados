import * as functions from 'firebase-functions';
import fastify, {
  type FastifyInstance,
  type FastifyRequest,
  type FastifyReply,
} from 'fastify';

let app: FastifyInstance | null = null;

async function buildApp(): Promise<FastifyInstance> {
  const server = fastify({ logger: false });

  server.get('/', async (_: FastifyRequest, reply: FastifyReply) => {
    reply.send({
      name: 'Affiliate Promotion Bot API — Firebase Functions',
      version: '1.0.0',
      docs: '/api/health',
      time: new Date().toISOString(),
      runtime: 'firebase-functions-gen2',
    });
  });

  server.get('/api/health', async (_: FastifyRequest, reply: FastifyReply) => {
    reply.send({
      status: 'ok',
      uptime: process.uptime(),
      memory: process.memoryUsage().heapUsed,
      platform: process.platform,
      ts: new Date().toISOString(),
    });
  });

  server.post('/api/campaigns/run', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as Record<string, unknown>) || {};
    reply.status(202).send({
      accepted: true,
      received: Object.keys(body),
      note: 'Modo serverless: campaigns dependem de trigger HTTP (workers/cron nao rodam em Functions). ' +
        'Use Scheduler do GCP para invocar periodicamente.',
      ts: new Date().toISOString(),
    });
  });

  server.get('/api/groups', async (_: FastifyRequest, reply: FastifyReply) => {
    reply.send({ data: [], note: 'Firestore-backed groups endpoint requer schema separado.' });
  });

  await server.ready();
  return server;
}

export const api = functions.https.onRequest(
  { region: 'southamerica-east1', memory: '512MiB', timeoutSeconds: 60 },
  async (req, res) => {
    if (!app) app = await buildApp();
    await app.ready();
    (app.server as any).emit('request', req, res);
  },
);
