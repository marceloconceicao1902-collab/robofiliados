import { Queue, Worker, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { CronJob } from 'cron';
import type { Job } from 'bullmq';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import PromotionBotService from '../../modules/promotion/services/PromotionBotService';
import { prisma } from '../../database/prisma';
import type { RunCampaignOptions } from '../../modules/promotion/services/PromotionBotService';
import { notifyWebhook } from '../../shared/utils/webhook';
import type { CampaignSummary } from '../../shared/interfaces';

const CONNECTION = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
  db: env.REDIS_DB,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export const CAMPAIGN_QUEUE_NAME = 'promotion-campaigns';

export interface CampaignJob extends RunCampaignOptions {}

export class PromotionQueue {
  public readonly queue: Queue<CampaignJob>;
  public worker?: Worker<CampaignJob>;
  private readonly redis: IORedis;
  private readonly bot: PromotionBotService;
  private cronJob?: CronJob;

  constructor(bot: PromotionBotService = new PromotionBotService()) {
    this.bot = bot;
    this.redis = new IORedis(CONNECTION as any);

    this.queue = new Queue<CampaignJob>(CAMPAIGN_QUEUE_NAME, {
      connection: { ...CONNECTION } as any,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });

    this.queue.on('error', (err: unknown) => logger.error({ err }, 'Erro na queue BullMQ'));
    logger.info('Queue de promoções inicializada (BullMQ + Redis)');
  }

  public startWorker(): void {
    this.worker = new Worker<CampaignJob>(
      CAMPAIGN_QUEUE_NAME,
      async (job: Job<CampaignJob>) => {
        logger.info({ jobId: job.id, url: job.data.url }, 'Worker: processando job de campanha');
        await this.bot.ensureConnected();
        const summary = await this.bot.runCampaign(job.data);
        return summary;
      },
      {
        connection: { ...CONNECTION } as any,
        concurrency: 1,
      },
    );

    this.worker.on('completed', (job: Job<CampaignJob>, result: CampaignSummary) => {
      logger.info({ jobId: job?.id, sent: result?.sent }, 'Job concluído com sucesso');
    });
    this.worker.on('failed', (job: Job<CampaignJob> | undefined, err: Error) => {
      logger.error({ jobId: job?.id, err }, 'Job falhou');
      notifyWebhook('ERROR', { jobId: job?.id, message: err.message, stack: err.stack }).catch(
        () => void 0,
      );
    });
  }

  public async enqueue(
    data: CampaignJob,
    options?: JobsOptions,
  ): Promise<string | undefined> {
    const job = await this.queue.add('campaign', data, options);
    logger.info({ jobId: job.id, url: data.url }, 'Campanha enfileirada');
    return job.id?.toString();
  }

  public startCron(): void {
    const everyXMinutes = `0 */${Math.max(1, env.SEND_CAMPAIGN_INTERVAL)} * * * *`;
    logger.info(
      { cron: everyXMinutes },
      'Iniciando agendador (node-cron) para buscar ofertas automáticas',
    );

    this.cronJob = new CronJob(
      everyXMinutes,
      async () => {
        try {
          const offers = await this.loadPendingOffers();
          for (const offer of offers) {
            await this.enqueue(offer, { removeOnComplete: true });
            await new Promise((r: (v?: unknown) => void) =>
              setTimeout(r, 5000),
            );
          }
        } catch (err: unknown) {
          logger.error({ err }, 'Erro no tick do cron');
        }
      },
      null,
      true,
      env.TZ,
    );
  }

  public stopCron(): void {
    this.cronJob?.stop();
  }

  private async loadPendingOffers(): Promise<CampaignJob[]> {
    try {
      const rows = (await prisma.$queryRawUnsafe<{ url: string }[]>(
        `SELECT url FROM OfferSource ORDER BY priority ASC LIMIT 5`,
      )) as { url: string }[];
      return rows.map((r: { url: string }) => ({ url: r.url }));
    } catch {
      logger.debug('Nenhuma tabela OfferSource ou ofertas pendentes; cron sem ação');
      return [];
    }
  }

  public async shutdown(): Promise<void> {
    this.stopCron();
    await this.worker?.close();
    await this.queue.close();
    await this.redis.quit();
  }
}

export default PromotionQueue;
