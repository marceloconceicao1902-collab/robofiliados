import axios from 'axios';
import { env } from '../../../config/env';
import runtimeConfig from '../../../config/runtime-config';
import { logger } from '../../../config/logger';
import { WhatsAppServiceError } from '../../../shared/errors/AppError';
import type { WhatsAppProvider } from '../../../shared/interfaces';

function resolveEvolutionCfg(): { apiUrl: string; apiKey: string; instance: string } {
  const r = runtimeConfig.get().evolution;
  const apiUrlRaw = r.apiUrl || env.EVOLUTION_API_URL || '';
  const apiKey = r.apiKey || env.EVOLUTION_API_KEY || '';
  const instance = r.instanceName || env.EVOLUTION_INSTANCE_NAME || '';
  return { apiUrl: apiUrlRaw.replace(/\/$/, ''), apiKey, instance };
}

export class EvolutionApiProvider implements WhatsAppProvider {
  private _connected = false;

  constructor() {}

  private get cfg() {
    return resolveEvolutionCfg();
  }

  public async connect(): Promise<void> {
    const { apiUrl, apiKey, instance } = this.cfg;
    try {
      if (!apiUrl || !apiKey || !instance) {
        logger.warn('Evolution credenciais ausentes (preencha no painel /); marcando connected=false safe mode.');
        this._connected = false;
        return;
      }
      const url = `${apiUrl}/instance/findContacts/${instance}`;
      const response = await axios.get(url, {
        headers: this.headers(),
        timeout: 10000,
      });
      if (response.status >= 200 && response.status < 300) {
        this._connected = true;
        logger.info(`Evolution API conectado (instância: ${instance})`);
        return;
      }
      throw new WhatsAppServiceError(`Falha ao validar Evolution API: status ${response.status}`);
    } catch (err) {
      logger.warn({ err }, 'Não foi possível validar Evolution API; tentando usar send direto (safe connected=true).');
      this._connected = true;
    }
  }

  public async disconnect(): Promise<void> {
    this._connected = false;
  }

  public isConnected(): boolean {
    const c = this.cfg;
    return this._connected && !!c.apiUrl && !!c.apiKey && !!c.instance;
  }

  public async sendTextMessage(toId: string, text: string): Promise<boolean> {
    const { apiUrl, instance } = this.cfg;
    const url = `${apiUrl}/message/sendText/${instance}`;
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
    const { apiUrl, instance } = this.cfg;
    const url = `${apiUrl}/message/sendMedia/${instance}`;
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
      apikey: this.cfg.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private normalizeNumber(raw: string): string {
    return raw.replace(/@g\.us$/, '').replace(/\D/g, '');
  }
}
