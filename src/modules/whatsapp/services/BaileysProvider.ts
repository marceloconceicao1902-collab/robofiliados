import fs from 'node:fs';
import path from 'node:path';
import P from 'pino';
import qrcode from 'qrcode-terminal';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import { WhatsAppServiceError } from '../../../shared/errors/AppError';
import type { WhatsAppProvider } from '../../../shared/interfaces';

type BaileysDeps = {
  default: any;
  fetchLatestBaileysVersion: any;
  makeCacheableSignalKeyStore: any;
  useMultiFileAuthState: any;
  isJidGroup: any;
  DisconnectReason: any;
  proto: any;
  Boom: any;
  NodeCache: any;
};

let baileysLazy: Promise<BaileysDeps> | null = null;
async function ensureBaileysDeps(): Promise<BaileysDeps> {
  if (baileysLazy) return baileysLazy;
  baileysLazy = (async () => {
    const [
      {
        default: makeWASocket,
        fetchLatestBaileysVersion,
        isJidGroup,
        makeCacheableSignalKeyStore,
        proto,
        useMultiFileAuthState,
        DisconnectReason,
      },
      { Boom },
      { default: NodeCache },
    ] = await Promise.all([
      import('@whiskeysockets/baileys'),
      import('@hapi/boom'),
      import('node-cache'),
    ]);
    return {
      default: makeWASocket,
      fetchLatestBaileysVersion,
      makeCacheableSignalKeyStore,
      useMultiFileAuthState,
      isJidGroup,
      DisconnectReason,
      proto,
      Boom,
      NodeCache,
    };
  })();
  return baileysLazy;
}

let msgRetryCache: any = null;

export class BaileysProvider implements WhatsAppProvider {
  private sock?: any;
  private connected = false;
  private readonly sessionFolder: string;
  private readonly sessionName: string;
  private readonly baileysLogger: P.Logger;

  constructor(sessionFolder = env.WA_SESSION_FOLDER, sessionName = env.WA_SESSION_NAME) {
    this.sessionFolder = sessionFolder;
    this.sessionName = sessionName;
    this.baileysLogger = P({
      level: env.NODE_ENV === 'production' ? 'error' : 'silent',
    });
  }

  public async connect(): Promise<void> {
    const baileys = await ensureBaileysDeps();
    const {
      default: makeWASocket,
      fetchLatestBaileysVersion,
      useMultiFileAuthState,
      makeCacheableSignalKeyStore,
      DisconnectReason,
      proto,
      Boom,
      NodeCache,
    } = baileys;

    if (!msgRetryCache) {
      msgRetryCache = new NodeCache({ stdTTL: 60 * 30 });
    }

    const sessionPath = path.resolve(this.sessionFolder, this.sessionName);
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    logger.info({ version, isLatest }, 'Versao Baileys carregada');

    this.sock = makeWASocket({
      version,
      printQRInTerminal: true,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, this.baileysLogger),
      },
      logger: this.baileysLogger,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      retryRequestDelayMs: 5000,
      msgRetryCounterCache: msgRetryCache as any,
      generateHighQualityLinkPreview: true,
      getMessage: async (key: any) => {
        const store = (msgRetryCache as any).get(key.id || '');
        return store ?? proto.Message.fromObject({});
      },
    });

    this.sock.ev.on('creds.update', saveCreds);

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new WhatsAppServiceError('Timeout ao conectar WhatsApp (escaneie o QR code)', 408));
      }, 1000 * 60 * 2);

      if (!this.sock) {
        reject(new WhatsAppServiceError('Socket nao inicializado'));
        return;
      }

      this.sock.ev.on('connection.update', (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          logger.info('QR Code recebido. Escaneie no seu WhatsApp:');
          qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
          const code = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = code !== DisconnectReason.loggedOut;
          logger.warn({ code, shouldReconnect }, 'Conexao WhatsApp fechada');

          if (code === DisconnectReason.loggedOut) {
            clearTimeout(timeout);
            reject(
              new WhatsAppServiceError(
                'WhatsApp desconectado (logged out). Recrie a sessao.',
              ),
            );
            return;
          }

          if (shouldReconnect) {
            logger.info('Tentando reconectar...');
            this.connect().catch((err: unknown) =>
              logger.error({ err }, 'Erro na reconexao'),
            );
          }
        } else if (connection === 'open') {
          this.connected = true;
          logger.info('WhatsApp conectado com sucesso!');
          clearTimeout(timeout);
          resolve();
        }
      });

      this.sock.ev.on('messages.upsert', ({ messages }: { messages: any[] }) => {
        for (const m of messages) {
          if (m.key.id) {
            (msgRetryCache as any).set(
              m.key.id,
              m.message || proto.Message.fromObject({}),
            );
          }
        }
      });
    });
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.sock) {
        await this.sock.end(new Error('Solicitado desconexao pelo usuario'));
      }
    } catch (err: unknown) {
      logger.warn({ err }, 'Erro ao desconectar WhatsApp (ignorado)');
    } finally {
      this.connected = false;
    }
  }

  public isConnected(): boolean {
    return this.connected && !!this.sock;
  }

  public async sendTextMessage(toId: string, text: string): Promise<boolean> {
    this.ensureConnected();
    try {
      const jid = this.ensureGroupJid(toId);
      const content: any = { text };
      const result = await this.sock!.sendMessage(jid, content);
      return !!result;
    } catch (err: unknown) {
      logger.error({ err, toId }, 'Erro ao enviar mensagem de texto');
      throw new WhatsAppServiceError(`Erro envio texto: ${(err as Error).message}`);
    }
  }

  public async sendImageMessage(
    toId: string,
    caption: string,
    imageUrl: string,
  ): Promise<boolean> {
    this.ensureConnected();
    try {
      const jid = this.ensureGroupJid(toId);
      const content: any = {
        image: { url: imageUrl },
        caption,
        mimetype: 'image/jpeg',
      };
      const result = await this.sock!.sendMessage(jid, content);
      return !!result;
    } catch (err: unknown) {
      logger.warn({ err, toId }, 'Falha envio com imagem, tentando fallback somente texto');
      return this.sendTextMessage(toId, caption);
    }
  }

  private ensureConnected(): void {
    if (!this.connected || !this.sock) {
      throw new WhatsAppServiceError('WhatsApp nao esta conectado. Chame connect() primeiro.');
    }
  }

  private ensureGroupJid(groupId: string): string {
    if (msgRetryCache) {
      const { isJidGroup } = baileysLazy
        ? ({} as any)
        : ({} as any);
    }
    if (groupId.includes('@g.us')) return groupId;
    if (/^\d+$/.test(groupId)) {
      return `${groupId}@g.us`;
    }
    return groupId;
  }
}
