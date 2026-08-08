import pino, { Logger } from 'pino';
import { env } from './env';

export const logger: Logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'dd/mm/yyyy HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
