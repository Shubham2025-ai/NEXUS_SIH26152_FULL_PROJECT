import React, { useState } from 'react';
import {
  Search,
  Zap,
  Target,
  Globe,
  Radio,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectorStatus, WorkspaceSearchResponse } from './api';

export interface SearchExecutionOptions {
  reset?: boolean;
  limitPerSource?: number;
  enableTelegram?: boolean;
  enableX?: boolean;
  enableYouTube?: boolean;
  enableBluesky?: boolean;
  enableReddit?: boolean;
  enableMastodon?: boolean;
  telegramChannel?: string;
  instagramProfile?: string;
}

interface IntelligenceTargetHubProps {
  activeQuery: string;
  loading: boolean;
  connectors: ConnectorStatus[];
  onExecuteLiveAnalysis: (query: string, options: SearchExecutionOptions) => Promise<WorkspaceSearchResponse | void>;
  lastSearchResult?: WorkspaceSearchResponse | null;
}

const TOPIC_PRESETS = [
  { label: 'AI & LLMs', query: 'AI' },
  { label: 'Tech Policy', query: 'Tech Policy' },
  { label: 'Cybersecurity', query: 'Cybersecurity' },
  { label: 'Digital India', query: 'Digital India' },
  { label: 'Open Source', query: 'Open Source' },
];

