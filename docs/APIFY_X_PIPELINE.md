# NEXUS SIH26152 — Production-Ready Apify X/Twitter Ingestion Pipeline

## 1. Overview & Architecture

The NTRO Social Media Intelligence Platform integrates a production-ready, modular X/Twitter data collection pipeline using **Apify**. The pipeline preserves all existing data contracts, deduplication rules, and AI analytics pipelines (multilingual sentiment, stance detection, emotion classification, sarcasm detection, narrative clustering, and alert evaluation).

```
User Search Query (UI / API)
          │
          ▼
   X/Twitter Query Builder
 (Keywords, Lang, Filters, Date Bounds)
          │
          ▼
   Provider Dispatcher
 (X_PROVIDER = "apify" | "official")
          │
          ▼
   Apify X Collector Service
 (POST https://api.apify.com/v2/acts/apidojo~tweet-scraper/run-sync-get-dataset-items)
          │
          ▼
  Fetched Raw Posts (JSON Dataset)
          │
          ▼
  Provider-Independent Normalization
  (Extracts Canonical SocialEventIn: ID, clean text, author, engagement, entities)
          │
          ▼
  AI Enrichment Pipeline
  (Multilingual VADER + Lexicon, Stance, Emotion Lexicons, Sarcasm Probability)
          │
          ▼
  EventStore Database & Cluster Assignment
  (UNIQUE(platform, source_event_id) Deduplication Idempotency)
          │
          ▼
  NEXUS Intelligence Dashboard
  (Real-Time Trend Engine, Timeline, Narrative Lineage, Evidence Ledger)
```

---

## 2. Configuration & Environment Variables

The pipeline is controlled through environment variables defined in `.env` (derived from `backend-ai/app/config.py`):

| Variable | Type | Default | Description |
|---|---|---|---|
| `X_PROVIDER` | `str` | `"official"` | Explicit provider selector: `"apify"` or `"official"`. Set to `"apify"` to route collection through Apify. |
| `APIFY_API_TOKEN` | `str` | `""` | Apify API token (Bearer token). Kept confidential; never exposed in logs or API responses. |
| `APIFY_X_ACTOR_ID` | `str` | `"apidojo/tweet-scraper"` | The Apify Actor ID. Verified schema compatible with `apidojo/tweet-scraper`, `kaitoeasyapi/twitter-x-data-tweet-scraper`, etc. |
| `APIFY_TIMEOUT_SECONDS` | `int` | `60` | HTTP timeout (in seconds) for synchronous Apify actor run and dataset retrieval. |
| `APIFY_MAX_ITEMS_PER_RUN` | `int` | `50` | Maximum number of posts fetched per search request to manage Apify credit usage. |

### Sample `.env` for Local Apify Testing
```ini
X_PROVIDER=apify
APIFY_API_TOKEN=apify_api_YOUR_ACTUAL_TOKEN_HERE
APIFY_X_ACTOR_ID=apidojo/tweet-scraper
APIFY_TIMEOUT_SECONDS=60
APIFY_MAX_ITEMS_PER_RUN=50
```

---

## 3. Verified Actor Schema & Normalization

The normalization engine (`app/apify_x_service.py`) handles variations across modern Apify Twitter scrapers:

### Input Schema (`apidojo/tweet-scraper`)
- `searchTerms`: `list[str]` (e.g. `["cybersecurity lang:en"]`)
- `maxItems`: `int` (e.g. `10` or `20`)
- `sort`: `"Latest"`
- `tweetLanguage`: `str` (optional ISO 639-1 code)

### Output Mapping to Canonical `SocialEventIn`
| Apify Field | Canonical Field | Fallback / Normalization Logic |
|---|---|---|
| `id` / `id_str` / `tweet_id` | `source_event_id` | Required. Strict post ID string. |
| `text` / `full_text` | `text` | Cleaned text; malformed posts lacking text are safely skipped. |
| `createdAt` / `created_at` | `created_at` | RFC 2822 Twitter dates, ISO 8601, or epoch timestamps parsed to UTC. |
| `author.userName` / `user.screen_name` | `author_platform_id` | Twitter handle without leading `@`. |
| `author.name` / `user.name` | `author_display` | Human-readable user name, falling back to username. |
| `url` / `twitterUrl` | `url` | Canonical `https://x.com/{user}/status/{id}` link. |
| `likeCount` / `favorite_count` | `engagement.likes` | Non-negative integer. |
| `retweetCount` / `retweet_count` | `engagement.reposts` | Non-negative integer. |
| `replyCount` / `reply_count` | `engagement.replies` | Non-negative integer. |
| `viewCount` / `views` | `engagement.views` | Integer views metric if available. |
| `entities.hashtags` | `hashtags` | Lowercased list; regex fallback if absent in JSON. |
| `entities.user_mentions` | `mentions` | Lowercased handles; regex fallback if absent in JSON. |
| `entities.urls` | `urls` | Fully expanded URLs; regex fallback if absent. |

---

## 4. API Endpoints

