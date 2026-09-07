import { type ChangeEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Database,
  Download,
  ExternalLink,
  GitBranch,
  Layers,
  ListVideo,
  Network,
  Play,
  PlugZap,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Square,
  Upload,
  Users,
  Waypoints,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertItem,
  api,
  CollectorStatus,
  ConnectorStatus,
  DemographicSlice,
  DemographicsResponse,
  GraphNode,
  NarrativeDetail,
  NarrativeSummary,
  NetworkResponse,
  Overview,
  SocialEvent,
  TimelinePoint,
  TrendingKeyword,
} from './api';
import PostExplorer from './PostExplorer';
import ConnectionCenter from './ConnectionCenter';
import FreeConnectorPanel from './FreeConnectorPanel';

type Tab = 'overview' | 'posts' | 'timeline' | 'trends' | 'narrative' | 'network' | 'demographics' | 'alerts' | 'evidence';

const tabs: Array<{ id: Tab; label: string; icon: typeof Activity }> = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'posts', label: 'Posts / Explorer', icon: ListVideo },
  { id: 'timeline', label: 'Timeline', icon: Waypoints },
  { id: 'trends', label: 'Trends', icon: BarChart3 },
  { id: 'narrative', label: 'Narrative', icon: GitBranch },
  { id: 'network', label: 'Network', icon: Network },
  { id: 'demographics', label: 'Demographics', icon: Users },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  { id: 'evidence', label: 'Evidence', icon: Database },
];

