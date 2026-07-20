import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, X, MessageCircle, Loader2 } from 'lucide-react';
import { AxiosError } from 'axios';
import { assistantService } from '../../services/api';
import { useAssistantStore } from '../../store/assistant.store';
import Logo from './Logo';

type Msg = { role: 'user' | 'assistant'; content: string };

const WHATSAPP = '221710680152';
const WHATSAPP_MSG = encodeURIComponent('Bonjour, je souhaite parler à un conseiller Naatal.');

const GREETING =
  "Bonjour 👋 Je suis l'assistant Naatal. Je peux vous expliquer les modules, les formules et vous "
  + 'aider à choisir. Que puis-je faire pour vous ?';

const SUGGESTIONS = [
  'Quels sont vos tarifs ?',
  'Ça marche sur mon téléphone ?',
  'Je gère plusieurs boutiques',
  'Comment démarrer ?',
];

/** Rendu léger : gras **texte** + puces "- ", saut de ligne conservé. */
function renderText(text: string) {
  return text.split('\n').map((line, i) => {
    const bullet = /^\s*[-•]\s+/.test(line);
    const clean = line.replace(/^\s*[-•]\s+/, '');
    const parts = clean.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={j}>{p.slice(2, -2)}</strong>
        : <span key={j}>{p}</span>,
    );
    return (
      <div key={i} className={bullet ? 'flex gap-1.5 pl-1' : ''}>
        {bullet && <span className="text-primary-500 mt-0.5">•</span>}
        <span>{parts}</span>
      </div>
    );
  });
}

export default function ChatAssistant() {
  const open = useAssistantStore((s) => s.open);
  const setOpen = useAssistantStore((s) => s.setOpen);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Message d'accueil à la première ouverture
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', content: GREETING }]);
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 250);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      // On n'envoie que l'historique utile (sans le message d'accueil local)
      const history = next.filter(
        (m, i) => !(i === 0 && m.role === 'assistant' && m.content === GREETING),
      );
      const res = await assistantService.chat(history);
      const reply = res.data?.data?.reply as string;
      setMessages((m) => [...m, { role: 'assistant', content: reply || "Je n'ai pas de réponse, réessayez." }]);
    } catch (e) {
      const err = e as AxiosError<{ error?: string }>;
      const msg =
        err.response?.data?.error ||
        "Je ne parviens pas à répondre pour l'instant. Écrivez-nous sur WhatsApp au +221 71 068 01 52.";
      setMessages((m) => [...m, { role: 'assistant', content: msg }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Lanceur flottant */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Ouvrir l'assistant Naatal"
        className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full shadow-lg transition-all
          ${open ? 'bg-gray-900 text-white w-12 h-12 justify-center' : 'bg-primary-600 hover:bg-primary-700 text-white pl-3 pr-4 py-3'}`}
      >
        {open ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <Sparkles className="w-6 h-6" />
            <span className="hidden sm:inline font-medium text-sm">Poser une question</span>
          </>
        )}
      </button>

      {/* Panneau de discussion */}
      {open && (
        <div className="fixed z-50 bottom-24 right-5 left-5 sm:left-auto sm:w-[380px] max-h-[75vh] flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
          {/* En-tête */}
          <div className="flex items-center gap-3 px-4 py-3 bg-primary-600 text-white">
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
              <Logo className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight">Assistant Naatal</p>
              <p className="text-[11px] text-primary-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> En ligne · réponses IA
              </p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Fermer" className="p-1 hover:bg-white/10 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed space-y-1
                    ${m.role === 'user'
                      ? 'bg-primary-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-700 border border-gray-100 rounded-bl-sm'}`}
                >
                  {renderText(m.content)}
                </div>
              </div>
            ))}

            {/* Suggestions (seulement au tout début) */}
            {messages.length <= 1 && !loading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs bg-white border border-gray-200 text-gray-600 rounded-full px-3 py-1.5 hover:border-primary-400 hover:text-primary-600 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-gray-400 flex items-center gap-2 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Naatal réfléchit…
                </div>
              </div>
            )}
          </div>

          {/* Saisie */}
          <div className="border-t border-gray-100 p-2.5 bg-white">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                placeholder="Écrivez votre question…"
                className="flex-1 resize-none max-h-24 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                aria-label="Envoyer"
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary-600 text-white disabled:opacity-40 hover:bg-primary-700 transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <a
              href={`https://wa.me/${WHATSAPP}?text=${WHATSAPP_MSG}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-green-600"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Parler à un humain sur WhatsApp
            </a>
          </div>
        </div>
      )}
    </>
  );
}
