from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

from app.apify_x_service import (
    ApifyXService,
    ApifyAuthenticationError,
    ApifyAPIError,
    normalize_apify_tweet,
    get_apify_x_service,
)
import app.main as main_module
from app.config import get_settings
from app.db import EventStore
from app.analytics import enrich_event
from app.schemas import SocialEventIn
from app.main import app


SAMPLE_APIFY_TWEET_1 = {
    "id": "1896543210987654321",
    "url": "https://x.com/cyberintel/status/1896543210987654321",
    "text": "Breaking: Severe vulnerability disclosed affecting critical infrastructure #infosec @CERTIn https://example.com/advisory",
    "createdAt": "Mon Sep 07 14:32:00 +0000 2026",
    "likeCount": 142,
    "retweetCount": 58,
    "replyCount": 12,
    "quoteCount": 5,
    "viewCount": 3500,
    "lang": "en",
    "author": {
        "id": "987654321",
        "userName": "cyberintel",
        "name": "Cyber Intelligence Watch",
        "description": "National infrastructure and cyber threats monitoring.",
        "profilePicture": "https://pbs.twimg.com/profile_images/1.jpg",
        "isBlueVerified": True,
        "followers": 45000,
        "following": 320,
    },
    "entities": {
        "hashtags": [{"text": "infosec"}],
        "user_mentions": [{"screen_name": "CERTIn"}],
        "urls": [{"expanded_url": "https://example.com/advisory"}],
    },
}

SAMPLE_APIFY_TWEET_2 = {
    "id": "1896543210987654322",
    "twitterUrl": "https://twitter.com/threat_radar/status/1896543210987654322",
    "full_text": "Phishing campaign observed masquerading as governmental relief portals #cyberthreat",
    "created_at": "2026-09-07T15:00:00Z",
    "favorite_count": 89,
    "retweet_count": 34,
    "user": {
        "id_str": "876543210",
        "screen_name": "threat_radar",
        "name": "Threat Radar",
        "followers_count": 12000,
    },
}


# ==============================================================================
# Scenario 1: Normalization & Query Building
# ==============================================================================
def test_normalize_apify_tweet_valid_schema():
    event = normalize_apify_tweet(SAMPLE_APIFY_TWEET_1, run_id="test_run_1")
    assert event is not None
    assert isinstance(event, SocialEventIn)
    assert event.platform == "x"
    assert event.source_event_id == "1896543210987654321"
    assert event.url == "https://x.com/cyberintel/status/1896543210987654321"
    assert "critical infrastructure" in event.text
    assert event.author_platform_id == "987654321"
    assert event.author_display == "Cyber Intelligence Watch"
    assert event.engagement["likes"] == 142
    assert event.engagement["reposts"] == 58
    assert event.engagement["views"] == 3500
    assert "infosec" in event.hashtags
    assert "certin" in event.mentions
    assert "https://example.com/advisory" in event.urls
    assert event.source_mode == "LIVE"
    assert event.connector_run_id == "test_run_1"


def test_build_query_helper():
    svc = ApifyXService(api_token="test_token")
    q = svc.build_query("terror attack", lang="en", since="2026-09-01", until="2026-09-07")
    assert "terror attack" in q
    assert "lang:en" in q
    assert "since:2026-09-01" in q
    assert "until:2026-09-07" in q


# ==============================================================================
# Scenario 2: Missing Token Validation
# ==============================================================================
@pytest.mark.anyio
async def test_missing_token_raises_authentication_error():
    svc = ApifyXService(api_token="")
    with pytest.raises(ApifyAuthenticationError) as exc_info:
        await svc.search("test query", max_results=10)
    assert "APIFY_API_TOKEN is not configured" in str(exc_info.value)


# ==============================================================================
# Scenario 3: Invalid Response / HTTP 500 from Apify
# ==============================================================================
@pytest.mark.anyio
async def test_apify_http_500_error_handling():
    svc = ApifyXService(api_token="valid_test_token")

    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.text = "Internal Server Error in Actor runtime"

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        with pytest.raises(ApifyAPIError) as exc_info:
            await svc.search("test query", max_results=10)
        assert "Apify run failed with HTTP 500" in str(exc_info.value)


