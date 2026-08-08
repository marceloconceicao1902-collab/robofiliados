import axios from 'axios';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export async function notifyWebhook(type: 'SEND' | 'ERROR', payload: unknown): Promise<void> {
  const url = type === 'SEND' ? env.WEBHOOK_ON_SEND : env.WEBHOOK_ON_ERROR;
  if (!url) return;

  try {
    await axios.post(
      url,
      { type, payload, timestamp: new Date().toISOString() },
      { timeout: 5000, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    logger.warn({ err, type, url }, 'Falha ao enviar webhook (ignorado)');
  }
}
