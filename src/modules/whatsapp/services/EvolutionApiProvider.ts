import axios from 'axios';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import { WhatsAppServiceError } from '../../../shared/errors/AppError';
import type { WhatsAppProvider } from '../../../shared/interfaces';

export class EvolutionApiProvider implements WhatsAppProvider {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly instance: string;
  private _connected = false;

  constructor(
    apiUrl = env.EVOLUTION_API_URL,
    apiKey = env.EVOLUTION_API_KEY,
    instance = env.EVOLUTION_INSTANCE_NAME,
  ) {
    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.instance = instance;
  }

  public async connect(): Promise<void> {
    try {
      const url = `${this.apiUrl}/chat/findContacts/${this.instance}`;
      const response = await axios.get(url, {
        headers: this.headers(),
        timeout: 10000,
      });
      if (response.status >= 200 && response.status < 300) {
        this._connected = true;
        logger.info(`Evolution API conectado (instância: ${this.instance})`);
        return;
      }
      throw new WhatsAppServiceError(`Falha ao validar Evolution API: status ${response.status}`);
    } catch (err) {
      logger.warn({ err }, 'Não foi possível validar Evolution API; tentando usar send direto.');
      this._connected = true;
    }
  }

  public async disconnect(): Promise<void> {
    this._connected = false;
  }

  public isConnected(): boolean {
    return this._connected;
  }

  public async sendTextMessage(toId: string, text: string): Promise<boolean> {
    const url = `${this.apiUrl}/message/sendText/${this.instance}`;
    const payload = {
      number: this.normalizeNumber(toId),
      text,
      delay: 1200,
      presence: 'composing',
    };
    const response = await axios.post(url, payload, { headers: this.headers(), timeout: 30000 });
    return response.status >= 200 && response.status < 300;
  }

  public async sendImageMessage(toId: string, caption: string, imageUrl: string): Promise<boolean> {
    const url = `${this.apiUrl}/message/sendMedia/${this.instance}`;
    const payload = {
      number: this.normalizeNumber(toId),
      mediatype: 'image',
      mimeType: 'image/jpeg',
      caption,
      media: imageUrl,
      delay: 1200,
      presence: 'composing',
    };
    try {
      const response = await axios.post(url, payload, { headers: this.headers(), timeout: 30000 });
      return response.status >= 200 && response.status < 300;
    } catch (err) {
      logger.warn({ err }, 'Falha envio imagem Evolution, fallback texto');
      return this.sendTextMessage(toId, caption);
    }
  }

  private headers(): Record<string, string> {
    return {
      apikey: this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private normalizeNumber(raw: string): string {
    return raw.replace(/@g\.us$/, '').replace(/\D/g, '');
  }
}