export const IntelligenceTargetHub: React.FC<IntelligenceTargetHubProps> = ({
  activeQuery,
  loading,
  connectors,
  onExecuteLiveAnalysis,
  lastSearchResult,
}) => {
  const [mode, setMode] = useState<'topic' | 'target'>('topic');
  const [topicQuery, setTopicQuery] = useState(activeQuery && activeQuery !== '#RiverLinkUpdate' ? activeQuery : 'AI');
  const [targetType, setTargetType] = useState<'telegram' | 'x_post'>('telegram');
  const [targetInput, setTargetInput] = useState('@telegram');
  const [isExpanded, setIsExpanded] = useState(true);

  // Platform toggles for topic mode
  const [enableTelegram, setEnableTelegram] = useState(true);
  const [enableYouTube, setEnableYouTube] = useState(true);
  const [enableX, setEnableX] = useState(true);

  // Check X connector status
  const xConnector = connectors.find((c) => c.platform === 'x');
  const isXAuthenticated = xConnector?.state === 'READY' || xConnector?.state === 'LIVE';

  const handleStartTopicAnalysis = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = topicQuery.trim();
    if (!clean || loading) return;

    await onExecuteLiveAnalysis(clean, {
      reset: true,
      limitPerSource: 5,
      enableTelegram,
      enableYouTube,
      enableX,
      enableReddit: false,
      enableBluesky: false,
      enableMastodon: false,
    });
  };

  const handleStartTargetAnalysis = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = targetInput.trim();
    if (!clean || loading) return;

    if (targetType === 'telegram') {
      const channelName = clean.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '').trim();
      await onExecuteLiveAnalysis(`channel:${channelName}`, {
        reset: true,
        limitPerSource: 10,
        enableTelegram: true,
        enableX: false,
        enableYouTube: false,
        enableReddit: false,
        enableBluesky: false,
        enableMastodon: false,
        telegramChannel: channelName,
      });
    } else if (targetType === 'x_post') {
      await onExecuteLiveAnalysis(clean, {
        reset: true,
        limitPerSource: 5,
        enableX: true,
        enableTelegram: false,
        enableYouTube: false,
        enableReddit: false,
        enableBluesky: false,
        enableMastodon: false,
      });
    }
  };

  return (
    <div className="intelligence-target-hub rounded-2xl border border-blue-500/20 bg-gradient-to-b from-[#0c162d]/95 via-[#091124]/90 to-[#070b18]/95 p-4 sm:p-5 shadow-2xl backdrop-blur-xl mb-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/30">
            <Radio size={18} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide">
                Intelligence Target Hub
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                <Sparkles size={10} /> SIH26152 LIVE
              </span>
              <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                ZERO-KEY MODE READY
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Query live social streams directly into the AI sentiment, emotion, stance & network pipeline.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-[#101c36] p-1 border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setMode('topic')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                mode === 'topic'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe size={13} />
              <span>Topic Intelligence</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('target')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                mode === 'target'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Target size={13} />
              <span>Target Intelligence</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-lg bg-[#101c36] text-slate-400 hover:text-white border border-white/[0.08]"
            title={isExpanded ? 'Collapse Hub' : 'Expand Hub'}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="pt-4"
          >
            {/* MODE 1: TOPIC INTELLIGENCE */}
            {mode === 'topic' && (
              <form onSubmit={handleStartTopicAnalysis} className="space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                  {/* Query Input */}
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                      <Search size={16} />
                    </div>
                    <input
                      type="text"
                      value={topicQuery}
                      onChange={(e) => setTopicQuery(e.target.value)}
                      placeholder="Enter topic, keyword, or hashtag (e.g. AI, Tech Policy, Cybersecurity)..."
                      className="w-full rounded-xl bg-[#0e172e] border border-white/[0.12] pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || !topicQuery.trim()}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {loading ? (
                      <>
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Collecting Live Data...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={16} className="text-amber-300" />
                        <span>START LIVE ANALYSIS</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Suggestion Chips */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-medium text-slate-400">Quick Topics:</span>
                  {TOPIC_PRESETS.map((p) => (
                    <button
                      key={p.query}
                      type="button"
                      onClick={() => setTopicQuery(p.query)}
                      className={`rounded-lg px-2.5 py-1 text-xs transition-all ${
                        topicQuery === p.query
                          ? 'bg-blue-600/30 border border-blue-400/50 text-blue-200'
                          : 'bg-[#101b33] border border-white/[0.08] text-slate-300 hover:bg-[#162444] hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Platform Selector Checkboxes */}
                <div className="rounded-xl bg-[#0b1326] border border-white/[0.07] p-3">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.05]">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Layers size={13} className="text-blue-400" /> Live Data Connectors
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Querying parallel public feeds concurrently (<span className="text-emerald-400">~2-3s response</span>)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Telegram */}
                    <label className="flex items-start gap-2 rounded-lg bg-[#111c38] p-2.5 border border-white/[0.06] cursor-pointer hover:border-blue-500/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={enableTelegram}
                        onChange={(e) => setEnableTelegram(e.target.checked)}
                        className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                      />
                      <div className="text-left">
                        <div className="text-xs font-semibold text-slate-200">Telegram</div>
                        <div className="text-[10px] text-emerald-400">Live Channels & Bot API</div>
                      </div>
                    </label>

                    {/* YouTube */}
                    <label className="flex items-start gap-2 rounded-lg bg-[#111c38] p-2.5 border border-white/[0.06] cursor-pointer hover:border-blue-500/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={enableYouTube}
                        onChange={(e) => setEnableYouTube(e.target.checked)}
                        className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                      />
                      <div className="text-left">
                        <div className="text-xs font-semibold text-slate-200">YouTube</div>
                        <div className="text-[10px] text-emerald-400">Video Metadata & Comments</div>
                      </div>
                    </label>

                    {/* X (Twitter) */}
                    <label className="flex items-start gap-2 rounded-lg bg-[#111c38] p-2.5 border border-white/[0.06] cursor-pointer hover:border-blue-500/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={enableX}
                        onChange={(e) => setEnableX(e.target.checked)}
                        className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                      />
                      <div className="text-left">
                        <div className="text-xs font-semibold text-slate-200">X (Twitter)</div>
                        {isXAuthenticated ? (
                          <div className="text-[10px] text-emerald-400">Official API LIVE</div>
                        ) : (
                          <div className="text-[10px] text-amber-400/90 font-medium" title="Official API key required for keyword search">
                            KEY REQUIRED
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              </form>
            )}

            {/* MODE 2: TARGET INTELLIGENCE */}
            {mode === 'target' && (
              <form onSubmit={handleStartTargetAnalysis} className="space-y-4">
                {/* Target Type Selector */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetType('telegram');
                      setTargetInput('@telegram');
                    }}
                    className={`rounded-xl px-3 py-1.5 text-xs font-medium border transition-all ${
                      targetType === 'telegram'
                        ? 'bg-blue-600/30 border-blue-400 text-blue-100 shadow-sm'
                        : 'bg-[#0f1a33] border-white/[0.08] text-slate-400 hover:text-white'
                    }`}
                  >
                    Telegram Channel (@channel)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetType('x_post');
                      setTargetInput('https://x.com/OpenAI/status/1789716668804174320');
                    }}
                    className={`rounded-xl px-3 py-1.5 text-xs font-medium border transition-all ${
                      targetType === 'x_post'
                        ? 'bg-blue-600/30 border-blue-400 text-blue-100 shadow-sm'
                        : 'bg-[#0f1a33] border-white/[0.08] text-slate-400 hover:text-white'
                    }`}
                  >
                    X Post URL (Official oEmbed)
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  {/* Target Input */}
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                      <Target size={16} />
                    </div>
                    <input
                      type="text"
                      value={targetInput}
                      onChange={(e) => setTargetInput(e.target.value)}
                      placeholder={
                        targetType === 'telegram'
                          ? 'Enter public channel handle (e.g. @durov, @telegram)...'
                          : 'Paste public post URL (https://x.com/username/status/...)...'
                      }
                      className="w-full rounded-xl bg-[#0e172e] border border-white/[0.12] pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || !targetInput.trim()}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {loading ? (
                      <>
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Analyzing Target...</span>
                      </>
                    ) : (
                      <>
                        <Target size={16} />
                        <span>START TARGET ANALYSIS</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Contextual description & suggestions */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    {targetType === 'telegram' && (
                      <>
                        <span>Examples:</span>
                        <button
                          type="button"
                          onClick={() => setTargetInput('@telegram')}
                          className="rounded bg-[#121f3d] px-2 py-0.5 text-blue-300 hover:text-white"
                        >
                          @telegram
                        </button>
                        <button
                          type="button"
                          onClick={() => setTargetInput('@durov')}
                          className="rounded bg-[#121f3d] px-2 py-0.5 text-blue-300 hover:text-white"
                        >
                          @durov
                        </button>
                      </>
                    )}
                    {targetType === 'x_post' && (
                      <span className="text-[11px] text-slate-300">
                        Zero-key mode: Uses official unauthenticated oEmbed (publish.x.com) to fetch genuine post text and metadata.
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <ShieldCheck size={12} /> Privacy-safe (k-anonymity = 10, zero PII)
                  </span>
                </div>
              </form>
            )}

            {/* LOADING TELEMETRY STATE */}
            {loading && (
              <div className="mt-4 rounded-xl bg-blue-500/10 border border-blue-500/25 p-3 flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
                </div>
                <div className="text-xs text-blue-200 flex-1">
                  <strong>Querying live social media feeds...</strong> Ingesting events and running real-time NLP enrichment (sentiment, emotion, stance, narrative clustering, and network mapping).
                </div>
              </div>
            )}

            {/* LAST SEARCH RESULT TELEMETRY */}
            {!loading && lastSearchResult && (
              <div className="mt-4 rounded-xl bg-[#091021] border border-white/[0.08] p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/[0.05]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span className="text-slate-200">
                      Live Ingestion Complete: <strong>{lastSearchResult.inserted}</strong> new event(s) added for{' '}
                      <span className="text-blue-300 font-mono">"{lastSearchResult.query}"</span>
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Session: <span className="font-mono">{lastSearchResult.search_session_id}</span>
                  </span>
                </div>

                {/* Per-source breakdown */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-[11px] text-slate-400">Source Telemetry:</span>
                  {Object.entries(lastSearchResult.sources || {}).map(([platform, info]) => {
                    const isOk = info.state === 'OK';
                    const isReq = info.state === 'CREDENTIALS_REQUIRED';
                    return (
                      <span
                        key={platform}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          isOk
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                            : isReq
                            ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                            : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                        }`}
                        title={info.detail || `${platform}: ${info.state} (${info.received} received)`}
                      >
                        <span className="uppercase">{platform}</span>: {info.state}{' '}
                        {isOk && `(${info.received})`}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default IntelligenceTargetHub;
