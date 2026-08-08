import type { Group } from '@prisma/client';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import { DuplicateProductError } from '../../../shared/errors/AppError';
import type {
  CampaignSummary,
  FormattedPromotionMessage,
  SendMessageResult,
} from '../../../shared/interfaces';
import { notifyWebhook } from '../../../shared/utils/webhook';
import AffiliateService from '../../affiliate/services/AffiliateService';
import WhatsAppService from '../../whatsapp/services/WhatsAppService';
import GroupService from '../../group/services/GroupService';
import {
  DuplicateGuardService,
  ProductRepository,
  SentHistoryRepository,
} from './PersistenceServices';

export interface RunCampaignOptions {
  url: string;
  groupIds?: string[];
  maxGroups?: number;
  skipAntiDuplicateCheck?: boolean;
  callToAction?: string;
}

export class PromotionBotService {
  constructor(
    private readonly affiliateService: AffiliateService = new AffiliateService(),
    private readonly whatsAppService: WhatsAppService = new WhatsAppService(),
    private readonly groupService: GroupService = new GroupService(),
    private readonly duplicateGuard: DuplicateGuardService = new DuplicateGuardService(),
    private readonly productRepo: ProductRepository = new ProductRepository(),
    private readonly historyRepo: SentHistoryRepository = new SentHistoryRepository(),
  ) {}

  public get whatsApp(): WhatsAppService {
    return this.whatsAppService;
  }

  public get groups(): GroupService {
    return this.groupService;
  }

  public get affiliates(): AffiliateService {
    return this.affiliateService;
  }

  public async ensureConnected(): Promise<void> {
    if (!this.whatsAppService.isConnected()) {
      logger.info('WhatsApp desconectado; iniciando conexão...');
      await this.whatsAppService.connect();
    }
  }

  public async runCampaign(options: RunCampaignOptions): Promise<CampaignSummary> {
    const startedAt = new Date();
    logger.info({ url: options.url }, '▶ Iniciando campanha de promoção');

    const [productInfo, groups] = await Promise.all([
      this.affiliateService.processLink(options.url),
      this.resolveGroups(options),
    ]);

    if (!options.skipAntiDuplicateCheck) {
      const alreadySent = await this.duplicateGuard.isProductSentRecently(options.url);
      if (alreadySent) {
        throw new DuplicateProductError(
          `Produto já enviado nas últimas ${env.ANTI_DUPLICATE_WINDOW_HOURS}h. Use skipAntiDuplicateCheck para forçar.`,
        );
      }
    }

    const product = await this.productRepo.upsert(productInfo);

    const message: FormattedPromotionMessage = this.whatsAppService.formatPromotionMessage({
      title: product.title,
      description: product.description ?? undefined,
      originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
      discountPrice: product.discountPrice ? Number(product.discountPrice) : undefined,
      discountPercentage: product.discountPercentage ?? undefined,
      link: product.shortUrl || product.affiliateUrl,
      imageUrl: product.imageUrl ?? undefined,
      platform: product.platform,
      callToAction: options.callToAction,
    });

    const summary: CampaignSummary = {
      totalGroups: groups.length,
      sent: 0,
      failed: 0,
      skippedDuplicate: 0,
      skippedRateLimit: 0,
      startedAt,
      productTitle: product.title,
    };

    logger.info({ groups: groups.length, title: product.title }, 'Grupos e mensagem preparados');

    for (const group of groups) {
      await this.deliverToGroup(group, product.id, message, summary);
    }

    summary.finishedAt = new Date();
    logger.info(
      {
        sent: summary.sent,
        failed: summary.failed,
        skippedDuplicate: summary.skippedDuplicate,
        durationSec: Math.round((summary.finishedAt.getTime() - startedAt.getTime()) / 1000),
      },
      '✅ Campanha finalizada',
    );

    notifyWebhook('SEND', summary).catch(() => void 0);
    return summary;
  }

  private async resolveGroups(options: RunCampaignOptions): Promise<Group[]> {
    if (options.groupIds && options.groupIds.length > 0) {
      const all = await this.groupService.listAll();
      const filter = new Set(options.groupIds);
      const selected = all.filter((g) => filter.has(g.groupId) || filter.has(g.id));
      if (selected.length === 0) {
        logger.warn('Nenhum grupo encontrado com os IDs informados; usando grupos ativos padrão');
        return this.groupService.listActive(options.maxGroups);
      }
      return selected;
    }
    return this.groupService.listActive(options.maxGroups);
  }

  private async deliverToGroup(
    group: Group,
    productId: string,
    message: FormattedPromotionMessage,
    summary: CampaignSummary,
  ): Promise<void> {
    const already = await this.duplicateGuard.isCombinationSent(productId, group.id);
    if (already) {
      logger.debug({ group: group.name, productId }, 'Combinação produto/grupo já enviada; pulando');
      summary.skippedDuplicate++;
      return;
    }

    let historyId: string | null = null;
    try {
      const history = await this.historyRepo.createPending({
        productId,
        groupId: group.id,
      });
      historyId = history.id;

      const result: SendMessageResult = await this.whatsAppService.sendToGroup(group, message);

      if (result.success && result.deliveredAt) {
        await this.historyRepo.markSent(history.id, result.deliveredAt);
        summary.sent++;
      } else {
        await this.historyRepo.markFailed(history.id, result.errorMessage || 'unknown');
        summary.failed++;
      }
    } catch (err) {
      logger.error({ err, group: group.name }, 'Erro durante entrega');
      if (historyId) {
        await this.historyRepo.markFailed(historyId, (err as Error).message);
      }
      summary.failed++;
    }
  }
}

export default PromotionBotService;
