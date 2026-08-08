import fastify, { type FastifyInstance, type FastifyServerOptions, type FastifyRequest, type FastifyReply } from 'fastify';
import { env } from './env';
import { logger } from './logger';
import PromotionController from '../modules/promotion/controllers/PromotionController';
import { DASHBOARD_HTML } from './dashboard-html';

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
