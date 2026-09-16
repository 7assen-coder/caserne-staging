"""Optimistic locking + student provision API tests."""

from datetime import date
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserProfile
from accounts.serializers import ensure_profile
from etudiants.models import DossierAcademique, DossierMilitaire, DossierSante, Eleve


def _make_eleve(*, matricule, compagnie='1ere', section='11', nni='2000000001'):
    eleve = Eleve.objects.create(
        matricule=matricule,
        num_bac=f'BAC{matricule}',
        nni=nni,
        sexe='H',
        prenom='Test',
        nom_famille='Eleve',
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
        email_perso=f'perso{matricule}@example.com',
        tel1='31234567',
    )
    DossierMilitaire.objects.create(
        eleve=eleve, compagnie=compagnie, section=section, sport_pratique='Football'
    )
    DossierAcademique.objects.create(
        eleve=eleve,
        departement='IRT',
        niveau_actuel='3',
        semestre_actuel='S5',
        parcours='En cours normal',
    )
    DossierSante.objects.create(eleve=eleve, groupe_sanguin='O+')
    return eleve


def _make_user(*, email, fonction, password='TestPass12', **profile_kwargs):
    user = User.objects.create_user(username=email, email=email, password=password)
    profile = ensure_profile(user)
    profile.fonction = fonction
    profile.is_active_access = True
    for k, v in profile_kwargs.items():
        setattr(profile, k, v)
    profile.save()
    return User.objects.select_related('profile').get(pk=user.pk)


class OptimisticLockTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.eleve = _make_eleve(matricule=5001, nni='5000000001')
        self.writer = _make_user(
            email='writer@esp.mr', fonction=UserProfile.ROLE_COMMANDANT_UNITE
        )
        self.client.force_authenticate(self.writer)

    def test_stale_patch_returns_409(self):
        r1 = self.client.get(f'/api/v1/eleves/{self.eleve.pk}/')
        self.assertEqual(r1.status_code, 200)
        v = r1.data['row_version']
        self.assertEqual(v, 1)

        ok = self.client.patch(
            f'/api/v1/eleves/{self.eleve.pk}/',
            {'prenom': 'Alpha', 'expected_version': v},
            format='json',
        )
        self.assertEqual(ok.status_code, 200, ok.data)
        self.assertEqual(ok.data['row_version'], 2)
        self.assertEqual(ok.data['prenom'], 'Alpha')

        stale = self.client.patch(
            f'/api/v1/eleves/{self.eleve.pk}/',
            {'prenom': 'Beta', 'expected_version': v},
            format='json',
        )
        self.assertEqual(stale.status_code, 409)
        self.assertEqual(stale.data['code'], 'version_conflict')
        self.assertEqual(int(stale.data['current_version']), 2)

        self.eleve.refresh_from_db()
        self.assertEqual(self.eleve.prenom, 'Alpha')

    def test_missing_version_returns_409(self):
        r = self.client.patch(
            f'/api/v1/eleves/{self.eleve.pk}/',
            {'prenom': 'NoVersion'},
            format='json',
        )
        self.assertEqual(r.status_code, 409)


class StudentProvisionAndScopeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.e1 = _make_eleve(matricule=6001, nni='6000000001')
        self.e2 = _make_eleve(matricule=6002, nni='6000000002', section='12')
        self.admin = _make_user(email='admin2@esp.mr', fonction=UserProfile.ROLE_ADMINISTRATEUR)

    def test_provision_idempotent_and_scope(self):
        self.client.force_authenticate(self.admin)
        r1 = self.client.post(
            '/api/v1/auth/users/provision/',
            {'eleve_id': self.e1.pk},
            format='json',
        )
        self.assertEqual(r1.status_code, 201, r1.data)
        self.assertTrue(r1.data['created'])
        self.assertEqual(r1.data['fonction'], UserProfile.ROLE_ETUDIANT)
        self.assertTrue(r1.data['temporary_password'])
        email = r1.data['email']

        r2 = self.client.post(
            '/api/v1/auth/users/provision/',
            {'eleve_id': self.e1.pk},
            format='json',
        )
        self.assertEqual(r2.status_code, 200)
        self.assertFalse(r2.data['created'])

        student = User.objects.get(email__iexact=email)
        self.client.force_authenticate(student)
        listed = self.client.get('/api/v1/eleves/')
        self.assertEqual(listed.status_code, 200)
        rows = listed.data if isinstance(listed.data, list) else listed.data.get('results', listed.data)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['id'], self.e1.pk)

        other = self.client.get(f'/api/v1/eleves/{self.e2.pk}/')
        self.assertIn(other.status_code, (403, 404))

        create = self.client.post('/api/v1/eleves/', {}, format='json')
        self.assertEqual(create.status_code, 403)

        users = self.client.get('/api/v1/auth/users/')
        self.assertEqual(users.status_code, 403)

    def test_student_ops_read_own_only(self):
        from operations.models import Sanction

        self.client.force_authenticate(self.admin)
        prov = self.client.post(
            '/api/v1/auth/users/provision/',
            {'eleve_id': self.e1.pk},
            format='json',
        )
        self.assertEqual(prov.status_code, 201, prov.data)
        Sanction.objects.create(
            eleve=self.e1,
            code='S1',
            motif='Retard',
            nature='avertissement',
            date_debut=date(2024, 1, 1),
            statut='en_cours',
        )
        Sanction.objects.create(
            eleve=self.e2,
            code='S2',
            motif='Autre',
            nature='avertissement',
            date_debut=date(2024, 1, 2),
            statut='en_cours',
        )

        student = User.objects.get(email__iexact=prov.data['email'])
        self.client.force_authenticate(student)
        listed = self.client.get('/api/v1/sanctions/')
        self.assertEqual(listed.status_code, 200)
        rows = listed.data if isinstance(listed.data, list) else listed.data.get('results', listed.data)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['eleve'], self.e1.pk)

        write = self.client.post(
            '/api/v1/sanctions/',
            {
                'eleve': self.e1.pk,
                'code': 'S3',
                'motif': 'x',
                'nature': 'avertissement',
                'date_debut': '2024-02-01',
                'statut': 'en_cours',
            },
            format='json',
        )
        self.assertEqual(write.status_code, 403)
