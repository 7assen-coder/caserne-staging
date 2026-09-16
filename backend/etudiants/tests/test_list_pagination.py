"""Phases 14–16: pagination, filters, slim list serializer, indexes."""

from datetime import date
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserProfile
from accounts.serializers import ensure_profile
from etudiants.models import DossierAcademique, DossierMilitaire, DossierSante, Eleve


def _make_eleve(
    *,
    matricule,
    prenom='Test',
    nom='Eleve',
    compagnie='1ere',
    section='11',
    departement='IRT',
    niveau='3',
    nni=None,
):
    nni = nni or f'{2000000000 + matricule}'[-10:]
    eleve = Eleve.objects.create(
        matricule=matricule,
        num_bac=f'BAC{matricule}',
        nni=nni,
        sexe='H',
        prenom=prenom,
        nom_famille=nom,
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
        departement=departement,
        niveau_actuel=niveau,
        semestre_actuel='S5',
        parcours='En cours normal',
    )
    DossierSante.objects.create(eleve=eleve, groupe_sanguin='O+')
    return eleve


def _make_user(*, email, fonction, password='TestPass12!', **profile_kwargs):
    user = User.objects.create_user(username=email, email=email, password=password)
    profile = ensure_profile(user)
    profile.fonction = fonction
    profile.is_active_access = True
    for k, v in profile_kwargs.items():
        setattr(profile, k, v)
    profile.save()
    return User.objects.select_related('profile').get(pk=user.pk)


LIST_FORBIDDEN_KEYS = {
    'dossier_sante',
    'documents',
    'contacts_parents',
    'hebergement',
}


class Phase14PaginationFilterTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _make_user(
            email='admin14@esp.mr', fonction=UserProfile.ROLE_ADMINISTRATEUR
        )
        self.client.force_authenticate(self.admin)
        for i in range(30):
            _make_eleve(
                matricule=6000 + i,
                prenom=f'Prenom{i}',
                nom=f'Nom{i}',
                compagnie='1ere' if i < 20 else '2eme',
                section='11' if i < 15 else '12',
                departement='IRT' if i < 10 else 'GM',
                niveau='3' if i < 25 else '4',
            )

    def test_page_size_and_next(self):
        r = self.client.get('/api/v1/eleves/', {'page_size': 10})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 30)
        self.assertEqual(len(r.data['results']), 10)
        self.assertIsNotNone(r.data['next'])

    def test_page_size_clamped(self):
        r = self.client.get('/api/v1/eleves/', {'page_size': 200})
        self.assertEqual(r.status_code, 200)
        self.assertLessEqual(len(r.data['results']), 100)

    def test_filter_departement(self):
        r = self.client.get('/api/v1/eleves/', {'departement': 'IRT', 'page_size': 100})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 10)
        for row in r.data['results']:
            self.assertEqual(row['dossier_academique']['departement'], 'IRT')

    def test_filter_compagnie_section(self):
        r = self.client.get(
            '/api/v1/eleves/', {'compagnie': '1ere', 'section': '11', 'page_size': 100}
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 15)

    def test_filter_niveau(self):
        r = self.client.get('/api/v1/eleves/', {'niveau': '4', 'page_size': 100})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 5)

    def test_search_q_name(self):
        r = self.client.get('/api/v1/eleves/', {'q': 'Prenom3', 'page_size': 100})
        self.assertEqual(r.status_code, 200)
        self.assertGreaterEqual(r.data['count'], 1)
        self.assertTrue(any(x['prenom'] == 'Prenom3' for x in r.data['results']))

    def test_search_q_matricule(self):
        r = self.client.get('/api/v1/eleves/', {'q': '6010', 'page_size': 100})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 1)
        self.assertEqual(r.data['results'][0]['matricule'], 6010)

    def test_section_scope_rbac(self):
        chef = _make_user(
            email='chef14@esp.mr',
            fonction=UserProfile.ROLE_CHEF_SECTION,
            scope_section='11',
            scope_compagnie='1ere',
        )
        self.client.force_authenticate(chef)
        r = self.client.get('/api/v1/eleves/', {'page_size': 100})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 15)
        # Cannot escape scope via filter
        r2 = self.client.get('/api/v1/eleves/', {'section': '12', 'page_size': 100})
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.data['count'], 0)

    def test_etudiant_sees_self_only(self):
        eleve = Eleve.objects.get(matricule=6000)
        student = _make_user(
            email='6000@esp.mr',
            fonction=UserProfile.ROLE_ETUDIANT,
            eleve=eleve,
        )
        self.client.force_authenticate(student)
        r = self.client.get('/api/v1/eleves/', {'page_size': 100})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 1)
        self.assertEqual(r.data['results'][0]['matricule'], 6000)


class Phase15SlimListSerializerTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _make_user(
            email='admin15@esp.mr', fonction=UserProfile.ROLE_ADMINISTRATEUR
        )
        self.client.force_authenticate(self.admin)
        self.eleve = _make_eleve(matricule=7001, nni='7000000001')

    def test_list_omits_heavy_keys(self):
        r = self.client.get('/api/v1/eleves/')
        self.assertEqual(r.status_code, 200)
        row = r.data['results'][0]
        for key in LIST_FORBIDDEN_KEYS:
            self.assertNotIn(key, row)
        self.assertIn('dossier_academique', row)
        self.assertIn('dossier_militaire', row)
        self.assertEqual(set(row['dossier_academique'].keys()), {'departement', 'niveau_actuel', 'parcours'})
        self.assertEqual(set(row['dossier_militaire'].keys()), {'compagnie', 'section'})

    def test_detail_includes_heavy_keys(self):
        r = self.client.get(f'/api/v1/eleves/{self.eleve.pk}/')
        self.assertEqual(r.status_code, 200)
        for key in ('dossier_sante', 'dossier_academique', 'dossier_militaire'):
            self.assertIn(key, r.data)


class Phase16IndexMigrationTests(TestCase):
    def test_indexes_registered_on_models(self):
        from etudiants.models import DossierAcademique, DossierMilitaire, Eleve

        eleve_ix = {ix.name for ix in Eleve._meta.indexes}
        acad_ix = {ix.name for ix in DossierAcademique._meta.indexes}
        mil_ix = {ix.name for ix in DossierMilitaire._meta.indexes}
        self.assertTrue(
            {
                'eleve_nom_prenom_idx',
                'eleve_date_naissance_idx',
                'eleve_updated_at_idx',
                'eleve_created_at_idx',
            }.issubset(eleve_ix)
        )
        self.assertTrue(
            {
                'acad_departement_idx',
                'acad_niveau_actuel_idx',
                'acad_dept_niveau_idx',
            }.issubset(acad_ix)
        )
        self.assertTrue(
            {
                'mil_compagnie_idx',
                'mil_section_idx',
                'mil_compagnie_section_idx',
            }.issubset(mil_ix)
        )
