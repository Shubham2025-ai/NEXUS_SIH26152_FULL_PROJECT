export type ConnectorState =
  | 'READY'
  | 'LIVE'
  | 'CREDENTIALS_REQUIRED'
  | 'PERMISSION_REQUIRED'
  | 'RATE_LIMITED'
  | 'NO_CREDITS'
  | 'DEGRADED'
  | 'DISABLED'
  | 'ERROR';

export interface ConnectorStatus {
  platform: string;
  state: ConnectorState;
  detail: string;
  source_mode?: 'LIVE' | 'REPLAY' | 'IMPORT' | null;
}

export interface TrendMetrics {
  score: number;
  status: string;
  current_bucket_volume: number;
  baseline_volume: number;
  growth_rate: number;
  burst_zscore: number;
  author_diversity: number;
  platform_count: number;
  engagement_signal: number;
  recency: number;
}

export interface NarrativeSummary {
  id: string;
  title: string;
  event_count: number;
  earliest_observed_at: string;
  latest_observed_at: string;
  earliest_event_id: string;
  earliest_platform: string;
  platform_mix: Record<string, number>;
  sentiment_mix: Record<string, number>;
  trend: TrendMetrics;
  representative_text: string;
  source_modes: Record<string, number>;
}

export interface TrendingKeyword {
  term: string;
  count: number;
  platforms: string[];
  growth_rate: number;
  sentiment_bias: string;
}

export interface Overview {
  total_events: number;
  platform_mix: Record<string, number>;
  source_modes: Record<string, number>;
  sentiment_mix: Record<string, number>;
  active_narratives: number;
  rising_narratives: number;
  alerts: number;
  top_narratives: NarrativeSummary[];
  trending_keywords?: TrendingKeyword[];
  latest_event_at?: string | null;
  coverage_note: string;
}

export interface TimelinePoint {
  time: string;
  count: number;
  sentiments: Record<string, number>;
  platforms: Record<string, number>;
  stances?: Record<string, number>;
  emotions?: Record<string, number>;
  avg_sentiment?: number;
}

export interface CommunityDetail {
  community_id: number;
  node_count: number;
  event_count: number;
  earliest_seen: string;
  dominant_sentiment: string;
  sentiment_mix: Record<string, number>;
  lead_node: string;
}

export interface TemporalPropagationStage {
  step: number;
  community_id: number;
  time: string;
  lead_node: string;
  dominant_sentiment: string;
  node_count: number;
  summary: string;
}

export interface GraphNode {
  id: string;
  label: string;
  platform: string;
  pagerank: number;
  betweenness: number;
  degree_centrality: number;
  community: number;
  role: string;
  sentiment?: string;
  explanation: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  types: string[];
}

export interface NetworkResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: {
    nodes: number;
    edges: number;
    communities?: number;
    high_reach_nodes?: number;
    bridge_nodes?: number;
  };
  communities_detail?: CommunityDetail[];
  temporal_propagation?: TemporalPropagationStage[];
}

export interface AlertItem {
  alert_id: string;
  title: string;
  severity: string;
  narrative_id: string;
  triggered_at: string;
  trend_score: number;
  why_triggered: string[];
  evidence_event_ids: string[];
  earliest_observed_event_id?: string | null;
  top_amplifiers: Array<{ pseudo_id: string; display: string; role: string; score: number }>;
  platform_mix: Record<string, number>;
  sentiment_shift: Record<string, number | string>;
  coverage_warning?: string | null;
  confidence: number;
}

export interface SocialEvent {
  id: string;
  platform: string;
  source_event_id: string;
  event_type: string;
  author_platform_id?: string | null;
  author_pseudo_id?: string | null;
  author_display?: string | null;
  text: string;
  language?: string | null;
  created_at: string;
  ingested_at?: string;
  url?: string | null;
  parent_event_id?: string | null;
  conversation_id?: string | null;
  mentions: string[];
  hashtags: string[];
  urls: string[];
  engagement: Record<string, number | string | null>;
  public_profile: Record<string, unknown>;
  source_mode: 'LIVE' | 'REPLAY' | 'IMPORT';
  connector_run_id?: string | null;
  raw_hash?: string;
  sentiment_label?: string | null;
  sentiment_score?: number | null;
  emotion_scores: Record<string, number>;
  stance_label?: string | null;
  stance_confidence?: number | null;
  sarcasm_probability?: number | null;
  topic_terms: string[];
  narrative_cluster_id?: string | null;
  trend_score?: number | null;
  quality_score?: number | null;
  inference_method?: string | null;
}