### 1. Dedicated Search Endpoint: `POST /api/social/x/search`
Direct collection endpoint accepting query, count, and filters:
```bash
curl -X POST "http://localhost:8000/api/social/x/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "cyber attack lang:en",
    "max_results": 10,
    "language": "en"
  }'
```
**Response Format (`ApifyXSearchResponse`):**
```json
{
  "status": "success",
  "platform": "x",
  "provider": "apify",
  "actor": "apidojo/tweet-scraper",
  "query": "cyber attack lang:en",
  "posts_fetched": 10,
  "posts_inserted": 10,
  "duplicates": 0,
  "analysis_status": "completed",
  "event_ids": ["evt_1", "evt_2"],
  "total_events": 10,
  "events": [...]
}
```

### 2. Connector Gateway: `POST /api/connectors/x/search`
Existing endpoint updated with seamless provider routing based on `X_PROVIDER`.

### 3. Unified Workspace Search: `POST /api/search/workspace`
Multi-source collector executing parallel searches across Telegram, YouTube, and X (via Apify when `X_PROVIDER=apify` and `enable_x=true`).

### 4. Health & Status: `GET /health` and `GET /api/connectors/status`
- `/health`: Exposes `x_provider` (`"apify"` or `"official"`) and `apify_x` (`"configured"` or `"not_configured"`).
- `/api/connectors/status`: Shows connector state (`READY` if configured, `CREDENTIALS_REQUIRED` if token missing).

---

## 5. Deduplication & AI Analysis Integration

1. **Deduplication Idempotency**:
   - `UNIQUE(platform, source_event_id)` ensures that duplicate tweets across multiple search iterations or overlapping query windows are never inserted twice into the database.
   - The response accurately details `posts_fetched`, `posts_inserted`, and `duplicates`.

2. **Automated AI Enrichment Pipeline**:
   - Every normalized post passes through `enrich_event(event)`:
     - **Sentiment Scoring**: Compound score from -1.0 to +1.0 via multilingual VADER with Indic lexicons (Hindi, Marathi, Hinglish).
     - **Stance Detection**: `supportive`, `against`, or `unclear` with confidence score.
     - **Emotion Classification**: Fear/Anxiety, Anger, Neutral, Excitement.
     - **Sarcasm Probability**: Contextual sarcasm marker detection.
     - **Topic Extraction**: Stopword-filtered keywords.
   - `assign_clusters()` dynamically groups newly ingested posts into emerging narrative clusters.

---

## 6. Frontend Integration

1. **𝕏 Search X Modal (`XSearchModal.tsx`)**:
   - Accessible via the `𝕏 Search X` button on the Continuous Collection action row.
   - Interactive configuration for search keywords, item count slider (1–50, default 10 for safe credit usage), and language selector.
   - Live execution feedback displays run statistics (posts fetched, new insertions, duplicate count) and an expandable list of retrieved tweets.
   - Auto-refreshes workspace intelligence on completion.

2. **Quick Connector Drawer (`FreeConnectorPanel.tsx`)**:
   - Includes quick-trigger `+ X (Apify)` button with customizable target post count.

3. **Platform Filter & Explorer (`PostExplorer.tsx`)**:
   - Filter chips allow isolating X posts (`𝕏 X (Apify)`).
   - Detailed event inspection shows author bio, verification status, sentiment breakdown, engagement metrics, and evidence provenance.

---

## 7. Testing & Verification

### Automated Unit Tests (`tests/test_apify_x.py`)
All 10 test scenarios run with Apify fully mocked (zero credit usage):
```powershell
cd backend-ai
..\.venv\Scripts\python.exe -m pytest tests/test_apify_x.py -v
```
**Test Coverage:**
1. `test_normalize_apify_tweet_valid_schema`: Valid tweet field extraction & mapping.
2. `test_build_query_helper`: Query composition with `lang:`, `since:`, and `until:` filters.
3. `test_missing_token_raises_authentication_error`: Validates `CREDENTIALS_REQUIRED` error without token.
4. `test_apify_http_500_error_handling`: Graceful handling of Apify runtime failures.
5. `test_apify_empty_results`: Non-destructive empty response handling.
6. `test_event_store_apify_x_insertion_and_deduplication`: `UNIQUE` constraint and deduplication.
7. `test_multiple_posts_batch_normalization`: Batch processing of diverse tweet payloads.
8. `test_malformed_posts_skipped_safely`: Defensive parsing ignoring missing fields or empty text.
9. `test_api_social_x_search_endpoint_mocked`: Full FastAPI endpoint contract validation.
10. `test_ai_pipeline_enrichment_on_apify_x_event`: AI inference verification (sentiment, stance, emotion, topics).

### Running All 44 Backend Tests
```powershell
..\.venv\Scripts\python.exe -m pytest -v
```

---

## 8. Security & Operational Guardrails

- **Token Masking**: `APIFY_API_TOKEN` is never printed to logs or included in HTTP response payloads.
- **Provider Isolation**: If official X credentials or Apify credentials change, `X_PROVIDER` enables instant swapping without code modifications.
- **Rate-Limit & Cost Protection**: Requests default to 10–20 posts; the backend enforces hard caps (`APIFY_MAX_ITEMS_PER_RUN <= 100`).
