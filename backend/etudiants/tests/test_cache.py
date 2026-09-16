"""Phases 18: dashboard stats + hot list cache."""

from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import UserProfile
from accounts.serializers import ensure_profile
from etudiants.cache_keys import DASHBOARD_STATS_VER_KEY, ELEVE_LIST_VER_KEY, get_version
from etudiants.dashboard_stats import compute_dashboard_stats
from etudiants.models import DossierAcademique, DossierMilitaire, DossierSante, Eleve


@override_settings(
    CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'phase18-tests',
        }
    },
    DASHBOARD_CACHE_TTL=60,
    ELEVE_HOT_LIST_TTL=60,
)
class Phase18CacheTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username='admin@esp.mr', email='admin@esp.mr', password='TestPass12!'
        )
        profile = ensure_profile(self.user)
        profile.fonction = UserProfile.ROLE_ADMINISTRATEUR
        profile.is_active_access = True
        profile.save()
        self.user = User.objects.select_related('profile').get(pk=self.user.pk)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        for i in range(3):
            e = Eleve.objects.create(
                matricule=9000 + i,
                num_bac=f'BAC{9000 + i}',
                nni=f'{2100000000 + i}'[-10:],
                sexe='H',
                prenom=f'P{i}',
                nom_famille=f'N{i}',
                date_naissance=date(2000, 1, 1),
                lieu_naissance='Nouakchott',
                nationalite='Mauritanienne',
                categorie_bac='National',
                serie_bac='C',
                moyenne_bac=Decimal('12.00'),
                ecole_bac='Lycée',
                date_premiere_inscription=date(2022, 9, 1),
                voie_acces='1',
                diplome_acces='Bac',
                adresse_primaire='Nouakchott',
                email_perso=f'ok{i}@esp.mr',
                tel1='31234567',
            )
            DossierMilitaire.objects.create(
                eleve=e, compagnie='1ere', section='11', sport_pratique='Football'
            )
            DossierAcademique.objects.create(
                eleve=e,
                departement='IRT',
                niveau_actuel='3',
                semestre_actuel='S5',
                parcours='En cours normal',
            )
            DossierSante.objects.create(eleve=e, groupe_sanguin='O+')

    def test_dashboard_stats_endpoint(self):
        r = self.client.get('/api/v1/eleves/stats/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['total_eleves'], 3)
        self.assertIn('par_filiere', r.data)

    def test_dashboard_stats_uses_cache(self):
        with patch(
            'etudiants.dashboard_stats.compute_dashboard_stats',
            wraps=compute_dashboard_stats,
        ) as mocked:
            r1 = self.client.get('/api/v1/eleves/stats/')
            r2 = self.client.get('/api/v1/eleves/stats/')
            self.assertEqual(r1.status_code, 200)
            self.assertEqual(r2.status_code, 200)
            self.assertEqual(mocked.call_count, 1)

    def test_list_hot_cache_and_bump_on_write(self):
        r1 = self.client.get('/api/v1/eleves/?page=1&page_size=25')
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r1.data['count'], 3)
        ver_before = get_version(ELEVE_LIST_VER_KEY)

        Eleve.objects.create(
            matricule=9999,
            num_bac='BAC9999',
            nni='2199999999',
            sexe='H',
            prenom='New',
            nom_famille='Eleve',
            date_naissance=date(2001, 1, 1),
            lieu_naissance='Nouakchott',
            nationalite='Mauritanienne',
            categorie_bac='National',
            serie_bac='C',
            moyenne_bac=Decimal('11.00'),
            ecole_bac='Lycée',
            date_premiere_inscription=date(2022, 9, 1),
            voie_acces='1',
            diplome_acces='Bac',
            adresse_primaire='Nouakchott',
            email_perso='new@esp.mr',
            tel1='31111111',
        )
        ver_after = get_version(ELEVE_LIST_VER_KEY)
        self.assertGreater(ver_after, ver_before)

        r2 = self.client.get('/api/v1/eleves/?page=1&page_size=25')
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.data['count'], 4)

    def test_healthz(self):
        r = self.client.get('/api/healthz/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['db'], 'ok')
