import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  X, 
  Loader2, 
  FileCode2, 
  ChevronRight, 
  AlertCircle,
  HelpCircle,
  Cpu
} from 'lucide-react';
import { queryRepoRag } from '../services/api';

const EXAMPLE_QUESTIONS = [
  "How does user authentication work in this codebase?",
  "Where are incoming API routes defined and handled?",
  "What database models or data schemas exist?",
  "How do controllers connect to background services?"
];

export const RagCodeAssistant = ({ repo, onSelectModule, isDark, onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I'm your **Codebase RAG Assistant** for **${repo?.name || 'this repository'}**. I can analyze the real module source code, map dependency flows, and explain how functions and services coordinate. Ask me anything!`,
      sources: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (questionText) => {
    const q = (questionText || input).trim();
    if (!q || loading) return;

    setInput('');
    setError(null);
    setLoading(true);

    const newMessages = [...messages, { role: 'user', content: q }];
    setMessages(newMessages);

    try {
      const res = await queryRepoRag(repo.id, q);
      if (res.success && res.data) {
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content: res.data.answer,
            sources: res.data.sources || []
          }
        ]);
      } else {
        setError(res.error || 'Failed to get answer from codebase RAG');
      }
    } catch (err) {
      console.error('RAG request failed:', err);
      setError(err.response?.data?.error || 'Could not query codebase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="w-full sm:w-[460px] md:w-[500px] border-l-2 border-black bg-white dark:bg-[#161822] flex flex-col h-full z-20 shadow-[-6px_0_0_0_#000] select-none font-mono">
      {/* Header */}
      <div className="p-4 border-b-2 border-black bg-[#ffea00] text-black flex items-center justify-between shrink-0 shadow-[0_2px_0_0_#000]">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-black text-[#ffea00] border border-black shadow-[1px_1px_0px_0px_#000]">
            <Cpu className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              Codebase RAG Assistant
              <span className="text-[9px] bg-black text-white px-1 py-0.2">AI RETRIEVAL</span>
            </h2>
            <p className="text-[10px] font-bold text-black/80 truncate max-w-[280px]">
              {repo?.name}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 bg-white hover:bg-black hover:text-white text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] transition-all cursor-pointer"
          title="Close RAG Assistant"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[90%] p-3.5 border-2 border-black shadow-[3px_3px_0px_0px_#000] ${
                msg.role === 'user'
                  ? 'bg-[#00f0ff] text-black font-semibold'
                  : 'bg-[#f6f3eb] dark:bg-[#0d0f14] text-zinc-900 dark:text-zinc-100 font-medium'
              }`}
            >
              <div className="whitespace-pre-line leading-relaxed">
                {msg.content}
              </div>

              {/* Source Citations */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t-2 border-black/20 dark:border-zinc-700/60 font-mono">
                  <div className="text-[10px] font-black uppercase text-zinc-800 dark:text-[#ffea00] mb-1.5 flex items-center gap-1">
                    <FileCode2 className="w-3 h-3" />
                    Cited Modules ({msg.sources.length}):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.sources.map((src) => (
                      <button
                        key={src.id}
                        onClick={() => onSelectModule && onSelectModule(src.id)}
                        className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-[#202332] hover:bg-[#ffea00] hover:text-black border border-black text-[10px] font-bold text-zinc-900 dark:text-zinc-200 transition-colors shadow-[1px_1px_0px_0px_#000] cursor-pointer"
                        title={src.summary || src.path}
                      >
                        <span className="truncate max-w-[140px]">{src.name}</span>
                        <ChevronRight className="w-2.5 h-2.5 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-3 bg-[#f6f3eb] dark:bg-[#0d0f14] border-2 border-black shadow-[3px_3px_0px_0px_#000] text-zinc-900 dark:text-zinc-200 font-mono">
            <Loader2 className="w-4 h-4 animate-spin text-[#ff007f] stroke-[2.5]" />
            <span className="text-[11px] font-bold">Retrieving AST chunks & synthesizing answer...</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-[#ff007f] text-white border-2 border-black shadow-[3px_3px_0px_0px_#000] text-xs flex items-center gap-2 font-mono font-bold">
            <AlertCircle className="w-4 h-4 shrink-0 stroke-[2.5]" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Questions */}
      {messages.length === 1 && (
        <div className="px-4 py-2 border-t-2 border-black bg-[#faf8f3] dark:bg-[#11131c]">
          <div className="text-[10px] font-black uppercase text-zinc-700 dark:text-zinc-400 mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#ffea00]" />
            Suggested Questions:
          </div>
          <div className="flex flex-col gap-1.5">
            {EXAMPLE_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                disabled={loading}
                className="text-left px-2.5 py-1.5 bg-white dark:bg-[#202332] hover:bg-[#ffea00] hover:text-black border border-black text-[11px] font-medium text-zinc-800 dark:text-zinc-200 transition-all shadow-[1px_1px_0px_0px_#000] cursor-pointer"
              >
                "{q}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Box */}
      <div className="p-3 border-t-2 border-black bg-white dark:bg-[#161822]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="Ask about data flow, exports, or functions..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 bg-[#f6f3eb] dark:bg-[#0d0f14] border-2 border-black px-3 py-2 text-xs text-zinc-950 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:bg-white dark:focus:bg-black font-mono transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-3.5 py-2 bg-[#00ff66] hover:bg-[#33ff85] text-black font-black border-2 border-black shadow-[2px_2px_0px_0px_#000] neo-btn disabled:opacity-50 transition-all flex items-center justify-center cursor-pointer"
            title="Send query"
          >
            <Send className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      </div>
    </aside>
  );
};
