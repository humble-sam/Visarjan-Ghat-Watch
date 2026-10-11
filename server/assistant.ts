import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import Papa from 'papaparse';
import { SITE_GUIDE } from './siteGuide.js';

// Server-only. The Anthropic API key is read from ANTHROPIC_API_KEY here and never
// reaches the browser. Used by api/chat.ts (Vercel) and the Vite dev/preview server.

const MODEL = 'claude-opus-5-5';
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 4000;
const MAX_CONTEXT_CHARS = 24000;

const SITE_IDS: Record<string, string> = {
  'Bairagarh (Sant Hirdaram) kund': 'bairagarh',
  'Khatlapura ghat': 'khatlapura',
  'Prempura ghat': 'prempura',
  'Rani Kamlapati ghat / Kamla Park kund': 'kamla-park',
  'Hathaikheda dam / kund': 'hathaikheda',
  'Malikhedi kund': 'malikhedi',
  'Shahpura lake ghat': 'shahpura',
};

const REPORTS: Record<string, string> = {
  '2023': 'Idol_immer._Report_23_CPCB.pdf',
  '2024': 'Ganesh_and_Durga_visarjan_report-2024.pdf',
  '2025': 'Ganesh_and_Durga_visarjan_report-2025.pdf',
};

/** Files the assistant reads; also listed in vercel.json includeFiles. */
export const KNOWLEDGE_FILES = {
  readings: 'public/assets/track-2/data/bhopal_ghats_2023_2025.csv',
  criteria: 'public/assets/track-2/data/cpcb_water_quality_criteria.csv',
  dictionary: 'public/assets/track-2/data/DATA_DICTIONARY.md',
  problem: 'public/assets/track-2/PROBLEM-STATEMENT.md',
  methodology: 'docs/METHODOLOGY.md',
  validation: 'docs/DATA_VALIDATION.md',
  qa: 'docs/QA_CHECKLIST.md',
} as const;

const INSTRUCTIONS = `You are the Visarjan Ghat Watch assistant for officers of the Bhopal Municipal Corporation (BMC). Officers use this website to decide where to send fresh water testing, cleanup and aeration attention at Bhopal's seven idol-immersion ghats before Durga visarjan (planning date 20 October 2026).

You help with five kinds of question:
1. How to use the website: views, filters, charts, brief export, adding reports.
2. Plans of action: turn the evidence into a practical, prioritised testing and operations plan for the officer to review.
3. Plain-language explanations of the MPPCB immersion reports and the readings.
4. Basic technical questions: DO, BOD, pH, COD, BDL, Class B, how the ranking works, units, how the app is built and run.
5. Background on Bhopal, its lakes and these ghats.

Ground rules. Follow them in every answer:
- Facts about readings must come from <readings_csv>, <current_view> or the documents below. Quote values exactly as printed, with the year, festival, phase and report PDF page (e.g. "2025 report, PDF page 28"). If the data does not contain something, say it is not in the supplied reports. Never estimate or invent a reading, page, detection limit, location or coordinate.
- Use <current_view> for the ranking, counts and coverage the officer is looking at. Do not recompute a different ranking. If the officer asks about a period different from <current_view>, tell them to change the filters, or answer from <readings_csv> and say you did.
- The data covers 2023-2025 only (plus any reports the officer added, shown in <current_view>). It describes historical conditions, not current 2026 water quality, and it is not a forecast.
- Missing readings are unknown, not clean. BDL/ND are censored: not zero and not a pass. DO = 0 is a real measured value.
- Class B (DO >= 5 mg/l, BOD <= 3 mg/l, pH 6.5-8.5) is a comparison benchmark. Total coliform was not measured, so full Class B compliance cannot be assessed. COD, solids, turbidity, conductivity and metals have no Class B limit here.
- Never call a ghat "safe", grant or refuse immersion permission, or give medical or health advice. Recommendations are suggestions for the officer to review: fresh DO/BOD/pH and coliform testing, aeration review where DO was low, cleanup review where BOD was high, and verifying the Rani Kamlapati / Kamla Park site identity.
- General knowledge about Bhopal (lakes, geography, festivals, institutions) is allowed but label it as general background, not report evidence. Do not invent names of officials, phone numbers, addresses or budgets.
- If a question is unrelated to this work, say briefly that you can help with the ghats, reports and website.
- Reply in the officer's language: Hindi in Devanagari if they write in Hindi, English otherwise. Keep site names as printed.
- Be concise: short paragraphs or "- " bullet lists, plain text only (no markdown tables, headings or bold). Lead with the answer.

Latency-sensitive; begin your visible answer immediately.`;

interface Knowledge {
  system: Anthropic.Beta.Messages.BetaTextBlockParam[];
}

let cached: Knowledge | null = null;

/** Compact, ID-stable form of the primary CSV: same bpl-NNNNNN IDs as the app. */
export function compactReadings(csvText: string): string {
  const rows = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: 'greedy' }).data;
  const lines = ['id,year,festival,site_id,phase,parameter,value_as_printed,flag,unit_assumed,report_pdf,pdf_page'];
  rows.forEach((row, index) => {
    const id = `bpl-${String(index + 1).padStart(6, '0')}`;
    const cells = [id, row.year, row.festival, SITE_IDS[row.site?.trim() ?? ''] ?? 'unknown', row.phase, row.parameter,
      row.value_as_printed, row.flag, row.unit_assumed, REPORTS[row.year?.trim() ?? ''] ?? '', row.source_page];
    lines.push(cells.map((cell) => {
      const text = (cell ?? '').trim();
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }).join(','));
  });
  return lines.join('\n');
}

