import fs from 'node:fs';
import path from 'node:path';
import makeWASocket, {
  type AnyMessageContent,
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidGroup,
  makeCacheableSignalKeyStore,
  proto,
  useMultiFileAuthState,
  type WAMessageKey,
  type ConnectionState,
  type WAMessage,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import NodeCache from 'node-cache';
import P from 'pino';
import qrcode from 'qrcode-terminal';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import { WhatsAppServiceError } from '../../../shared/errors/AppError';
import type { WhatsAppProvider } from '../../../shared/interfaces';

const msgRetryCache = new NodeCache({ stdTTL: 60 * 30 });

export class BaileysProvider implements WhatsAppProvider {
  private sock?: ReturnType<typeof makeWASocket>;
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
    const sessionPath = path.resolve(this.sessionFolder, this.sessionName);
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    logger.info({ version, isLatest }, 'Versão Baileys carregada');

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
      getMessage: async (key: WAMessageKey) => {
        const store = (msgRetryCache as any).get(
          key.id || '',
        );
        return store ?? proto.Message.fromObject({});
      },
    });

    this.sock.ev.on('creds.update', saveCreds);

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new WhatsAppServiceError('Timeout ao conectar WhatsApp (escaneie o QR code)', 408));
      }, 1000 * 60 * 2);

      if (!this.sock) {
        reject(new WhatsAppServiceError('Socket não inicializado'));
        return;
      }

      this.sock.ev.on('connection.update', (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          logger.info('QR Code recebido. Escaneie no seu WhatsApp:');
          qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
          const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const shouldReconnect = code !== DisconnectReason.loggedOut;
          logger.warn({ code, shouldReconnect }, 'Conexão WhatsApp fechada');

          if (code === DisconnectReason.loggedOut) {
            clearTimeout(timeout);
            reject(
              new WhatsAppServiceError(
                'WhatsApp desconectado (logged out). Recrie a sessão.',
              ),
            );
            return;
          }

          if (shouldReconnect) {
            logger.info('Tentando reconectar...');
            this.connect().catch((err: unknown) =>
              logger.error({ err }, 'Erro na reconexão'),
            );
          }
        } else if (connection === 'open') {
          this.connected = true;
          logger.info('WhatsApp conectado com sucesso!');
          clearTimeout(timeout);
          resolve();
        }
      });

      this.sock.ev.on('messages.upsert', ({ messages }: { messages: WAMessage[] }) => {
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
        await this.sock.end(new Error('Solicitado desconexão pelo usuário'));
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
      const content: AnyMessageContent = { text };
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
      const content: AnyMessageContent = {
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
      throw new WhatsAppServiceError('WhatsApp não está conectado. Chame connect() primeiro.');
    }
  }

  private ensureGroupJid(groupId: string): string {
    if (isJidGroup(groupId)) return groupId;
    if (groupId.includes('@g.us')) return groupId;
    if (/^\d+$/.test(groupId)) {
      return `${groupId}@g.us`;
    }
    return groupId;
  }
}
