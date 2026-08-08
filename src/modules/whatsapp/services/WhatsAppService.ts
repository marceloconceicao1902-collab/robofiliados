import type { Group } from '@prisma/client';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import { WhatsAppServiceError } from '../../../shared/errors/AppError';
import type {
  FormattedPromotionMessage,
  SendMessageResult,
  WhatsAppProvider,
} from '../../../shared/interfaces';
import {
  formatCurrency,
  randomDelayMs,
  sleep,
  truncateText,
} from '../../../shared/utils/helpers';
import { BaileysProvider } from './BaileysProvider';
import { EvolutionApiProvider } from './EvolutionApiProvider';
import type { FormatPromotionInput, IWhatsAppService } from '../interfaces';

export class WhatsAppService implements IWhatsAppService {
  private readonly provider: WhatsAppProvider;
  private rateLimitWindowStart = Date.now();
  private rateLimitCount = 0;

  constructor(provider?: WhatsAppProvider) {
    this.provider = provider ?? this.createDefaultProvider();
  }

  private createDefaultProvider(): WhatsAppProvider {
    if (env.WHATSAPP_PROVIDER === 'evolution') {
      logger.info('Usando Evolution API como provider WhatsApp');
      return new EvolutionApiProvider();
    }
    logger.info('Usando Baileys como provider WhatsApp');
    return new BaileysProvider();
  }

  public async connect(): Promise<void> {
    logger.info('Conectando WhatsApp...');
    await this.provider.connect();
    this.rateLimitWindowStart = Date.now();
    this.rateLimitCount = 0;
  }

  public async disconnect(): Promise<void> {
    logger.info('Desconectando WhatsApp...');
    await this.provider.disconnect();
  }

  public isConnected(): boolean {
    return this.provider.isConnected();
  }

  public formatPromotionMessage(input: FormatPromotionInput): FormattedPromotionMessage {
    const {
      title,
      description,
      originalPrice,
      discountPrice,
      discountPercentage,
      link,
      platform,
      imageUrl,
      callToAction = 'Compre agora',
    } = input;

    const platformLabel = this.platformEmojiLabel(platform);
    const hasDiscount = originalPrice && discountPrice && originalPrice > discountPrice;

    const lines: string[] = [];

    lines.push('🔥 *OFERTA IMPERDÍVEL!* 🔥');
    lines.push('');
    lines.push(platformLabel);
    lines.push('');
    lines.push(`*${truncateText(title, 120)}*`);
    lines.push('');

    if (hasDiscount) {
      lines.push(`💸 *De:* ~~${formatCurrency(originalPrice)}~~`);
      lines.push(`✅ *Por:* ${formatCurrency(discountPrice)}`);
      if (discountPercentage) {
        lines.push(`💰 *Economia:* ${discountPercentage}% OFF`);
      }
      lines.push('');
    } else if (discountPrice) {
      lines.push(`💲 *Preço:* ${formatCurrency(discountPrice)}`);
      lines.push('');
    } else if (originalPrice) {
      lines.push(`💲 *Preço:* ${formatCurrency(originalPrice)}`);
      lines.push('');
    }

    if (description) {
      lines.push(`📝 ${truncateText(description, 200)}`);
      lines.push('');
    }

    lines.push('🟢 *Acesse abaixo:*');
    lines.push(link);
    lines.push('');
    lines.push(`👉 *${callToAction}!*`);
    lines.push('');
    lines.push('🔞 Não compartilhamos pirataria, apenas promoções legais.');
    lines.push('🛍️ Aproveite enquanto durar o estoque!');

    const text = lines.join('\n');

    return { text, imageUrl };
  }

  private platformEmojiLabel(platform: string): string {
    switch (platform.toUpperCase()) {
      case 'SHOPEE':
        return '🛒 *| SHOPEE |*';
      case 'MERCADO_LIVRE':
      case 'MERCADOLIVRE':
      case 'ML':
        return '🟡 *| MERCADO LIVRE |*';
      default:
        return '🛍️ *| OFERTA |*';
    }
  }

  public async sendToGroup(
    group: Group,
    message: FormattedPromotionMessage,
  ): Promise<SendMessageResult> {
    if (!this.isConnected()) {
      throw new WhatsAppServiceError('WhatsApp desconectado. Não é possível enviar.');
    }

    const waitMs = await this.acquireRateLimit();
    if (waitMs > 0) {
      logger.debug({ ms: waitMs }, 'Rate-limit: esperando antes de enviar');
      await sleep(waitMs);
    }

    const startedAt = Date.now();
    let success = false;
    let errorMessage: string | undefined;

    try {
      if (message.imageUrl) {
        success = await this.provider.sendImageMessage(
          group.groupId,
          message.text,
          message.imageUrl,
        );
      } else {
        success = await this.provider.sendTextMessage(group.groupId, message.text);
      }
    } catch (err) {
      errorMessage = (err as Error).message;
      logger.error({ err, groupId: group.groupId, groupName: group.name }, 'Erro envio grupo');
    }

    logger.info(
      {
        group: group.name,
        success,
        durationMs: Date.now() - startedAt,
      },
      'Envio concluído para grupo',
    );

    return {
      groupId: group.groupId,
      groupName: group.name,
      success,
      errorMessage,
      deliveredAt: success ? new Date() : undefined,
    };
  }

  public async sendToAllGroups(
    groups: Group[],
    message: FormattedPromotionMessage,
    onProgress?: (current: number, total: number, result: SendMessageResult) => void,
  ): Promise<SendMessageResult[]> {
    const results: SendMessageResult[] = [];
    const total = groups.length;

    logger.info({ total }, 'Iniciando envio em massa para grupos');

    for (let i = 0; i < total; i++) {
      const group = groups[i];

      if (i > 0) {
        const delay = randomDelayMs();
        logger.debug({ delaySec: Math.round(delay / 1000), grupo: group.name }, 'Aguardando delay anti-ban');
        await sleep(delay);
      }

      const result = await this.sendToGroup(group, message);
      results.push(result);
      onProgress?.(i + 1, total, result);
    }

    const sent = results.filter((r) => r.success).length;
    logger.info({ total, sent, failed: total - sent }, 'Envio em massa concluído');
    return results;
  }

  private async acquireRateLimit(): Promise<number> {
    const oneHourMs = 60 * 60 * 1000;
    const now = Date.now();

    if (now - this.rateLimitWindowStart > oneHourMs) {
      this.rateLimitWindowStart = now;
      this.rateLimitCount = 0;
    }

    if (this.rateLimitCount < env.SEND_MAX_PER_HOUR) {
      this.rateLimitCount++;
      return 0;
    }

    const waitMs = oneHourMs - (now - this.rateLimitWindowStart) + 1000;
    logger.warn({ waitMinutes: Math.round(waitMs / 60000) }, 'Rate-limit atingido, aguardando janela');
    return waitMs;
  }
}

export default WhatsAppService;
