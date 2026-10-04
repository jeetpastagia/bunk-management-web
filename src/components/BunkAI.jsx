import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

const QUICK_PROMPTS = [
  'Can I bunk tomorrow?',
  'How many lectures can I bunk?',
  'My attendance summary',
  'Lowest attendance',
  'Attendance recovery',
  "Tomorrow's classes",
];

/**
 * Floating chat assistant over the student's own real attendance data.
 * Every number it states comes from the backend calling deterministic
 * attendance-engine functions (see bunk-manager-backend's
 * src/services/aiTools.js) — this component is purely the chat UI, it
 * never computes anything itself, just sends the running message history
 * to POST /api/ai/chat and renders whatever comes back.
 */
export default function BunkAI() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setError('');
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const { reply } = await api.aiChat(next);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err.message || 'Something went wrong — please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close Bunk AI' : 'Open Bunk AI'}
        className={`bunk-ai-glass fixed top-1/2 -translate-y-1/2 right-4 md:right-6 z-40 w-14 h-14 rounded-full text-[var(--color-text)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform ${open ? '' : 'bunk-ai-float'}`}
      >
        {open ? <CloseIcon className="w-5 h-5" /> : <BunkAIIcon className="w-6 h-6" />}
      </button>

      {open && (
        <div className="bunk-ai-glass-panel fixed inset-0 z-50 md:inset-auto md:top-1/2 md:-translate-y-1/2 md:right-24 md:w-96 md:h-[600px] md:max-h-[80vh] flex flex-col md:rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--color-border-soft)] shrink-0">
            <div className="flex items-center gap-2">
              <BunkAIIcon className="w-5 h-5 text-[var(--color-brand)]" />
              <span className="font-display font-semibold text-[var(--color-text)]">Bunk AI</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--tint-8)] hover:text-[var(--color-text)] transition-colors"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            {messages.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)]">
                Hi! I can see your real attendance data — ask me anything, or try one of these:
              </p>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === 'user' ? 'self-end bg-[var(--color-brand)] text-white' : 'self-start bg-[var(--tint-8)] text-[var(--color-text)]'
                }`}
              >
                {m.content}
              </div>
            ))}

            {loading && (
              <div className="self-start bg-[var(--tint-8)] rounded-2xl px-4 py-3 flex gap-1.5 items-center">
                {[0, 150, 300].map((delay) => (
                  <span key={delay} className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-faint)] animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            )}

            {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
          </div>

          <div className="px-4 pb-2.5 flex gap-2 overflow-x-auto shrink-0">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                disabled={loading}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-[var(--tint-8)] hover:bg-[var(--tint-12)] border border-[var(--color-border)] transition-colors disabled:opacity-40"
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 p-3 border-t border-[var(--color-border-soft)] shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your attendance…"
              disabled={loading}
              className="flex-1 bg-[var(--tint-5)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[var(--color-brand)] transition-colors disabled:opacity-60"
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              aria-label="Send"
              className="w-10 h-10 rounded-xl bg-[var(--color-brand)] text-white flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
            >
              <SendIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function SendIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M22 2 11 13" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2 15 22l-4-9-9-4 20-7Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A chat bubble with a bolt — deliberately not a sparkle/star glyph, which is Gemini's mark. */
function BunkAIIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H9l-4.5 4v-4h-.5A2.5 2.5 0 0 1 4 13.5v-8Z" strokeLinejoin="round" />
      <path d="M13 6.5 9 11h3l-1 4.5 4-5.5h-3l1-3.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}
