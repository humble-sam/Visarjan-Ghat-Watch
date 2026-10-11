import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildKnowledge, compactReadings, handleChat, KNOWLEDGE_FILES, parseChatRequest } from './assistant';

const root = process.cwd();
const post = (body: unknown, headers: Record<string, string> = {}) => new Request('http://localhost/api/chat', {
  method: 'POST', headers: { 'content-type': 'application/json', host: 'localhost', ...headers }, body: JSON.stringify(body),
});
const question = { messages: [{ role: 'user', content: 'Which ghat first?' }], context: 'scope' };

describe('assistant knowledge', () => {
  it('keeps every CSV row with the app reading IDs and report pages', () => {
    const lines = compactReadings(readFileSync(KNOWLEDGE_FILES.readings, 'utf-8')).split('\n');
    expect(lines).toHaveLength(1525);
    // bpl-001124: Bairagarh, 2025 Ganesh during, DO printed 0, PDF page 28 (QA-checked).
    const row = lines.find((line) => line.startsWith('bpl-001124,'))!;
    expect(row).toContain('bairagarh');
    expect(row).toContain('Ganesh_and_Durga_visarjan_report-2025.pdf,28');
    expect(lines.some((line) => line.includes(',unknown,'))).toBe(false);
  });

  it('builds an identical cached system prefix every time', () => {
    const first = buildKnowledge(root);
    const second = buildKnowledge(root);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    const reference = first.system[1].text;
    for (const tag of ['website_guide', 'methodology', 'readings_csv', 'cpcb_criteria_csv', 'problem_statement']) {
      expect(reference).toContain(`<${tag}>`);
    }
    expect(first.system[1].cache_control).toEqual({ type: 'ephemeral', ttl: '1h' });
  });
});

describe('chat request validation', () => {
  it('accepts alternating turns ending with a question', () => {
    const parsed = parseChatRequest({ messages: [
      { role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }, { role: 'user', content: 'c' },
    ] });
    expect(typeof parsed).toBe('object');
  });

  it('rejects empty, malformed, overlong and assistant-last conversations', () => {
    expect(parseChatRequest(null)).toBeTypeOf('string');
    expect(parseChatRequest({ messages: [] })).toBeTypeOf('string');
    expect(parseChatRequest({ messages: [{ role: 'assistant', content: 'x' }] })).toBeTypeOf('string');
    expect(parseChatRequest({ messages: [{ role: 'user', content: 'x'.repeat(4001) }] })).toBeTypeOf('string');
    expect(parseChatRequest({ messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] })).toBeTypeOf('string');
    expect(parseChatRequest({ messages: Array.from({ length: 21 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x' })) })).toBeTypeOf('string');
  });

  it('truncates oversized context instead of forwarding it', () => {
    const parsed = parseChatRequest({ ...question, context: 'x'.repeat(50000) });
    expect(typeof parsed === 'object' && parsed.context.length).toBe(24000);
  });
});

describe('POST /api/chat guards (no API call)', () => {
  it('reports a missing server key clearly', async () => {
    const response = await handleChat(post(question), { rootDir: root, apiKey: undefined });
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain('ANTHROPIC_API_KEY');
  });

  it('rejects other methods, other origins and bad payloads before calling Claude', async () => {
    const options = { rootDir: root, apiKey: 'test-key-not-used' };
    expect((await handleChat(new Request('http://localhost/api/chat'), options)).status).toBe(405);
    expect((await handleChat(post(question, { origin: 'https://evil.example' }), options)).status).toBe(403);
    expect((await handleChat(post({ messages: 'hi' }), options)).status).toBe(400);
  });
});
