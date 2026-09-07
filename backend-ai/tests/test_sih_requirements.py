from datetime import datetime, timezone
import pytest
from app.analytics import (
    build_network,
    demographics,
    timeline,
    top_workspace_keywords,
    _normalize_region,
    _infer_profession,
    _infer_age_bracket,
)
from app.schemas import SocialEventIn
from app.db import EventStore


def make_event(
    idx: int,
    text: str,
    author: str,
    *,
    platform: str = "x",
    parent_id: str | None = None,
    event_type: str = "post",
    bio: str = "",
    region: str = "",
    prof: str = "",
    age: str = "",
    sentiment: str = "positive",
    compound: float = 0.5,
    emotion_scores: dict | None = None,
    stance: str = "supportive",
) -> SocialEventIn:
    return SocialEventIn(
        platform=platform,
        source_event_id=f"test-{idx}",
        event_type=event_type,
        author_platform_id=f"{platform}:{author}",
        author_display=author,
        text=text,
        created_at=datetime(2026, 9, 7, 12, idx % 60, tzinfo=timezone.utc),
        parent_event_id=parent_id,
        public_profile={
            "bio": bio,
            "region": region,
            "professional_interest": prof,
            "age_bracket": age,
        },
        source_mode="LIVE",
    )


def test_demographic_signal_inference():
    # Test geography normalization and inference
    assert _normalize_region("Mumbai, Maharashtra") == "India - West"
    assert _normalize_region("New Delhi, India") == "India - North"
    assert _normalize_region("Bengaluru, KA") == "India - South"
    assert _normalize_region("Kolkata, WB") == "India - East / Central"
    assert _normalize_region("New York, USA") == "North America"

    # Test profession inference
    assert _infer_profession("Working on neural networks with Python", "software engineer", "dev_guy") == "Tech & Engineering"
    assert _infer_profession("Breaking news on water pipeline", "senior reporter at city daily", "news_anchor") == "Media & Journalism"
    assert _infer_profession("New constitutional amendment review", "legal advocate & policy researcher", "adv_patel") == "Policy & Governance"

    # Test age bracket inference
    assert _infer_age_bracket("Studying for final semester exams", "undergrad student at IIT") == "18–24 (Student / Early Career)"
    assert _infer_age_bracket("Leading the platform migration", "senior director of engineering") == "35–49 (Senior Professional)"
    assert _infer_age_bracket("Looking back at my career in civic service", "retired civil servant, veteran") == "50+ (Experienced / Senior)"


def test_demographics_aggregation_and_suppression(tmp_path):
    store = EventStore(tmp_path / "test_demo.db")
    # Insert 15 events from students in North India (satisfying k=10)
    for i in range(15):
        event_in = make_event(
            i,
            f"College campus update #{i} studying for exams in Delhi",
            f"student_{i}",
            bio="CS undergrad student at college",
            region="New Delhi",
            sentiment="neutral",
        )
        store.insert(event_in, {"sentiment_label": "neutral", "sentiment_score": 0.0})

    # Insert 3 events from a rare group (should be suppressed by k-anonymity k=10)
    for i in range(15, 18):
        event_in = make_event(
            i,
            f"Senior advisory remarks #{i}",
            f"veteran_{i}",
            bio="Retired judge, 40 years experience",
            region="Tokyo, Japan",
            sentiment="positive",
        )
        store.insert(event_in, {"sentiment_label": "positive", "sentiment_score": 0.6})

    demo = demographics(store.list_events())
    assert demo["unique_anonymized_users"] == 18
    # The North region should have count >= 10 and be public
    geo = demo["broad_geography"]
    assert "India - North" in geo["counts"]
    assert geo["counts"]["India - North"] >= 10
    # Small groups should be suppressed
    assert geo["counts"].get("Asia-Pacific & Middle East", 0) < 10
    assert "suppressed_small_groups" in geo["counts"] or geo["counts"].get("Asia-Pacific & Middle East", 0) == 0


def test_timeline_multi_dimensional_sentiment(tmp_path):
    store = EventStore(tmp_path / "test_time.db")
    for i in range(6):
        event_in = make_event(
            i * 5,
            f"River flood anxiety warning post #{i}",
            f"user_{i}",
            sentiment="negative",
            compound=-0.6,
            emotion_scores={"anxiety": 0.8, "anger": 0.2},
            stance="against",
        )
        store.insert(
            event_in,
            {
                "sentiment_label": "negative",
                "sentiment_score": -0.6,
                "emotion_scores": {"anxiety": 0.8, "anger": 0.2},
                "stance_label": "against",
            },
        )

    points = timeline(store.list_events(), minutes=30)
    assert len(points) >= 1
    p = points[0]
    assert "sentiments" in p
    assert p["sentiments"]["negative"] == 6
    assert "stances" in p
    assert p["stances"]["against"] == 6
    assert "emotions" in p
    assert p["emotions"].get("anxiety", 0) > 0
    assert "avg_sentiment" in p
    assert p["avg_sentiment"] < 0


def test_network_repost_and_temporal_propagation(tmp_path):
    store = EventStore(tmp_path / "test_net.db")
    # Event 1: Seed post by Alice
    e1 = make_event(1, "Original investigation report", "alice")
    row1 = store.insert(e1, {"sentiment_label": "positive", "sentiment_score": 0.5})

    # Event 2: Repost / quote by Bob
    e2 = make_event(
        2,
        "RT @alice: Original investigation report",
        "bob",
        parent_id=row1.source_event_id,
        event_type="repost",
    )
    store.insert(e2, {"sentiment_label": "positive", "sentiment_score": 0.5})

    net = build_network(store.list_events())
    assert net["summary"]["nodes"] >= 2
    repost_edge = next((e for e in net["edges"] if "repost" in e["types"]), None)
    assert repost_edge is not None

    # Check that communities detail and temporal propagation exist
    assert "communities_detail" in net
    assert "temporal_propagation" in net
    assert len(net["temporal_propagation"]) >= 1


def test_trending_keywords_extraction(tmp_path):
    store = EventStore(tmp_path / "test_kw.db")
    for i in range(10):
        e = make_event(
            i,
            f"Critical flood alert for #RiverLinkUpdate and infrastructure #{i}",
            f"reporter_{i}",
        )
        store.insert(e, {"hashtags": ["riverlinkupdate"], "topic_terms": ["infrastructure", "flood"]})

    keywords = top_workspace_keywords(store.list_events(), top_n=5)
    terms = [k["term"] for k in keywords]
    assert any("riverlinkupdate" in t for t in terms)
