import { createHash, randomInt } from 'node:crypto';
import { nanoid } from 'nanoid';
import { env } from '../../config/env';

export function generateProductHash(originalUrl: string): string {
  const normalizedUrl = originalUrl.trim().toLowerCase();
  return createHash('sha256').update(normalizedUrl).digest('hex');
}

export function generateUniqueHash(productId: string, groupId: string, windowHours: number = env.ANTI_DUPLICATE_WINDOW_HOURS): string {
  const now = new Date();
  const bucket = Math.floor(now.getTime() / (1000 * 60 * 60 * windowHours));
  return createHash('sha256')
    .update(`${productId}:${groupId}:${bucket}`)
    .digest('hex');
}

export function randomDelayMs(minSeconds: number = env.SEND_MIN_DELAY, maxSeconds: number = env.SEND_MAX_DELAY): number {
  const min = Math.max(1, Math.floor(minSeconds * 1000));
  const max = Math.max(min + 1000, Math.floor(maxSeconds * 1000));
  return randomInt(min, max + 1);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function shortId(size = 10): string {
  return nanoid(size);
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

export function calculateDiscountPercentage(original: number, discount: number): number | null {
  if (!original || !discount || original <= discount) {
    return null;
  }
  const percent = Math.round(((original - discount) / original) * 100);
  return percent > 0 ? percent : null;
}

export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function truncateText(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}
