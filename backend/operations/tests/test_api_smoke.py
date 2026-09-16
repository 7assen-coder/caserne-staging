"""Minimal operations API authz smoke under /api/v1/."""

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import UserProfile
from accounts.tests.factories import make_eleve, make_user


@override_settings(SECURE_SSL_REDIRECT=False)
class OperationsApiSmokeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_user(
            email='ops-admin@esp.mr',
            fonction=UserProfile.ROLE_ADMINISTRATEUR,
        )
        make_eleve(matricule=91001, compagnie='1ere', section='11')

    def test_sanctions_unauthenticated_401(self):
        r = self.client.get('/api/v1/sanctions/')
        self.assertEqual(r.status_code, 401)

    def test_sanctions_list_200_for_admin(self):
        self.client.force_authenticate(self.admin)
        r = self.client.get('/api/v1/sanctions/')
        self.assertEqual(r.status_code, 200)
        if isinstance(r.data, dict):
            self.assertIn('results', r.data)
            self.assertIsInstance(r.data['results'], list)
        else:
            self.assertIsInstance(r.data, list)

    def test_equipements_unauthenticated_401(self):
        r = self.client.get('/api/v1/equipements/')
        self.assertEqual(r.status_code, 401)
