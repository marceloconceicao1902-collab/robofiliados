import fastify, { type FastifyInstance, type FastifyServerOptions, type FastifyRequest, type FastifyReply } from 'fastify';
import { z } from 'zod';
import { env } from './env';
import { logger } from './logger';
import PromotionController from '../modules/promotion/controllers/PromotionController';
import { DASHBOARD_HTML } from './dashboard-html';
import { runtimeConfig, type RuntimeConfigShape } from './runtime-config';
import { applyCredentialsToEnv, parseGroupsListText } from '../shared/utils/apply-credentials';

const ConfigPostSchema = z.object({
  shopee: z.object({
    appId: z.string().default(''),
    appSecret: z.string().default(''),
    tag: z.string().default(''),
    sandbox: z.boolean().default(true),
  }).partial().optional(),
  mercadolivre: z.object({
    clientId: z.string().default(''),
    clientSecret: z.string().default(''),
    accessToken: z.string().default(''),
    tag: z.string().default(''),
    sandbox: z.boolean().default(true),
  }).partial().optional(),
  evolution: z.object({
    apiUrl: z.string().default(''),
    apiKey: z.string().default(''),
    instanceName: z.string().default(''),
  }).partial().optional(),
  groups: z.array(z.string()).optional(),
  groupsText: z.string().optional(),
});

export function createServer(
  controller: PromotionController = new PromotionController(),
  opts: FastifyServerOptions = {},
): FastifyInstance {
  const app = fastify({
    logger: false,
    ...opts,
  });

  app.addHook('onRequest', async (req: FastifyRequest) => {
    logger.debug({ method: req.method, url: req.url }, 'Requisição recebida');
  });

  app.get('/', async (_: FastifyRequest, reply: FastifyReply) => {
    reply
      .type('text/html; charset=utf-8')
      .header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      .header('Pragma', 'no-cache')
      .header('Expires', '0')
      .send(DASHBOARD_HTML);
  });

  app.get('/api/config', async (_: FastifyRequest, reply: FastifyReply) => {
    applyCredentialsToEnv();
    reply.send({
      ok: true,
      masks: runtimeConfig.getMasks(),
    });
  });

  app.post('/api/config', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = ConfigPostSchema.parse(req.body || {});
      const patch: Partial<RuntimeConfigShape> = {};
      if (parsed.shopee) patch.shopee = parsed.shopee as any;
      if (parsed.mercadolivre) patch.mercadolivre = parsed.mercadolivre as any;
      if (parsed.evolution) patch.evolution = parsed.evolution as any;
      if (parsed.groups) patch.groups = parsed.groups;
      else if (typeof parsed.groupsText === 'string') patch.groups = parseGroupsListText(parsed.groupsText);
      runtimeConfig.set(patch);
      applyCredentialsToEnv();
      reply.status(200).send({
        ok: true,
        message: 'Credenciais gravadas em memória (singleton runtime). Cold start limpa tudo automaticamente.',
        masks: runtimeConfig.getMasks(),
      });
    } catch (e: any) {
      reply.status(400).send({
        ok: false,
        error: 'ValidationError',
        message: e?.message || 'Body inválido para /api/config',
      });
    }
  });

  controller.registerRoutes(app);

  return app;
}

export async function startServer(
  port: number = env.PORT,
  controller: PromotionController = new PromotionController(),
): Promise<FastifyInstance> {
  const app = createServer(controller);
  try {
    await app.listen({ port, host: '0.0.0.0' });
    logger.info({ port }, '🚀 Fastify HTTP server rodando');
  } catch (err: unknown) {
    logger.fatal({ err }, 'Falha ao subir servidor HTTP');
    process.exit(1);
  }
  return app;
}

export default createServer;
