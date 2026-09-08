import { type ChangeEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Database,
  Download,
  ExternalLink,
  Eye,
  GitBranch,
  Layers,
  ListVideo,
  Network,
  Play,
  PlugZap,
  Radio,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  Waypoints,
  Wifi,
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
  WorkspaceSearchResponse,
  getCustomApiUrl,
  setCustomApiUrl,
  getEffectiveApiBase,
} from './api';
import demoData from './demoData.json';
import PostExplorer from './PostExplorer';
import ConnectionCenter from './ConnectionCenter';
import FreeConnectorPanel from './FreeConnectorPanel';

type ViewMode = 'input' | 'analyzing' | 'report' | 'deep_dive';
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

const ANALYSIS_STEPS = [
  { id: 0, title: 'Connecting to available sources' },
  { id: 1, title: 'Collecting live public conversations' },
  { id: 2, title: 'Analyzing sentiment & emotion' },
  { id: 3, title: 'Detecting emerging narratives' },
  { id: 4, title: 'Mapping influence & propagation' },
];

const PRESETS = [
  'AI India',
  '#cybersecurity',
  '@BBCWorld',
  'Chandrayaan 3',
  'Generative AI',
  '@nexus_sih26152_bot',
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

export default function App({ onNavigateHome }: { onNavigateHome?: () => void } = {}) {
  // Navigation & View Modes
  const [viewMode, setViewMode] = useState<ViewMode>('input');
  const [tab, setTab] = useState<Tab>('overview');

  // Search & Investigation Query State
  const [searchInput, setSearchInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [analysisStep, setAnalysisStep] = useState(0);

  // Active Source Selection for Investigation (Focused on Telegram, YouTube, and X)
  const [selectedSources, setSelectedSources] = useState<Record<string, boolean>>({
    telegram: true,
    youtube: true,
    x: true,
  });

  // Core Intelligence Data Models
  const [overview, setOverview] = useState<Overview | null>(null);
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
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

  // UI Progressive Disclosure Toggles
  const [expandedNarrativeId, setExpandedNarrativeId] = useState<string | null>(null);
  const [showNetworkGraph, setShowNetworkGraph] = useState(false);
  const [showEvidenceLedger, setShowEvidenceLedger] = useState(false);
  const [sentimentChartMode, setSentimentChartMode] = useState<'all' | 'positive' | 'negative' | 'volume'>('all');
  const [conversationLimit, setConversationLimit] = useState(8);
  const [clearWorkspaceOnSearch, setClearWorkspaceOnSearch] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  // Backend Health State
  const [backendHealth, setBackendHealth] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // Check Backend Health
  useEffect(() => {
    let active = true;
    api.health()
      .then(() => { if (active) setBackendHealth('connected'); })
      .catch(() => { if (active) setBackendHealth('disconnected'); });
    return () => { active = false; };
  }, []);

  // Load All Intelligence Endpoints
  const loadAll = useCallback(async () => {
    try {
      setError(null);
      const [status, overviewData, timeData, narrativeData, networkData, demographicData, alertData, eventData, collectorData] = await Promise.all([
        api.connectorStatus(),
        api.overview(),
        api.timeline(),
        api.narratives(),
        api.network(),
        api.demographics(),
        api.alerts(),
        api.events(),
        api.collectorStatus(),
      ]);
      setConnectors(status.connectors || []);
      setOverview(overviewData);
      setTimelinePoints(timeData.points || []);
      setNarratives(narrativeData.narratives || []);
      setNetwork(networkData);
      setDemographics(demographicData);
      setAlerts(alertData.alerts || []);
      setEvents(eventData.events || []);
      setCollector(collectorData);
      setBackendHealth('connected');

      if (eventData.events.length > 0 && !selectedEventId) {
        setSelectedEventId(eventData.events[0].id);
      }
      const preferred = selectedNarrativeId || narrativeData.narratives[0]?.id || null;
      if (preferred) {
        setSelectedNarrativeId(preferred);
        try {
          setNarrativeDetail(await api.narrative(preferred));
        } catch {
          setNarrativeDetail(null);
        }
      }
    } catch (e) {
      setBackendHealth('disconnected');
      setError(e instanceof Error ? e.message : 'Unable to connect to NEXUS intelligence backend.');
    }
  }, [selectedEventId, selectedNarrativeId]);

  // Initial Load
  useEffect(() => {
    void (async () => {
      await loadAll();
    })();
  }, [loadAll]);

  // Continuous Collector Polling
  useEffect(() => {
    if (!collector?.running) return;
    const timer = window.setInterval(() => void loadAll(), 6000);
    return () => window.clearInterval(timer);
  }, [collector?.running, loadAll]);

  // Offline / Online Demo Scenario Loader
  const loadDemoScenario = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.seedDemo();
      await loadAll();
    } catch {
      // Offline fallback for deployed demo preview when backend is not connected
      const d = demoData as any;
      setOverview(d.overview);
      setTimelinePoints(d.timeline?.points || []);
      setNarratives(d.narratives?.narratives || []);
      setEvents(d.events?.events || []);
      setNetwork(d.network);
      setDemographics(d.demographics);
      setAlerts(d.alerts?.alerts || []);
      if (d.narratives?.narratives?.[0]) {
        setSelectedNarrativeId(d.narratives.narratives[0].id);
        setNarrativeDetail(d.narrativeDetails?.[d.narratives.narratives[0].id] || null);
      }
    } finally {
      setLoading(false);
    }
    setActiveQuery('SIH Demo Scenario');
    setViewMode('report');
  };


  // Actions Runner
  const action = async (label: string, fn: () => Promise<unknown>) => {
    setLoading(true);
    setError(null);
    setNotice(null);
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

  // REAL LIVE INVESTIGATION EXECUTION
  const runLiveInvestigation = async (queryToInvestigate?: string) => {
    const clean = (queryToInvestigate || searchInput).trim();
    if (!clean) return;

    setViewMode('analyzing');
    setLoading(true);
    setError(null);
    setNotice(null);
    setActiveQuery(clean);
    setSearchInput(clean);

    try {
      // Step 0: Check source connectors
      setAnalysisStep(0);
      const connStatus = await api.connectorStatus();
      setConnectors(connStatus.connectors || []);

      // Step 1: Live Workspace Ingestion
      setAnalysisStep(1);
      const searchRes: WorkspaceSearchResponse = await api.searchWorkspace(clean, {
        reset: clearWorkspaceOnSearch,
        limitPerSource: 10,
        enableTelegram: selectedSources.telegram,
        enableX: selectedSources.x,
        enableYouTube: selectedSources.youtube,
        enableBluesky: false,
        enableReddit: false,
        enableMastodon: false,
      });

      // Step 2: Ingest Overview & Timeline & Events
      setAnalysisStep(2);
      const [overviewData, timeData, eventData] = await Promise.all([
        api.overview(),
        api.timeline(),
        api.events(),
      ]);
      setOverview(overviewData);
      setTimelinePoints(timeData.points || []);
      setEvents(eventData.events || []);
      if (eventData.events[0]) setSelectedEventId(eventData.events[0].id);

      // Step 3: Cluster Emerging Narratives
      setAnalysisStep(3);
      const narrativeData = await api.narratives();
      setNarratives(narrativeData.narratives || []);
      if (narrativeData.narratives[0]) {
        setSelectedNarrativeId(narrativeData.narratives[0].id);
        try {
          setNarrativeDetail(await api.narrative(narrativeData.narratives[0].id));
        } catch {
          setNarrativeDetail(null);
        }
      }

      // Step 4: Map Influence Network, Demographics, & Alerts
      setAnalysisStep(4);
      const [netData, demoData, alertData, collData] = await Promise.all([
        api.network(),
        api.demographics(),
        api.alerts(),
        api.collectorStatus(),
      ]);
      setNetwork(netData);
      setDemographics(demoData);
      setAlerts(alertData.alerts || []);
      setCollector(collData);

      // Transition to Intelligence Report
      setViewMode('report');
      setNotice(`Investigation complete: ${searchRes.inserted} events collected across live sources.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Investigation encountered an issue.');
      setViewMode('input');
    } finally {
      setLoading(false);
    }
  };

  // Switch to Deep Dive with specific event
  const openPostInDeepDive = (id: string) => {
    setSelectedEventId(id);
    setTab('posts');
    setViewMode('deep_dive');
  };

  // Switch to Deep Dive with specific narrative
  const openNarrativeInDeepDive = async (id: string) => {
    setSelectedNarrativeId(id);
    try {
      setNarrativeDetail(await api.narrative(id));
      setNetwork(await api.network(id));
    } catch {
      // ignore
    }
    setTab('narrative');
    setViewMode('deep_dive');
  };

  // Import JSON Event File
  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const parsed = JSON.parse(await file.text());
      const rows = Array.isArray(parsed) ? parsed : parsed.events;
      if (!Array.isArray(rows)) throw new Error('JSON must be an array of events.');
      await api.importEvents(rows);
      setNotice(`Imported ${rows.length} offline event records (truthfully tagged as IMPORT/REPLAY).`);
      await loadAll();
      setViewMode('report');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  // Continuous Collector Toggle
  const toggleContinuous = () => {
    if (collector?.running) {
      void action('Continuous collection paused', api.stopCollector);
    } else {
      void action('Continuous collection started', () => api.startCollector(activeQuery));
    }
  };

  // Primary Insight Derived Computations
  const topNarrative = narratives[0] || null;
  const platformEntries = useMemo(
    () => Object.entries(overview?.platform_mix || {}).sort((a, b) => b[1] - a[1]),
    [overview],
  );
  const platformCount = platformEntries.length;

  const sentimentBreakdown = useMemo(() => {
    const mix = overview?.sentiment_mix || {};
    const total = Object.values(mix).reduce((acc, v) => acc + v, 0) || 1;
    return {
      positive: Math.round(((mix.positive || 0) / total) * 100),
      negative: Math.round(((mix.negative || 0) / total) * 100),
      neutral: Math.round(((mix.neutral || 0) / total) * 100),
    };
  }, [overview]);

  // Filtered Events
  const displayedEvents = useMemo(() => {
    let filtered = events;
    if (postDateFilter) {
      const targetStr = postDateFilter.toDateString();
      filtered = filtered.filter((e) => new Date(e.created_at).toDateString() === targetStr);
    }
    return filtered.slice(0, conversationLimit);
  }, [events, postDateFilter, conversationLimit]);

  // Timeline Data for Sentiment Visualization
  const timelineData = useMemo(() => {
    return timelinePoints.map((p) => ({
      time: new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      volume: p.count,
      positive: p.sentiments?.positive || 0,
      negative: p.sentiments?.negative || 0,
      neutral: p.sentiments?.neutral || 0,
    }));
  }, [timelinePoints]);

  // Influence Nodes
  const topInfluencers = useMemo(() => {
    return (network?.nodes || []).slice(0, 5);
  }, [network]);

  // Truth Mode
  const sourceModeDistribution = overview?.source_modes || {};
  const isAllLive = Object.keys(sourceModeDistribution).length === 1 && sourceModeDistribution.LIVE;
  const hasReplay = !!sourceModeDistribution.REPLAY || !!sourceModeDistribution.IMPORT;

  // =========================================================================
  // RENDER: 1. INITIAL SCREEN — INPUT FIRST
  // =========================================================================
  if (viewMode === 'input') {
    return (
      <div className="input-page-wrap">
        <header className="report-topbar">
          <div
            className="report-topbar-brand"
            onClick={onNavigateHome}
            style={{ cursor: onNavigateHome ? 'pointer' : 'default' }}
            title={onNavigateHome ? 'Return to Home' : undefined}
          >
            <Sparkles size={16} className="text-blue-400" />
            <strong>NEXUS</strong>
            <span>AI Intelligence</span>
          </div>

          <div className="report-topbar-actions">
            {onNavigateHome && (
              <button
                type="button"
                className="btn-minimal"
                onClick={onNavigateHome}
                title="Return to landing page"
              >
                ← Home
              </button>
            )}
          </div>
        </header>

        <main className="investigate-input-root">
          <div className="input-hero-container">
            <div className="input-brand-pill">
              <Sparkles size={13} />
              <span>New Investigation</span>
            </div>

            <h1 className="input-hero-title">Investigate anything across social media</h1>
            <p className="input-hero-subtitle">
              Real-time multi-source social intelligence. Analyze topics, hashtags, public channels, or URLs with verified provenance.
            </p>

            <form
              className="input-search-bar"
              onSubmit={(e) => {
                e.preventDefault();
                void runLiveInvestigation();
              }}
            >
              <Search size={18} className="text-slate-400 shrink-0 ml-1" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter topic, #hashtag, @channel, or post URL..."
                className="input-search-field"
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !searchInput.trim()}
                className="input-analyze-btn"
              >
                <span>Analyze Live</span>
                <ArrowRight size={15} />
              </button>
            </form>


            {/* Unobtrusive Source Selector */}
            <div className="input-sources-wrap">
              <span className="input-sources-label">Configured Intelligence Sources</span>
              <div className="input-sources-row">
                {Object.entries(selectedSources).map(([source, isSelected]) => {
                  const connectorObj = connectors.find((c) => c.platform.toLowerCase() === source.toLowerCase());
                  const isReady = connectorObj?.state === 'READY' || connectorObj?.state === 'LIVE';
                  return (
                    <button
                      key={source}
                      type="button"
                      onClick={() => setSelectedSources((prev) => ({ ...prev, [source]: !isSelected }))}
                      className={`source-toggle-pill ${isSelected ? 'active' : ''}`}
                      title={`${source.toUpperCase()}: ${connectorObj?.state || 'Ready'}`}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          backgroundColor: isReady ? '#34D399' : '#FBBF24',
                        }}
                      />
                      <span>{source.toUpperCase()}</span>
                    </button>
                  );
                })}
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: '#94A3B8',
                    cursor: 'pointer',
                    marginLeft: 'auto',
                    userSelect: 'none',
                  }}
                  title="When unchecked, new search results accumulate with existing evidence"
                >
                  <input
                    type="checkbox"
                    checked={clearWorkspaceOnSearch}
                    onChange={(e) => setClearWorkspaceOnSearch(e.target.checked)}
                    style={{ cursor: 'pointer', accentColor: '#0EA5E9' }}
                  />
                  <span>Reset workspace on search</span>
                </label>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="input-presets-row">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="preset-chip"
                  onClick={() => void runLiveInvestigation(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Demo Scenario Option */}
            <button
              type="button"
              className="input-demo-link"
              onClick={() => void loadDemoScenario()}
            >
              Or evaluate sample SIH deterministic scenario with Demo Mode →
            </button>
          </div>
        </main>
      </div>
    );
  }

  // =========================================================================
  // RENDER: 2. LIVE ANALYSIS STATE
  // =========================================================================
  if (viewMode === 'analyzing') {
    return (
      <main className="analyzing-root">
        <div className="analyzing-card">
          <span className="analyzing-eyebrow">Investigating</span>
          <h2 className="analyzing-query">{activeQuery}</h2>
          <div className="analyzing-divider" />

          <div className="analyzing-steps">
            {ANALYSIS_STEPS.map((step) => {
              const isDone = analysisStep > step.id;
              const isActive = analysisStep === step.id;
              const isPending = analysisStep < step.id;

              return (
                <div
                  key={step.id}
                  className={`analyzing-step-row ${isDone ? 'done' : isActive ? 'active' : 'pending'}`}
                >
                  <div className="step-icon-wrap">
                    {isDone ? (
                      <Check size={16} className="step-check" />
                    ) : isActive ? (
                      <div className="step-pulse" />
                    ) : (
                      <div className="step-circle" />
                    )}
                  </div>
                  <span>{step.title}</span>
                </div>
              );
            })}
          </div>

          <p className="analyzing-footnote">
            Live multi-source collection active across configured platform bridges. Zero synthetic data.
          </p>
        </div>
      </main>
    );
  }

  // =========================================================================
  // RENDER: 3. RESULT PAGE — THE INTELLIGENCE REPORT (Answer-First)
  // =========================================================================
  if (viewMode === 'report') {
    return (
      <div className="report-root">
        {/* Minimal Editorial Topbar */}
        <header className="report-topbar">
          <div className="report-topbar-brand" onClick={() => setViewMode('input')}>
            <Sparkles size={16} className="text-blue-400" />
            <strong>NEXUS</strong>
            <span>AI Intelligence</span>
          </div>

          <div className="report-topbar-actions">
            <button
              type="button"
              className="btn-minimal"
              onClick={() => setViewMode('input')}
              title="Start a new investigation"
            >
              <Search size={13} />
              <span>New Investigation</span>
            </button>
            {onNavigateHome && (
              <button
                type="button"
                className="btn-minimal"
                onClick={onNavigateHome}
                title="Return to Home"
              >
                ← Home
              </button>
            )}
          </div>
        </header>

        {/* Intelligence Report Main Body */}
        <article className="report-container">
          {/* Header & Telemetry */}
          <section className="report-hero-head">
            <h1 className="report-topic-title">{activeQuery}</h1>
            <div className="report-classification-strip">
              <span className="report-live-badge">
                <span style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: isAllLive ? '#34D399' : '#FBBF24' }} />
                {isAllLive ? 'LIVE INTELLIGENCE' : hasReplay ? 'HYBRID / REPLAY ARCHIVE' : 'OBSERVED TOPIC'}
              </span>
              <span>Updated just now</span>
              <span>·</span>
              <span>Truthful provenance enforced</span>
            </div>

            {/* Micro-metrics Row (Lines and Spacing, NO cards!) */}
            <div className="report-metrics-row">
              <span className="report-metric-item">
                <b>{overview?.total_events || events.length}</b> Observed Events
              </span>
              <span>·</span>
              <span className="report-metric-item">
                <b>{narratives.length}</b> Emerging Narratives
              </span>
              <span>·</span>
              <span className="report-metric-item">
                <b>{alerts.length}</b> Risk Alerts
              </span>
              <span>·</span>
              <span className="report-metric-item">
                <b>{platformCount}</b> Platforms Observed
              </span>
            </div>
          </section>

          {/* 1. PRIMARY INTELLIGENCE ANSWER: WHAT'S HAPPENING */}
          <section className="report-section" style={{ borderTop: 0, paddingTop: 0 }}>
            <div className="report-section-eyebrow">Primary Takeaway</div>
            <h2 className="report-section-title">WHAT&apos;S HAPPENING</h2>

            {topNarrative ? (
              <>
                <p className="primary-insight-text">
                  &ldquo;{topNarrative.title}&rdquo;
                </p>
                <p className="primary-insight-desc">
                  {topNarrative.representative_text}
                </p>

                {/* Key Insight Indicators */}
                <div className="primary-stat-grid">
                  <div className="primary-stat-cell">
                    <span>Conversation Volume</span>
                    <strong>↑ {Math.round(topNarrative.trend.growth_rate * 100)}% velocity</strong>
                  </div>
                  <div className="primary-stat-cell">
                    <span>Positive Sentiment</span>
                    <strong style={{ color: '#34D399' }}>{sentimentBreakdown.positive}%</strong>
                  </div>
                  <div className="primary-stat-cell">
                    <span>Negative Sentiment</span>
                    <strong style={{ color: '#F87171' }}>{sentimentBreakdown.negative}%</strong>
                  </div>
                  <div className="primary-stat-cell">
                    <span>Platform Spread</span>
                    <strong>{topNarrative.trend.platform_count} platforms</strong>
                  </div>
                </div>

                {/* Editorial Why It Matters Box */}
                <div className="why-it-matters-box">
                  <strong>Why it matters</strong>
                  The discussion is accelerating across {topNarrative.trend.platform_count} platforms with {pct(topNarrative.trend.author_diversity)} author diversity. Sentiment is trending {sentimentBreakdown.positive > sentimentBreakdown.negative ? 'predominantly positive' : 'critical or skeptical'}, spreading through {Object.keys(topNarrative.platform_mix).join(', ')}.
                </div>

                {/* Top Alert Callout if present */}
                {alerts.length > 0 && (
                  <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                    <div style={{ fontSize: 12.5, color: '#FCA5A5' }}>
                      <strong style={{ color: '#FFFFFF', display: 'block', marginBottom: 2 }}>{alerts[0].title}</strong>
                      <span>{alerts[0].why_triggered[0]} (Confidence: {pct(alerts[0].confidence)})</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="primary-insight-desc">
                No dominant narrative detected yet for this topic. Run a fresh search or poll live bridges to ingest events.
              </p>
            )}
          </section>

          {/* 2. EMERGING NARRATIVES */}
          <section className="report-section">
            <div className="report-section-eyebrow">Trend Clustering</div>
            <h2 className="report-section-title">EMERGING NARRATIVES</h2>
            <p className="report-section-subtitle">
              Ranked by semantic momentum, burst rate, and cross-platform presence. Click any narrative to reveal details.
            </p>

            <div className="narratives-list">
              {narratives.slice(0, 5).map((n, idx) => {
                const isExpanded = expandedNarrativeId === n.id;
                return (
                  <div
                    key={n.id}
                    className="narrative-row"
                    onClick={() => setExpandedNarrativeId(isExpanded ? null : n.id)}
                  >
                    <span className="narrative-num">0{idx + 1}</span>
                    <div className="narrative-body">
                      <div className="narrative-row-title">{n.title}</div>
                      <div className="narrative-row-meta">
                        <span>↑ <b>{Math.round(n.trend.growth_rate * 100)}%</b> growth</span>
                        <span>·</span>
                        <span><b>{n.trend.platform_count}</b> platforms</span>
                        <span>·</span>
                        <span><b>{n.event_count}</b> mentions</span>
                        <span>·</span>
                        <span><b>{pct(n.trend.author_diversity)}</b> diversity</span>
                        <span style={{ marginLeft: 'auto', color: '#60A5FA', fontSize: 11 }}>
                          {isExpanded ? 'Less ↑' : 'Details ↓'}
                        </span>
                      </div>

                      {/* Progressive Disclosure Content */}
                      {isExpanded && (
                        <div className="narrative-expanded-content" onClick={(e) => e.stopPropagation()}>
                          <p style={{ margin: '0 0 10px', fontStyle: 'italic' }}>&ldquo;{n.representative_text}&rdquo;</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                            {Object.entries(n.platform_mix).map(([p, count]) => (
                              <span key={p} className="chip">{p}: {count}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 3. SENTIMENT OVER TIME */}
          <section className="report-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div className="report-section-eyebrow">Emotional Trajectory</div>
                <h2 className="report-section-title">SENTIMENT OVER TIME</h2>
                <p className="report-section-subtitle">Conversation volume and sentiment movement across observed timeline buckets.</p>
              </div>

              {/* Visualization Mode Switcher */}
              <div style={{ display: 'flex', gap: 4 }}>
                {(['all', 'positive', 'negative', 'volume'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`btn-minimal ${sentimentChartMode === mode ? 'btn-minimal-primary' : ''}`}
                    style={{ fontSize: 11, height: 28 }}
                    onClick={() => setSentimentChartMode(mode)}
                  >
                    {mode.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ width: '100%', height: 280, marginTop: 12 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="time" tick={{ fontSize: 10.5, fill: '#64748B' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10.5, fill: '#64748B' }} />
                  <Tooltip contentStyle={{ background: '#09101C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />

                  {(sentimentChartMode === 'all' || sentimentChartMode === 'volume') && (
                    <Area type="monotone" dataKey="volume" stroke="#60A5FA" fill="#3B82F6" fillOpacity={0.12} strokeWidth={2} name="Total Volume" />
                  )}
                  {(sentimentChartMode === 'all' || sentimentChartMode === 'positive') && (
                    <Line type="monotone" dataKey="positive" stroke="#34D399" strokeWidth={2} dot={false} name="Positive" />
                  )}
                  {(sentimentChartMode === 'all' || sentimentChartMode === 'negative') && (
                    <Line type="monotone" dataKey="negative" stroke="#F87171" strokeWidth={2} dot={false} name="Negative" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* 4. LIVE CONVERSATION (Evidence Stream) */}
          <section className="report-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div className="report-section-eyebrow">Forensic Wire</div>
                <h2 className="report-section-title">LIVE CONVERSATION</h2>
                <p className="report-section-subtitle">
                  Chronological public events collected directly from verified sources.
                </p>
              </div>

              {postDateFilter && (
                <button
                  type="button"
                  className="btn-minimal"
                  onClick={() => setPostDateFilter(undefined)}
                >
                  Clear Date Filter ({postDateFilter.toLocaleDateString()}) ✕
                </button>
              )}
            </div>

            <div className="conversation-stream">
              {displayedEvents.map((e) => (
                <div key={e.id} className="conversation-wire-item">
                  <div className="conversation-wire-time">
                    {new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="conversation-wire-content">
                    <div className="conversation-wire-head">
                      <span className="wire-platform">{e.platform}</span>
                      <SourceBadge mode={e.source_mode} />
                      <span className="wire-author">{e.author_display || e.author_pseudo_id || 'Anonymous'}</span>
                    </div>
                    <p className="wire-text">{e.text}</p>
                    <div className="wire-footer">
                      <span className="chip" style={{ fontSize: 9.5 }}>{e.sentiment_label || 'neutral'}</span>
                      {e.stance_label && <span className="chip" style={{ fontSize: 9.5 }}>{e.stance_label}</span>}
                      {e.url && !e.url.includes('example.invalid') && (
                        <a href={e.url} target="_blank" rel="noreferrer" className="text-btn" style={{ fontSize: 11, padding: 0 }}>
                          View source ↗
                        </a>
                      )}
                      <button
                        type="button"
                        className="text-btn"
                        style={{ marginLeft: 'auto', fontSize: 11 }}
                        onClick={() => openPostInDeepDive(e.id)}
                      >
                        Inspect in Forensics →
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {events.length > conversationLimit && (
                <button
                  type="button"
                  className="progressive-disclosure-btn"
                  onClick={() => setConversationLimit((prev) => prev + 12)}
                >
                  Show more events ({events.length - conversationLimit} remaining) ↓
                </button>
              )}
            </div>
          </section>

          {/* 5. AUDIENCE (WHO IS TALKING?) */}
          <section className="report-section">
            <div className="report-section-eyebrow">Demographic Signals</div>
            <h2 className="report-section-title">WHO IS TALKING?</h2>
            <p className="report-section-subtitle">
              Aggregate public-signal inference · k-anonymity protected · No individual profiling
            </p>

            {demographics ? (
              <div className="audience-grid">
                {/* Language */}
                <div>
                  <div className="audience-card-label">Language</div>
                  {Object.entries(demographics.language?.counts || {}).slice(0, 4).map(([lang, count]) => {
                    const total = Object.values(demographics.language?.counts || {}).reduce((a, b) => a + b, 0) || 1;
                    const percentage = Math.round((count / total) * 100);
                    return (
                      <div key={lang}>
                        <div className="audience-bar-row">
                          <span>{lang}</span>
                          <b>{percentage}%</b>
                        </div>
                        <div className="audience-bar-track">
                          <div className="audience-bar-fill" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Geography */}
                <div>
                  <div className="audience-card-label">Broad Region</div>
                  {Object.entries(demographics.broad_geography?.counts || {}).slice(0, 4).map(([geo, count]) => {
                    const total = Object.values(demographics.broad_geography?.counts || {}).reduce((a, b) => a + b, 0) || 1;
                    const percentage = Math.round((count / total) * 100);
                    return (
                      <div key={geo}>
                        <div className="audience-bar-row">
                          <span>{geo.replaceAll('_', ' ')}</span>
                          <b>{percentage}%</b>
                        </div>
                        <div className="audience-bar-track">
                          <div className="audience-bar-fill" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Professional Interests */}
                <div>
                  <div className="audience-card-label">Professional Interests</div>
                  {Object.entries(demographics.professional_interests?.counts || {}).slice(0, 4).map(([topic, count]) => {
                    const total = Object.values(demographics.professional_interests?.counts || {}).reduce((a, b) => a + b, 0) || 1;
                    const percentage = Math.round((count / total) * 100);
                    return (
                      <div key={topic}>
                        <div className="audience-bar-row">
                          <span>{topic.replaceAll('_', ' ')}</span>
                          <b>{percentage}%</b>
                        </div>
                        <div className="audience-bar-track">
                          <div className="audience-bar-fill" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Age Brackets */}
                <div>
                  <div className="audience-card-label">Age Brackets</div>
                  {Object.entries(demographics.age_brackets?.counts || {}).slice(0, 4).map(([age, count]) => {
                    const total = Object.values(demographics.age_brackets?.counts || {}).reduce((a, b) => a + b, 0) || 1;
                    const percentage = Math.round((count / total) * 100);
                    return (
                      <div key={age}>
                        <div className="audience-bar-row">
                          <span>{age}</span>
                          <b>{percentage}%</b>
                        </div>
                        <div className="audience-bar-track">
                          <div className="audience-bar-fill" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p style={{ color: '#64748B', fontSize: 12 }}>Aggregate demographics not yet loaded.</p>
            )}
          </section>

          {/* 6. WHO IS DRIVING THE CONVERSATION? (Influence) */}
          <section className="report-section">
            <div className="report-section-eyebrow">Influence Dynamics</div>
            <h2 className="report-section-title">WHO IS DRIVING THE CONVERSATION?</h2>
            <p className="report-section-subtitle">
              Key bridge nodes and reach amplifiers detected via graph centrality algorithms.
            </p>

            <div className="influencers-list">
              {topInfluencers.map((node, idx) => (
                <div key={node.id} className="influencer-row">
                  <div className="influencer-left">
                    <span className="influencer-num">0{idx + 1}</span>
                    <div>
                      <div className="influencer-name">{node.label}</div>
                      <div className="influencer-role">{node.role} · {node.explanation}</div>
                    </div>
                  </div>
                  <div className="influencer-score">PageRank {node.pagerank.toFixed(3)}</div>
                </div>
              ))}
            </div>

            {/* Progressive Disclosure: Network Canvas */}
            <button
              type="button"
              className="progressive-disclosure-btn"
              onClick={() => setShowNetworkGraph((prev) => !prev)}
            >
              {showNetworkGraph ? 'Hide Network Graph ↑' : 'Explore Interactive Network Graph ↓'}
            </button>

            {showNetworkGraph && network && (
              <div style={{ marginTop: 16 }}>
                <NetworkGraph network={network} />
              </div>
            )}
          </section>

          {/* 7. WHY SHOULD I TRUST THIS? (Evidence & Trust) */}
          <section className="report-section">
            <div className="report-section-eyebrow">Verifiability & Audit</div>
            <h2 className="report-section-title">WHY SHOULD I TRUST THIS?</h2>
            <p className="report-section-subtitle">
              SIH26152 Truthful Provenance Guarantee. Every insight is tied to timestamped source evidence.
            </p>

            <div style={{ padding: '16px 20px', borderRadius: 8, background: '#09101C', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block', fontSize: 13.5, color: '#F1F5F9' }}>Evidence Verified</strong>
                <span style={{ fontSize: 12, color: '#8994A7' }}>
                  {events.length} observations across {platformCount} live sources · 100% source traceability
                </span>
              </div>
              <button
                type="button"
                className="btn-minimal"
                onClick={() => setShowEvidenceLedger((prev) => !prev)}
              >
                {showEvidenceLedger ? 'Hide Ledger ↑' : 'View Evidence Ledger ↓'}
              </button>
            </div>

            {showEvidenceLedger && (
              <div style={{ marginTop: 16 }}>
                <section className="panel table-panel">
                  <div className="evidence-table">
                    <div className="evidence-row evidence-head">
                      <span>Source</span>
                      <span>Time</span>
                      <span>Author</span>
                      <span>Text</span>
                      <span>Inference</span>
                    </div>
                    {events.slice(0, 50).map((event) => (
                      <div
                        key={event.id}
                        className="evidence-row evidence-row-clickable"
                        onClick={() => openPostInDeepDive(event.id)}
                      >
                        <span>
                          <PlatformBadge platform={event.platform} /> <SourceBadge mode={event.source_mode} />
                        </span>
                        <span>{fmt(event.created_at)}</span>
                        <span>{event.author_display || event.author_pseudo_id || '—'}</span>
                        <span className="evidence-text">{event.text}</span>
                        <span>
                          <Badge>{event.sentiment_label || 'unknown'}</Badge>{' '}
                          <Badge>{event.stance_label || 'unclear'}</Badge>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </section>

        </article>
      </div>
    );
  }

  // =========================================================================
  // RENDER: 4. LEVEL 2 — DEEP DIVE ANALYST CONSOLE (9 Specialized Modules)
  // =========================================================================
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

      {/* Sticky Back to Report Banner */}
      <div className="deep-dive-header">
        <button
          type="button"
          className="back-to-report-btn"
          onClick={() => setViewMode('report')}
        >
          <ArrowLeft size={13} />
          <span>Back to Intelligence Report</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#8994A7' }}>
          <span>Active Topic: <strong style={{ color: '#F8FAFC' }}>{activeQuery}</strong></span>
          <span>·</span>
          <span>9 Analyst Modules</span>
        </div>

        <button
          type="button"
          className="btn-minimal"
          onClick={() => setViewMode('input')}
        >
          <Search size={12} />
          <span>New Query</span>
        </button>
      </div>

      {/* TOPBAR */}
      <header className="topbar">
        <div className="brand">
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void runLiveInvestigation(searchInput);
              }}
              placeholder="Search topic or #hashtag..."
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading || !searchInput.trim()}
            onClick={() => void runLiveInvestigation(searchInput)}
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
        </div>
      </header>

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
              <span>{activeQuery} · {platformCount} platforms</span>
            </div>
          </div>
        </aside>

        <main className="content">
          {loading && <div className="loading-line"><span /></div>}

          {/* TAB 1: OVERVIEW */}
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

              {/* Data Ingestion Drawer */}
              <div style={{ marginBottom: 20 }}>
                <ConnectionCenter />
                <FreeConnectorPanel />
              </div>

              {/* Continuous Collection Tray */}
              <div className="collection-tray">
                <div className="collection-tray-head">
                  <div className="collection-tray-title">
                    <Radio size={14} className="text-blue-400" />
                    <strong>CONTINUOUS COLLECTION</strong>
                    <span className={`badge ${collector?.running ? 'badge-live' : 'badge-neutral'}`}>
                      {collector?.running ? '● STREAMING' : 'IDLE'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {collector?.cycles ? `${collector.cycles} cycles executed` : 'Manual or continuous stream'}
                  </span>
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
                    onClick={() => action('Polled Telegram Bot', api.pollTelegram)}
                  >
                    + Telegram Bot
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ height: 32, fontSize: 11.5 }}
                    disabled={loading}
                    onClick={() => importRef.current?.click()}
                  >
                    <Upload size={13} />
                    <span>Import JSON</span>
                  </button>
                </div>
              </div>

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
                    {narratives.slice(0, 4).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        className="trend-card"
                        onClick={() => void openNarrativeInDeepDive(n.id)}
                      >
                        <div className="trend-card-top">
                          <div>
                            <div className="eyebrow">{n.id} · {n.event_count} events</div>
                            <h3>{n.title}</h3>
                          </div>
                          <Badge tone={n.trend.status === 'VIRAL' ? 'bad' : n.trend.status === 'RISING' ? 'warn' : 'neutral'}>
                            {n.trend.status}
                          </Badge>
                        </div>
                        <p>{n.representative_text}</p>
                        <div className="trend-grid">
                          <span><b>{n.trend.score.toFixed(2)}</b> score</span>
                          <span><b>{n.trend.growth_rate >= 0 ? '+' : ''}{n.trend.growth_rate.toFixed(2)}</b> growth</span>
                          <span><b>{n.trend.platform_count}</b> platforms</span>
                          <span><b>{pct(n.trend.author_diversity)}</b> diversity</span>
                        </div>
                      </button>
                    ))}
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
                </aside>
              </div>
            </motion.div>
          )}

          {/* TAB 2: POSTS / EXPLORER (With Calendar-10 integration) */}
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

          {/* TAB 3: TIMELINE */}
          {tab === 'timeline' && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="page-head">
                <div>
                  <div className="eyebrow">Exact chronology</div>
                  <h1>Timeline & sentiment movement</h1>
                  <p>See when volume changes and whether emotion shifts with it.</p>
                </div>
              </div>
              <section className="panel panel-large">
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height={380}>
                    <AreaChart data={timelineData} margin={{ left: 0, right: 16, top: 12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748B' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                      <Tooltip contentStyle={{ background: '#091120', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                      <Area type="monotone" dataKey="volume" stroke="#60A5FA" fill="#3B82F6" fillOpacity={0.12} strokeWidth={2.5} />
                      <Line type="monotone" dataKey="negative" stroke="#F87171" strokeWidth={1.75} dot={false} />
                      <Line type="monotone" dataKey="positive" stroke="#34D399" strokeWidth={1.75} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </motion.div>
          )}

          {/* TAB 4: TRENDS */}
          {tab === 'trends' && (
            <motion.div
              key="trends"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="page-head">
                <div>
                  <div className="eyebrow">Real-time trend engine</div>
                  <h1>Emerging narratives</h1>
                  <p>Ranked using growth, burst, diversity, cross-platform presence, engagement and recency.</p>
                </div>
              </div>
              <div className="trend-list standalone">
                {narratives.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className="trend-card"
                    onClick={() => void openNarrativeInDeepDive(n.id)}
                  >
                    <div className="trend-card-top">
                      <div>
                        <div className="eyebrow">{n.id} · {n.event_count} events</div>
                        <h3>{n.title}</h3>
                      </div>
                      <Badge tone={n.trend.status === 'VIRAL' ? 'bad' : n.trend.status === 'RISING' ? 'warn' : 'neutral'}>
                        {n.trend.status}
                      </Badge>
                    </div>
                    <p>{n.representative_text}</p>
                    <div className="trend-grid">
                      <span><b>{n.trend.score.toFixed(2)}</b> score</span>
                      <span><b>{n.trend.growth_rate >= 0 ? '+' : ''}{n.trend.growth_rate.toFixed(2)}</b> growth</span>
                      <span><b>{n.trend.platform_count}</b> platforms</span>
                      <span><b>{pct(n.trend.author_diversity)}</b> diversity</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 5: NARRATIVE */}
          {tab === 'narrative' && narrativeDetail && (
            <motion.div
              key="narrative"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="page-head">
                <div>
                  <div className="eyebrow">{narrativeDetail.id} · Narrative lineage</div>
                  <h1>{narrativeDetail.title}</h1>
                  <p>{narrativeDetail.representative_text}</p>
                </div>
                <div className="chip-row">
                  <a className="btn btn-secondary" href={api.narrativeCsvUrl(narrativeDetail.id)}><Download size={13} /> CSV</a>
                  <a className="btn btn-secondary" href={api.narrativeJsonUrl(narrativeDetail.id)}><Download size={13} /> JSON</a>
                </div>
              </div>

              <div className="narrative-layout">
                <section className="panel panel-large">
                  <div className="callout"><ShieldCheck size={16} /><span>{narrativeDetail.origin_claim}</span></div>
                  <div className="lineage">
                    {narrativeDetail.lineage.slice(0, 40).map((item, index) => (
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
                            <div className="chip-row"><span className="chip">sentiment: {item.sentiment || 'unknown'}</span></div>
                            <button type="button" className="text-btn" onClick={() => openPostInDeepDive(item.event_id)}>Inspect post →</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <aside className="panel narrative-side">
                  <div className="eyebrow">Trend Decomposition</div>
                  {[
                    ['Trend score', narrativeDetail.trend.score.toFixed(2)],
                    ['Growth', `${narrativeDetail.trend.growth_rate >= 0 ? '+' : ''}${narrativeDetail.trend.growth_rate.toFixed(2)}`],
                    ['Author diversity', pct(narrativeDetail.trend.author_diversity)],
                    ['Platforms', narrativeDetail.trend.platform_count],
                  ].map(([label, value]) => (
                    <div className="fact-row" key={label}><span>{label}</span><strong>{value}</strong></div>
                  ))}
                </aside>
              </div>
            </motion.div>
          )}

          {/* TAB 6: NETWORK */}
          {tab === 'network' && network && (
            <motion.div
              key="network"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="page-head">
                <div>
                  <div className="eyebrow">Link analysis</div>
                  <h1>How influence moved</h1>
                  <p>Centrality and bridge roles describe observed network position — never guilt or intent.</p>
                </div>
                <div className="chip-row">
                  <span className="chip">nodes {network.summary.nodes || 0}</span>
                  <span className="chip">edges {network.summary.edges || 0}</span>
                  <span className="chip">communities {network.summary.communities || 0}</span>
                </div>
              </div>
              <section className="panel panel-large">
                <NetworkGraph network={network} />
              </section>
            </motion.div>
          )}

          {/* TAB 7: DEMOGRAPHICS */}
          {tab === 'demographics' && demographics && (
            <motion.div
              key="demographics"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="page-head">
                <div>
                  <div className="eyebrow">Aggregate only</div>
                  <h1>Audience signals without individual profiling</h1>
                  <p>{demographics.privacy_note}</p>
                </div>
                {demographics.sample_status === 'limited_sample' ? (
                  <Badge tone="warn"><ShieldCheck size={13} /> Limited Sample (k=1 coarse)</Badge>
                ) : (
                  <Badge tone="good"><ShieldCheck size={13} /> k-anonymity guard (k={demographics.effective_k || 10})</Badge>
                )}
              </div>
              <div className="demographic-grid">
                <DemographicSliceCard title="Language" slice={demographics.language} />
                <DemographicSliceCard title="Broad geography" slice={demographics.broad_geography} />
                <DemographicSliceCard title="Professional interests" slice={demographics.professional_interests} />
                <DemographicSliceCard title="Age brackets" slice={demographics.age_brackets} />
              </div>
            </motion.div>
          )}

          {/* TAB 8: ALERTS */}
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
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 9: EVIDENCE */}
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
                  {events.slice(0, 100).map((event) => (
                    <div
                      className="evidence-row evidence-row-clickable"
                      key={event.id}
                      onClick={() => openPostInDeepDive(event.id)}
                    >
                      <span>
                        <PlatformBadge platform={event.platform} /> <SourceBadge mode={event.source_mode} />
                      </span>
                      <span>{fmt(event.created_at)}</span>
                      <span>{event.author_display || event.author_pseudo_id || '—'}</span>
                      <span className="evidence-text">{event.text}</span>
                      <span>
                        <Badge>{event.sentiment_label || 'unknown'}</Badge>{' '}
                        <Badge>{event.stance_label || 'unclear'}</Badge>
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

// Subcomponents for Deep Dive
function NetworkGraph({ network }: { network: NetworkResponse | null }) {
  const nodes = (network?.nodes || []).slice(0, 32);
  const ids = new Set(nodes.map((n) => n.id));
  const edges = (network?.edges || []).filter((edge) => ids.has(edge.source) && ids.has(edge.target)).slice(0, 90);
  const width = 900;
  const height = 480;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.37;
  const positions = new Map<string, { x: number; y: number }>();
  nodes.forEach((node, index) => {
    const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2;
    const r = radius * (0.72 + (index % 4) * 0.08);
    positions.set(node.id, { x: centerX + Math.cos(angle) * r, y: centerY + Math.sin(angle) * r });
  });

  if (!network || !nodes.length) return <div className="empty">No network data yet.</div>;

  return (
    <div className="network-canvas">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Network">
        {edges.map((edge, index) => {
          const a = positions.get(edge.source);
          const b = positions.get(edge.target);
          if (!a || !b) return null;
          return <line key={`${edge.source}-${edge.target}-${index}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="network-edge" strokeWidth={Math.min(3, 0.7 + edge.weight)} />;
        })}
        {nodes.map((node) => {
          const p = positions.get(node.id)!;
          const size = 6 + Math.min(10, node.pagerank * 90);
          return (
            <g key={node.id} className="network-node">
              <circle cx={p.x} cy={p.y} r={size} className={`network-dot role-${node.role.replaceAll(' ', '-').toLowerCase()}`} />
              <text x={p.x + size + 4} y={p.y + 4}>{node.label.slice(0, 18)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DemographicSliceCard({ title, slice }: { title: string; slice: DemographicSlice }) {
  const entries = Object.entries(slice.counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  return (
    <div className="panel demographic-card">
      <div className="section-head compact">
        <h3>{title}</h3>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {slice.status === 'limited_sample' && <Badge tone="warn">Limited Sample</Badge>}
          <Badge>{pct(slice.coverage)} coverage</Badge>
        </div>
      </div>
      {slice.warning && (
        <p style={{ fontSize: 11, color: '#FBBF24', margin: '4px 0 8px', lineHeight: 1.4 }}>
          {slice.warning}
        </p>
      )}
      <div className="bars">
        {entries.map(([label, value]) => (
          <div className="bar-row" key={label}>
            <span>{label.replaceAll('_', ' ')}</span>
            <div className="bar-track"><i style={{ width: `${(value / max) * 100}%` }} /></div>
            <b>{value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
