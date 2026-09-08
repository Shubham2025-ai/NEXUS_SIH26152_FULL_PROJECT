import { useState } from 'react';
import {
  BadgeCheck,
  Radio,
  ShieldCheck,
  Wifi,
  X as CloseIcon,
  Search,
  AtSign,
  Loader2,
} from 'lucide-react';
import { API_BASE } from './api';

type ActionName = 'telegram' | 'youtube' | 'bluesky' | 'reddit' | 'mastodon' | 'instagram' | 'instagramTag' | 'x' | 'apify_x' | 'mix' | 'verify';

const X_POST_RE = /https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[A-Za-z0-9_]+\/status\/\d+/i;

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, init);
  const raw = await response.text();
  let parsed: any = null;
  try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = raw; }
  if (!response.ok) {
    const detail = parsed?.detail;
    const message = typeof detail === 'string' ? detail : detail?.message || parsed?.message || raw || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return parsed;
}

async function post(path: string, body: unknown) {
  return request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

export default function FreeConnectorPanel() {
  const [query, setQuery] = useState('#RiverLinkUpdate');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState<ActionName | null>(null);
  const [message, setMessage] = useState<string>('');
  const [messageGood, setMessageGood] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const run = async (name: ActionName, fn: () => Promise<any>, reload = true) => {
    setBusy(name); setMessage(''); setMessageGood(false);
    try {
      const result = await fn();
      setMessageGood(true);
      setMessage(`${name.toUpperCase()}: ${result?.inserted ?? 0} new / ${result?.received ?? 0} received${reload ? ' · refreshing…' : ''}`);
      if (reload) window.setTimeout(() => window.location.reload(), 650);
    } catch (error) {
      setMessageGood(false);
      setMessage(error instanceof Error ? error.message : 'Connector failed.');
    } finally { setBusy(null); }
  };

  const runMix = async () => {
    if (!query.trim()) return;
    setBusy('mix');
    setMessage('Creating a fresh multi-source workspace…');
    setMessageGood(false);
    try {
      const rawTarget = target.trim();
      const targetIsX = X_POST_RE.test(rawTarget);
      const cleanTarget = rawTarget.replace(/^@/, '');

      const result = await post('/api/search/workspace', {
        query: query.trim(),
        reset: true,
        limit_per_source: 15,
        enable_youtube: true,
        enable_bluesky: false,
        enable_reddit: false,
        enable_mastodon: false,
        telegram_channel: !targetIsX && cleanTarget ? cleanTarget : null,
        instagram_profile: null,
      });

      let totalInserted = Number(result?.inserted || 0);
      const sourceEntries = Object.entries(result?.sources || {}) as Array<[string, any]>;
      const ok = sourceEntries.filter(([, status]) => status?.state === 'OK').map(([name]) => name);
      const unavailable = sourceEntries.filter(([, status]) => status?.state !== 'OK').map(([name]) => name);

      if (targetIsX) {
        try {
          const xResult = await post('/api/connectors/x/public', { query: '', target: rawTarget, limit: 25 });
          totalInserted += Number(xResult?.inserted || 0);
          if (!ok.includes('x')) ok.push('x');
        } catch {
          unavailable.push('x');
        }
      }

      setMessageGood(ok.length > 0);
      setMessage(`FRESH MIX: ${totalInserted} posts · OK ${ok.join(', ') || 'none'}${unavailable.length ? ` · unavailable ${[...new Set(unavailable)].join(', ')}` : ''} · old topic cleared`);
      window.setTimeout(() => window.location.reload(), 850);
    } catch (error) {
      setMessageGood(false);
      setMessage(error instanceof Error ? error.message : 'Fresh workspace search failed.');
    } finally { setBusy(null); }
  };

  const verifyEvidence = async () => {
    setBusy('verify'); setMessage('Checking evidence certificates…'); setMessageGood(false);
    try {
      const result = await request('/api/certificates');
      const certificates: any[] = result?.certificates || [];
      const certified = certificates.filter((item) => item.decision === 'CERTIFIED').length;
      const abstain = certificates.filter((item) => item.decision === 'ABSTAIN').length;
      setMessageGood(certificates.length > 0);
      setMessage(`EVIDENCE VERIFY: ${certified} certified · ${abstain} abstain · ${certificates.length} narrative certificate(s)`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Evidence verification failed.');
    } finally { setBusy(null); }
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fsl-floating-trigger"
        title="Open Free Source Lab controls"
      >
        <Wifi size={13} />
        <span>FREE SOURCES</span>
      </button>
    );
  }

  const cleanHashtag = query.trim().replace(/^#/, '');
  const targetLooksX = X_POST_RE.test(target.trim());

  return (
    <section className="free-source-panel">
      <div className="fsl-container">
        {/* Section 1: Brand & Query Inputs */}
        <div className="fsl-input-cluster">
          <div className="fsl-title-group">
            <Radio size={14} className="text-cyan-400 shrink-0" />
            <strong className="fsl-title">FREE SOURCE LAB</strong>
          </div>

          <div className="fsl-field">
            <Search size={13} className="text-slate-500 shrink-0 ml-2" />
            <input
              className="fsl-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void runMix(); }}
              placeholder="Topic / #hashtag"
              title="Search query or topic hashtag"
            />
          </div>

          <div className="fsl-field fsl-field-target">
            <AtSign size={13} className="text-slate-500 shrink-0 ml-2" />
            <input
              className="fsl-input"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="TG channel, IG user, or X URL"
              title="Use a Telegram channel username, Instagram public username, or public X Post URL."
            />
          </div>
        </div>

        {/* Section 2: Primary Mix Button */}
        <div className="fsl-primary-action">
          <button
            type="button"
            className="fsl-btn fsl-btn-primary"
            disabled={!!busy || !query.trim()}
            onClick={() => void runMix()}
            title="Create a fresh multi-source search workspace"
          >
            {busy === 'mix' ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Wifi size={13} />
            )}
            <span>Fresh Free Mix</span>
          </button>
        </div>

        {/* Section 3: Segmented Public Search Engines */}
        <div className="fsl-group">
          <span className="fsl-group-label">Engines:</span>
          <div className="fsl-btn-row">
            <button
              type="button"
              className="fsl-btn fsl-btn-subtle"
              disabled={!!busy || !query.trim()}
              onClick={() => run('youtube', () => post('/api/connectors/youtube/free', { query: query.trim(), limit: 10 }))}
              title="Append YouTube public video metadata (Zero-key)"
            >
              {busy === 'youtube' ? <Loader2 size={11} className="animate-spin" /> : null}
              + YouTube ₹0
            </button>
          </div>
        </div>

        {/* Section 4: Targeted Direct Bridges */}
        <div className="fsl-group">
          <span className="fsl-group-label">Bridges:</span>
          <div className="fsl-btn-row">
            <button
              type="button"
              className="fsl-btn fsl-btn-subtle"
              disabled={!!busy || !target.trim() || targetLooksX}
              onClick={() => run('telegram', () => post('/api/connectors/telegram/public', { channel: `${target.trim().replace(/^@/, '')}||${query.trim()}`, limit: 25 }))}
              title="Search targeted public Telegram channel"
            >
              {busy === 'telegram' ? <Loader2 size={11} className="animate-spin" /> : null}
              + Telegram
            </button>
            <button
              type="button"
              className="fsl-btn fsl-btn-subtle"
              disabled={!!busy || (!query.trim() && !target.trim())}
              onClick={() => run('x', () => post('/api/connectors/x/public', { query: query.trim(), target: target.trim(), limit: 25 }))}
              title="Ingest public X Post URL or bridge feed"
            >
              {busy === 'x' ? <Loader2 size={11} className="animate-spin" /> : null}
              + X Bridge
            </button>
            <button
              type="button"
              className="fsl-btn fsl-btn-subtle"
              disabled={!!busy || !query.trim()}
              onClick={() => run('apify_x', () => post('/api/social/x/search', { query: query.trim(), max_results: 20 }))}
              title="Ingest live X posts via Apify Collector"
            >
              {busy === 'apify_x' ? <Loader2 size={11} className="animate-spin" /> : null}
              + X (Apify)
            </button>
          </div>
        </div>

        {/* Section 5: Verification & Controls */}
        <div className="fsl-controls">
          <button
            type="button"
            className="fsl-btn fsl-btn-verify"
            disabled={!!busy}
            onClick={() => void verifyEvidence()}
            title="Inspect cryptographic certificates for active narratives"
          >
            {busy === 'verify' ? <Loader2 size={12} className="animate-spin" /> : <BadgeCheck size={12} />}
            <span>Verify Evidence</span>
          </button>
          <span className="fsl-truth-tag" title="Truthful provenance: Replay/Import data is never falsely tagged as LIVE">
            <ShieldCheck size={12} className="text-emerald-400" />
            <span>Truthful modes</span>
          </span>
          <button
            type="button"
            aria-label="Collapse free connector controls"
            onClick={() => setCollapsed(true)}
            className="fsl-close-btn"
            title="Hide Free Source Lab bar"
          >
            <CloseIcon size={13} />
          </button>
        </div>
      </div>

      {message && (
        <div className={`fsl-feedback ${messageGood ? 'fsl-feedback-good' : 'fsl-feedback-warn'}`}>
          <span>{message}</span>
          <button type="button" onClick={() => setMessage('')} className="fsl-feedback-close">✕</button>
        </div>
      )}
    </section>
  );
}