# ==============================================================================
# Scenario 4: Empty Results Handling
# ==============================================================================
@pytest.mark.anyio
async def test_apify_empty_results():
    svc = ApifyXService(api_token="valid_test_token")

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = []

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        events = await svc.search("obscure keyword with no matches", max_results=10)
        assert events == []


# ==============================================================================
# Scenario 5 & 8: Database Insertion and Deduplication Idempotency
# ==============================================================================
def test_event_store_apify_x_insertion_and_deduplication(tmp_path):
    store = EventStore(tmp_path / "test_dedup.db")
    
    event1 = normalize_apify_tweet(SAMPLE_APIFY_TWEET_1, run_id="run_dedup_test")
    assert event1 is not None

    normalized, derived = enrich_event(event1)

    # First insert: must succeed
    inserted1 = store.insert(normalized, derived)
    assert inserted1 is not None
    assert store.count() == 1

    # Duplicate insert: must return None without crashing
    inserted2 = store.insert(normalized, derived)
    assert inserted2 is None
    assert store.count() == 1


# ==============================================================================
# Scenario 6: Multiple Posts Batch Normalization
# ==============================================================================
def test_multiple_posts_batch_normalization():
    raw_items = [SAMPLE_APIFY_TWEET_1, SAMPLE_APIFY_TWEET_2]
    events = [normalize_apify_tweet(item, run_id="batch_run") for item in raw_items]
    events = [e for e in events if e is not None]

    assert len(events) == 2
    assert events[0].source_event_id == "1896543210987654321"
    assert events[1].source_event_id == "1896543210987654322"
    assert events[1].author_platform_id == "876543210"
    assert events[1].author_display == "Threat Radar"
    assert events[1].engagement["likes"] == 89
    assert events[1].engagement["reposts"] == 34


# ==============================================================================
# Scenario 7: Malformed Post Skipping
# ==============================================================================
def test_malformed_posts_skipped_safely():
    malformed_items = [
        {},  # Completely empty
        {"id": ""},  # Empty ID
        {"text": "No ID here"},  # Missing ID
        {"id": "valid_id", "text": "   "},  # Empty whitespace text
        {"id": "valid_id_2"},  # Missing text
    ]
    for item in malformed_items:
        res = normalize_apify_tweet(item, run_id="malformed_test")
        assert res is None, f"Expected None for malformed item: {item}"


# ==============================================================================
# Scenario 9: POST /api/social/x/search Endpoint Contract
# ==============================================================================
def test_api_social_x_search_endpoint_mocked(monkeypatch):
    client = TestClient(app)

    event1 = normalize_apify_tweet(SAMPLE_APIFY_TWEET_1, run_id="api_run_test")
    assert event1 is not None

    mock_service = MagicMock()
    mock_service.actor_id = "apidojo/tweet-scraper"
    mock_service.is_configured = True
    mock_service.search = AsyncMock(return_value=[event1])

    monkeypatch.setattr(main_module, "get_apify_x_service", lambda: mock_service)
    monkeypatch.setattr(main_module.SETTINGS, "x_provider", "apify")

    response = client.post(
        "/api/social/x/search",
        json={
            "query": "#infosec vulnerability",
            "max_results": 10,
            "language": "en",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["provider"] == "apify"
    assert data["query"] == "#infosec vulnerability"
    assert data["posts_fetched"] == 1
    assert "posts_inserted" in data
    assert "duplicates" in data
    assert len(data["events"]) == 1
    post = data["events"][0]
    assert post["platform"] == "x"
    assert post["source_event_id"] == "1896543210987654321"


# ==============================================================================
# Scenario 10: AI Pipeline Enrichment Verification
# ==============================================================================
def test_ai_pipeline_enrichment_on_apify_x_event():
    event_in = normalize_apify_tweet(SAMPLE_APIFY_TWEET_1, run_id="ai_test_run")
    assert event_in is not None

    normalized, derived = enrich_event(event_in)
    assert derived["sentiment_label"] in {"positive", "negative", "neutral"}
    assert isinstance(derived["sentiment_score"], float)
    assert derived["stance_label"] in {"support", "oppose", "against", "neutral", "unclear"}
    assert "stance_confidence" in derived
    assert "emotion_scores" in derived
    assert "sarcasm_probability" in derived
    assert "topic_terms" in derived
