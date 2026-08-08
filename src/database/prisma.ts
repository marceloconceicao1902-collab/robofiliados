import type { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let cachedPrisma: PrismaClient | null = null;
let prismaLoadError: Error | null = null;

async function createPrismaClient(): Promise<PrismaClient> {
  if (cachedPrisma) return cachedPrisma;
  if (prismaLoadError) throw prismaLoadError;

  try {
    const { PrismaClient } = await import('@prisma/client');
    const client = new PrismaClient({
      log:
        env.NODE_ENV === 'development'
          ? (['query', 'error', 'warn'] as any)
          : (['error'] as any),
    });
    try {
      await client.$connect();
    } catch (e) {
      console.warn('[prisma] $connect falhou (esperado em serverless sem DB persistente):', (e as Error).message);
    }
    cachedPrisma = client;
    if (env.NODE_ENV !== 'production') globalForPrisma.prisma = client;
    return client;
  } catch (e: any) {
    prismaLoadError = e;
    throw e;
  }
}

type PrismaClientAny = any;

function makeLazyPrisma(): PrismaClient {
  const lazy = new Proxy({} as PrismaClientAny, {
    get(_target, prop: string | symbol) {
      if (prop === 'then' || prop === 'catch' || prop === 'finally') return undefined;
      const clientPromise = createPrismaClient();
      const anyPrisma: PrismaClientAny = new Proxy(clientPromise, {
        get(promise: Promise<PrismaClient>, subprop: string | symbol) {
          if (subprop === 'then' || subprop === 'catch' || subprop === 'finally') {
            return (Promise.prototype as any)[subprop].bind(promise);
          }
          return (...args: any[]) => promise.then((c: any) => (c as any)[subprop](...args));
        },
      });
      return anyPrisma[prop];
    },
  });
  return lazy as PrismaClient;
}

export const prisma: PrismaClient = makeLazyPrisma();

export async function getPrisma(): Promise<PrismaClient> {
  return createPrismaClient();
}

export type PrismaService = PrismaClient;
