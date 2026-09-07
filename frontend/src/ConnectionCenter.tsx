import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  PlugZap,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, type ConnectorStatus } from './api';

type SourceMeta = {
  platform: string;
  label: string;
  shortLabel: string;
  official: string;
  freePath: string;
  env: string[];
  input: string;
  demoPriority: 'HIGH' | 'MEDIUM' | 'LOW';
  note: string;
};

const SOURCES: SourceMeta[] = [
  {
    platform: 'telegram',
    label: 'Telegram',
    shortLabel: 'TG',
    official: 'Bot API for authorized channel/chat updates',
    freePath: 'Monitored public-channel preview + local query filtering',
    env: ['TELEGRAM_PUBLIC_CHANNELS', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_ALLOWED_CHAT_IDS'],
    input: 'Fresh Search uses configured channels automatically; manual input accepts public channel username',
    demoPriority: 'HIGH',
    note: 'Primary SIH source. Configure comma-separated public channel usernames once; every Fresh Search then includes query-matching Telegram posts at zero API cost. Bot API is the best controlled live-demo addition.',
  },
  {
    platform: 'x',
    label: 'X / Twitter',
    shortLabel: 'X',
    official: 'X API v2 recent search (pay-per-use)',
    freePath: 'Official public Post oEmbed by explicit URL; optional permitted RSS/Atom bridge',
    env: ['X_BEARER_TOKEN', 'X_PUBLIC_RSS_URL_TEMPLATE'],
    input: 'Free: public X Post URL(s). Paid: keyword/hashtag query.',
    demoPriority: 'HIGH',
    note: 'Primary SIH source. Free mode ingests known public Post URLs through X oEmbed and renders the official embed. Automatic keyword search needs X API credits; NEXUS does not falsely claim free global X search.',
  },
  {
    platform: 'youtube',
    label: 'YouTube',
    shortLabel: 'YT',
    official: 'YouTube Data API v3',
    freePath: 'yt-dlp public video metadata',
    env: ['YOUTUBE_API_KEY'],
    input: 'Search topic / keyword',
    demoPriority: 'HIGH',
    note: 'Zero-key mode is metadata-first. Add the API key for official search and comments.',
  },
];

const stateTone = (state: string) => {
  if (state === 'READY' || state === 'LIVE') return '#34d399';
  if (state === 'CREDENTIALS_REQUIRED' || state === 'PERMISSION_REQUIRED' || state === 'NO_CREDITS') return '#fbbf24';
  if (state === 'ERROR') return '#f87171';
  return '#94a3b8';
};

export default function ConnectionCenter() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statuses, setStatuses] = useState<ConnectorStatus[]>([]);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.connectorStatus();
      setStatuses(result.connectors || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read connector status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const byPlatform = useMemo(() => new Map(statuses.map((item) => [item.platform, item])), [statuses]);
  const liveReady = SOURCES.filter((source) => {
    const state = byPlatform.get(source.platform)?.state;
    return state === 'READY' || state === 'LIVE';
  }).length;

  return (
    <div className="connection-center-bar">
      <div className="cc-strip">
        <div className="cc-brand">
          <PlugZap size={14} className="text-blue-400 shrink-0" />
          <strong className="cc-title">CONNECTION CENTER</strong>
          <span className="cc-count-badge">{liveReady}/{SOURCES.length} Ready</span>
        </div>

        {/* Quick-Scan Platform Pills */}
        <div className="cc-platform-cluster">
          {SOURCES.map((source) => {
            const state = byPlatform.get(source.platform)?.state || 'NOT_REPORTED';
            const color = stateTone(state);
            const isReady = state === 'READY' || state === 'LIVE';
            return (
              <div
                key={source.platform}
                className="cc-pill"
                title={`${source.label}: ${state.replaceAll('_', ' ')} (${source.official})`}
              >
                <span
                  className="cc-dot"
                  style={{
                    backgroundColor: color,
                    boxShadow: isReady ? `0 0 6px ${color}88` : 'none',
                  }}
                />
                <span className="cc-pill-name">{source.shortLabel}</span>
              </div>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="cc-actions">
          <span className="cc-env-note" title="API keys and secrets are never sent to the browser">
            <ShieldCheck size={12} className="text-emerald-400" />
            <span>.env secured</span>
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="cc-btn cc-btn-icon"
            title="Refresh connector statuses"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setOpen((val) => !val)}
            className="cc-btn cc-btn-toggle"
            title="Inspect all connector details and credentials"
          >
            <span>{open ? 'Hide' : 'Inspect'}</span>
            {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="cc-drawer"
          >
            <div className="cc-guidance">
              <strong>Source Transparency:</strong> The status badge reflects the backend's official connector credential state. The <b>Free / Fallback</b> line shows what NEXUS executes at zero cost without that credential. For X, a credentials requirement badge coexists with free public-Post oEmbed because oEmbed fetches explicit Post URLs without requiring global search credits.
            </div>

            {error && <div className="cc-error">{error}</div>}

            <div className="cc-grid">
              {SOURCES.map((source) => {
                const status = byPlatform.get(source.platform);
                const state = status?.state || 'NOT_REPORTED';
                const ready = state === 'READY' || state === 'LIVE';
                const tone = stateTone(state);

                return (
                  <article key={source.platform} className="cc-card">
                    <div className="cc-card-top">
                      <div className="flex items-center gap-2">
                        {ready ? (
                          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                        ) : (
                          <CircleAlert size={15} style={{ color: tone }} className="shrink-0" />
                        )}
                        <strong className="text-xs text-slate-100 font-semibold">{source.label}</strong>
                      </div>
                      <span
                        className="cc-state-chip"
                        style={{ color: tone, borderColor: `${tone}44`, backgroundColor: `${tone}12` }}
                      >
                        {state.replaceAll('_', ' ')}
                      </span>
                    </div>

                    <div className="cc-spec-list">
                      <div><span className="cc-spec-label">Official:</span> <span className="cc-spec-val">{source.official}</span></div>
                      <div><span className="cc-spec-label">Free path:</span> <span className="cc-spec-val text-blue-300">{source.freePath}</span></div>
                      <div><span className="cc-spec-label">Input:</span> <span className="cc-spec-val">{source.input}</span></div>
                      {source.env.length > 0 && (
                        <div>
                          <span className="cc-spec-label">Local .env:</span>
                          <code className="cc-code">{source.env.join(', ')}</code>
                        </div>
                      )}
                    </div>

                    <p className="cc-note">{source.note}</p>
                    {status?.detail && (
                      <div className="cc-backend-detail">Backend: {status.detail}</div>
                    )}
                  </article>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
