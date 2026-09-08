from __future__ import annotations

from datetime import datetime, timedelta, timezone
import pytest

from app.analytics import (
    build_network,
    demographics,
    infer_text,
    timeline,
    trend_metrics,
)
from app.db import EventStore
from app.schemas import SocialEventIn, WorkspaceSearchRequest


def test_multilingual_sentiment_hindi_and_marathi():
    # 1. Hindi Devanagari positive
    hi_pos = infer_text("इस परियोजना के लिए हमारा पूरा समर्थन है और विकास शानदार है।")
    assert hi_pos["sentiment_label"] == "positive"
    assert hi_pos["stance_label"] == "supportive"
    assert hi_pos["inference_method"] == "contextual-multilingual-v2"

    # 2. Hindi Devanagari negative with anger & anxiety
    hi_neg = infer_text("यह बहुत बड़ा घोटाला है, जनता में भारी गुस्सा और चिंता है।")
    assert hi_neg["sentiment_label"] == "negative"
    assert hi_neg["stance_label"] == "against"
    assert hi_neg["emotion_scores"].get("anger", 0) > 0 or hi_neg["emotion_scores"].get("anxiety", 0) > 0

    # 3. Marathi Devanagari
    mr_test = infer_text("प्रकल्पाचे स्वागत आहे, अतिशय चांगले काम केले.")
    assert mr_test["sentiment_label"] == "positive"
    assert mr_test["stance_label"] == "supportive"

    # 4. Hinglish positive & negative
    hinglish_pos = infer_text("Ye step bohot accha hai, full samarthan hamari taraf se!")
    assert hinglish_pos["sentiment_label"] == "positive"
    assert hinglish_pos["stance_label"] == "supportive"

    hinglish_neg = infer_text("Ye total dhokha aur bakwas hai, pure virodh me hain hum!")
    assert hinglish_neg["sentiment_label"] == "negative"
    assert hinglish_neg["stance_label"] == "against"

    # 5. Hinglish sarcasm marker
    sarcasm_test = infer_text("Wah kya baat hai, bridge toot gaya aur bol rahe hain sab theek hai!")
    assert sarcasm_test["sarcasm_probability"] >= 0.40


def test_dynamic_demographics_limited_sample_preserves_coarse_distribution(tmp_path):
    store = EventStore(tmp_path / "test_limited.db")
    now = datetime.now(timezone.utc)

    # Insert 3 events from distinct users (sample size < k=10)
    for i in range(3):
        ev = SocialEventIn(
            platform="telegram",
            source_event_id=f"tg-{i}",
            text=f"Live discussion message #{i} in Mumbai group",
            author_display=f"user_{i}",
            created_at=now + timedelta(minutes=i),
            source_mode="LIVE",
            public_profile={"region": "Mumbai, Maharashtra", "professional_interest": "software engineering"},
        )
        store.insert(ev, {"sentiment_label": "neutral", "sentiment_score": 0.0})

    demo = demographics(store.list_events())
    assert demo["unique_anonymized_users"] == 3
    assert demo["sample_status"] == "limited_sample"
    assert demo["effective_k"] == 1

    # Under dynamic k-anonymity with small sample, counts should show coarse distribution, not zeroed/suppressed
    geo = demo["broad_geography"]
    assert geo["status"] == "limited_sample"
    assert geo["effective_k"] == 1
    assert "India - West" in geo["counts"]
    assert geo["counts"]["India - West"] == 3
    assert "warning" in geo


def test_timeline_platform_and_date_filtering(tmp_path):
    store = EventStore(tmp_path / "test_timeline_filter.db")
    base = datetime(2026, 9, 8, 10, 0, tzinfo=timezone.utc)

    # Event 1: Telegram at 10:00
    e1 = SocialEventIn(
        platform="telegram",
        source_event_id="t1",
        text="Telegram update 1",
        created_at=base,
        source_mode="LIVE",
    )
    store.insert(e1, {"sentiment_label": "positive", "sentiment_score": 0.5})

    # Event 2: YouTube at 11:00
    e2 = SocialEventIn(
        platform="youtube",
        source_event_id="y1",
        text="YouTube video 1",
        created_at=base + timedelta(hours=1),
        source_mode="LIVE",
    )
    store.insert(e2, {"sentiment_label": "neutral", "sentiment_score": 0.0})

    # Event 3: Telegram at 12:00
    e3 = SocialEventIn(
        platform="telegram",
        source_event_id="t2",
        text="Telegram update 2",
        created_at=base + timedelta(hours=2),
        source_mode="LIVE",
    )
    store.insert(e3, {"sentiment_label": "negative", "sentiment_score": -0.6})

    # Filter by platform = telegram
    tg_events = store.list_events(platform="telegram")
    assert len(tg_events) == 2
    assert all(e.platform == "telegram" for e in tg_events)

    # Filter by date range: 10:30 to 12:30
    window_events = store.list_events(
        since=base + timedelta(minutes=30),
        until=base + timedelta(hours=3),
    )
    assert len(window_events) == 2
    event_ids = {e.source_event_id for e in window_events}
    assert "y1" in event_ids
    assert "t2" in event_ids


def test_network_analysis_handles_edge_cases(tmp_path):
    store = EventStore(tmp_path / "test_net_edge.db")
    now = datetime.now(timezone.utc)

    # Case 1: Empty event list
    empty_net = build_network([])
    assert empty_net["summary"]["nodes"] == 0
    assert empty_net["summary"]["edges"] == 0

    # Case 2: Exactly 1 single node (no edges)
    e1 = SocialEventIn(
        platform="x",
        source_event_id="solo-1",
        text="Single post without any replies or mentions",
        author_display="lone_wolf",
        created_at=now,
        source_mode="LIVE",
    )
    store.insert(e1, {"sentiment_label": "neutral", "sentiment_score": 0.0})
    single_net = build_network(store.list_events())
    assert single_net["summary"]["nodes"] == 1
    assert single_net["summary"]["edges"] == 0
    assert len(single_net["nodes"]) == 1
    assert single_net["nodes"][0]["role"] in {"Participant", "High Reach Node", "Bridge Node"}

    # Case 3: Empty all_events in trend_metrics
    events = store.list_events()
    metrics = trend_metrics(events, [])
    assert "score" in metrics
    assert "status" in metrics


def test_workspace_search_default_non_destructive():
    req = WorkspaceSearchRequest(query="flood disaster")
    assert req.reset is False
