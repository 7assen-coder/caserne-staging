"""Phase 17: CONN_MAX_AGE is wired on DATABASES."""

from django.conf import settings
from django.test import SimpleTestCase


class ConnMaxAgeSettingsTests(SimpleTestCase):
    def test_conn_max_age_present(self):
        self.assertIn('CONN_MAX_AGE', settings.DATABASES['default'])
        self.assertIsInstance(settings.DATABASES['default']['CONN_MAX_AGE'], int)

    def test_cache_ttls_present(self):
        self.assertTrue(hasattr(settings, 'DASHBOARD_CACHE_TTL'))
        self.assertTrue(hasattr(settings, 'ELEVE_HOT_LIST_TTL'))
