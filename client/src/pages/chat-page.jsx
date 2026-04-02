import { useEffect, useRef, useState } from 'react';
import { SendHorizonal } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { api, streamChat } from '../lib/api';

export const ChatPage = ({ citations, setCitations }) => {
  const [question, setQuestion] = useState('');
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    api.get('/chat/sessions').then((res) => setSessions(res.data.sessions));
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const loadSession = async (id) => {
    const { data } = await api.get(`/chat/sessions/${id}`);
    setSessionId(id);
    setMessages(data.session.messages || []);
  };

  const onSend = async () => {
    if (!question.trim() || thinking) return;
    const q = question.trim();
    setQuestion('');
    setThinking(true);

    const tempAssistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [...prev, { role: 'user', content: q }, { id: tempAssistantId, role: 'assistant', content: '' }]);

    try {
      await streamChat({
        question: q,
        sessionId,
        onMeta: (meta) => {
          if (meta.sessionId && !sessionId) setSessionId(meta.sessionId);
          setCitations(meta.citations || []);
        },
        onToken: (token) => {
          setMessages((prev) => {
            const next = [...prev];
            const idx = next.findIndex((m) => m.id === tempAssistantId || (m.role === 'assistant' && !m._id));
            if (idx >= 0) {
              next[idx] = { ...next[idx], id: tempAssistantId, content: `${next[idx].content || ''}${token}` };
            }
            return next;
          });
        },
        onDone: (payload) => {
          setCitations(payload.citations || []);
          setMessages((prev) => prev.map((m) => (m.id === tempAssistantId ? { ...m, content: payload.answer, citations: payload.citations } : m)));
        },
        onError: () => null
      });
      const { data } = await api.get('/chat/sessions');
      setSessions(data.sessions);
    } catch (error) {
      toast.error(error.message || 'Failed to ask question');
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="grid h-full grid-cols-12 gap-4">
      <div className="col-span-3 glass-card m-4 overflow-auto p-3">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Chat History</p>
        <div className="space-y-2">
          {sessions.map((s) => (
            <button key={s._id} onClick={() => loadSession(s._id)} className="w-full rounded-xl border border-transparent bg-white/50 p-3 text-left text-sm hover:border-indigo-300 dark:bg-slate-800/40">
              {s.title}
            </button>
          ))}
        </div>
      </div>

      <div className="col-span-9 m-4 flex flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/60 shadow-xl backdrop-blur-xl dark:bg-slate-900/50">
        <div ref={listRef} className="flex-1 space-y-3 overflow-auto p-6">
          {messages.length === 0 && (
            <div className="grid h-full place-items-center text-center text-slate-500">
              <div>
                <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">Ask any SOP question</p>
                <p>OpsMind answers only from indexed documents with citations.</p>
              </div>
            </div>
          )}
          {messages.map((m, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`max-w-3xl rounded-2xl px-4 py-3 ${m.role === 'user' ? 'ml-auto bg-indigo-600 text-white' : 'bg-white/80 dark:bg-slate-800/70'}`}>
              <p className="whitespace-pre-wrap text-sm">{m.content}</p>
            </motion.div>
          ))}
          {thinking && <div className="text-sm text-indigo-500">AI thinking…</div>}
        </div>

        <div className="border-t border-white/20 p-4">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 p-2 dark:border-slate-700 dark:bg-slate-900/70">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder="Ask about SOP workflows, policies, and procedures..."
              className="max-h-36 min-h-12 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none"
            />
            <button onClick={onSend} className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 p-3 text-white">
              <SendHorizonal className="h-4 w-4" />
            </button>
          </div>
          {citations.length > 0 && <p className="mt-2 text-xs text-slate-500">{citations.length} citations attached</p>}
        </div>
      </div>
    </div>
  );
};

