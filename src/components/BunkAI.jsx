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
const CLOSE_ANIM_MS = 200; // keep in sync with .bunk-ai-panel-exit's duration in index.css

/**
 * Floating chat assistant over the student's own real attendance data.
 * Every number it states comes from the backend calling deterministic
 * attendance-engine functions (see bunk-manager-backend's
 * src/services/aiTools.js) — this component is purely the chat UI, it
 * never computes anything itself, just sends the running message history
 * to POST /api/ai/chat and renders whatever comes back.
 *
 * Visual language here is deliberately separate from the rest of the
 * app's theme: Apple-style liquid glass (plain translucent white, strong
 * blur, soft highlights) rather than the app's brand-colored tokens, per
 * an explicit request to redesign only this one UI element.
 */
export default function BunkAI() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
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

  const closePanel = () => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, CLOSE_ANIM_MS);
  };

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
        onClick={() => (open ? closePanel() : setOpen(true))}
        aria-label={open ? 'Close Bunk AI' : 'Open Bunk AI'}
        className={`bunk-ai-glass fixed top-1/2 -translate-y-1/2 right-4 md:right-6 z-40 w-14 h-14 text-[var(--color-text)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 ease-out ${
          open ? '' : 'bunk-ai-float'
        }`}
      >
        {open ? <CloseIcon className="w-5 h-5" /> : <BunkAIIcon className="w-6 h-6" />}
      </button>

      {(open || closing) && (
        <div
          className={`bunk-ai-glass-panel fixed inset-0 z-50 md:inset-auto md:top-1/2 md:-translate-y-1/2 md:right-24 md:w-96 md:h-[600px] md:max-h-[80vh] flex flex-col rounded-none md:rounded-[26px] overflow-hidden ${
            closing ? 'bunk-ai-panel-exit' : 'bunk-ai-panel-enter'
          }`}
        >
          <div className="relative flex items-center justify-between px-4 py-3.5 border-b border-white/15 shrink-0">
            <div className="flex items-center gap-2">
              <BunkAIIcon className="w-5 h-5" />
              <span className="font-display font-semibold text-[var(--color-text)]">Bunk AI</span>
            </div>
            <button
              onClick={closePanel}
              aria-label="Close"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:bg-white/10 hover:text-[var(--color-text)] transition-colors duration-150"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>

          <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            {messages.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)]">
                Hi! I can see your real attendance data — ask me anything, or try one of these:
              </p>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`bunk-ai-glass-bubble bunk-ai-message-pop max-w-[85%] rounded-[20px] px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed text-[var(--color-text)] ${
                  m.role === 'user' ? 'self-end' : 'self-start'
                }`}
              >
                {m.content}
              </div>
            ))}

            {loading && (
              <div className="bunk-ai-glass-bubble self-start rounded-[20px] px-4 py-3 flex gap-1.5 items-center">
                {[0, 150, 300].map((delay) => (
                  <span key={delay} className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-faint)] animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            )}

            {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
          </div>

          <div className="relative px-4 pb-2.5 flex gap-2 overflow-x-auto shrink-0">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                disabled={loading}
                className="bunk-ai-glass-bubble shrink-0 text-xs px-3 py-1.5 rounded-full text-[var(--color-text)] hover:bg-white/18 transition-colors duration-150 disabled:opacity-40"
              >
                {p}
              </button>
            ))}
          </div>

          <div className="relative flex items-center gap-2 p-3 border-t border-white/15 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your attendance…"
              disabled={loading}
              className="bunk-ai-glass-input flex-1 rounded-full px-4 py-2.5 text-sm outline-none text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-white/40 transition-colors duration-150 disabled:opacity-60"
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              aria-label="Send"
              className="bunk-ai-glass w-10 h-10 text-[var(--color-text)] flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-all duration-150 disabled:opacity-40"
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

/** Simplified flat robot-mascot face: antenna + rounded head + two eyes. */
function BunkAIIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="3" r="1.4" fill="white" />
      <rect x="11.3" y="4.1" width="1.4" height="2.8" rx="0.7" fill="white" />
      <rect x="3.5" y="6.5" width="17" height="12" rx="6" fill="white" />
      <rect x="7.6" y="10.8" width="2.6" height="3.4" rx="1.3" fill="var(--color-sidebar)" />
      <rect x="13.8" y="10.8" width="2.6" height="3.4" rx="1.3" fill="var(--color-sidebar)" />
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
