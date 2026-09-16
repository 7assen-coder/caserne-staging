"""Contract: expected /api/v1 path prefixes (anti-regression for URL hygiene)."""

from django.test import Client, SimpleTestCase, TestCase
from django.urls import get_resolver


class ApiV1UrlContractTests(SimpleTestCase):
    def test_v1_auth_and_domain_prefixes_registered(self):
        pattern_strs = []
        for p in get_resolver().url_patterns:
            pattern_strs.append(str(p.pattern))
        joined = ' | '.join(pattern_strs)
        self.assertIn('api/v1/auth/', joined)
        self.assertIn('api/v1/audit/', joined)
        self.assertIn('api/livez/', joined)
        # Domain mounts under api/v1/ (etudiants + operations share the prefix)
        self.assertTrue(
            'api/v1/' in joined,
            'expected api/v1/ include for domain routers',
        )
        # Bare api/auth/ mount must not exist (only api/v1/auth/)
        self.assertNotRegex(joined, r'(^| \| )api/auth/')


class ApiV1HttpContractTests(TestCase):
    def test_infra_and_v1_csrf(self):
        c = Client()
        self.assertEqual(c.get('/api/livez/').status_code, 200)
        self.assertEqual(c.get('/api/v1/auth/csrf/').status_code, 200)
        self.assertEqual(c.get('/api/auth/csrf/').status_code, 404)

    def test_v1_ops_and_eleves_require_auth(self):
        c = Client()
        self.assertEqual(c.get('/api/v1/eleves/').status_code, 401)
        self.assertEqual(c.get('/api/v1/sanctions/').status_code, 401)
