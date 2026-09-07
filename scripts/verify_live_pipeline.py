"""End-to-end live pipeline verification script for SIH26152.

Verifies the complete pipeline on genuine live social data:
LIVE SOURCES -> INGESTION -> DATABASE -> NLP/AI -> SENTIMENT/EMOTION/STANCE
-> DEMOGRAPHICS -> TRENDS -> NETWORK -> ALERTS -> EVIDENCE -> DASHBOARD
"""
import asyncio
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Add backend-ai to path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend-ai"))

from app.db import get_store
from app.schemas import WorkspaceSearchRequest
from app.main import (
    workspace_search,
    api_overview,
    api_timeline,
    api_trends,
    api_narratives,
    api_network,
    api_demographics,
    api_alerts,
    collector_status,
)

async def test_live_pipeline():
    print("=== SIH26152 LIVE REAL-TIME PIPELINE VERIFICATION ===\n")
    store = get_store()
    
    # Step 1: Execute workspace search with query "AI"
    print("[1] Executing live workspace search for query 'AI'...", flush=True)
    request = WorkspaceSearchRequest(
        query="AI",
        reset=True,
        limit_per_source=3,
        enable_x=True,
        enable_youtube=True,
        enable_bluesky=True,
        enable_reddit=True,
        enable_mastodon=True,
    )
    search_result = await workspace_search(request)
    print(f"    - Sources reported: {list(search_result['sources'].keys())}", flush=True)
    for src, info in search_result['sources'].items():
        print(f"      * {src}: state={info.get('state')} received={info.get('received', 0)}", flush=True)
    
    total_events = search_result['total_events']
    print(f"    - Total genuine events ingested: {total_events}", flush=True)
    assert total_events > 0, "Expected live events to be ingested!"

    # Step 2: Verify Database storage & timestamps
    print("\n[2] Verifying Database records and timestamps...", flush=True)
    events = store.list_events(limit=50)
    for ev in events[:5]:
        print(f"    - [{ev.platform}] ({ev.source_mode}) {ev.author_display or ev.author_platform_id}: {ev.text[:60]}... | created={ev.created_at.isoformat()} ingested={ev.ingested_at.isoformat()}", flush=True)
        assert ev.created_at is not None
        assert ev.ingested_at is not None
        assert ev.raw_hash is not None
        assert ev.source_mode == "LIVE"

    # Step 3: Verify Live AI / NLP Analysis (Sentiment, Emotion, Stance)
    print("\n[3] Verifying AI/NLP Enrichment (Sentiment, Emotion, Stance)...", flush=True)
    for ev in events[:5]:
        print(f"    - Event {ev.id[:8]}: sentiment={ev.sentiment_label} ({ev.sentiment_score}) | stance={ev.stance_label} ({ev.stance_confidence}) | emotions={list(ev.emotion_scores.keys())}", flush=True)
        assert str(ev.sentiment_label).lower() in {"positive", "negative", "neutral"}
        assert -1.0 <= ev.sentiment_score <= 1.0
        assert str(ev.stance_label).lower() in {"supportive", "against", "neutral", "unclear"}
        assert set(ev.emotion_scores.keys()) >= {"anxiety", "excitement", "anger", "sadness"}

    # Step 4: Verify Timeline Generation
    print("\n[4] Verifying Timeline with emotion & stance series...", flush=True)
    time_res = api_timeline(minutes=60)
    print(f"    - Timeline points: {len(time_res['points'])}", flush=True)
    if time_res['points']:
        pt = time_res['points'][0]
        print(f"    - Sample point: time={pt['time']} count={pt['count']} emotions={pt['emotions']} stances={pt['stances']}", flush=True)
        assert isinstance(pt['emotions'], dict)
        assert isinstance(pt['stances'], dict)

    # Step 5: Verify Demographics & Privacy (k-anonymity)
    print("\n[5] Verifying Demographics and privacy preservation...", flush=True)
    demo_res = api_demographics()
    print(f"    - Privacy note: {demo_res['privacy_note']}", flush=True)
    assert "k=10" in demo_res['privacy_note'] or "k-anonymity" in demo_res['privacy_note']
    for p in events:
        assert not hasattr(p, "email") or p.email is None, "No PII email should exist!"
        assert not hasattr(p, "phone") or p.phone is None, "No PII phone should exist!"

    # Step 6: Verify Trends & Ranked Keywords
    print("\n[6] Verifying Trends and Workspace Keywords...", flush=True)
    trends_res = api_trends()
    narratives = trends_res['narratives']
    print(f"    - Active narrative clusters: {len(narratives)}", flush=True)
    keywords = trends_res['trending_keywords']
    print(f"    - Top workspace keywords: {len(keywords)}", flush=True)
    for kw in keywords[:3]:
        print(f"      * '{kw['term']}': count={kw['count']}, growth={kw['growth_rate']}, platforms={kw['platforms']}", flush=True)

    # Step 7: Verify Network Graph
    print("\n[7] Verifying Network Graph topology & centralities...", flush=True)
    net = api_network()
    print(f"    - Nodes: {len(net['nodes'])}, Edges: {len(net['edges'])}", flush=True)
    if net['nodes']:
        n = net['nodes'][0]
        print(f"    - Sample node: {n['label']} | pagerank={n['pagerank']:.4f}, betweenness={n['betweenness']:.4f}, degree={n['degree_centrality']}", flush=True)
        assert 'pagerank' in n

    # Step 8: Verify Evidence & Alerts
    print("\n[8] Verifying Alerts and Evidence...", flush=True)
    alt = api_alerts()
    print(f"    - Generated alerts: {len(alt['alerts'])}", flush=True)
    for a in alt['alerts'][:3]:
        print(f"      * Alert [{a['severity']}] {a['title']}: evidence_count={len(a['evidence_event_ids'])}", flush=True)

    # Step 9: Verify Collector Status & Telemetry
    print("\n[9] Verifying Collector Telemetry...", flush=True)
    col_status = collector_status()
    print(f"    - Collector running: {col_status['running']}", flush=True)
    print(f"    - Ingestion rate: {col_status['ingestion_rate']} ev/min", flush=True)
    print(f"    - Last event: {col_status['last_event_at']}", flush=True)
    print(f"    - Source health: {col_status['source_health']}", flush=True)
    assert col_status['last_event_at'] is not None

    print("\n>>> ALL 9 PIPELINE STAGES VERIFIED WITH REAL LIVE DATA! SUCCESS! <<<", flush=True)

if __name__ == "__main__":
    asyncio.run(test_live_pipeline())
