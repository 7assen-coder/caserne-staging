"""Phase 25 — livez / readyz / healthz probes."""

from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings


class Phase25HealthTests(TestCase):
    def test_livez_ok_without_deps(self):
        r = self.client.get('/api/livez/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {'status': 'ok'})

    def test_readyz_and_healthz_ok(self):
        for path in ('/api/readyz/', '/api/healthz/'):
            with self.subTest(path=path):
                r = self.client.get(path)
                self.assertEqual(r.status_code, 200)
                body = r.json()
                self.assertEqual(body['status'], 'ok')
                self.assertEqual(body['db'], 'ok')
                self.assertIn(body['redis'], ('ok', 'error'))

    def test_readyz_503_when_db_fails(self):
        with patch('backend.health.connection') as conn:
            cursor = MagicMock()
            cursor.__enter__ = MagicMock(return_value=cursor)
            cursor.__exit__ = MagicMock(return_value=False)
            cursor.execute.side_effect = RuntimeError('db down')
            conn.cursor.return_value = cursor
            r = self.client.get('/api/readyz/')
        self.assertEqual(r.status_code, 503)
        self.assertEqual(r.json()['db'], 'error')
        self.assertEqual(r.json()['status'], 'degraded')

    @override_settings(HEALTHZ_REQUIRE_REDIS=True)
    def test_readyz_503_when_redis_required_and_broken(self):
        with patch('backend.health.cache') as c:
            c.set.side_effect = RuntimeError('redis down')
            r = self.client.get('/api/readyz/')
        self.assertEqual(r.status_code, 503)
        self.assertEqual(r.json()['redis'], 'error')

    @override_settings(HEALTHZ_REQUIRE_REDIS=False)
    def test_readyz_200_when_redis_optional_and_broken(self):
        with patch('backend.health.cache') as c:
            c.set.side_effect = RuntimeError('redis down')
            r = self.client.get('/api/readyz/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['redis'], 'error')
        self.assertEqual(r.json()['db'], 'ok')

    @override_settings(USE_S3_MEDIA=True, HEALTHZ_REQUIRE_STORAGE=True)
    def test_readyz_503_when_storage_required_and_broken(self):
        with patch('backend.health.default_storage') as storage:
            storage.exists.side_effect = RuntimeError('s3 down')
            storage.save.side_effect = RuntimeError('s3 down')
            r = self.client.get('/api/healthz/')
        self.assertEqual(r.status_code, 503)
        self.assertEqual(r.json().get('storage'), 'error')

    def test_render_yaml_uses_healthz_not_docs(self):
        from pathlib import Path

        root = Path(__file__).resolve().parents[3]
        text = (root / 'render.yaml').read_text(encoding='utf-8')
        self.assertIn('healthCheckPath: /api/healthz/', text)
        self.assertNotIn('healthCheckPath: /api/docs', text)
