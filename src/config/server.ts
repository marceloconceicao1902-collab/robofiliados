import fastify, { type FastifyInstance, type FastifyServerOptions, type FastifyRequest, type FastifyReply } from 'fastify';
import { env } from './env';
import { logger } from './logger';
import PromotionController from '../modules/promotion/controllers/PromotionController';

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
    reply.send({
      name: 'Affiliate Promotion Bot API',
      version: '1.0.0',
      docs: '/api/health',
      time: new Date().toISOString(),
    });
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
