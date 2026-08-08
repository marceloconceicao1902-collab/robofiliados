import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  TZ: z.string().default('America/Sao_Paulo'),

  DATABASE_URL: z.string().default('file:./dev.db'),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),

  SHOPEE_AFFILIATE_TAG: z.string().default(''),
  SHOPEE_APP_ID: z.string().default(''),
  SHOPEE_APP_SECRET: z.string().default(''),
  SHOPEE_SANDBOX: z.coerce.boolean().default(true),

  ML_AFFILIATE_TAG: z.string().default(''),
  ML_CLIENT_ID: z.string().default(''),
  ML_CLIENT_SECRET: z.string().default(''),
  ML_ACCESS_TOKEN: z.string().default(''),
  ML_SANDBOX: z.coerce.boolean().default(true),

  WHATSAPP_PROVIDER: z.enum(['baileys', 'evolution']).default('evolution'),
  WA_SESSION_FOLDER: z.string().default('./sessions'),
  WA_SESSION_NAME: z.string().default('default'),
  EVOLUTION_API_URL: z.string().default('http://localhost:8080'),
  EVOLUTION_API_KEY: z.string().default(''),
  EVOLUTION_INSTANCE_NAME: z.string().default('affiliate-bot'),

  SEND_MIN_DELAY: z.coerce.number().default(30),
  SEND_MAX_DELAY: z.coerce.number().default(90),
  SEND_CAMPAIGN_INTERVAL: z.coerce.number().default(60),
  SEND_MAX_PER_HOUR: z.coerce.number().default(60),
  SEND_MAX_GROUPS_PER_CAMPAIGN: z.coerce.number().default(30),

  SHORTENER_PROVIDER: z.enum(['tinyurl', 'bitly', 'none']).default('tinyurl'),
  BITLY_TOKEN: z.string().default(''),

  ANTI_DUPLICATE_WINDOW_HOURS: z.coerce.number().default(24),

  WEBHOOK_ON_SEND: z.string().optional(),
  WEBHOOK_ON_ERROR: z.string().optional(),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
