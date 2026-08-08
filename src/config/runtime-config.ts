import { env } from './env';

export type RuntimeConfigShape = {
  shopee: {
    appId: string;
    appSecret: string;
    tag: string;
    sandbox: boolean;
  };
  mercadolivre: {
    clientId: string;
    clientSecret: string;
    accessToken: string;
    tag: string;
    sandbox: boolean;
  };
  evolution: {
    apiUrl: string;
    apiKey: string;
    instanceName: string;
  };
  groups: string[];
};

const defaults: RuntimeConfigShape = {
  shopee: {
    appId: env.SHOPEE_APP_ID || '',
    appSecret: env.SHOPEE_APP_SECRET || '',
    tag: env.SHOPEE_AFFILIATE_TAG || '',
    sandbox: typeof env.SHOPEE_SANDBOX === 'boolean' ? env.SHOPEE_SANDBOX : true,
  },
  mercadolivre: {
    clientId: env.ML_CLIENT_ID || '',
    clientSecret: env.ML_CLIENT_SECRET || '',
    accessToken: env.ML_ACCESS_TOKEN || '',
    tag: env.ML_AFFILIATE_TAG || '',
    sandbox: typeof env.ML_SANDBOX === 'boolean' ? env.ML_SANDBOX : true,
  },
  evolution: {
    apiUrl: env.EVOLUTION_API_URL || '',
    apiKey: env.EVOLUTION_API_KEY || '',
    instanceName: env.EVOLUTION_INSTANCE_NAME || '',
  },
  groups: [],
};

class RuntimeConfigStore {
  private data: RuntimeConfigShape = JSON.parse(JSON.stringify(defaults));

  public get(): RuntimeConfigShape {
    return JSON.parse(JSON.stringify(this.data));
  }

  public getMasks(): {
    shopee: { appId: string; appSecret: string; tag: string; sandbox: boolean; set: boolean };
    mercadolivre: { clientId: string; clientSecret: string; accessToken: string; tag: string; sandbox: boolean; set: boolean };
    evolution: { apiUrl: string; apiKey: string; instanceName: string; set: boolean };
    groups: { count: number; list: string[] };
  } {
    const d = this.data;
    return {
      shopee: {
        appId: mask(d.shopee.appId, 4),
        appSecret: maskSecret(d.shopee.appSecret),
        tag: d.shopee.tag ? (d.shopee.tag.length > 0 ? 'SET' : 'NOT SET') : 'NOT SET',
        sandbox: d.shopee.sandbox,
        set: !!(d.shopee.appId && d.shopee.appSecret),
      },
      mercadolivre: {
        clientId: mask(d.mercadolivre.clientId, 4),
        clientSecret: maskSecret(d.mercadolivre.clientSecret),
        accessToken: maskSecret(d.mercadolivre.accessToken),
        tag: d.mercadolivre.tag || 'NOT SET',
        sandbox: d.mercadolivre.sandbox,
        set: !!(d.mercadolivre.clientId && d.mercadolivre.clientSecret && d.mercadolivre.accessToken),
      },
      evolution: {
        apiUrl: mask(d.evolution.apiUrl, 0),
        apiKey: maskSecret(d.evolution.apiKey),
        instanceName: d.evolution.instanceName || 'NOT SET',
        set: !!(d.evolution.apiUrl && d.evolution.apiKey && d.evolution.instanceName),
      },
      groups: { count: d.groups.length, list: d.groups.slice(0, 10) },
    };
  }

  public set(patch: Partial<RuntimeConfigShape>): RuntimeConfigShape {
    if (patch.shopee) this.data.shopee = { ...this.data.shopee, ...patch.shopee };
    if (patch.mercadolivre) this.data.mercadolivre = { ...this.data.mercadolivre, ...patch.mercadolivre };
    if (patch.evolution) this.data.evolution = { ...this.data.evolution, ...patch.evolution };
    if (Array.isArray(patch.groups)) this.data.groups = [...patch.groups];
    return this.get();
  }
}

function mask(s: string, keepStart = 4): string {
  if (!s) return '';
  if (s.length <= keepStart + 4) return '*'.repeat(Math.max(0, s.length - 2)) + s.slice(-2);
  return s.slice(0, keepStart) + '*'.repeat(Math.max(4, s.length - keepStart - 4)) + s.slice(-4);
}

function maskSecret(s: string): string {
  if (!s) return '';
  if (s.length <= 6) return '*'.repeat(s.length);
  return s.slice(0, 3) + '*'.repeat(Math.max(6, s.length - 6)) + s.slice(-3);
}

export const runtimeConfig = new RuntimeConfigStore();

export default runtimeConfig;