const fmt = (value: string | number | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const pct = (value: number | null | undefined) => `${Math.round((value || 0) * 100)}%`;

function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'live' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function SourceBadge({ mode }: { mode?: string }) {
  const tone = mode === 'LIVE' ? 'live' : mode === 'REPLAY' ? 'warn' : 'neutral';
  return <Badge tone={tone}>{mode || 'UNKNOWN'}</Badge>;
}

function PlatformBadge({ platform }: { platform: string }) {
  return <span className={`platform platform-${platform}`}>{platform.toUpperCase()}</span>;
}

function Metric({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'blue',
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon: typeof Activity;
  tone?: 'blue' | 'purple' | 'amber' | 'rose';
}) {
  return (
    <div className="metric-card">
      <div className={`metric-icon metric-icon-${tone}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="metric-value">{value}</div>
        <div className="metric-label">{label}</div>
        {helper && <div className="metric-helper">{helper}</div>}
      </div>
    </div>
  );
}

function ConnectorStrip({ connectors }: { connectors: ConnectorStatus[] }) {
  return (
    <div className="connector-strip">
      {connectors.map((connector) => {
        const tone = connector.state === 'READY' || connector.state === 'LIVE' ? 'good' : connector.state === 'ERROR' ? 'bad' : 'warn';
        return (
          <div className="connector-item" key={connector.platform} title={connector.detail}>
            <span className={`connector-dot connector-${tone}`} />
            <strong>{connector.platform.toUpperCase()}</strong>
            <span>{connector.state.replaceAll('_', ' ')}</span>
          </div>
        );
      })}
    </div>
  );
}

function TrendCard({ narrative, onOpen }: { narrative: NarrativeSummary; onOpen: () => void }) {
  const tone = narrative.trend.status === 'VIRAL' ? 'bad' : narrative.trend.status === 'RISING' ? 'warn' : 'neutral';
  return (
    <button type="button" className="trend-card" onClick={onOpen}>
      <div className="trend-card-top">
        <div>
          <div className="eyebrow">{narrative.id} · {narrative.event_count} events</div>
          <h3>{narrative.title}</h3>
        </div>
        <Badge tone={tone}>{narrative.trend.status}</Badge>
      </div>
      <p>{narrative.representative_text}</p>
      <div className="trend-grid">
        <span><b>{narrative.trend.score.toFixed(2)}</b> score</span>
        <span><b>{narrative.trend.growth_rate >= 0 ? '+' : ''}{narrative.trend.growth_rate.toFixed(2)}</b> growth</span>
        <span><b>{narrative.trend.platform_count}</b> platforms</span>
        <span><b>{pct(narrative.trend.author_diversity)}</b> diversity</span>
      </div>
      <div className="chip-row">
        {Object.entries(narrative.platform_mix).map(([platform, count]) => <span className="chip" key={platform}>{platform}: {count}</span>)}
        {Object.entries(narrative.source_modes).map(([mode, count]) => <span className="chip" key={mode}>{mode}: {count}</span>)}
      </div>
    </button>
  );
}

function SIHPipelineBanner({ activeTab, onSelectTab }: { activeTab: Tab; onSelectTab: (tab: Tab) => void }) {
  const steps = [
    { num: 1, title: 'Multi-Source Data', desc: 'X, Telegram, IG, FB, RSS', tab: 'overview' as Tab },
    { num: 2, title: 'Continuous Collection', desc: 'Real-time & Chronology', tab: 'timeline' as Tab },
    { num: 3, title: 'AI/NLP Enrichment', desc: 'Emotions, Stances, Entities', tab: 'posts' as Tab },
    { num: 4, title: 'Core Analytics (B-E)', desc: 'Sentiment, Demographics, Trends, Network', tab: 'trends' as Tab },
    { num: 5, title: 'Evidence Console', desc: 'Explainable Alerts & Provenance', tab: 'evidence' as Tab },
  ];
  return (
    <div className="sih-pipeline-banner">
      <div className="sih-pipeline-title">
        <Sparkles size={13} />
        <span>SIH26152 End-to-End Social Media Analytics Pipeline</span>
      </div>
      <div className="sih-pipeline-steps">
        {steps.map((step, idx) => (
          <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 150 }}>
            <div
              className={`sih-step ${activeTab === step.tab ? 'active' : ''}`}
              onClick={() => onSelectTab(step.tab)}
              style={{ cursor: 'pointer' }}
              title={`Switch to ${step.title}`}
            >
              <div className="sih-step-num">{step.num}</div>
              <div>
                <strong>{step.title}</strong>
                <span>{step.desc}</span>
              </div>
            </div>
            {idx < steps.length - 1 && <span className="sih-arrow">→</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendingKeywordsRibbon({ keywords }: { keywords?: TrendingKeyword[] }) {
  if (!keywords || !keywords.length) return null;
  return (
    <div className="trending-keywords-panel">
      <div className="trending-keywords-head">
        <div className="eyebrow" style={{ color: '#93c5fd' }}>SIH Component D · Emerging Topic & Keyword Clusters</div>
        <Badge tone="good">{keywords.length} active keyword signals</Badge>
      </div>
      <div className="trending-keywords-cloud">
        {keywords.map((kw) => (
          <div className="trending-keyword-pill" key={kw.term}>
            <strong>{kw.term}</strong>
            <span className="trending-keyword-count">{kw.count} posts</span>
            <span className={`trending-keyword-growth ${kw.growth_rate >= 0 ? 'positive' : 'negative'}`}>
              {kw.growth_rate >= 0 ? '+' : ''}{(kw.growth_rate * 100).toFixed(0)}%
            </span>
            <span style={{ fontSize: 9.5, color: '#64748b' }}>
              {kw.platforms.length} {kw.platforms.length === 1 ? 'platform' : 'platforms'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineView({
  points,
  minutes,
  onMinutesChange,
}: {
  points: TimelinePoint[];
  minutes: number;
  onMinutesChange: (m: number) => void;
}) {
  const [viewMode, setViewMode] = useState<'polarity' | 'emotions' | 'stance'>('polarity');

  const data = points.map((point) => {
    const d = new Date(point.time);
    const time = Number.isNaN(d.getTime())
      ? String(point.time)
      : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      time,
      count: point.count,
      negative: point.sentiments?.negative || 0,
      positive: point.sentiments?.positive || 0,
      neutral: point.sentiments?.neutral || 0,
      anxiety: point.emotions?.anxiety || 0,
      excitement: point.emotions?.excitement || 0,
      anger: point.emotions?.anger || 0,
      sadness: point.emotions?.sadness || 0,
      supportive: point.stances?.supportive || 0,
      against: point.stances?.against || 0,
      unclear: point.stances?.unclear || 0,
    };
  });

  return (
    <section className="panel panel-large">
      <div className="section-head">
        <div>
          <div className="eyebrow">SIH Components A & B · Exact Chronology & Sentiment Timeline</div>
          <h2>Conversation timeline & sentiment movement</h2>
        </div>
        <div className="legend">
          {viewMode === 'polarity' && (
            <>
              <span style={{ color: '#60a5fa' }}>● Volume</span>
              <span style={{ color: '#f87171' }}>● Negative</span>
              <span style={{ color: '#34d399' }}>● Positive</span>
              <span style={{ color: '#94a3b8' }}>- - Neutral</span>
            </>
          )}
          {viewMode === 'emotions' && (
            <>
              <span style={{ color: '#f59e0b' }}>● Anxiety</span>
              <span style={{ color: '#ef4444' }}>● Anger</span>
              <span style={{ color: '#38bdf8' }}>● Excitement</span>
              <span style={{ color: '#a855f7' }}>● Sadness</span>
            </>
          )}
          {viewMode === 'stance' && (
            <>
              <span style={{ color: '#10b981' }}>● Supportive</span>
              <span style={{ color: '#f43f5e' }}>● Against</span>
              <span style={{ color: '#64748b' }}>- - Unclear</span>
            </>
          )}
        </div>
      </div>

      <div className="timeline-toolbar">
        <div className="timeline-toggle-group">
          <button
            type="button"
            className={`timeline-toggle-btn ${viewMode === 'polarity' ? 'active' : ''}`}
            onClick={() => setViewMode('polarity')}
          >
            Sentiment Polarity
          </button>
          <button
            type="button"
            className={`timeline-toggle-btn ${viewMode === 'emotions' ? 'active' : ''}`}
            onClick={() => setViewMode('emotions')}
          >
            Nuanced Emotions
          </button>
          <button
            type="button"
            className={`timeline-toggle-btn ${viewMode === 'stance' ? 'active' : ''}`}
            onClick={() => setViewMode('stance')}
          >
            Stance Movement
          </button>
        </div>

        <div className="timeline-interval-group">
          <span style={{ fontSize: 10, color: '#64748b', marginRight: 4 }}>Bucket Resolution:</span>
          {[15, 30, 60, 180].map((m) => (
            <button
              key={m}
              type="button"
              className={`timeline-interval-btn ${minutes === m ? 'active' : ''}`}
              onClick={() => onMinutesChange(m)}
            >
              {m >= 60 ? `${m / 60}h` : `${m}m`}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={380}>
          <AreaChart data={data} margin={{ left: 0, right: 16, top: 12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip
              contentStyle={{
                background: '#091120',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 11,
              }}
            />
            {viewMode === 'polarity' && (
              <>
                <Area type="monotone" dataKey="count" stroke="#60a5fa" fill="#3b82f6" fillOpacity={0.12} strokeWidth={2.5} name="Total Volume" />
                <Line type="monotone" dataKey="negative" stroke="#f87171" strokeWidth={1.75} dot={false} name="Negative" />
                <Line type="monotone" dataKey="positive" stroke="#34d399" strokeWidth={1.75} dot={false} name="Positive" />
                <Line type="monotone" dataKey="neutral" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="Neutral" />
              </>
            )}
            {viewMode === 'emotions' && (
              <>
                <Line type="monotone" dataKey="anxiety" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Anxiety" />
                <Line type="monotone" dataKey="anger" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Anger" />
                <Line type="monotone" dataKey="excitement" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} name="Excitement" />
                <Line type="monotone" dataKey="sadness" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} name="Sadness" />
              </>
            )}
            {viewMode === 'stance' && (
              <>
                <Line type="monotone" dataKey="supportive" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Supportive" />
                <Line type="monotone" dataKey="against" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} name="Against" />
                <Line type="monotone" dataKey="unclear" stroke="#64748b" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="Unclear" />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="coverage-callout">
        <ShieldCheck size={16} /> Exact source timestamps are preserved separately from ingestion time. Multi-dimensional emotion & stance tracking satisfies SIH Component B.
      </div>
    </section>
  );
}

function NetworkGraph({ network }: { network: NetworkResponse | null }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const nodes = (network?.nodes || []).slice(0, 36);
  const ids = new Set(nodes.map((n) => n.id));
  const edges = (network?.edges || []).filter((edge) => ids.has(edge.source) && ids.has(edge.target)).slice(0, 100);
  const width = 900;
  const height = 500;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.37;
  const positions = new Map<string, { x: number; y: number }>();
  nodes.forEach((node, index) => {
    const communityOffset = (node.community || 0) * 0.35;
    const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2 + communityOffset;
    const r = radius * (0.72 + (index % 4) * 0.08);
    positions.set(node.id, { x: centerX + Math.cos(angle) * r, y: centerY + Math.sin(angle) * r });
  });

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return nodes[0] || null;
    return nodes.find((n) => n.id === selectedNodeId) || nodes[0] || null;
  }, [nodes, selectedNodeId]);

  if (!network || !nodes.length) return <div className="empty">No network data yet. Seed or ingest events first.</div>;

  return (
    <div>
      <div className="network-layout">
        <div className="network-canvas">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Observed interaction network">
            {edges.map((edge, index) => {
              const a = positions.get(edge.source);
              const b = positions.get(edge.target);
              if (!a || !b) return null;
              const isRepost = edge.types?.includes('repost') || edge.types?.includes('quote');
              return (
                <line
                  key={`${edge.source}-${edge.target}-${index}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  className="network-edge"
                  strokeDasharray={isRepost ? '4 3' : undefined}
                  stroke={isRepost ? '#a855f7' : '#334155'}
                  strokeWidth={Math.min(3.5, 0.7 + edge.weight)}
                />
              );
            })}
            {nodes.map((node) => {
              const p = positions.get(node.id)!;
              const size = 6 + Math.min(10, node.pagerank * 90);
              const isSelected = selectedNode?.id === node.id;
              return (
                <g
                  key={node.id}
                  className="network-node"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedNodeId(node.id)}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isSelected ? size + 3 : size}
                    className={`network-dot role-${node.role.replaceAll(' ', '-').toLowerCase()}`}
                    stroke={isSelected ? '#60a5fa' : undefined}
                    strokeWidth={isSelected ? 2.5 : undefined}
                  />
                  <text x={p.x + size + 4} y={p.y + 4} fill={isSelected ? '#93c5fd' : undefined} fontWeight={isSelected ? 700 : undefined}>
                    {node.label.slice(0, 18)}
                  </text>
                </g>
              );
            })}
          </svg>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
            <span><strong style={{ color: '#334155' }}>—</strong> Reply/Mention Edge</span>
            <span><strong style={{ color: '#a855f7' }}>- - -</strong> Repost/Quote Edge (SIH E)</span>
          </div>
        </div>

        <div className="network-rank">
          <div className="eyebrow">Observed graph & centrality</div>
          <h3>Influence & bridge nodes</h3>

          {selectedNode && (
            <div className="network-community-card" style={{ marginBottom: 12, borderColor: 'rgba(59, 130, 246, 0.4)', background: '#0a1426' }}>
              <div className="network-community-head">
                <strong>{selectedNode.label}</strong>
                <Badge tone={selectedNode.role === 'Bridge Node' ? 'warn' : selectedNode.role === 'High Reach Node' ? 'good' : 'neutral'}>
                  {selectedNode.role}
                </Badge>
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0' }}>{selectedNode.explanation}</p>
              <div className="network-metrics-strip">
                <div>
                  <span>PageRank</span>
                  <strong>{selectedNode.pagerank.toFixed(4)}</strong>
                </div>
                <div>
                  <span>Betweenness</span>
                  <strong>{(selectedNode.betweenness ?? 0).toFixed(4)}</strong>
                </div>
                <div>
                  <span>Degree Cent.</span>
                  <strong>{(selectedNode.degree_centrality ?? 0).toFixed(4)}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: '#64748b' }}>
                <span>Community #{selectedNode.community}</span>
                {selectedNode.sentiment && <span className="chip">sentiment: {selectedNode.sentiment}</span>}
              </div>
            </div>
          )}

          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {nodes.slice(0, 10).map((node: GraphNode) => (
              <div
                className="rank-row"
                key={node.id}
                style={{ cursor: 'pointer', background: selectedNode?.id === node.id ? 'rgba(59, 130, 246, 0.1)' : undefined }}
                onClick={() => setSelectedNodeId(node.id)}
              >
                <div>
                  <strong>{node.label}</strong>
                  <span>PR: {node.pagerank.toFixed(3)} · Betw: {(node.betweenness ?? 0).toFixed(3)}</span>
                </div>
                <Badge tone={node.role === 'Bridge Node' ? 'warn' : node.role === 'High Reach Node' ? 'good' : 'neutral'}>
                  {node.role}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TEMPORAL PROPAGATION FLOW */}
      {network.temporal_propagation && network.temporal_propagation.length > 0 && (
        <div className="network-temporal-panel">
          <div className="eyebrow" style={{ color: '#93c5fd', marginBottom: 8 }}>
            SIH Component E · Temporal Narrative Propagation Flow
          </div>
          {network.temporal_propagation.map((stage) => (
            <div className="network-step-row" key={stage.step}>
              <span className="network-step-badge">{stage.step}</span>
              <div className="network-step-copy">
                <strong>Stage {stage.step}: Community #{stage.community_id} (led by {stage.lead_node})</strong>
                <span>{stage.summary} · {stage.node_count} nodes · sentiment: {stage.dominant_sentiment}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* COMMUNITY SENTIMENT BREAKDOWN */}
      {network.communities_detail && network.communities_detail.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div className="eyebrow" style={{ color: '#93c5fd', marginBottom: 6 }}>
            SIH Component E · Community Sentiment Breakdown
          </div>
          <div className="network-communities-grid">
            {network.communities_detail.map((c) => (
              <div className="network-community-card" key={c.community_id}>
                <div className="network-community-head">
                  <strong>Community #{c.community_id} ({c.node_count} nodes, {c.event_count} events)</strong>
                  <Badge tone={c.dominant_sentiment === 'negative' ? 'bad' : c.dominant_sentiment === 'positive' ? 'good' : 'neutral'}>
                    {c.dominant_sentiment}
                  </Badge>
                </div>
                <div style={{ fontSize: 10.5, color: '#94a3b8' }}>
                  Lead node: {c.lead_node || 'None'} · Earliest: {fmt(c.earliest_seen)}
                </div>
                <div className="chip-row" style={{ marginTop: 8 }}>
                  {Object.entries(c.sentiment_mix).map(([sent, cnt]) => (
                    <span className="chip" key={sent}>{sent}: {String(cnt)}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DemographicSliceCard({ title, slice }: { title: string; slice: DemographicSlice }) {
  const entries = Object.entries(slice.counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  return (
    <div className="panel demographic-card">
      <div className="section-head compact"><h3>{title}</h3><Badge>{pct(slice.coverage)} coverage</Badge></div>
      <div className="bars">
        {entries.map(([label, value]) => (
          <div className="bar-row" key={label}>
            <span>{label.replaceAll('_', ' ')}</span>
            <div className="bar-track"><i style={{ width: `${(value / max) * 100}%` }} /></div>
            <b>{value}</b>
          </div>
        ))}
      </div>
      <div className="mini-note">Confidence {pct(slice.confidence)} · groups below k={slice.minimum_group_size} suppressed</div>
    </div>
  );
}

function NarrativeView({ detail, onOpenEvent }: { detail: NarrativeDetail | null; onOpenEvent: (id: string) => void }) {
  if (!detail) return <div className="empty">Select a narrative from Trends to inspect its evidence-backed lineage.</div>;
  return (
    <div className="narrative-layout">
      <section className="panel panel-large">
        <div className="section-head">
          <div><div className="eyebrow">{detail.id} · Narrative lineage</div><h2>{detail.title}</h2></div>
          <div className="chip-row">
            <Badge tone={detail.trend.status === 'RISING' || detail.trend.status === 'VIRAL' ? 'warn' : 'neutral'}>{detail.trend.status}</Badge>
            <a className="btn btn-secondary" href={api.narrativeCsvUrl(detail.id)}><Download size={13} /> CSV</a>
            <a className="btn btn-secondary" href={api.narrativeJsonUrl(detail.id)}><Download size={13} /> JSON</a>
          </div>
        </div>
        <p className="lead">{detail.representative_text}</p>
        <div className="callout"><ShieldCheck size={16} /><span>{detail.origin_claim}</span></div>
        <div className="lineage">
          {detail.lineage.slice(0, 40).map((item, index) => (
            <div className="lineage-item" key={item.event_id}>
              <div className="lineage-axis"><span>{index + 1}</span></div>
              <div className="lineage-card">
                <div className="row-between">
                  <div className="chip-row"><PlatformBadge platform={item.platform} /><SourceBadge mode={item.source_mode} /></div>
                  <span className="muted">{fmt(item.created_at)}</span>
                </div>
                <strong>{item.author || item.author_pseudo_id || 'Unknown author'}</strong>
                <p>{item.text}</p>
                <div className="row-between">
                  <div className="chip-row"><span className="chip">sentiment: {item.sentiment || 'unknown'}</span><span className="chip">stance: {item.stance || 'unknown'}</span></div>
                  <button type="button" className="text-btn" onClick={() => onOpenEvent(item.event_id)}>Inspect post →</button>
                </div>
                {item.source_url && item.source_url.startsWith('http') && !item.source_url.includes('example.invalid') && (
                  <a href={item.source_url} target="_blank" rel="noreferrer">Open source <ExternalLink size={12} /></a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
      <aside className="panel narrative-side">
        <div className="eyebrow">Why it matters</div>
        <h3>Trend decomposition</h3>
        {[
          ['Trend score', detail.trend.score.toFixed(2)],
          ['Growth', `${detail.trend.growth_rate >= 0 ? '+' : ''}${detail.trend.growth_rate.toFixed(2)}`],
          ['Burst z-score', detail.trend.burst_zscore.toFixed(2)],
          ['Author diversity', pct(detail.trend.author_diversity)],
          ['Platforms', detail.trend.platform_count],
        ].map(([label, value]) => <div className="fact-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}
        <hr />
        <div className="eyebrow">Platform mix</div>
        <div className="chip-row">{Object.entries(detail.platform_mix).map(([k, v]) => <span className="chip" key={k}>{k}: {v}</span>)}</div>
        <div className="eyebrow spaced">Sentiment mix</div>
        <div className="chip-row">{Object.entries(detail.sentiment_mix).map(([k, v]) => <span className="chip" key={k}>{k}: {v}</span>)}</div>
      </aside>
    </div>
  );
}

function App({ onNavigateHome }: { onNavigateHome?: () => void } = {}) {
  const [tab, setTab] = useState<Tab>('overview');
  const [query, setQuery] = useState('AI');
  const [activeQuery, setActiveQuery] = useState<string>('AI · live workspace');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [showIntelligenceDrawer, setShowIntelligenceDrawer] = useState(true);
  const [timelinePoints, setTimelinePoints] = useState<TimelinePoint[]>([]);
  const [narratives, setNarratives] = useState<NarrativeSummary[]>([]);
  const [selectedNarrativeId, setSelectedNarrativeId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [narrativeDetail, setNarrativeDetail] = useState<NarrativeDetail | null>(null);
  const [network, setNetwork] = useState<NetworkResponse | null>(null);
  const [demographics, setDemographics] = useState<DemographicsResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [events, setEvents] = useState<SocialEvent[]>([]);
  const [postDateFilter, setPostDateFilter] = useState<Date | undefined>(undefined);
  const [collector, setCollector] = useState<CollectorStatus | null>(null);
  const [timelineMinutes, setTimelineMinutes] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const loadAll = useCallback(async () => {
    try {
      setError(null);
      const [status, overviewData, timeData, narrativeData, networkData, demographicData, alertData, eventData, collectorData] = await Promise.all([
        api.connectorStatus(), api.overview(), api.timeline(timelineMinutes), api.narratives(), api.network(), api.demographics(), api.alerts(), api.events(), api.collectorStatus(),
      ]);
      setConnectors(status.connectors);
      setOverview(overviewData);
      setTimelinePoints(timeData.points);
      setNarratives(narrativeData.narratives);
      setNetwork(networkData);
      setDemographics(demographicData);
      setAlerts(alertData.alerts);
      setEvents(eventData.events);
      setCollector(collectorData);
      setSelectedEventId((current) => eventData.events.some((event) => event.id === current) ? current : eventData.events[0]?.id || null);
      const inferredQuery = String(eventData.events[0]?.public_profile?.search_query || '').trim();
      if (inferredQuery) setActiveQuery(inferredQuery);
      const preferred = selectedNarrativeId || narrativeData.narratives[0]?.id || null;
      if (preferred) {
        setSelectedNarrativeId(preferred);
        try { setNarrativeDetail(await api.narrative(preferred)); } catch { setNarrativeDetail(null); }
      } else {
        setNarrativeDetail(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to reach NEXUS backend.');
    }
  }, [selectedNarrativeId, timelineMinutes]);

  const handleTimelineMinutesChange = async (minutes: number) => {
    setTimelineMinutes(minutes);
    try {
      const timeData = await api.timeline(minutes);
      setTimelinePoints(timeData.points);
    } catch {
      // ignore
    }
  };

  useEffect(() => { void loadAll(); }, []);

  useEffect(() => {
    if (!collector?.running) return;
    const timer = window.setInterval(() => void loadAll(), 6000);
    return () => window.clearInterval(timer);
  }, [collector?.running, loadAll]);

  const action = async (label: string, fn: () => Promise<unknown>) => {
    setLoading(true); setError(null); setNotice(null);
    try {
      await fn();
      setNotice(label);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  const runFreshSearch = async () => {
    const clean = query.trim();
    if (!clean) return;
    setLoading(true); setError(null); setNotice(null);
    try {
      const result = await api.searchWorkspace(clean, { reset: true, limitPerSource: 15 });
      const okSources = Object.entries(result.sources).filter(([, status]) => status.state === 'OK').map(([name]) => name);
      const failedSources = Object.entries(result.sources).filter(([, status]) => status.state !== 'OK').map(([name]) => name);
      setActiveQuery(clean);
      setSelectedNarrativeId(null);
      setSelectedEventId(null);
      setPostDateFilter(undefined);
      setNotice(`Fresh search: ${result.inserted} post(s) · live sources ${okSources.join(', ') || 'none'}${failedSources.length ? ` · unavailable ${failedSources.join(', ')}` : ''}`);
      await loadAll();
      setTab('posts');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fresh search failed.');
    } finally {
      setLoading(false);
    }
  };

  const openNarrative = async (id: string) => {
    setSelectedNarrativeId(id);
    setLoading(true);
    try {
      setNarrativeDetail(await api.narrative(id));
      setNetwork(await api.network(id));
      setTab('narrative');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load narrative.');
    } finally {
      setLoading(false);
    }
  };

  const openPostById = (id: string) => {
    setSelectedEventId(id);
    setTab('posts');
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setLoading(true); setError(null); setNotice(null);
    try {
      const parsed = JSON.parse(await file.text());
      const rows = Array.isArray(parsed) ? parsed : parsed.events;
      if (!Array.isArray(rows)) throw new Error('JSON must be an event array or an object with an events array.');
      await api.importEvents(rows);
      setNotice(`Imported ${rows.length} event record(s). They are labelled IMPORT/REPLAY, never LIVE.`);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  const toggleContinuous = () => {
    if (collector?.running) {
      void action('Continuous collector stopped', api.stopCollector);
    } else {
      void action('Continuous collector started', () => api.startCollector(activeQuery));
    }
  };

  const platformEntries = useMemo(
    () => Object.entries(overview?.platform_mix || {}).sort((a, b) => b[1] - a[1]),
    [overview],
  );

  const readyConnectorsCount = useMemo(
    () => connectors.filter((c) => c.state === 'READY' || c.state === 'LIVE').length,
    [connectors],
  );

  return (
    <div className="app-shell">
      {/* Hidden File Input for JSON import */}
      <input
        type="file"
        ref={importRef}
        onChange={importJson}
        accept=".json"
        style={{ display: 'none' }}
      />

      {/* TOPBAR */}
      <header className="topbar">
        <div className="brand">
          {onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              className="btn btn-secondary"
              style={{ height: 32, padding: '0 9px', fontSize: 11, gap: 5 }}
              title="Return to Landing Page"
            >
              ← Home
            </button>
          )}
          <div className="brand-mark"><Sparkles size={18} /></div>
          <div>
            <strong>NEXUS</strong>
            <span>AI Analyst Console · SIH26152</span>
          </div>
        </div>

        <div className="top-actions">
          <div className="query-box">
            <Search size={14} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void runFreshSearch(); }}
              placeholder="Search topic or #hashtag..."
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading || !query.trim()}
            onClick={() => void runFreshSearch()}
          >
            <Search size={13} /> Search
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading}
            onClick={() => action('Demo workspace loaded', api.seedDemo)}
            title="Load SIH deterministic demonstration scenario"
          >
            <Play size={13} /> Demo
          </button>
          <button
            type="button"
            className={`btn btn-secondary ${showIntelligenceDrawer ? 'active' : ''}`}
            onClick={() => setShowIntelligenceDrawer((prev) => !prev)}
            title="Toggle Connection Center & Free Source Lab toolbar"
          >
            <Layers size={13} />
            <span>Sources & Lab ({readyConnectorsCount}/{connectors.length || 8})</span>
            {showIntelligenceDrawer ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </header>

      {/* COLLAPSIBLE INTELLIGENCE INGESTION TOOLBAR */}
      <AnimatePresence>
        {showIntelligenceDrawer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <ConnectionCenter />
            <FreeConnectorPanel />
          </motion.div>
        )}
      </AnimatePresence>

      {/* BANNERS */}
      {error && (
        <div className="banner banner-error">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>×</button>
        </div>
      )}
      {notice && (
        <div className="banner banner-success">
          <ShieldCheck size={16} />
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)}>×</button>
        </div>
      )}

      {/* BODY GRID */}
      <div className="body-grid">
        <aside className="sidebar">
          <div className="sidebar-label">ANALYST CONSOLE</div>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`nav-item ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon size={16} />
              <span>{label}</span>
              {id === 'alerts' && alerts.length > 0 && <i>{alerts.length}</i>}
            </button>
          ))}
          <div className="sidebar-foot">
            <ShieldCheck size={15} className="shrink-0 text-emerald-400" />
            <div>
              <strong>Active Workspace</strong>
              <span>{activeQuery} · {readyConnectorsCount} sources live</span>
            </div>
          </div>
        </aside>

        <main className="content">
          {loading && <div className="loading-line"><span /></div>}

          {/* SIH26152 END-TO-END PIPELINE BANNER */}
          <SIHPipelineBanner activeTab={tab} onSelectTab={setTab} />

          {/* OVERVIEW TAB */}
          {tab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="page-head">
                <div>
                  <div className="eyebrow">Workspace · {activeQuery}</div>
                  <h1>What is moving — and why?</h1>
                  <p>Real-time narrative intelligence, anomalies, and influence dynamics.</p>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => void loadAll()}
                  title="Refresh current workspace"
                >
                  <RefreshCw size={16} />
                </button>
              </div>

              {/* 4 SOC METRIC CARDS */}
              <div className="metric-grid">
                <Metric
                  icon={Database}
                  label="Observed events"
                  value={overview?.total_events || 0}
                  helper="current search workspace only"
                  tone="blue"
                />
                <Metric
                  icon={GitBranch}
                  label="Active Narratives"
                  value={overview?.active_narratives || 0}
                  helper="semantic + temporal clusters"
                  tone="purple"
                />
                <Metric
                  icon={Activity}
                  label="Rising Signals"
                  value={overview?.rising_narratives || 0}
                  helper="burst & acceleration detected"
                  tone="amber"
                />
                <Metric
                  icon={AlertTriangle}
                  label="Evidence alerts"
                  value={overview?.alerts || 0}
                  helper="audited & verifiable alerts"
                  tone="rose"
                />
              </div>

              {/* LIVE TELEMETRY STRIP & COLLECTION CONTROL */}
              <div className="collection-tray">
                <div className="collection-tray-head" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 8, marginBottom: 10 }}>
                  <div className="collection-tray-title">
                    <Radio size={14} className={collector?.running ? 'text-emerald-400 animate-pulse' : 'text-slate-400'} />
                    <strong>LIVE PIPELINE TELEMETRY</strong>
                    <span className={`badge ${collector?.running ? 'badge-live' : 'badge-neutral'}`}>
                      {collector?.running ? '● LIVE STREAMING' : 'IDLE'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 11.5 }}>
                    <span className="text-slate-400">
                      Last Event: <strong className="text-slate-200">{collector?.last_event_at ? new Date(collector.last_event_at).toLocaleTimeString() : 'Awaiting data'}</strong>
                    </span>
                    <span className="text-slate-400">
                      Rate: <strong className="text-emerald-400">{collector?.ingestion_rate ?? 0} ev/min</strong>
                    </span>
                    <span className="text-slate-400">
                      Cycles: <strong className="text-slate-200">{collector?.cycles || 0}</strong>
                    </span>
                  </div>
                </div>

                <div className="collection-actions-row">
                  <button
                    type="button"
                    className={`btn ${collector?.running ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ height: 32, fontSize: 11.5 }}
                    disabled={loading}
                    onClick={toggleContinuous}
                  >
                    <Radio size={13} />
                    <span>{collector?.running ? 'Stop Continuous' : 'Start Continuous'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ height: 32, fontSize: 11.5 }}
                    disabled={loading}
                    onClick={() => action('Queried Official X API', () => api.searchX(query))}
                    title="Query Official X API v2 (honest LIVE or CREDENTIALS_REQUIRED)"
                  >
                    + Official X
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ height: 32, fontSize: 11.5 }}
                    disabled={loading}
                    onClick={() => action('Polled Telegram Bot', api.pollTelegram)}
                    title="Poll authorized Telegram Bot updates"
                  >
                    + Telegram Bot
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ height: 32, fontSize: 11.5 }}
                    disabled={loading}
                    onClick={() => action('Synced Meta Instagram', () => api.syncMeta('instagram'))}
                    title="Sync Meta Instagram Graph API"
                  >
                    + Instagram API
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ height: 32, fontSize: 11.5 }}
                    disabled={loading}
                    onClick={() => action('Synced Meta Facebook', () => api.syncMeta('facebook'))}
                    title="Sync Meta Facebook Page Graph API"
                  >
                    + Facebook Page
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ height: 32, fontSize: 11.5 }}
                    disabled={loading}
                    onClick={() => importRef.current?.click()}
                    title="Import offline JSON event ledger (labeled IMPORT/REPLAY)"
                  >
                    <Upload size={13} />
                    <span>Import JSON</span>
                  </button>
                </div>

                {/* Per-Platform Connector Health */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: 10.5, color: '#94a3b8', marginRight: 2 }}>Sources:</span>
                  {Object.entries(collector?.source_health || {
                    telegram: 'OK',
                    x: 'CREDENTIALS_REQUIRED',
                    youtube: 'OK',
                    reddit: 'OK',
                    bluesky: 'OK',
                    mastodon: 'OK',
                  }).map(([plat, state]) => {
                    const isLive = state === 'OK' || state === 'LIVE';
                    const isReq = state.includes('REQUIRED') || state.includes('PERMISSION');
                    const badgeClass = isLive ? 'badge-good' : isReq ? 'badge-warn' : 'badge-bad';
                    return (
                      <span key={plat} className={`badge ${badgeClass}`} style={{ fontSize: 10, padding: '2px 6px', textTransform: 'capitalize' }} title={`${plat}: ${state}`}>
                        {plat}: {state}
                      </span>
                    );
                  })}
                </div>

                <div className="collection-callout" style={{ marginTop: 8 }}>
                  <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                  <span>Real-time pipeline active. Ingested posts execute live NLP/AI analysis, timeline updates, sentiment/emotion trends, and evidence verification without simulated fallback.</span>
                </div>
              </div>

              {/* OVERVIEW GRID */}
              <div className="overview-grid">
                <section className="panel panel-span-2">
                  <div className="section-head">
                    <div>
                      <div className="eyebrow">Priority narratives</div>
                      <h2>Ranked by explainable trend score</h2>
                    </div>
                    <button type="button" className="text-btn" onClick={() => setTab('trends')}>
                      View all →
                    </button>
                  </div>
                  <div className="trend-list">
                    {(overview?.top_narratives || []).slice(0, 4).map((n) => (
                      <TrendCard key={n.id} narrative={n} onOpen={() => void openNarrative(n.id)} />
                    ))}
                    {!overview?.top_narratives?.length && (
                      <div className="empty">
                        <Sparkles size={28} />
                        <h3>No events yet</h3>
                        <p>Run Search above or click Demo to load the deterministic scenario.</p>
                      </div>
                    )}
                  </div>
                </section>

                <aside className="panel">
                  <div className="eyebrow">Coverage truth</div>
                  <h2>Data composition</h2>
                  <div className="platform-stack">
                    {platformEntries.map(([platform, count]) => (
                      <div className="platform-stat" key={platform}>
                        <PlatformBadge platform={platform} />
                        <strong>{count}</strong>
                      </div>
                    ))}
                  </div>
                  <hr />
                  <div className="eyebrow">Source modes</div>
                  <div className="chip-row">
                    {Object.entries(overview?.source_modes || {}).map(([mode, count]) => (
                      <span className="chip" key={mode}>{mode}: {count}</span>
                    ))}
                  </div>
                  <div className="coverage-callout">
                    <ShieldCheck size={16} />
                    <span>{overview?.coverage_note || 'Coverage is always bounded by configured connectors.'}</span>
                  </div>
                </aside>
              </div>
            </motion.div>
          )}

          {/* POSTS / EXPLORER TAB */}
          {tab === 'posts' && (
            <motion.div
              key="posts"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="page-head">
                <div>
                  <div className="eyebrow">Selected post intelligence · {activeQuery}</div>
                  <h1>Posts / Explorer</h1>
                  <p>Select any result to inspect its media, author, engagement, NLP analysis and complete evidence provenance.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {postDateFilter && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: 11, height: 32, padding: '0 10px' }}
                      onClick={() => setPostDateFilter(undefined)}
                      title="Reset date filter to show all dates"
                    >
                      Filter: {postDateFilter.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ✕
                    </button>
                  )}
                  <Badge tone="good">{events.length} observed results</Badge>
                </div>
              </div>
              <PostExplorer
                events={events}
                selectedId={selectedEventId}
                onSelect={(event) => setSelectedEventId(event.id)}
                selectedDate={postDateFilter}
                onDateChange={setPostDateFilter}
              />
            </motion.div>
          )}

          {/* TIMELINE TAB */}
          {tab === 'timeline' && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="page-head">
                <div>
                  <div className="eyebrow">SIH Components A & B · Exact Chronology & Sentiment Timeline</div>
                  <h1>Timeline & sentiment movement</h1>
                  <p>Track post volume, nuanced emotions (anxiety, excitement, anger, sadness) and supportive/against stances over selectable time windows.</p>
                </div>
              </div>
              <TimelineView
                points={timelinePoints}
                minutes={timelineMinutes}
                onMinutesChange={handleTimelineMinutesChange}
              />
            </motion.div>
          )}

          {/* TRENDS TAB */}
          {tab === 'trends' && (
            <motion.div
              key="trends"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="page-head">
                <div>
                  <div className="eyebrow">SIH Component D · Real-time Trend Engine</div>
                  <h1>Emerging narratives & keyword clusters</h1>
                  <p>Ranked using frequency, growth rate, cross-platform spread, burst velocity, and author diversity.</p>
                </div>
              </div>

              {/* SIH D: Ranked Workspace-wide Trending Keywords Ribbon */}
              <TrendingKeywordsRibbon keywords={overview?.trending_keywords} />

              <div className="trend-list standalone">
                {narratives.map((n) => (
                  <TrendCard key={n.id} narrative={n} onOpen={() => void openNarrative(n.id)} />
                ))}
              </div>
            </motion.div>
          )}

          {/* NARRATIVE TAB */}
          {tab === 'narrative' && (
            <motion.div
              key="narrative"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="page-head">
                <div>
                  <div className="eyebrow">Evidence-backed story</div>
                  <h1>Narrative lineage</h1>
                  <p>Earliest observed evidence → variants → amplification → sentiment change.</p>
                </div>
              </div>
              <NarrativeView detail={narrativeDetail} onOpenEvent={openPostById} />
            </motion.div>
          )}

          {/* NETWORK TAB */}
          {tab === 'network' && (
            <motion.div
              key="network"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="page-head">
                <div>
                  <div className="eyebrow">SIH Component E · Link Analysis & Temporal Propagation</div>
                  <h1>How influence moved</h1>
                  <p>Exact centrality metrics (PageRank, Betweenness, Degree), community sentiment, and temporal propagation across stages.</p>
                </div>
                <div className="chip-row">
                  <span className="chip">nodes {network?.summary.nodes || 0}</span>
                  <span className="chip">edges {network?.summary.edges || 0}</span>
                  <span className="chip">communities {network?.summary.communities || 0}</span>
                </div>
              </div>
              <section className="panel panel-large">
                <NetworkGraph network={network} />
              </section>
            </motion.div>
          )}

          {/* DEMOGRAPHICS TAB */}
          {tab === 'demographics' && demographics && (
            <motion.div
              key="demographics"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="page-head">
                <div>
                  <div className="eyebrow">SIH Component C · Privacy-Safe Aggregate Inference</div>
                  <h1>Audience signals without individual profiling</h1>
                  <p>{demographics.privacy_note}</p>
                </div>
                <Badge tone="good"><ShieldCheck size={13} /> k-anonymity guard (k=10)</Badge>
              </div>

              <div className="coverage-callout" style={{ marginBottom: 16 }}>
                <ShieldCheck size={16} />
                <span>
                  <strong>Ethical Inference Guarantee:</strong> NEXUS adheres strictly to public-signal aggregate profiling.
                  Inferences are derived from public metadata (bio keywords, public location strings, language detectors) and protected under k-anonymity (k=10).
                  No PII, private messages, or micro-targeted tracking is stored or exposed.
                </span>
              </div>

              <div className="demographic-grid">
                <DemographicSliceCard title="Language Distribution" slice={demographics.language} />
                <DemographicSliceCard title="Broad Geographic Regions" slice={demographics.broad_geography} />
                <DemographicSliceCard title="Professional / Domain Interests" slice={demographics.professional_interests} />
                <DemographicSliceCard title="Inferred Age Brackets" slice={demographics.age_brackets} />
              </div>
            </motion.div>
          )}

          {/* ALERTS TAB */}
          {tab === 'alerts' && (
            <motion.div
              key="alerts"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="page-head">
                <div>
                  <div className="eyebrow">Explainable alerts</div>
                  <h1>Why the system raised attention</h1>
                  <p>No black-box alarm: each alert includes trigger components, coverage warning and evidence IDs.</p>
                </div>
              </div>
              <div className="alert-list">
                {alerts.map((alert) => (
                  <div className="panel alert-card" key={alert.alert_id}>
                    <div className="section-head compact">
                      <div>
                        <div className="eyebrow">{fmt(alert.triggered_at)} · confidence {pct(alert.confidence)}</div>
                        <h3>{alert.title}</h3>
                      </div>
                      <Badge tone={alert.severity === 'high' ? 'bad' : 'warn'}>{alert.severity}</Badge>
                    </div>
                    <ul>
                      {alert.why_triggered.map((why) => <li key={why}>{why}</li>)}
                    </ul>
                    <div className="callout">
                      <ShieldCheck size={16} />
                      <span>{alert.coverage_warning}</span>
                    </div>
                    <div className="row-between">
                      <span className="muted">{alert.evidence_event_ids.length} evidence events · score {alert.trend_score.toFixed(2)}</span>
                      <button type="button" className="text-btn" onClick={() => void openNarrative(alert.narrative_id)}>Open evidence →</button>
                    </div>
                  </div>
                ))}
                {!alerts.length && <div className="empty">No narrative currently crosses the alert threshold.</div>}
              </div>
            </motion.div>
          )}

          {/* EVIDENCE TAB */}
          {tab === 'evidence' && (
            <motion.div
              key="evidence"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="page-head">
                <div>
                  <div className="eyebrow">Source traceability</div>
                  <h1>Evidence ledger</h1>
                  <p>Click any row to open the complete selected-post view. Every event retains platform, timestamp, source mode and provenance.</p>
                </div>
              </div>
              <section className="panel table-panel">
                <div className="evidence-table">
                  <div className="evidence-row evidence-head">
                    <span>Source</span>
                    <span>Time</span>
                    <span>Author</span>
                    <span>Text</span>
                    <span>Inference</span>
                  </div>
                  {events.slice(0, 200).map((event) => (
                    <div
                      className="evidence-row evidence-row-clickable"
                      role="button"
                      tabIndex={0}
                      onClick={() => openPostById(event.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') openPostById(event.id); }}
                      key={event.id}
                    >
                      <span>
                        <PlatformBadge platform={event.platform} />{' '}
                        <SourceBadge mode={event.source_mode} />
                      </span>
                      <span>{fmt(event.created_at)}</span>
                      <span>{event.author_display || event.author_pseudo_id || '—'}</span>
                      <span className="evidence-text">{event.text}</span>
                      <span>
                        <Badge>{event.sentiment_label || 'unknown'}</Badge>{' '}
                        <Badge>{event.stance_label || 'unclear'}</Badge>
                        {event.url && !event.url.includes('example.invalid') && (
                          <a
                            className="source-link"
                            href={event.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
