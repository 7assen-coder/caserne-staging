"""Phase 7 — field-level access for NNI, santé, parents."""

from datetime import date
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserProfile
from accounts.serializers import ensure_profile
from etudiants.models import ContactParent, DossierMilitaire, DossierAcademique, DossierSante, Eleve


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
    )
    DossierAcademique.objects.create(eleve=eleve, niveau_actuel='3e année')
    DossierSante.objects.create(eleve=eleve, groupe_sanguin='O+', maladies_chroniques='Asthme')
    ContactParent.objects.create(
        eleve=eleve,
        prenom_pere='Pere',
        nom_famille_pere='Parent',
        tel_pere='32000001',
    )
    return eleve


def _make_user(*, email, fonction, password='TestPass12', **profile_kwargs):
    user = User.objects.create_user(username=email, email=email, password=password)
    profile = ensure_profile(user)
    profile.fonction = fonction
    profile.is_active_access = True
    for k, v in profile_kwargs.items():
        setattr(profile, k, v)
    profile.save()
    # Refresh so reverse OneToOne cache is not stuck on signal defaults
    return User.objects.select_related('profile').get(pk=user.pk)


class SensitiveFieldsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.eleve = _make_eleve(
            matricule=5001, compagnie='1ere', section='11', nni='9876543210'
        )
        self.admin = _make_user(email='admin-sens@esp.mr', fonction=UserProfile.ROLE_ADMINISTRATEUR)
        self.unite = _make_user(email='unite-sens@esp.mr', fonction=UserProfile.ROLE_COMMANDANT_UNITE)
        self.superviseur = _make_user(
            email='sup-sens@esp.mr',
            fonction=UserProfile.ROLE_SUPERVISEUR,
            scope_section='11',
            scope_compagnie='1ere',
        )
        self.chef = _make_user(
            email='chef-sens@esp.mr',
            fonction=UserProfile.ROLE_CHEF_SECTION,
            scope_section='11',
            scope_compagnie='1ere',
        )
        self.etudiant = _make_user(
            email='etu-sens@esp.mr',
            fonction=UserProfile.ROLE_ETUDIANT,
            eleve=self.eleve,
        )

    def test_me_returns_sensitive_caps(self):
        self.client.force_authenticate(self.superviseur)
        r = self.client.get('/api/v1/auth/me/')
        self.assertEqual(r.status_code, 200)
        caps = r.data['sensitive_caps']
        self.assertEqual(caps['nni'], 'masked')
        self.assertEqual(caps['sante'], 'none')
        self.assertEqual(caps['parents'], 'none')
        self.assertFalse(caps['edit_nni'])

    def test_superviseur_masked_nni_and_no_sante_parents(self):
        self.client.force_authenticate(self.superviseur)
        r = self.client.get(f'/api/v1/eleves/{self.eleve.pk}/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['nni'], '******3210')
        self.assertIsNone(r.data.get('dossier_sante'))
        self.assertIsNone(r.data.get('contacts_parents'))

    def test_superviseur_dossier_sante_forbidden(self):
        self.client.force_authenticate(self.superviseur)
        r = self.client.get('/api/v1/sante/')
        self.assertEqual(r.status_code, 403)

    def test_chef_full_view_no_edit_nni(self):
        self.client.force_authenticate(self.chef)
        r = self.client.get(f'/api/v1/eleves/{self.eleve.pk}/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['nni'], '9876543210')
        self.assertIsNotNone(r.data.get('dossier_sante'))
        patch = self.client.patch(
            f'/api/v1/eleves/{self.eleve.pk}/',
            {'nni': '1111111111', 'expected_version': self.eleve.row_version},
            format='json',
        )
        self.assertEqual(patch.status_code, 403)

    def test_unite_can_edit_nni(self):
        self.client.force_authenticate(self.unite)
        patch = self.client.patch(
            f'/api/v1/eleves/{self.eleve.pk}/',
            {'nni': '1111111111', 'expected_version': self.eleve.row_version},
            format='json',
        )
        self.assertEqual(patch.status_code, 200, getattr(patch, 'data', patch.content))
        self.eleve.refresh_from_db()
        self.assertEqual(self.eleve.nni, '1111111111')

    def test_etudiant_own_full_cannot_patch(self):
        self.client.force_authenticate(self.etudiant)
        r = self.client.get(f'/api/v1/eleves/{self.eleve.pk}/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['nni'], '9876543210')
        self.assertIsNotNone(r.data.get('dossier_sante'))
        self.assertIsNotNone(r.data.get('contacts_parents'))
        patch = self.client.patch(
            f'/api/v1/eleves/{self.eleve.pk}/',
            {'prenom': 'Hacker', 'expected_version': self.eleve.row_version},
            format='json',
        )
        self.assertIn(patch.status_code, (403, 405))

    def test_admin_me_full_edit_caps(self):
        self.client.force_authenticate(self.admin)
        r = self.client.get('/api/v1/auth/me/')
        self.assertEqual(r.status_code, 200)
        caps = r.data.get('sensitive_caps')
        self.assertEqual(caps['nni'], 'full')
        self.assertTrue(caps['edit_nni'])
        self.assertTrue(caps['edit_sante'])
        self.assertTrue(caps['edit_parents'])
