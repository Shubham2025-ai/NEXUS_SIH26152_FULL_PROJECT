from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any
from uuid import uuid4

import httpx

from .config import get_settings
from .connectors import ConnectorError
from .schemas import SocialEventIn

logger = logging.getLogger("nexus.apify_x")


def _parse_tweet_datetime(value: Any) -> datetime:
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=timezone.utc)
    if isinstance(value, str):
        clean = value.strip()
        if not clean:
            return datetime.now(timezone.utc)
        # Try ISO 8601 first
        try:
            dt = datetime.fromisoformat(clean.replace("Z", "+00:00"))
            return dt.astimezone(timezone.utc) if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            pass
        # Try RFC 2822 / Twitter date format: "Fri Nov 24 17:49:36 +0000 2023"
        try:
            dt = parsedate_to_datetime(clean)
            return dt.astimezone(timezone.utc) if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            pass
        for fmt in (
            "%a %b %d %H:%M:%S %z %Y",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
        ):
            try:
                dt = datetime.strptime(clean, fmt)
                return dt.astimezone(timezone.utc) if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
            except (ValueError, TypeError):
                continue
    return datetime.now(timezone.utc)


def normalize_apify_tweet(
    raw: dict[str, Any],
    query: str,
    run_id: str,
    actor_id: str,
) -> SocialEventIn | None:
    """Normalize raw tweet data from Apify actors into canonical SocialEventIn.

    Supports apidojo/tweet-scraper, kaitoeasyapi/twitter-x-data-tweet-scraper,
    danek/twitter-scraper, and other common Twitter scraping actors.
    """
    if not isinstance(raw, dict):
        return None

    # Resolve post id
    post_id = str(
        raw.get("id")
        or raw.get("id_str")
        or raw.get("tweet_id")
        or raw.get("rest_id")
        or raw.get("tweetId")
        or ""
    ).strip()

    # Resolve text
    text = str(
        raw.get("text")
        or raw.get("full_text")
        or raw.get("fullText")
        or raw.get("tweet_text")
        or ""
    ).strip()

    if not post_id or not text:
        return None

    # Resolve author info
    author = raw.get("author") or raw.get("user") or {}
    if not isinstance(author, dict):
        author = {}

    username = str(
        author.get("userName")
        or author.get("username")
        or author.get("screen_name")
        or raw.get("userName")
        or raw.get("username")
        or raw.get("screen_name")
        or ""
    ).strip().lstrip("@")

    display_name = str(
        author.get("name")
        or author.get("userFullName")
        or raw.get("name")
        or username
        or "Anonymous"
    ).strip()

    author_id = str(
        author.get("id")
        or author.get("id_str")
        or raw.get("user_id")
        or raw.get("author_id")
        or ""
    ).strip()

    # Resolve url
    url = (
        raw.get("url")
        or raw.get("twitterUrl")
        or (f"https://x.com/{username}/status/{post_id}" if username else f"https://x.com/i/web/status/{post_id}")
    )

    created_at = _parse_tweet_datetime(
        raw.get("createdAt")
        or raw.get("created_at")
        or raw.get("timestamp")
        or raw.get("date")
    )

    # Resolve engagement
    likes = int(raw.get("likeCount") or raw.get("likes") or raw.get("favorite_count") or 0)
    reposts = int(raw.get("retweetCount") or raw.get("retweets") or 0)
    replies = int(raw.get("replyCount") or raw.get("replies") or 0)
    quotes = int(raw.get("quoteCount") or raw.get("quotes") or 0)
    views = raw.get("viewCount") or raw.get("views")

    # Extract entities
    entities = raw.get("entities") or {}
    mentions: list[str] = []
    if isinstance(entities, dict) and "mentions" in entities:
        for m in entities.get("mentions", []):
            if isinstance(m, dict) and m.get("username"):
                mentions.append(m["username"].lstrip("@"))
            elif isinstance(m, str):
                mentions.append(m.lstrip("@"))

    hashtags: list[str] = []
    if isinstance(entities, dict) and "hashtags" in entities:
        for h in entities.get("hashtags", []):
            if isinstance(h, dict) and h.get("tag"):
                hashtags.append(h["tag"].lower().lstrip("#"))
            elif isinstance(h, str):
                hashtags.append(h.lower().lstrip("#"))

    urls: list[str] = []
    if isinstance(entities, dict) and "urls" in entities:
        for u in entities.get("urls", []):
            if isinstance(u, dict) and (u.get("expanded_url") or u.get("url")):
                urls.append(u.get("expanded_url") or u["url"])
            elif isinstance(u, str):
                urls.append(u)

    # Event type
    is_retweet = bool(raw.get("isRetweet") or raw.get("is_retweet") or text.startswith("RT @"))
    is_quote = bool(raw.get("isQuote") or raw.get("is_quote"))
    is_reply = bool(raw.get("isReply") or raw.get("is_reply") or raw.get("inReplyTo"))
    event_type = "repost" if is_retweet else "quote" if is_quote else "reply" if is_reply else "post"

    lang = raw.get("lang") or raw.get("language")

    public_profile = {
        "bio": author.get("description") or author.get("bio"),
        "region": author.get("location"),
        "avatar_url": author.get("profilePicture") or author.get("avatar_url") or author.get("profile_image_url"),
        "followers": author.get("followers") or author.get("followersCount"),
        "verified": bool(author.get("isVerified") or author.get("isBlueVerified") or author.get("verified")),
        "connector": "apify_x",
        "provider": "apify",
        "actor_id": actor_id,
        "search_query": query,
    }

    return SocialEventIn(
        platform="x",
        source_event_id=post_id,
        event_type=event_type,
        author_platform_id=author_id or None,
        author_display=username or display_name,
        text=text,
        language=str(lang) if lang else None,
        created_at=created_at,
        url=str(url),
        conversation_id=str(raw.get("conversationId") or raw.get("conversation_id") or ""),
        mentions=mentions,
        hashtags=hashtags,
        urls=urls,
        engagement={
            "likes": likes,
            "reposts": reposts,
            "replies": replies,
            "quotes": quotes,
            "views": int(views) if views is not None else None,
        },
        public_profile=public_profile,
        source_mode="LIVE",
        connector_run_id=run_id,
    )