export interface WorkspaceSearchResponse {
  received: number;
  inserted: number;
  duplicates: number;
  total_events: number;
  query: string;
  search_session_id: string;
  reset: boolean;
  message: string;
  sources: Record<string, { state: string; received: number; detail?: string; connector?: string }>;
}

export interface NarrativeDetail extends NarrativeSummary {
  events: SocialEvent[];
  lineage: Array<{
    event_id: string;
    platform: string;
    source_mode: string;
    created_at: string;
    author?: string | null;
    author_pseudo_id?: string | null;
    text: string;
    sentiment?: string | null;
    stance?: string | null;
    source_url?: string | null;
    engagement?: Record<string, unknown>;
    public_profile?: Record<string, unknown>;
  }>;
  network: NetworkResponse;
  origin_claim: string;
}

export interface DemographicSlice {
  counts: Record<string, number>;
  coverage: number;
  confidence: number;
  minimum_group_size: number;
  method: string;
}

export interface DemographicsResponse {
  unique_anonymized_users: number;
  language: DemographicSlice;
  broad_geography: DemographicSlice;
  professional_interests: DemographicSlice;
  age_brackets: DemographicSlice;
  privacy_note: string;
}

export interface CollectorStatus {
  running: boolean;
  config?: {
    query: string;
    interval_seconds: number;
    enable_telegram: boolean;
    enable_x: boolean;
    enable_youtube: boolean;
  } | null;
  cycles: number;
  last_run_at?: string | null;
  last_event_at?: string | null;
  ingestion_rate?: number;
  source_health?: Record<string, string>;
  last_result?: Record<string, unknown>;
  note: string;
}

const DIRECT_API = import.meta.env.VITE_API_BASE_URL || '';
const JAVA_API = import.meta.env.VITE_JAVA_GATEWAY_URL || 'http://127.0.0.1:8080';
const USE_GATEWAY = String(import.meta.env.VITE_USE_JAVA_GATEWAY || 'false').toLowerCase() === 'true';

export function getCustomApiUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const queryApi = params.get('api');
      if (queryApi && queryApi.trim()) {
        const cleaned = queryApi.trim().replace(/\/+$/, '');
        localStorage.setItem('nexus_custom_api_url', cleaned);
        return cleaned;
      }
    } catch {
      // ignore query parsing errors
    }
    return localStorage.getItem('nexus_custom_api_url') || '';
  }
  return '';
}

