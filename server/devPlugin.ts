import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import type { Connect, Plugin } from 'vite';
import { handleChat } from './assistant.js';

// Serves /api/chat from `npm run dev` and `npm run preview`, mirroring the Vercel function.
export function assistantApi(apiKey: string | undefined): Plugin {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    if (req.url?.split('?')[0] !== '/api/chat') return next();
    void forward(req, res, apiKey);
  };
  return {
    name: 'assistant-api',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
}

async function forward(req: IncomingMessage, res: ServerResponse, apiKey: string | undefined) {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(name, value);
    }
    const request = new Request(`http://${req.headers.host ?? 'localhost'}${req.url}`, {
      method: req.method, headers, body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
    });
    const response = await handleChat(request, { rootDir: process.cwd(), apiKey });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) Readable.fromWeb(response.body as import('node:stream/web').ReadableStream).pipe(res);
    else res.end();
  } catch {
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'The assistant server failed.' }));
  }
}