export function buildKnowledge(rootDir: string): Knowledge {
  const read = (path: string) => readFileSync(join(rootDir, path), 'utf-8');
  const siteNames = Object.entries(SITE_IDS).map(([name, id]) => `${id} = ${name}`).join('\n');
  const reference = [
    `<website_guide>\n${SITE_GUIDE}\n</website_guide>`,
    `<site_ids>\n${siteNames}\n</site_ids>`,
    `<problem_statement>\n${read(KNOWLEDGE_FILES.problem)}\n</problem_statement>`,
    `<data_dictionary>\n${read(KNOWLEDGE_FILES.dictionary)}\n</data_dictionary>`,
    `<methodology>\n${read(KNOWLEDGE_FILES.methodology)}\n</methodology>`,
    `<data_validation>\n${read(KNOWLEDGE_FILES.validation)}\n</data_validation>`,
    `<evidence_qa>\n${read(KNOWLEDGE_FILES.qa)}\n</evidence_qa>`,
    `<cpcb_criteria_csv>\n${read(KNOWLEDGE_FILES.criteria)}\n</cpcb_criteria_csv>`,
    `<readings_csv>\nOne row per printed reading in the MPPCB immersion reports for the seven Bhopal ghats, 2023-2025. pdf_page is the one-based PDF viewer page.\n${compactReadings(read(KNOWLEDGE_FILES.readings))}\n</readings_csv>`,
  ].join('\n\n');
  // Stable prefix, cached for an hour: identical bytes on every request.
  return {
    system: [
      { type: 'text', text: INSTRUCTIONS },
      { type: 'text', text: reference, cache_control: { type: 'ephemeral', ttl: '1h' } },
    ],
  };
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** Validates the browser payload; returns an error message or the parsed request. */
export function parseChatRequest(body: unknown): { messages: ChatTurn[]; context: string } | string {
  if (!body || typeof body !== 'object') return 'Invalid request.';
  const { messages, context } = body as { messages?: unknown; context?: unknown };
  if (!Array.isArray(messages) || messages.length === 0) return 'No question was sent.';
  if (messages.length > MAX_MESSAGES) return 'This conversation is too long. Start a new chat.';
  const turns: ChatTurn[] = [];
  for (const [index, message] of messages.entries()) {
    const { role, content } = (message ?? {}) as { role?: unknown; content?: unknown };
    const expected = index % 2 === 0 ? 'user' : 'assistant';
    if (role !== expected || typeof content !== 'string' || !content.trim()) return 'Invalid conversation.';
    if (content.length > MAX_MESSAGE_CHARS) return `Messages are limited to ${MAX_MESSAGE_CHARS} characters.`;
    turns.push({ role: expected, content });
  }
  if (turns[turns.length - 1].role !== 'user') return 'Invalid conversation.';
  if (context !== undefined && typeof context !== 'string') return 'Invalid context.';
  return { messages: turns, context: (context ?? '').slice(0, MAX_CONTEXT_CHARS) };
}

function json(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json' } });
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === (request.headers.get('x-forwarded-host') ?? request.headers.get('host'));
  } catch {
    return false;
  }
}

export interface ChatOptions {
  rootDir: string;
  apiKey: string | undefined;
}

/** POST /api/chat. Streams the answer as UTF-8 plain text. */
export async function handleChat(request: Request, options: ChatOptions): Promise<Response> {
  if (request.method !== 'POST') return json(405, 'Use POST.');
  if (!sameOrigin(request)) return json(403, 'Requests must come from this website.');
  if (!options.apiKey) return json(503, 'The assistant is not configured: ANTHROPIC_API_KEY is not set on the server.');

  let parsed: ReturnType<typeof parseChatRequest>;
  try {
    parsed = parseChatRequest(await request.json());
  } catch {
    parsed = 'Invalid request.';
  }
  if (typeof parsed === 'string') return json(400, parsed);

  cached ??= buildKnowledge(options.rootDir);
  const client = new Anthropic({ apiKey: options.apiKey });
  const history = parsed.messages.slice(0, -1);
  const question = parsed.messages[parsed.messages.length - 1].content;
  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [
    ...history.map((turn) => ({ role: turn.role, content: turn.content })),
    {
      role: 'user',
      content: [
        { type: 'text', text: `<current_view>\n${parsed.context || 'Not supplied.'}\n</current_view>` },
        { type: 'text', text: question },
      ],
    },
  ];

  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: 'low' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: cached.system,
    messages,
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === 'refusal') {
          controller.enqueue(encoder.encode('\n\n[The assistant could not answer this question.]'));
        } else if (final.stop_reason === 'max_tokens') {
          controller.enqueue(encoder.encode('\n\n[Answer cut off. Ask a narrower question.]'));
        }
      } catch (error) {
        controller.enqueue(encoder.encode(`\n\n[${describeError(error)}]`));
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function describeError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return 'The server API key was rejected. Check ANTHROPIC_API_KEY.';
  if (error instanceof Anthropic.RateLimitError) return 'The assistant is busy (rate limit). Try again shortly.';
  if (error instanceof Anthropic.APIConnectionError) return 'Could not reach the Claude API. Check the network and try again.';
  if (error instanceof Anthropic.APIError) return `The Claude API returned an error (${error.status ?? 'unknown'}). Try again.`;
  return 'The assistant stopped unexpectedly. Try again.';
}
