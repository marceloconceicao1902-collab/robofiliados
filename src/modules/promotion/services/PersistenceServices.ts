import type { Group, Product, SentHistory } from '@prisma/client';
import { SendStatusEnum } from '../../../shared/interfaces';
import { prisma } from '../../../database/prisma';
import { env } from '../../../config/env';
import { generateProductHash, generateUniqueHash } from '../../../shared/utils/helpers';
import type { ProductInfo } from '../../../shared/interfaces';

export class DuplicateGuardService {
  public async isProductSentRecently(originalUrl: string, windowHours: number = env.ANTI_DUPLICATE_WINDOW_HOURS): Promise<boolean> {
    const hash = generateProductHash(originalUrl);
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const existing = await prisma.product.findUnique({
      where: { hash },
      select: {
        id: true,
        sentHistory: {
          where: { status: SendStatusEnum.SENT, sentAt: { gte: since } },
          take: 1,
        },
      },
    });

    if (existing && existing.sentHistory.length > 0) {
      return true;
    }
    return false;
  }

  public async isCombinationSent(productId: string, groupId: string): Promise<boolean> {
    const hash = generateUniqueHash(productId, groupId, env.ANTI_DUPLICATE_WINDOW_HOURS);
    const entry = await prisma.sentHistory.findUnique({
      where: { uniqueHash: hash },
      select: { id: true, status: true },
    });
    if (!entry) return false;
    return entry.status === SendStatusEnum.SENT || entry.status === SendStatusEnum.PENDING;
  }

  public buildUniqueHash(productId: string, groupId: string): string {
    return generateUniqueHash(productId, groupId, env.ANTI_DUPLICATE_WINDOW_HOURS);
  }

  public productHash(originalUrl: string): string {
    return generateProductHash(originalUrl);
  }
}

export class ProductRepository {
  public async upsert(info: ProductInfo): Promise<Product> {
    const hash = generateProductHash(info.originalUrl);
    const data = {
      originalUrl: info.originalUrl,
      affiliateUrl: info.affiliateUrl,
      shortUrl: info.shortUrl ?? null,
      platform: info.platform,
      productId: info.productId ?? null,
      title: info.title,
      description: info.description ?? null,
      imageUrl: info.imageUrl ?? null,
      originalPrice: info.originalPrice ?? null,
      discountPrice: info.discountPrice ?? null,
      discountPercentage: info.discountPercentage ?? null,
      category: info.category ?? null,
      brand: info.brand ?? null,
      hash,
    };

    return prisma.product.upsert({
      where: { hash },
      create: data,
      update: {
        ...data,
      },
    });
  }

  public async getByHash(hash: string): Promise<Product | null> {
    return prisma.product.findUnique({ where: { hash } });
  }
}

export class SentHistoryRepository {
  public async createPending(data: {
    productId: string;
    groupId: string;
  }): Promise<SentHistory> {
    const uniqueHash = generateUniqueHash(data.productId, data.groupId);

    return prisma.sentHistory.create({
      data: {
        productId: data.productId,
        groupId: data.groupId,
        status: SendStatusEnum.PENDING,
        uniqueHash,
      },
    });
  }

  public async markSent(id: string, sentAt: Date): Promise<void> {
    await prisma.sentHistory.update({
      where: { id },
      data: { status: SendStatusEnum.SENT, sentAt },
    });
  }

  public async markFailed(id: string, errorMessage: string): Promise<void> {
    await prisma.sentHistory.update({
      where: { id },
      data: { status: SendStatusEnum.FAILED, errorMessage },
    });
  }

  public async markSkipped(id: string, reason: 'DUPLICATE' | 'RATE_LIMIT'): Promise<void> {
    await prisma.sentHistory.update({
      where: { id },
      data: {
        status: reason === 'DUPLICATE' ? SendStatusEnum.SKIPPED_DUPLICATE : SendStatusEnum.SKIPPED_RATE_LIMIT,
        errorMessage: reason,
      },
    });
  }

  public async findById(id: string): Promise<SentHistory | null> {
    return prisma.sentHistory.findUnique({ where: { id } });
  }

  public async statsLast(hours: number = 24): Promise<{ total: number; sent: number; failed: number; skipped: number }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const items = await prisma.sentHistory.findMany({ where: { createdAt: { gte: since } } });
    return {
      total: items.length,
      sent: items.filter((i: SentHistory) => i.status === SendStatusEnum.SENT).length,
      failed: items.filter((i: SentHistory) => i.status === SendStatusEnum.FAILED).length,
      skipped: items.filter((i: SentHistory) => i.status.toString().startsWith('SKIPPED')).length,
    };
  }
}

export type { Group, Product, SentHistory };