class ApifyXService:
    """Production-ready X/Twitter collector service using Apify."""

    def __init__(self) -> None:
        self.settings = get_settings()

    @property
    def actor_id(self) -> str:
        return self.settings.apify_x_actor_id.strip() or "apidojo/tweet-scraper"

    @property
    def actor_slug(self) -> str:
        return self.actor_id.replace("/", "~")

    def _validate_credentials(self) -> None:
        token = self.settings.apify_api_token.strip()
        if not token:
            raise ConnectorError(
                "APIFY_API_TOKEN is not configured. Set APIFY_API_TOKEN in your environment or .env file to enable live Apify X collection.",
                "CREDENTIALS_REQUIRED",
            )

    def build_actor_input(
        self,
        query: str,
        max_results: int = 20,
        language: str | None = None,
    ) -> dict[str, Any]:
        """Build actor input payload with cross-actor compatibility."""
        clean_query = query.strip()
        limit = max(1, min(max_results, self.settings.apify_max_items_per_run, 100))

        payload: dict[str, Any] = {
            "searchTerms": [clean_query],
            "queries": [clean_query],
            "query": clean_query,
            "maxItems": limit,
            "maxTweets": limit,
            "max_results": limit,
            "sort": "Latest",
        }
        if language:
            payload["tweetLanguage"] = language
            payload["lang"] = language
        return payload

    async def search(
        self,
        query: str,
        max_results: int = 20,
        language: str | None = None,
    ) -> list[SocialEventIn]:
        """Collect X posts via Apify, wait for completion, and return normalized events."""
        self._validate_credentials()

        token = self.settings.apify_api_token.strip()
        actor = self.actor_id
        actor_slug = self.actor_slug
        limit = max(1, min(max_results, self.settings.apify_max_items_per_run, 100))
        timeout = max(15, self.settings.apify_timeout_seconds)

        # Safe operational logging (never log token)
        logger.info(
            "Apify X ingestion started | Provider: Apify | Actor: %s | Query: %s | Requested: %d",
            actor,
            query,
            limit,
        )

        input_data = self.build_actor_input(query, limit, language)
        run_id = f"apify-x-{uuid4().hex[:10]}"

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        # Attempt: Direct sync endpoint (runs actor and returns dataset items)
        sync_url = f"https://api.apify.com/v2/acts/{actor_slug}/run-sync-get-dataset-items"
        params = {"timeout": min(timeout, 120)}

        items: list[dict[str, Any]] = []

        async with httpx.AsyncClient(timeout=timeout + 15) as client:
            try:
                response = await client.post(
                    sync_url,
                    json=input_data,
                    headers=headers,
                    params=params,
                )
            except httpx.TimeoutException as exc:
                logger.error("Apify synchronous call timed out after %d seconds: %s", timeout, exc)
                raise ConnectorError(
                    f"Apify X Collector timed out after {timeout} seconds. Try requesting fewer posts or try again later.",
                    "DEGRADED",
                ) from exc
            except httpx.RequestError as exc:
                logger.error("Apify network request failed: %s", exc)
                raise ConnectorError(f"Network failure connecting to Apify: {exc}", "DEGRADED") from exc

            # Handle HTTP errors
            if response.status_code == 401:
                raise ConnectorError(
                    "Invalid or expired APIFY_API_TOKEN. Verify your token in Apify Console.",
                    "CREDENTIALS_REQUIRED",
                )
            if response.status_code == 404:
                raise ConnectorError(
                    f"Apify Actor '{actor}' was not found. Verify APIFY_X_ACTOR_ID in your configuration.",
                    "ERROR",
                )
            if response.status_code == 429:
                raise ConnectorError(
                    "Apify rate limit reached. Please wait before retrying.",
                    "RATE_LIMITED",
                )
            if response.status_code in {402, 403}:
                raise ConnectorError(
                    f"Apify rejected request ({response.status_code}). Check your account balance, usage limits, or permissions.",
                    "NO_CREDITS" if response.status_code == 402 else "PERMISSION_REQUIRED",
                )
            if response.status_code >= 500:
                raise ConnectorError(
                    f"Apify service temporarily unavailable ({response.status_code}).",
                    "DEGRADED",
                )
            if response.status_code >= 400:
                err_detail = response.text[:400]
                raise ConnectorError(f"Apify API error {response.status_code}: {err_detail}", "ERROR")

            # Parse dataset items
            try:
                data = response.json()
                if isinstance(data, list):
                    items = data
                elif isinstance(data, dict):
                    if "items" in data and isinstance(data["items"], list):
                        items = data["items"]
                    elif "data" in data and isinstance(data["data"], list):
                        items = data["data"]
                    elif "defaultDatasetId" in data:
                        dataset_id = data["defaultDatasetId"]
                        dataset_url = f"https://api.apify.com/v2/datasets/{dataset_id}/items"
                        ds_res = await client.get(dataset_url, headers=headers, params={"clean": "true", "format": "json"})
                        if ds_res.status_code == 200 and isinstance(ds_res.json(), list):
                            items = ds_res.json()
            except Exception as exc:
                logger.warning("Error parsing Apify JSON response: %s", exc)
                items = []

        logger.info(
            "Apify X run finished | Actor: %s | Fetched: %d raw items",
            actor,
            len(items),
        )

        # Normalize items
        normalized: list[SocialEventIn] = []
        for raw_item in items:
            event = normalize_apify_tweet(raw_item, query, run_id, actor)
            if event is not None:
                normalized.append(event)
                if len(normalized) >= limit:
                    break

        logger.info(
            "Apify X normalization complete | Valid posts: %d / %d",
            len(normalized),
            len(items),
        )

        return normalized


_APIFY_X_SERVICE: ApifyXService | None = None


def get_apify_x_service() -> ApifyXService:
    global _APIFY_X_SERVICE
    if _APIFY_X_SERVICE is None:
        _APIFY_X_SERVICE = ApifyXService()
    return _APIFY_X_SERVICE
