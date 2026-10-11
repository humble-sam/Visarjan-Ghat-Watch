import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { assistantApi } from './server/devPlugin.js';

export default defineConfig(({ mode }) => {
  // ANTHROPIC_API_KEY stays server-side: it has no VITE_ prefix, so it is never bundled.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), assistantApi(env.ANTHROPIC_API_KEY)],
    base: process.env.VITE_BASE_PATH || '/',
    server: { port: 5173 },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'server/**/*.test.ts'],
    },
  };
});
