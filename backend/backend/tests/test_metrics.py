"""Phase 32 — metrics endpoint gating."""

from django.test import RequestFactory, SimpleTestCase, override_settings

from backend.metrics import metrics_view


class MetricsAccessTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def test_metrics_forbidden_without_token_from_public_ip(self):
        with override_settings(METRICS_TOKEN=''):
            req = self.factory.get('/metrics')
            req.META['REMOTE_ADDR'] = '8.8.8.8'
            r = metrics_view(req)
        self.assertEqual(r.status_code, 403)

    def test_metrics_ok_from_loopback(self):
        with override_settings(METRICS_TOKEN=''):
            req = self.factory.get('/metrics')
            req.META['REMOTE_ADDR'] = '127.0.0.1'
            r = metrics_view(req)
        self.assertEqual(r.status_code, 200)
        self.assertIn(b'python_info', r.content)

    def test_metrics_ok_with_token(self):
        with override_settings(METRICS_TOKEN='secret-metrics'):
            req = self.factory.get('/metrics')
            req.META['REMOTE_ADDR'] = '8.8.8.8'
            req.META['HTTP_X_METRICS_TOKEN'] = 'secret-metrics'
            r = metrics_view(req)
        self.assertEqual(r.status_code, 200)
