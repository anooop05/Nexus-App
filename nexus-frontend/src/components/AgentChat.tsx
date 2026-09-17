import { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { browserStorage, storageKeys } from '../services/storage';

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
}

interface AgentChatProps {
  onTaskChange?: (msg: string | null) => void;
}

const SUGGESTED_QUERIES = [
  'Which of my saved roles close this week?',
  'What skill appears most often across my matches?',
  'Show my top matches above 80% score',
  'What are the best distributed systems roles?',
];

export default function AgentChat({ onTaskChange }: AgentChatProps = {}) {
  const [messages, setMessagesState] = useState<ChatMessage[]>(() =>
    browserStorage.get<ChatMessage[]>(storageKeys.AGENT_MESSAGES, [])
  );
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const setMessages = (action: React.SetStateAction<ChatMessage[]>) => {
    setMessagesState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      browserStorage.set(storageKeys.AGENT_MESSAGES, next);
      return next;
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || inputText).trim();
    if (!messageContent || loading) return;

    const userMessage: ChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: messageContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputText('');
    setLoading(true);
    onTaskChange?.('AI Agent formulating response in background...');

    try {
      const reply = await api.chatWithAgent(messageContent);

      const agentMessage: ChatMessage = {
        id: 'agent-' + Date.now(),
        sender: 'agent',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'agent-err-' + Date.now(),
          sender: 'agent',
          text: `⚠️ Error communicating with agent: ${err.message || 'Server error'}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
      onTaskChange?.(null);
    }
  };

  const handleResetChat = () => {
    browserStorage.remove(storageKeys.AGENT_MESSAGES);
    setMessagesState([]);
  };

  const formatText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={pIdx} className="italic text-slate-700">{part.slice(1, -1)}</em>;
        }
        return part;
      });

      return (
        <p key={idx} className={line.trim() === '' ? 'h-2' : 'my-0.5'}>
          {formattedParts}
        </p>
      );
    });
  };

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            Autonomous Career Agent
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gemini tool calling enabled: answers queries by querying your saved database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium transition"
            title="Reset Conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Suggestion Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-semibold shrink-0 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
          Quick Prompts:
        </span>
        {SUGGESTED_QUERIES.map((query) => (
          <button
            key={query}
            type="button"
            onClick={() => handleSendMessage(query)}
            disabled={loading}
            className="shrink-0 px-3 py-1.5 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 rounded-full text-slate-700 transition font-medium shadow-2xs"
          >
            {query}
          </button>
        ))}
      </div>

      {/* Chat Messages Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[520px] overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Bot className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">How can I assist your career search?</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Ask about upcoming deadlines, required skill distributions, or top job matches.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isUser
                        ? 'bg-slate-900 text-white'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className={`max-w-[82%] ${isUser ? 'text-right' : 'text-left'}`}>
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-tr-xs'
                          : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-tl-xs'
                      }`}
                    >
                      {isUser ? <p>{msg.text}</p> : formatText(msg.text)}
                    </div>

                    <span className="text-[10px] text-slate-400 mt-1 inline-block px-1">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs p-3.5 flex items-center gap-2 shadow-2xs">
                <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
                <span className="text-xs text-slate-600 font-medium">
                  Querying backend agent...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask Nexus agent about your jobs, deadlines, or skills..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-medium text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition shrink-0"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
