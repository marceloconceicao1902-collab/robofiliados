import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServer } from '../src/config/server';

let cachedServer: ReturnType<typeof createServer> | null = null;

async function getServer() {
  if (!cachedServer) {
    cachedServer = createServer();
    await cachedServer.ready();
  }
  return cachedServer;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const app = await getServer();
  await app.ready();
  app.server.emit('request', req as any, res as any);
}
