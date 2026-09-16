"""Phase 5: security headers when SECURITY_HEADERS_ENABLED."""

from django.test import TestCase, override_settings


@override_settings(
    SECURITY_HEADERS_ENABLED=True,
    SECURE_SSL_REDIRECT=False,
    SECURE_HSTS_SECONDS=0,
    CSP_REPORT_ONLY=False,
    ROOT_URLCONF='backend.urls',
)
class SecurityHeadersTests(TestCase):
    def test_api_docs_have_security_headers(self):
        response = self.client.get('/api/docs/')
        self.assertEqual(response['X-Content-Type-Options'], 'nosniff')
        self.assertIn(response.get('Referrer-Policy', ''), ('same-origin', 'same-origin'))
        self.assertEqual(response['X-Frame-Options'], 'DENY')
        self.assertIn('Content-Security-Policy', response)
        self.assertIn("frame-ancestors 'none'", response['Content-Security-Policy'])
