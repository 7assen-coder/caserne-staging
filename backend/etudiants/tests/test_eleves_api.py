"""Phase 33 — élèves API pagination shape, auth, detail vs list, dashboard-stats."""

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import UserProfile
from accounts.tests.factories import make_eleve, make_user


@override_settings(SECURE_SSL_REDIRECT=False)
class Phase33ElevesApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_user(
            email='admin33@esp.mr',
            fonction=UserProfile.ROLE_ADMINISTRATEUR,
        )
        self.eleve = make_eleve(matricule=33001, compagnie='1ere', section='11')

    def test_eleves_unauthenticated_401(self):
        r = self.client.get('/api/v1/eleves/')
        self.assertEqual(r.status_code, 401)

    def test_eleves_paginated_shape(self):
        self.client.force_authenticate(self.admin)
        r = self.client.get('/api/v1/eleves/', {'page': 1, 'page_size': 25})
        self.assertEqual(r.status_code, 200)
        self.assertIn('count', r.data)
        self.assertIn('results', r.data)
        self.assertIsInstance(r.data['results'], list)
        self.assertGreaterEqual(r.data['count'], 1)
        self.assertLessEqual(len(r.data['results']), 25)

    def test_detail_heavier_than_list(self):
        self.client.force_authenticate(self.admin)
        listing = self.client.get('/api/v1/eleves/', {'page_size': 25})
        self.assertEqual(listing.status_code, 200)
        row = next(x for x in listing.data['results'] if x['id'] == self.eleve.pk)
        self.assertNotIn('documents', row)
        self.assertNotIn('dossier_sante', row)

        detail = self.client.get(f'/api/v1/eleves/{self.eleve.pk}/')
        self.assertEqual(detail.status_code, 200)
        self.assertIn('dossier_sante', detail.data)
        self.assertTrue(
            'documents' in detail.data or 'dossier_academique' in detail.data
        )

    def test_dashboard_stats_200(self):
        self.client.force_authenticate(self.admin)
        r = self.client.get('/api/v1/eleves/stats/')
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(r.data, dict)
