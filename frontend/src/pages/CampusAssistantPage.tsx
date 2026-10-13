import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  Search,
  FileText,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import apiClient from '../services/api';

interface RAGSource {
  title: string;
  section?: string;
}

interface RAGChunk {
  title: string;
  section: string;
  content: string;
  relevance_score: number;
}

interface RAGResponse {
  query: string;
  answer: string;
  sources: RAGSource[];
  confidence: string;
  retrieved_chunks: RAGChunk[];
}

export const CampusAssistantPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<RAGResponse[]>([]);
  const [expandedChunks, setExpandedChunks] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await apiClient.get('/rag/documents');
        setDocuments(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchDocs();
  }, []);

  const handleSearch = async (textQuery?: string) => {
    const q = textQuery || query;
    if (!q.trim() || loading) return;

    setLoading(true);
    try {
      const res = await apiClient.post('/rag/query', { query: q.trim() });
      setHistory((prev) => [res.data, ...prev]);
      if (!textQuery) setQuery('');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'RAG query failed.');
    } finally {
      setLoading(false);
    }
  };

  const toggleChunks = (idx: number) => {
    setExpandedChunks((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const sampleQuestions = [
    'What is the minimum attendance required to write final exams?',
    'What is the one-student-one-job placement rule and dream upgrades?',
    'How do I apply for examination revaluation and what is the fee?',
    'What are the residence hall curfew timings and night-out pass rules?',
  ];

  return (
    <PageContainer
      title="RAG Campus Knowledge Assistant"
      subtitle="Semantic policy search and verified regulatory reasoning backed by official institutional documents."
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Indexed Policies */}
        <div className="lg:col-span-1 space-y-4">
          <Card
            title="Indexed Policy Handbooks"
            subtitle={`${documents.length} verified documents loaded`}
          >
            <div className="space-y-2.5 pt-1">
              {documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#0B0F19] border border-slate-800 text-xs space-y-1 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{doc.title}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>{doc.sections_count} Articles indexed</span>
                    <span className="font-mono text-[10px] text-slate-500">{doc.filename}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right 3 Columns: Search & Grounded Answers */}
        <div className="lg:col-span-3 space-y-6">
          {/* Search Bar Card */}
          <Card className="p-4 bg-gradient-to-r from-slate-900 to-[#111827] border-cyan-800/30">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search campus policy, grading scales, attendance rules, placement policies..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={loading}
                    className="w-full pl-9 pr-4 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <Button type="submit" size="sm" disabled={!query.trim() || loading} className="flex items-center gap-1.5 px-4 h-10">
                  <Sparkles className="w-3.5 h-3.5" />
                  {loading ? 'Searching...' : 'Search Policy'}
                </Button>
              </div>

              {/* Sample Question Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-cyan-400" /> FAQ:
                </span>
                {sampleQuestions.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSearch(q)}
                    className="px-2.5 py-1 rounded-lg bg-[#0B0F19] hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-cyan-300 text-left transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </form>
          </Card>

          {/* Results Feed */}
          {history.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-3">
              <BookOpen className="w-10 h-10 mx-auto text-slate-600" />
              <div>
                <p className="text-sm font-semibold text-slate-400">Institutional Knowledge Search Ready</p>
                <p className="text-xs text-slate-500 mt-1">
                  Type an inquiry above or select a frequently asked question to retrieve official regulations.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item, idx) => (
                <Card key={idx} className="p-5 border-slate-800 space-y-3">
                  {/* Query Header */}
                  <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                        REGULATORY INQUIRY
                      </span>
                      <h3 className="text-sm font-bold text-white">{item.query}</h3>
                    </div>
                    <Badge variant={item.confidence === 'HIGH' ? 'emerald' : 'rose'} size="sm">
                      {item.confidence} CONFIDENCE
                    </Badge>
                  </div>

                  {/* Grounded Answer */}
                  <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line font-sans">
                    {item.answer}
                  </div>

                  {/* Cited Sources */}
                  {item.sources && item.sources.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <div className="text-[11px] font-mono text-slate-400 mb-1.5 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                        Official Sources Cited:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.sources.map((src, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-[11px] flex items-center gap-1.5"
                          >
                            <FileText className="w-3 h-3 text-cyan-400" />
                            <strong>{src.title}</strong>
                            {src.section && <span className="text-cyan-400/70">({src.section})</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Retrieved Evidence Excerpts */}
                  {item.retrieved_chunks && item.retrieved_chunks.length > 0 && (
                    <div className="pt-2">
                      <button
                        onClick={() => toggleChunks(idx)}
                        className="text-[11px] font-mono text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        <Layers className="w-3 h-3 text-cyan-400" />
                        <span>View Retrieved Policy Excerpts ({item.retrieved_chunks.length})</span>
                        {expandedChunks[idx] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {expandedChunks[idx] && (
                        <div className="mt-2 space-y-2">
                          {item.retrieved_chunks.map((chunk, cIdx) => (
                            <div
                              key={cIdx}
                              className="p-3 rounded-xl bg-[#0B0F19] border border-slate-800/80 text-xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-white">{chunk.title} — {chunk.section}</span>
                                <span className="font-mono text-cyan-400">Score: {chunk.relevance_score}</span>
                              </div>
                              <p className="text-[11px] text-slate-400 line-clamp-3 font-sans">
                                {chunk.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};
