import { IncomingMessage, ServerResponse } from 'http';
import { createServer } from '../src/config/server';

type VercelRequest = IncomingMessage & {
  query: Record<string, string | string[] | undefined>;
  cookies: Record<string, string>;
  body: any;
};

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  send: (body: any) => VercelResponse;
  json: (body: any) => VercelResponse;
  redirect: (url: string) => VercelResponse;
};

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
  (app.server as any).emit('request', req, res);
}
