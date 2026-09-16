"""RBAC API tests — 7 roles, scopes, user admin."""

from datetime import date
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserProfile
from accounts.serializers import ensure_profile
from etudiants.models import Eleve, DossierMilitaire, DossierAcademique, DossierSante


def _make_eleve(*, matricule, compagnie, section, nni):
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
        eleve=eleve,
        compagnie=compagnie,
        section=section,
        sport_pratique='Football',
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


def _list_rows(data):
    """Support paginated `{results: [...]}` and bare list responses."""
    if isinstance(data, dict) and 'results' in data:
        return data['results']
    return data


class RbacApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.e11 = _make_eleve(matricule=1001, compagnie='1ere', section='11', nni='1000000001')
        self.e12 = _make_eleve(matricule=1002, compagnie='1ere', section='12', nni='1000000002')
        self.e21 = _make_eleve(matricule=1003, compagnie='2eme', section='21', nni='1000000003')

        self.admin = _make_user(email='admin@esp.mr', fonction=UserProfile.ROLE_ADMINISTRATEUR)
        self.unite = _make_user(email='cdu@esp.mr', fonction=UserProfile.ROLE_COMMANDANT_UNITE)
        self.groupement = _make_user(email='cdg@esp.mr', fonction=UserProfile.ROLE_COMMANDANT_GROUPEMENT)
        self.cdc = _make_user(
            email='cdc@esp.mr',
            fonction=UserProfile.ROLE_COMMANDANT_COMPAGNIE,
            scope_compagnie='1ere',
        )
        self.chef = _make_user(
            email='chef@esp.mr',
            fonction=UserProfile.ROLE_CHEF_SECTION,
            scope_section='11',
            scope_compagnie='1ere',
        )
        self.sup = _make_user(
            email='sup@esp.mr',
            fonction=UserProfile.ROLE_SUPERVISEUR,
            scope_section='11',
        )
        self.etu = _make_user(
            email='etu@esp.mr',
            fonction=UserProfile.ROLE_ETUDIANT,
            eleve=self.e11,
        )

    def test_anonymous_eleves_401(self):
        r = self.client.get('/api/v1/eleves/')
        self.assertEqual(r.status_code, 401)

    def test_chef_lists_only_section(self):
        self.client.force_authenticate(self.chef)
        r = self.client.get('/api/v1/eleves/')
        self.assertEqual(r.status_code, 200)
        mats = {row['matricule'] for row in _list_rows(r.data)}
        self.assertEqual(mats, {1001})

    def test_cdc_lists_compagnie(self):
        self.client.force_authenticate(self.cdc)
        r = self.client.get('/api/v1/eleves/')
        self.assertEqual(r.status_code, 200)
        mats = {row['matricule'] for row in _list_rows(r.data)}
        self.assertEqual(mats, {1001, 1002})

    def test_groupement_lists_all_readonly_delete_403(self):
        self.client.force_authenticate(self.groupement)
        r = self.client.get('/api/v1/eleves/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(_list_rows(r.data)), 3)
        d = self.client.delete(f'/api/v1/eleves/{self.e11.pk}/')
        self.assertEqual(d.status_code, 403)

    def test_unite_can_delete(self):
        self.client.force_authenticate(self.unite)
        d = self.client.delete(
            f'/api/v1/eleves/{self.e21.pk}/',
            {'expected_version': self.e21.row_version},
            format='json',
        )
        self.assertIn(d.status_code, (204, 200))

    def test_chef_outside_section_404(self):
        self.client.force_authenticate(self.chef)
        r = self.client.get(f'/api/v1/eleves/{self.e12.pk}/')
        self.assertEqual(r.status_code, 404)

    def test_etudiant_only_own(self):
        self.client.force_authenticate(self.etu)
        r = self.client.get('/api/v1/eleves/')
        self.assertEqual(r.status_code, 200)
        rows = _list_rows(r.data)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['matricule'], 1001)
        r2 = self.client.get(f'/api/v1/eleves/{self.e12.pk}/')
        self.assertEqual(r2.status_code, 404)
        c = self.client.post('/api/v1/eleves/', {}, format='json')
        self.assertEqual(c.status_code, 403)

    def test_sup_cannot_import(self):
        self.client.force_authenticate(self.sup)
        r = self.client.post('/api/v1/eleves/import/', {}, format='multipart')
        self.assertEqual(r.status_code, 403)

    def test_template_requires_auth(self):
        r = self.client.get('/api/v1/eleves/import/template/?type=csv')
        self.assertEqual(r.status_code, 401)
        self.client.force_authenticate(self.chef)
        r2 = self.client.get('/api/v1/eleves/import/template/?type=csv')
        self.assertEqual(r2.status_code, 200)

    def test_non_admin_cannot_manage_users(self):
        self.client.force_authenticate(self.unite)
        r = self.client.get('/api/v1/auth/users/')
        self.assertEqual(r.status_code, 403)

    def test_admin_creates_scoped_chef(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post(
            '/api/v1/auth/users/',
            {
                'email': 'newchef@esp.mr',
                'password': 'TestPass12',
                'first_name': 'New',
                'last_name': 'Chef',
                'fonction': UserProfile.ROLE_CHEF_SECTION,
                'scope_section': '12',
                'scope_compagnie': '1ere',
            },
            format='json',
        )
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['fonction'], UserProfile.ROLE_CHEF_SECTION)
        self.assertEqual(r.data['scope_section'], '12')

    def test_revoked_access_me_403(self):
        profile = self.chef.profile
        profile.is_active_access = False
        profile.save(update_fields=['is_active_access'])
        self.client.force_authenticate(self.chef)
        r = self.client.get('/api/v1/auth/me/')
        self.assertEqual(r.status_code, 403)
