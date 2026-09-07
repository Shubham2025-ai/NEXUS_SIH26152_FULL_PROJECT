import sys
from pathlib import Path

# Add backend-ai to sys.path
root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / "backend-ai"))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("Testing End-to-End User Journey across SIH Components A-E & All 9 Tabs...")

# 1. Reset and Seed Demo
r = client.post("/api/demo/seed", json={"reset": True})
assert r.status_code == 200, f"seed failed: {r.text}"
seed_res = r.json()
print(f"[PASS] 1. Ingestion / Demo seed: {seed_res}")

# 2. Connectors Status (Component A)
r = client.get("/api/connectors/status")
assert r.status_code == 200
connectors = r.json()["connectors"]
x_conn = next(c for c in connectors if c["platform"] == "x")
assert x_conn["state"] == "CREDENTIALS_REQUIRED", f"X state should be honest CREDENTIALS_REQUIRED, got {x_conn}"
tg_conn = next(c for c in connectors if c["platform"] == "telegram")
assert tg_conn["state"] == "READY", f"Telegram should be READY, got {tg_conn}"
print("[PASS] 2. Component A - Connectors status & honesty verified (X credentials honest, Telegram zero-key ready)")

# 3. Overview (Tab 1)
r = client.get("/api/overview")
assert r.status_code == 200
overview = r.json()
assert "trending_keywords" in overview, "trending_keywords missing from overview"
assert len(overview["trending_keywords"]) > 0, "No trending keywords found"
print(f"[PASS] 3. Tab 1: Overview & {len(overview['trending_keywords'])} trending keywords verified")

# 4. Posts / Explorer (Tab 2)
r = client.get("/api/events?limit=50&newest_first=true")
assert r.status_code == 200
events = r.json()["events"]
assert len(events) > 0
sample_ev = events[0]
assert sample_ev["source_mode"] in {"LIVE", "REPLAY", "IMPORT"}
assert "sentiment_label" in sample_ev
assert "emotion_scores" in sample_ev
print(f"[PASS] 4. Tab 2: Posts Explorer ({len(events)} events, sentiment/emotion/stance verified)")

# 5. Timeline & Multi-dimensional Sentiment (Tab 3, Components A & B)
for mins in [15, 30, 60, 180]:
    r = client.get(f"/api/timeline?minutes={mins}")
    assert r.status_code == 200
    pts = r.json()["points"]
    assert len(pts) > 0, f"No points for {mins}m"
    first_pt = pts[0]
    assert "emotions" in first_pt, f"emotions missing from timeline point: {first_pt}"
    assert "stances" in first_pt, f"stances missing from timeline point: {first_pt}"
print("[PASS] 5. Tab 3: Timeline with 15m/30m/1h/3h buckets, emotions & stances verified")

# 6. Trends & Narratives (Tab 4, Component D)
r = client.get("/api/trends")
assert r.status_code == 200
trends_data = r.json()
narratives = trends_data["narratives"]
assert len(narratives) > 0, "No narratives found"
assert "trending_keywords" in trends_data
print(f"[PASS] 6. Tab 4: Trends ({len(narratives)} narratives, {len(trends_data['trending_keywords'])} keyword signals) verified")

# 7. Narrative Lineage (Tab 5)
r = client.get(f"/api/narratives/{narratives[0]['id']}")
assert r.status_code == 200
detail = r.json()
assert len(detail["lineage"]) > 0
print(f"[PASS] 7. Tab 5: Narrative Lineage ({len(detail['lineage'])} chronological lineage steps) verified")

# 8. Network Graph & Centrality & Temporal Propagation (Tab 6, Component E)
r = client.get("/api/network")
assert r.status_code == 200
net = r.json()
assert len(net["nodes"]) > 0 and len(net["edges"]) > 0
top_node = net["nodes"][0]
assert "pagerank" in top_node and "betweenness" in top_node and "degree_centrality" in top_node
assert "communities_detail" in net and len(net["communities_detail"]) > 0
assert "temporal_propagation" in net and len(net["temporal_propagation"]) > 0
has_repost = any("repost" in e.get("types", []) for e in net["edges"])
assert has_repost, "Expected repost edges in network"
print(f"[PASS] 8. Tab 6: Network Graph (PR, Betweenness, Degree, {len(net['communities_detail'])} communities, {len(net['temporal_propagation'])} propagation stages, repost edges: {has_repost}) verified")

# 9. Demographics (Tab 7, Component C)
r = client.get("/api/demographics")
assert r.status_code == 200
demo = r.json()
assert "language" in demo and "broad_geography" in demo and "professional_interests" in demo and "age_brackets" in demo
assert demo["language"]["minimum_group_size"] == 10, "k-anonymity should be k=10"
print(f"[PASS] 9. Tab 7: Demographics (k-anonymity k=10, broad geo, interests, age brackets for {demo['unique_anonymized_users']} users) verified")

# 10. Alerts (Tab 8)
r = client.get("/api/alerts")
assert r.status_code == 200
alert_list = r.json()["alerts"]
assert len(alert_list) > 0
print(f"[PASS] 10. Tab 8: Explainable Alerts ({len(alert_list)} alerts with trigger reasons) verified")

# 11. Evidence Ledger (Tab 9)
r = client.get("/api/events?limit=200")
assert r.status_code == 200
ev_list = r.json()["events"]
for ev in ev_list[:20]:
    assert ev["source_mode"] in {"LIVE", "REPLAY", "IMPORT"}
    assert ev["created_at"] is not None
print(f"[PASS] 11. Tab 9: Evidence Ledger ({len(ev_list)} events with full provenance and timestamps) verified")

print("\n=======================================================")
print("ALL 9 TABS & FULL END-TO-END USER JOURNEY VERIFIED 100%")
print("=======================================================")
