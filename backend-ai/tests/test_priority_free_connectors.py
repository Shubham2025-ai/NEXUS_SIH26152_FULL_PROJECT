from datetime import datetime, timezone

from app.priority_free_connectors import _extract_x_urls, _matches_query, _parse_channel_spec
from app.schemas import SocialEventIn, WorkspaceSearchRequest


def event(text: str) -> SocialEventIn:
    return SocialEventIn(
        platform="telegram",
        source_event_id="test:1",
        event_type="public_channel_post",
        author_display="Demo Channel",
        text=text,
        created_at=datetime(2026, 9, 7, 6, 0, tzinfo=timezone.utc),
        source_mode="LIVE",
    )


def test_telegram_channel_spec_supports_multiple_channels_and_query():
    channels, query = _parse_channel_spec("channel_one,@channel_two;channel_three||AI regulation India")
    assert channels == ["channel_one", "channel_two", "channel_three"]
    assert query == "AI regulation India"


def test_monitored_telegram_posts_are_filtered_by_active_query():
    assert _matches_query(event("Breaking update about AI regulation in India"), "AI regulation")
    assert not _matches_query(event("Weekend cricket match result"), "AI regulation")
    assert _matches_query(event("Follow #RiverLinkUpdate for verified information"), "#RiverLinkUpdate")
    # Word-boundary check: "painful" contains "ai", but must NOT match query "AI"
    assert not _matches_query(event("Gram Wallet avoids painful migrations."), "AI")
    # Multi-term precision: Post about AI in Kazakhstan must NOT match "AI India"
    assert not _matches_query(event("Olympiad in AI finished in Astana, Kazakhstan."), "AI India")
    # Genuine match: mentions both AI and India
    assert _matches_query(event("The National AI Mission in India announces new funding."), "AI India")
    # Numeric false positive guard: standalone year 2026 cannot match multi-term topic query without topic keywords
    assert not _matches_query(event("Prizes awarded for the 2026 Olympiad in Informatics."), "TCS NQT 2026")


def test_workspace_explicit_telegram_target_is_bound_to_query():
    request = WorkspaceSearchRequest(
        query="RiverLink",
        telegram_channel="my_public_channel",
        enable_youtube=False,
        enable_bluesky=False,
        enable_reddit=False,
        enable_mastodon=False,
    )
    assert request.telegram_channel == "my_public_channel||RiverLink"


def test_workspace_defaults_to_configured_telegram_channel():
    request = WorkspaceSearchRequest(
        query="RiverLink",
        telegram_channel=None,
        enable_youtube=False,
        enable_bluesky=False,
        enable_reddit=False,
        enable_mastodon=False,
    )
    assert request.telegram_channel in {
        "telegram,durov||RiverLink",
        "NexusSIHDemo||RiverLink",
        "telegram,durov,NexusSIHDemo||RiverLink",
    } or (request.telegram_channel and request.telegram_channel.endswith("||RiverLink"))


def test_x_public_post_urls_are_detected_without_accepting_random_urls():
    value = "https://x.com/example/status/1234567890 https://twitter.com/other/status/987654321"
    assert _extract_x_urls(value) == [
        "https://x.com/example/status/1234567890",
        "https://twitter.com/other/status/987654321",
    ]
    assert _extract_x_urls("https://example.com/post/123") == []
