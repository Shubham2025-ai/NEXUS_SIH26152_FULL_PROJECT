from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import re
from typing import Any
from uuid import uuid4

import httpx

from .config import get_settings
from .connectors import ConnectorError
from .schemas import SocialEventIn

logger = logging.getLogger("nexus.apify_x")


class ApifyAuthenticationError(ConnectorError):
    """Raised when Apify authentication fails or token is missing."""


class ApifyAPIError(ConnectorError):
    """Raised when Apify API returns an error or fails."""


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
    query: str = "",
    run_id: str = "",
    actor_id: str = "apify/x",
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

    if not post_id or not text or post_id in {"-1", "0"} or raw.get("noResults") or raw.get("type") == "mock_tweet":
        return None

    # Resolve author info from author, user, or user_info (api-ninja format)
    author = raw.get("author") or raw.get("user") or raw.get("user_info") or {}
    if not isinstance(author, dict):
        author = {}

    username = str(
        author.get("userName")
        or author.get("username")
        or author.get("screen_name")
        or raw.get("screen_name")
        or raw.get("userName")
        or raw.get("username")
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
        or author.get("rest_id")
        or raw.get("user_id")
        or raw.get("author_id")
        or username
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
    likes = int(
        raw.get("likeCount")
        or raw.get("likes")
        or raw.get("favorite_count")
        or raw.get("favorites")
        or 0
    )
    reposts = int(
        raw.get("retweetCount")
        or raw.get("retweets")
        or raw.get("retweet_count")
        or 0
    )
    replies = int(
        raw.get("replyCount")
        or raw.get("replies")
        or raw.get("reply_count")
        or 0
    )
    quotes = int(
        raw.get("quoteCount")
        or raw.get("quotes")
        or raw.get("quote_count")
        or 0
    )
    raw_views = raw.get("viewCount") or raw.get("views") or raw.get("views_count")
    views = int(raw_views) if raw_views is not None and str(raw_views).isdigit() else None

    # Extract entities
    entities = raw.get("entities") or {}
    mentions: list[str] = []
    if isinstance(entities, dict):
        raw_mentions = entities.get("mentions") or entities.get("user_mentions") or []
        for m in raw_mentions:
            if isinstance(m, dict):
                u = m.get("username") or m.get("screen_name") or ""
                if u:
                    mentions.append(u.lstrip("@").lower())
            elif isinstance(m, str):
                mentions.append(m.lstrip("@").lower())

    hashtags: list[str] = []
    if isinstance(entities, dict):
        raw_hashtags = entities.get("hashtags") or []
        for h in raw_hashtags:
            if isinstance(h, dict):
                tag = h.get("tag") or h.get("text") or ""
                if tag:
                    hashtags.append(tag.lower().lstrip("#"))
            elif isinstance(h, str):
                hashtags.append(h.lower().lstrip("#"))

    urls: list[str] = []
    if isinstance(entities, dict):
        raw_urls = entities.get("urls") or []
        for u in raw_urls:
            if isinstance(u, dict) and (u.get("expanded_url") or u.get("url")):
                urls.append(u.get("expanded_url") or u["url"])
            elif isinstance(u, str):
                urls.append(u)

    # Fallback to regex extraction if entities list was absent or empty
    if not hashtags:
        hashtags = [t.lower() for t in re.findall(r"#(\w+)", text)]
    if not mentions:
        mentions = [m.lower() for m in re.findall(r"@(\w+)", text)]
    if not urls:
        urls = re.findall(r"https?://\S+", text)

    # Event type
    is_retweet = bool(raw.get("isRetweet") or raw.get("is_retweet") or text.startswith("RT @"))
    is_quote = bool(raw.get("isQuote") or raw.get("is_quote"))
    is_reply = bool(raw.get("isReply") or raw.get("is_reply") or raw.get("inReplyTo"))
    event_type = "repost" if is_retweet else "quote" if is_quote else "reply" if is_reply else "post"

    lang = raw.get("lang") or raw.get("language")

    avatar_url = (
        author.get("profilePicture")
        or author.get("avatar")
        or author.get("avatar_url")
        or author.get("profile_image_url")
        or raw.get("avatar")
    )
    followers = author.get("followers") or author.get("followersCount") or author.get("followers_count")

    public_profile = {
        "bio": author.get("description") or author.get("bio"),
        "region": author.get("location") or raw.get("location"),
        "avatar_url": avatar_url,
        "followers": followers,
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
        author_platform_id=author_id or username or None,
        author_display=display_name or username,
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
            "views": views,
        },
        public_profile=public_profile,
        source_mode="LIVE",
        connector_run_id=run_id,
    )


class ApifyXService:
    """Production-ready X/Twitter collector service using Apify."""

    def __init__(self, api_token: str | None = None) -> None:
        self.settings = get_settings()
        self._override_token = api_token

    @property
    def token(self) -> str:
        return (self._override_token if self._override_token is not None else self.settings.apify_api_token).strip()

    @property
    def is_configured(self) -> bool:
        return bool(self.token)

    @property
    def actor_id(self) -> str:
        return self.settings.apify_x_actor_id.strip() or "api-ninja/x-twitter-advanced-search"

    @property
    def actor_slug(self) -> str:
        return self.actor_id.replace("/", "~")

    def _validate_credentials(self) -> None:
        if not self.token:
            raise ApifyAuthenticationError(
                "APIFY_API_TOKEN is not configured. Set APIFY_API_TOKEN in your environment or .env file to enable live Apify X collection.",
                "CREDENTIALS_REQUIRED",
            )

    def build_query(
        self,
        query: str,
        lang: str | None = None,
        since: str | None = None,
        until: str | None = None,
    ) -> str:
        """Compose clean X/Twitter search query with optional filters."""
        parts = [query.strip()]
        if lang:
            parts.append(f"lang:{lang.strip()}")
        if since:
            parts.append(f"since:{since.strip()}")
        if until:
            parts.append(f"until:{until.strip()}")
        return " ".join(filter(None, parts))

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

    async def run_search(
        self,
        query: str,
        max_items: int = 20,
        lang: str | None = None,
        since: str | None = None,
        until: str | None = None,
    ) -> list[SocialEventIn]:
        """Convenience runner applying query building before search."""
        combined_query = self.build_query(query, lang=lang, since=since, until=until)
        return await self.search(combined_query, max_results=max_items, language=lang)

    async def search(
        self,
        query: str,
        max_results: int = 20,
        language: str | None = None,
    ) -> list[SocialEventIn]:
        """Collect X posts via Apify, wait for completion, and return normalized events."""
        self._validate_credentials()

        token = self.token
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
                raise ApifyAuthenticationError(
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
                raise ApifyAPIError(
                    f"Apify run failed with HTTP {response.status_code}: {response.text[:200]}",
                    "DEGRADED",
                )
            if response.status_code >= 400:
                err_detail = response.text[:400]
                raise ApifyAPIError(f"Apify API error {response.status_code}: {err_detail}", "ERROR")

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

        if not normalized:
            if items and any(isinstance(i, dict) and (i.get("noResults") or i.get("type") == "mock_tweet") for i in items):
                raise ConnectorError(
                    f"Apify Actor '{actor}' returned noResults. The actor developer restricts free plan API usage. Set APIFY_X_ACTOR_ID=api-ninja/x-twitter-advanced-search in .env.",
                    "ACTOR_ERROR",
                )
            if items:
                raise ConnectorError(
                    f"Apify Actor '{actor}' returned data but no valid posts could be normalized for query '{query}'.",
                    "MALFORMED_DATA",
                )
            return []

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
