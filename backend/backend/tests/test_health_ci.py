"""Phase 33 — health probes for CI (livez / healthz / readyz with locmem)."""

from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings


@override_settings(SECURE_SSL_REDIRECT=False)
class Phase33HealthCiTests(TestCase):
    def test_livez_200_without_redis(self):
        r = self.client.get('/api/livez/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json().get('status'), 'ok')

    def test_healthz_and_readyz_ok_with_db(self):
        for path in ('/api/healthz/', '/api/readyz/'):
            with self.subTest(path=path):
                r = self.client.get(path)
                self.assertEqual(r.status_code, 200)
                body = r.json()
                self.assertEqual(body['status'], 'ok')
                self.assertEqual(body['db'], 'ok')

    @override_settings(HEALTHZ_REQUIRE_REDIS=False, USE_LOCMEM_CACHE=True)
    def test_readyz_200_when_redis_optional(self):
        with patch('backend.health.cache') as c:
            c.set.side_effect = RuntimeError('redis down')
            r = self.client.get('/api/readyz/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['db'], 'ok')
        self.assertEqual(r.json()['redis'], 'error')

    @override_settings(HEALTHZ_REQUIRE_REDIS=True)
    def test_readyz_503_when_redis_required(self):
        with patch('backend.health.cache') as c:
            c.set.side_effect = RuntimeError('redis down')
            r = self.client.get('/api/readyz/')
        self.assertEqual(r.status_code, 503)
        self.assertEqual(r.json()['status'], 'degraded')
