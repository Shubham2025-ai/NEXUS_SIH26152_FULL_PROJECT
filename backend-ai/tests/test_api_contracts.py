from __future__ import annotations

from fastapi.testclient import TestClient

import app.main as main_module
from app.main import app


client = TestClient(app)


def test_health_and_connector_contracts_load_without_credentials():
    health = client.get('/health')
    assert health.status_code == 200
    assert health.json()['version'] == '0.4.0'

    response = client.get('/api/connectors/status')
    assert response.status_code == 200
    connectors = {item['platform']: item for item in response.json()['connectors']}
    for platform in {'x', 'telegram', 'instagram', 'youtube', 'bluesky', 'reddit', 'mastodon', 'replay'}:
        assert platform in connectors
    assert connectors['telegram']['state'] == 'READY'
    assert connectors['bluesky']['state'] == 'READY'


def test_public_connector_validation_fails_cleanly_before_network():
    response = client.post('/api/connectors/telegram/public', json={'channel': '***', 'limit': 10})
    assert response.status_code in {400, 422, 503}

    response = client.post('/api/connectors/x/public', json={'query': '', 'target': '', 'limit': 10})
    assert response.status_code == 400


def test_fresh_workspace_search_clears_previous_topic_without_network_calls(monkeypatch):
    seeded = client.post('/api/demo/seed', json={'reset': True})
    assert seeded.status_code == 200
    assert seeded.json()['total_events'] > 0

    seen: dict[str, object] = {}

    async def fake_telegram_public_channel(channel: str, limit: int):
        seen['channel'] = channel
        seen['limit'] = limit
        return []

    async def fake_telegram_poll(max_updates: int = 50):
        return []

    async def fake_x_search(request):
        seen['x_query'] = request.query
        return []

    # Fresh Search now intentionally includes the configured/default Telegram
    # monitored channel, X search, and configured bot poll. Stub them so this contract test remains deterministic and
    # makes zero external network calls while verifying the automatic source path.
    monkeypatch.setattr(main_module, 'telegram_public_channel', fake_telegram_public_channel)
    monkeypatch.setattr(main_module, 'telegram_poll', fake_telegram_poll)
    monkeypatch.setattr(main_module, 'x_search', fake_x_search)

    fresh = client.post(
        '/api/search/workspace',
        json={
            'query': 'brand new isolated topic',
            'reset': True,
            'limit_per_source': 5,
            'enable_youtube': False,
            'enable_bluesky': False,
            'enable_reddit': False,
            'enable_mastodon': False,
        },
    )
    assert fresh.status_code == 200
    body = fresh.json()
    assert body['query'] == 'brand new isolated topic'
    assert body['reset'] is True
    assert body['total_events'] == 0
    assert body['sources']['telegram']['state'] == 'OK'
    assert body['sources']['telegram']['received'] == 0
    assert seen['limit'] == 5
    assert str(seen['channel']).endswith('||brand new isolated topic')

    overview = client.get('/api/overview')
    assert overview.status_code == 200
    assert overview.json()['total_events'] == 0


def test_workspace_search_enable_telegram_toggle_and_x_url(monkeypatch):
    seen_x: dict[str, object] = {}

    async def fake_x_public_bridge(query: str, target: str, limit: int):
        seen_x['query'] = query
        return []

    monkeypatch.setattr(main_module, 'x_public_bridge', fake_x_public_bridge)

    res = client.post(
        '/api/search/workspace',
        json={
            'query': 'https://x.com/user/status/123456789',
            'reset': True,
            'limit_per_source': 5,
            'enable_telegram': False,
            'enable_x': True,
            'enable_youtube': False,
            'enable_bluesky': False,
            'enable_reddit': False,
            'enable_mastodon': False,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert 'telegram' not in data['sources']
    assert data['sources']['x']['state'] == 'OK'
    assert seen_x['query'] == 'https://x.com/user/status/123456789'

