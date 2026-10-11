import { handleChat } from '../server/assistant.js';

// Vercel serverless function. Set ANTHROPIC_API_KEY in the Vercel project settings.
export async function POST(request: Request): Promise<Response> {
  return handleChat(request, { rootDir: process.cwd(), apiKey: process.env.ANTHROPIC_API_KEY });
}