export function setCustomApiUrl(url: string) {
  if (typeof window !== 'undefined') {
    if (url.trim()) {
      localStorage.setItem('nexus_custom_api_url', url.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem('nexus_custom_api_url');
    }
  }
}

export function getEffectiveApiBase(): string {
  const custom = getCustomApiUrl();
  if (custom) return custom;
  return USE_GATEWAY ? `${JAVA_API}/api/gateway` : DIRECT_API;
}

export const API_BASE = getEffectiveApiBase();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);
  const base = getEffectiveApiBase();

  try {
    const url = `${base}${path}`;
    const response = await fetch(url, {
      ...init,
      signal: init?.signal || controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });

    if (!response.ok) {
      const raw = await response.text();
      let message = raw || `Request failed: ${response.status}`;
      try {
        const parsed = JSON.parse(raw);
        const detail = parsed.detail;
        message = typeof detail === 'string' ? detail : detail?.message || JSON.stringify(detail);
      } catch {
        // Keep raw response.
      }
      throw new Error(message);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const isPublic = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      if (isPublic && !base) {
        throw new Error(
          'Deployed frontend cannot reach a local backend directly. To run live queries in the cloud, deploy your backend (e.g. on Render) or set your Backend URL in Settings.'
        );
      }
      throw new Error(`Endpoint ${path} returned non-JSON response (${contentType}). Verify backend is running.`);
    }
    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  connectorStatus: () => request<{ connectors: ConnectorStatus[] }>('/api/connectors/status'),
  overview: () => request<Overview>('/api/overview'),
  timeline: (minutes: number = 15) => request<{ bucket_minutes: number; points: TimelinePoint[] }>(`/api/timeline?minutes=${minutes}`),
  trends: () => request<{ narratives: NarrativeSummary[]; trending_keywords?: TrendingKeyword[] }>('/api/trends'),
  narratives: () => request<{ narratives: NarrativeSummary[]; trending_keywords?: TrendingKeyword[] }>('/api/narratives'),
  narrative: (id: string) => request<NarrativeDetail>(`/api/narratives/${encodeURIComponent(id)}`),
  network: (id?: string) => request<NetworkResponse>(`/api/network${id ? `?narrative_id=${encodeURIComponent(id)}` : ''}`),
  demographics: () => request<DemographicsResponse>('/api/demographics'),
  alerts: () => request<{ alerts: AlertItem[] }>('/api/alerts'),
  events: () => request<{ events: SocialEvent[] }>('/api/events?limit=500&newest_first=true'),
  event: (id: string) => request<SocialEvent>(`/api/events/${encodeURIComponent(id)}`),
  resetWorkspace: () => request<{ status: string; total_events: number }>('/api/workspace/reset', {
    method: 'POST', body: '{}',
  }),
  searchWorkspace: (
    query: string,
    options?: {
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
    },
  ) => request<WorkspaceSearchResponse>('/api/search/workspace', {
    method: 'POST',
    body: JSON.stringify({
      query,
      reset: options?.reset ?? true,
      limit_per_source: options?.limitPerSource ?? 5,
      enable_telegram: options?.enableTelegram ?? true,
      enable_x: options?.enableX ?? true,
      enable_youtube: options?.enableYouTube ?? true,
      enable_bluesky: options?.enableBluesky ?? false,
      enable_reddit: options?.enableReddit ?? false,
      enable_mastodon: options?.enableMastodon ?? false,
      telegram_channel: options?.telegramChannel || null,
      instagram_profile: options?.instagramProfile || null,
    }),
  }),
  seedDemo: () => request<{ inserted: number; total_events: number; message: string }>('/api/demo/seed', {
    method: 'POST', body: JSON.stringify({ reset: true }),
  }),
  pollTelegram: () => request<{ inserted: number; total_events: number }>('/api/connectors/telegram/poll', {
    method: 'POST', body: JSON.stringify({ max_updates: 50 }),
  }),
  searchX: (query: string) => request<{ inserted: number; total_events: number }>('/api/connectors/x/search', {
    method: 'POST', body: JSON.stringify({ query, max_results: 20 }),
  }),
  searchYouTube: (query: string) => request<{ inserted: number; total_events: number }>('/api/connectors/youtube/search', {
    method: 'POST', body: JSON.stringify({ query, max_videos: 3, max_comments_per_video: 20 }),
  }),
  syncMeta: (source: 'instagram' | 'facebook') => request<{ inserted: number; total_events: number }>(
    '/api/connectors/meta/sync', { method: 'POST', body: JSON.stringify({ source, limit: 25 }) },
  ),
  collectorStatus: () => request<CollectorStatus>('/api/collector/status'),
  startCollector: (query: string, options?: { telegram?: boolean; x?: boolean; youtube?: boolean; interval?: number }) => request<CollectorStatus>(
    '/api/collector/start', {
      method: 'POST',
      body: JSON.stringify({
        query,
        interval_seconds: options?.interval || 60,
        enable_telegram: options?.telegram ?? true,
        enable_x: options?.x ?? false,
        enable_youtube: options?.youtube ?? false,
      }),
    },
  ),
  stopCollector: () => request<CollectorStatus>('/api/collector/stop', { method: 'POST', body: '{}' }),
  importEvents: (events: unknown[]) => request<{ inserted: number; total_events: number }>('/api/ingest/replay', {
    method: 'POST', body: JSON.stringify({ events }),
  }),
  narrativeJsonUrl: (id: string) => `${API_BASE}/api/export/narrative/${encodeURIComponent(id)}.json`,
  narrativeCsvUrl: (id: string) => `${API_BASE}/api/export/narrative/${encodeURIComponent(id)}.csv`,
};
