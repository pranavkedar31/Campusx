import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Database,
  User as UserIcon,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  evidence?: any;
  provider?: string;
  timestamp: string;
}

export const AIAssistantPage: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await apiClient.get('/ai/suggested-prompts');
        setSuggestions(res.data.suggestions || []);
      } catch (e) {
        console.error(e);
      }
    };

    fetchSuggestions();

    // Initial greeting
    setMessages([
      {
        id: 'init-1',
        sender: 'assistant',
        text: `Hello ${user?.full_name || 'there'}! I am your CampusX AI Academic Companion. I am grounded directly in your institutional records, attendance records, course evaluations, and predictive risk indicators. How may I assist you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [user]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputPrompt;
    if (!query.trim() || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setLoading(true);

    try {
      const res = await apiClient.post('/ai/chat', { prompt: query.trim() });
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: res.data.response,
        evidence: res.data.grounding_evidence,
        provider: res.data.provider,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'Apologies, I encountered an issue connecting to the academic reasoning service. Please check database connectivity.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const toggleEvidence = (msgId: string) => {
    setExpandedEvidence((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'assistant',
        text: `Chat session reset. What would you like to explore regarding your academic records or course progression?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <PageContainer
      title="CampusX AI Academic Companion"
      subtitle="Context-grounded intelligent assistant analyzing real attendance logs, assessment scores, and early risk flags."
    >
      <div className="flex flex-col h-[calc(100vh-14rem)] min-h-[500px] max-w-4xl mx-auto space-y-4">
        {/* Assistant Status Banner */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#0F172A] border border-slate-800 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-white">Live Grounded Persona:</span>
            <Badge variant="cyan" size="sm">
              {user?.role === 'STUDENT'
                ? 'Student Academic Companion'
                : user?.role === 'FACULTY'
                ? 'Faculty Teaching & Cohort Advisor'
                : 'Campus Executive Intelligence'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              Verified DB Grounding
            </span>
            <Button size="sm" variant="ghost" onClick={handleResetChat} className="p-1 h-7 text-slate-400 hover:text-white">
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Suggested Prompt Chips */}
        {suggestions.length > 0 && messages.length <= 3 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
              <Sparkles className="w-3 h-3 text-cyan-400" /> SUGGESTED PROMPTS
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(sug)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-cyan-300 text-left transition"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-cyan-900/30">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-4 space-y-2 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-cyan-600 text-white rounded-tr-sm'
                    : 'bg-[#111827] border border-slate-800 text-slate-200 rounded-tl-sm'
                }`}
              >
                <div className="whitespace-pre-line">{m.text}</div>

                <div
                  className={`flex items-center justify-between text-[10px] pt-1 ${
                    m.sender === 'user' ? 'text-cyan-200' : 'text-slate-500'
                  }`}
                >
                  <span>{m.timestamp}</span>
                  {m.provider && <span>Engine: {m.provider}</span>}
                </div>

                {/* Grounding Evidence Drawer */}
                {m.evidence && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => toggleEvidence(m.id)}
                      className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 hover:underline"
                    >
                      <Database className="w-3 h-3" />
                      <span>Live DB Evidence Context</span>
                      {expandedEvidence[m.id] ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    {expandedEvidence[m.id] && (
                      <div className="mt-2 p-2.5 rounded-xl bg-[#0B0F19] border border-slate-800/90 text-[10px] font-mono text-slate-300 max-h-40 overflow-y-auto">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(m.evidence, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {m.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-cyan-600/30 text-cyan-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 rounded-2xl bg-[#111827] border border-slate-800 flex items-center gap-2 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
                Analyzing database records and reasoning...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 p-2 rounded-2xl bg-[#111827] border border-slate-800 shadow-xl"
        >
          <input
            type="text"
            placeholder={
              user?.role === 'STUDENT'
                ? 'Ask about your attendance %, weak subjects, or placement eligibility...'
                : 'Ask about at-risk students, section attendance averages, or remedial plans...'
            }
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          <Button type="submit" size="sm" disabled={!inputPrompt.trim() || loading} className="flex items-center gap-1.5 px-4">
            <Send className="w-3.5 h-3.5" />
            Send
          </Button>
        </form>
      </div>
    </PageContainer>
  );
};
