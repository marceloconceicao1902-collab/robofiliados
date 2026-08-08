import { runtimeConfig, type RuntimeConfigShape } from '../config/runtime-config';

export function applyCredentialsToEnv(): RuntimeConfigShape {
  const cfg = runtimeConfig.get();
  if (cfg.shopee.appId) process.env.SHOPEE_APP_ID = cfg.shopee.appId;
  if (cfg.shopee.appSecret) process.env.SHOPEE_APP_SECRET = cfg.shopee.appSecret;
  if (cfg.shopee.tag) process.env.SHOPEE_AFFILIATE_TAG = cfg.shopee.tag;
  if (typeof cfg.shopee.sandbox === 'boolean') process.env.SHOPEE_SANDBOX = cfg.shopee.sandbox ? 'true' : 'false';

  if (cfg.mercadolivre.clientId) process.env.ML_CLIENT_ID = cfg.mercadolivre.clientId;
  if (cfg.mercadolivre.clientSecret) process.env.ML_CLIENT_SECRET = cfg.mercadolivre.clientSecret;
  if (cfg.mercadolivre.accessToken) process.env.ML_ACCESS_TOKEN = cfg.mercadolivre.accessToken;
  if (cfg.mercadolivre.tag) process.env.ML_AFFILIATE_TAG = cfg.mercadolivre.tag;
  if (typeof cfg.mercadolivre.sandbox === 'boolean') process.env.ML_SANDBOX = cfg.mercadolivre.sandbox ? 'true' : 'false';

  if (cfg.evolution.apiUrl) process.env.EVOLUTION_API_URL = cfg.evolution.apiUrl;
  if (cfg.evolution.apiKey) process.env.EVOLUTION_API_KEY = cfg.evolution.apiKey;
  if (cfg.evolution.instanceName) process.env.EVOLUTION_INSTANCE_NAME = cfg.evolution.instanceName;

  return cfg;
}

export function parseGroupsListText(text: string): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n|,|;/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export default applyCredentialsToEnv;
