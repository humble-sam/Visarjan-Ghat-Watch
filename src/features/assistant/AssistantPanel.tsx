import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { MessageCircle, RotateCcw, Send, Square, X } from 'lucide-react';
import './assistant.css';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AssistantPanelProps {
  /** Summary of the officer's current view, sent with every question. */
  getContext: () => string;
}

const SUGGESTIONS = [
  'Which ghats should get fresh testing first, and why?',
  'Draft a one-week action plan for the top three ghats.',
  'Explain what DO = 0 at Bairagarh means, in simple words.',
  'How do I download the Hindi brief?',
  'मलिखेड़ी कुंड के बारे में रिपोर्ट क्या कहती है?',
];
const MAX_CHARS = 4000;
const MAX_TURNS = 20;

export async function streamAnswer(
  messages: ChatMessage[], context: string, onText: (text: string) => void, signal: AbortSignal,
): Promise<void> {
  const response = await fetch(`${import.meta.env.BASE_URL}api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages, context }),
    signal,
  });
  if (!response.ok || !response.body) {
    const detail = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(detail?.error ?? (response.status === 404
      ? 'The assistant server is not running. Deploy on Vercel or use npm run dev.'
      : `The assistant is unavailable (${response.status}).`));
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onText(decoder.decode(value, { stream: true }));
  }
}

export function AssistantPanel({ getContext }: AssistantPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [messages]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const turnsLeft = messages.length < MAX_TURNS - 1;

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy || !turnsLeft) return;
    const history: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setDraft('');
    setError(null);
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamAnswer(history, getContext(), (chunk) => setMessages((current) => {
        const next = [...current];
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, content: last.content + chunk };
        return next;
      }), controller.signal);
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(caught instanceof Error ? caught.message : 'The assistant failed. Try again.');
        // Drop the unanswered turn so the conversation stays user/assistant alternating.
        setMessages((current) => current.at(-1)?.content ? current : current.slice(0, -2));
        setDraft(text);
      }
    } finally {
      setMessages((current) => current.at(-1)?.role === 'assistant' && !current.at(-1)?.content
        ? current.slice(0, -2) : current);
      setBusy(false);
      abortRef.current = null;
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(draft);
  }
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void ask(draft); }
  }
  function reset() {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
  }

  if (!open) {
    return (
      <button type="button" className="assistant-launcher" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <MessageCircle size={20} aria-hidden="true" />Ask the assistant
      </button>
    );
  }

  return (
    <section className="assistant-panel" role="dialog" aria-label="Visarjan Ghat Watch assistant">
      <header className="assistant-header">
        <div><strong>Assistant</strong><span>Answers from the bundled reports · powered by Claude</span></div>
        <button type="button" className="icon-button" onClick={reset} disabled={!messages.length && !error} aria-label="New chat" title="New chat">
          <RotateCcw size={16} aria-hidden="true" />
        </button>
        <button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="Close assistant" title="Close">
          <X size={17} aria-hidden="true" />
        </button>
      </header>

      <div className="assistant-log" ref={logRef} aria-live="polite">
        {messages.length === 0 && (
          <div className="assistant-intro">
            <p>Ask about the ghats, the MPPCB reports, a plan of action, or how to use this site. English or हिन्दी.</p>
            <ul>{SUGGESTIONS.map((suggestion) => (
              <li key={suggestion}><button type="button" onClick={() => void ask(suggestion)}>{suggestion}</button></li>
            ))}</ul>
          </div>
        )}
        {messages.map((message, index) => (
          <div key={index} className={`assistant-message ${message.role}`}>
            {message.content || (busy && index === messages.length - 1 ? <span className="assistant-typing">Thinking…</span> : null)}
          </div>
        ))}
        {error && <p className="assistant-error" role="alert">{error}</p>}
        {!turnsLeft && <p className="assistant-error">This chat is at its length limit. Start a new chat.</p>}
      </div>

      <form className="assistant-form" onSubmit={submit}>
        <textarea ref={inputRef} value={draft} maxLength={MAX_CHARS} rows={2} placeholder="Type a question…"
          aria-label="Your question" onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown} disabled={!turnsLeft} />
        {busy ? (
          <button type="button" className="command-button" onClick={() => abortRef.current?.abort()} aria-label="Stop answer">
            <Square size={15} aria-hidden="true" />Stop
          </button>
        ) : (
          <button type="submit" className="command-button primary" disabled={!draft.trim() || !turnsLeft} aria-label="Send question">
            <Send size={15} aria-hidden="true" />Send
          </button>
        )}
      </form>
      <p className="assistant-note">AI answers can be wrong. Check report pages before acting. Historical data only; not an immersion permission or health advice.</p>
    </section>
  );
}
