import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / "backend-ai"))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# 1. Reset and seed
client.post("/api/demo/seed", json={"reset": True})

# 2. Collect all data
health = client.get("/health").json()
connectors = client.get("/api/connectors/status").json()
overview = client.get("/api/overview").json()
timeline = client.get("/api/timeline?minutes=15").json()
narratives = client.get("/api/narratives").json()
network = client.get("/api/network").json()
demographics = client.get("/api/demographics").json()
alerts = client.get("/api/alerts").json()
events = client.get("/api/events?limit=500&newest_first=true").json()
collector = client.get("/api/collector/status").json()

narrative_details = {}
for n in narratives.get("narratives", []):
    nid = n["id"]
    det = client.get(f"/api/narratives/{nid}").json()
    narrative_details[nid] = det

combined = {
    "health": health,
    "connectors": connectors,
    "overview": overview,
    "timeline": timeline,
    "narratives": narratives,
    "narrativeDetails": narrative_details,
    "network": network,
    "demographics": demographics,
    "alerts": alerts,
    "events": events,
    "collector": collector,
}

out_file = root / "frontend" / "src" / "demoData.json"
with open(out_file, "w", encoding="utf-8") as f:
    json.dump(combined, f, indent=2, ensure_ascii=False)

print(f"[PASS] Successfully exported comprehensive demo dataset to {out_file}")
