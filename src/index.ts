import { env } from './config/env';
import { logger } from './config/logger';
import { startServer } from './config/server';
import PromotionBotService from './modules/promotion/services/PromotionBotService';
import PromotionController from './modules/promotion/controllers/PromotionController';
import PromotionQueue from './shared/utils/PromotionQueue';
import { notifyWebhook } from './shared/utils/webhook';

async function bootstrap(): Promise<void> {
  logger.info('============================================');
  logger.info('🤖 Affiliate Promotion Bot - Inicializando...');
  logger.info(`Ambiente: ${env.NODE_ENV}`);
  logger.info(`Porta HTTP: ${env.PORT}`);
  logger.info(`Provider WhatsApp: ${env.WHATSAPP_PROVIDER}`);
  logger.info(`Anti-Duplicidade Janela: ${env.ANTI_DUPLICATE_WINDOW_HOURS}h`);
  logger.info('============================================');

  const bot = new PromotionBotService();
  const controller = new PromotionController(bot);

  await startServer(env.PORT, controller);

  const queue = new PromotionQueue(bot);
  queue.startWorker();
  queue.startCron();

  process.on('SIGINT', async () => {
    logger.info('SIGINT recebido; desligando gracefully...');
    try {
      await bot.whatsApp.disconnect();
      await queue.shutdown();
    } catch (e: unknown) {
      logger.warn({ err: e }, 'Erro no shutdown (ignorado)');
    }
    process.exit(0);
  });

  process.on('uncaughtException', (err: Error) => {
    logger.fatal({ err }, 'Uncaught Exception');
    notifyWebhook('ERROR', { message: err.message, stack: err.stack }).catch(() => void 0);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error({ err: reason }, 'Unhandled Rejection');
    notifyWebhook('ERROR', { message: String(reason) }).catch(() => void 0);
  });
}

bootstrap().catch((err: unknown) => {
  logger.fatal({ err }, 'Falha crítica no bootstrap');
  process.exit(1);
});
