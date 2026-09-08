import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Heart,
  Loader2,
  MessageCircle,
  Repeat,
  Search,
  Sparkles,
  X as CloseIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, type ApifyXSearchResponse, type SocialEvent } from './api';

interface XSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshWorkspace?: () => void;
  defaultQuery?: string;
}

export const XSearchModal: React.FC<XSearchModalProps> = ({
  isOpen,
  onClose,
  onRefreshWorkspace,
  defaultQuery = '("terrorism" OR "attack") lang:en',
}) => {
  const [query, setQuery] = useState(defaultQuery);
  const [maxResults, setMaxResults] = useState(10);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ApifyXSearchResponse | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = query.trim();
    if (!clean || loading) return;

    setLoading(true);
    setError(null);
    setResponse(null);
    setStage('Connecting to Apify Actor...');

    try {
      setStage('Executing Actor run & collecting X posts...');
      const res = await api.searchSocialX(clean, maxResults);
      setStage('Normalized & processed through NTRO AI pipeline.');
      setResponse(res);
      if (onRefreshWorkspace) {
        onRefreshWorkspace();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apify X ingestion failed.');
    } finally {
      setLoading(false);
      setStage('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-blue-500/30 bg-[#091124] text-white shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0c162d]/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-black border border-white/20 text-white font-bold text-sm">
              𝕏
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-wide">X / Twitter Ingestion (Apify)</h2>
              <p className="text-xs text-slate-400">Production-ready pipeline with sentiment, topic, and threat extraction.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Query Form */}
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Search Query <span className="text-slate-500 font-normal">(X syntax supported, e.g. keywords, hashtags, lang:en)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='("terrorism" OR "attack") lang:en'
                  className="w-full rounded-xl border border-white/10 bg-[#101c36] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-300">Max Posts:</label>
                <select
                  value={maxResults}
                  onChange={(e) => setMaxResults(Number(e.target.value))}
                  disabled={loading}
                  className="rounded-lg border border-white/10 bg-[#101c36] px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value={10}>10 posts (Recommended for test)</option>
                  <option value={25}>25 posts</option>
                  <option value={50}>50 posts</option>
                  <option value={100}>100 posts</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/30 transition-all"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                <span>{loading ? 'Collecting from Apify...' : 'Search X'}</span>
              </button>
            </div>
          </form>

          {/* Progress / Status banner */}
          {loading && (
            <div className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-950/40 p-4 text-xs text-blue-200">
              <Loader2 size={18} className="animate-spin text-blue-400 shrink-0" />
              <div>
                <p className="font-semibold">Apify Pipeline Active</p>
                <p className="text-blue-300/80">{stage || 'Waiting for Apify Actor response...'}</p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-200 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-rose-300">
                <AlertCircle size={16} />
                <span>Ingestion Error</span>
              </div>
              <p>{error}</p>
              {error.includes('APIFY_API_TOKEN') && (
                <p className="text-[11px] text-rose-300/80 mt-1">
                  💡 Tip: Add your personal Apify token to <code>.env</code> as <code>APIFY_API_TOKEN=your_token</code> and restart the backend.
                </p>
              )}
            </div>
          )}

          {/* Success Summary & Stats */}
          {response && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-white/10 bg-[#101c36] p-3 text-center">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400">Fetched</span>
                  <div className="text-xl font-bold text-white mt-0.5">{response.posts_fetched}</div>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-3 text-center">
                  <span className="text-[11px] uppercase tracking-wider text-emerald-400">Inserted</span>
                  <div className="text-xl font-bold text-emerald-300 mt-0.5">{response.posts_inserted}</div>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-950/30 p-3 text-center">
                  <span className="text-[11px] uppercase tracking-wider text-amber-400">Duplicates</span>
                  <div className="text-xl font-bold text-amber-300 mt-0.5">{response.duplicates}</div>
                </div>
                <div className="rounded-xl border border-blue-500/20 bg-blue-950/30 p-3 text-center">
                  <span className="text-[11px] uppercase tracking-wider text-blue-400">AI Analysis</span>
                  <div className="text-xs font-semibold text-blue-300 mt-2 uppercase flex items-center justify-center gap-1">
                    <Sparkles size={12} /> {response.analysis_status}
                  </div>
                </div>
              </div>

              {/* Latest Collected Posts */}
              {response.events && response.events.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Latest Ingested Posts ({response.events.length})
                    </h3>
                    <span className="text-[11px] text-slate-400">Enriched with sentiment & emotion</span>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {response.events.map((post: SocialEvent) => (
                      <div
                        key={post.id}
                        className="rounded-xl border border-white/[0.08] bg-[#0c162d] p-3 hover:border-white/20 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-blue-400">@{post.author_display}</span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(post.created_at).toLocaleString()}
                            </span>
                          </div>
                          {post.url && (
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-white"
                              title="Open original post on X"
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>

                        <p className="text-xs text-slate-200 leading-relaxed">{post.text}</p>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/[0.05] text-[11px] text-slate-400">
                          {/* Sentiment / Emotion pill */}
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                post.sentiment_label === 'POSITIVE'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : post.sentiment_label === 'NEGATIVE'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {post.sentiment_label || 'NEUTRAL'} ({post.sentiment_score?.toFixed(2)})
                            </span>
                            {post.stance_label && (
                              <span className="text-[10px] text-slate-400">Stance: {post.stance_label}</span>
                            )}
                          </div>

                          {/* Engagement counters */}
                          <div className="flex items-center gap-3 text-[10px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <Heart size={10} /> {post.engagement?.likes ?? 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Repeat size={10} /> {post.engagement?.reposts ?? 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle size={10} /> {post.engagement?.replies ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.08] bg-[#0c162d]/60 text-xs text-slate-400">
          <span>Actor: <code>{response?.actor || 'apidojo/tweet-scraper'}</code></span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs text-white transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default XSearchModal;
