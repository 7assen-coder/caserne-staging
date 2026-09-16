"""
Liste définitive mapper tests.

Field matrix documented in etudiants.importers_liste_definitive module docstring.
"""

from pathlib import Path

from django.test import TestCase

from etudiants.importers import BulkImporter, read_excel
from etudiants.importers_liste_definitive import (
    FORMAT_LISTE_3A,
    FORMAT_LISTE_4A,
    FORMAT_LEGACY,
    ListeDefinitiveMapper,
    compagnie_from_niveau,
    detect_import_format,
    map_sexe,
    map_voie_institut,
    niveau_from_sheet_name,
    normalize_dept_liste,
    section_from_dept_niveau,
    split_nom_prenom,
)
from etudiants.models import DossierAcademique, DossierMilitaire, Eleve

FIXTURES = Path(__file__).resolve().parent / 'fixtures'


class PureHelperTests(TestCase):
    def test_split_nom_prenom(self):
        self.assertEqual(split_nom_prenom('Tettou cheikh'), ('Tettou', 'cheikh'))
        self.assertEqual(split_nom_prenom('Saadna Mohamed Ahmed'), ('Saadna', 'Mohamed Ahmed'))
        self.assertEqual(split_nom_prenom('Ahmed'), ('Ahmed', ''))
        self.assertEqual(split_nom_prenom(''), ('', ''))
        self.assertEqual(split_nom_prenom('  Fatim Mint Ali  '), ('Fatim', 'Mint Ali'))

    def test_niveau_from_sheet_name(self):
        self.assertEqual(niveau_from_sheet_name('3A'), '3')
        self.assertEqual(niveau_from_sheet_name('4A'), '4')
        self.assertEqual(niveau_from_sheet_name('Liste 3A BD'), '3')
        self.assertEqual(niveau_from_sheet_name('xx4Ayy'), '')  # not token-bounded
        self.assertEqual(niveau_from_sheet_name('Feuille 4A finale'), '4')
        self.assertEqual(niveau_from_sheet_name('Etudiants'), '')

    def test_map_voie_institut(self):
        self.assertEqual(
            map_voie_institut('Voie 1', 'IPGEI'),
            {'voie_acces': '1', 'parcours': 'En cours normal'},
        )
        self.assertEqual(
            map_voie_institut('Voie 1', 'Externe'),
            {'voie_acces': '2', 'parcours': 'En cours normal'},
        )
        self.assertEqual(
            map_voie_institut('Voie 2', 'ISME'),
            {'voie_acces': '3', 'parcours': 'En cours normal'},
        )
        self.assertEqual(
            map_voie_institut('Voie 2', 'Externe'),
            {'voie_acces': '4', 'parcours': 'En cours normal'},
        )
        self.assertEqual(
            map_voie_institut('Redoublant', ''),
            {'voie_acces': '', 'parcours': 'Redoublant'},
        )
        self.assertEqual(
            map_voie_institut('', ''),
            {'voie_acces': '', 'parcours': 'En cours normal'},
        )

    def test_map_sexe(self):
        self.assertEqual(map_sexe('F'), 'F')
        self.assertEqual(map_sexe(''), 'H')
        self.assertEqual(map_sexe('M'), 'H')
        self.assertEqual(map_sexe('H'), 'H')

    def test_normalize_dept_gc(self):
        self.assertEqual(normalize_dept_liste('GC'), 'GC-HE')
        self.assertEqual(normalize_dept_liste('IRT'), 'IRT')
        self.assertIsNone(normalize_dept_liste('XYZ'))

    def test_compagnie_section_compound(self):
        self.assertEqual(compagnie_from_niveau('3'), '1re Compagnie')
        self.assertEqual(compagnie_from_niveau('4'), '2e Compagnie')
        self.assertEqual(compagnie_from_niveau('4-E'), '3e Compagnie')
        self.assertEqual(compagnie_from_niveau('5-DD'), '3e Compagnie')
        self.assertEqual(section_from_dept_niveau('IRT', '3'), 'Section 11')
        self.assertEqual(section_from_dept_niveau('GE', '3'), 'Section 12')
        self.assertEqual(section_from_dept_niveau('SID', '4'), 'Section 21')
        self.assertEqual(section_from_dept_niveau('MPG', '5-DD'), 'Section 33')
        self.assertEqual(section_from_dept_niveau('GC', '3'), 'Section 13')


class DetectFormatTests(TestCase):
    def test_detect_3a_4a_legacy(self):
        h3 = [
            'N°', 'Matricule', 'Nom et Prénom', 'Département', 'Voie', 'S',
            'Institut', 'NNI', 'Date de naissance', 'Lieu de naissance',
            'Mail Personnel', 'Tél',
        ]
        self.assertEqual(detect_import_format(h3, '3A'), FORMAT_LISTE_3A)

        h4 = [
            'N°', 'Matricule ', 'Nom et Prénom', 'Département ', 'Sexe', 'NNI',
            'e-mail personnel', 'Date de naissance', 'Lieu de naissance', 'Tél',
        ]
        self.assertEqual(detect_import_format(h4, '4A'), FORMAT_LISTE_4A)

        h_legacy = ['matricule', 'nom_famille', 'prenom', 'nni', 'sexe']
        self.assertEqual(detect_import_format(h_legacy, 'Etudiants'), FORMAT_LEGACY)

    def test_detect_rejects_garbage(self):
        with self.assertRaises(ValueError):
            detect_import_format(['foo', 'bar'], 'Sheet1')


class FixtureReadTests(TestCase):
    def test_read_3a_fixture(self):
        path = FIXTURES / 'liste_definitive_3a_sample.xlsx'
        with path.open('rb') as fh:
            rows, meta = read_excel(fh)
        self.assertEqual(meta['format'], FORMAT_LISTE_3A)
        self.assertEqual(meta['sheet_name'], '3A')
        self.assertEqual(len(rows), 5)

        mapped, errors = ListeDefinitiveMapper().map(rows[0], 2, '3A')
        # Redoublant row
        self.assertEqual(mapped['eleve']['prenom'], 'Saadna')
        self.assertEqual(mapped['eleve']['nom_famille'], 'Mohamed Ahmed')
        self.assertEqual(mapped['eleve']['voie_acces'], '')
        self.assertEqual(mapped['dossier_academique']['parcours'], 'Redoublant')
        self.assertEqual(mapped['dossier_academique']['niveau_actuel'], '3')
        self.assertTrue(mapped['eleve']['profil_incomplet'])
        self.assertIsNone(mapped['eleve']['nni'])
        self.assertFalse(any(e['field'] in ListeDefinitiveMapper.FATAL for e in errors))

        mapped2, _ = ListeDefinitiveMapper().map(rows[1], 3, '3A')
        self.assertEqual(mapped2['eleve']['prenom'], 'Tettou')
        self.assertEqual(mapped2['eleve']['nom_famille'], 'cheikh')
        self.assertEqual(mapped2['eleve']['sexe'], 'F')
        self.assertEqual(mapped2['eleve']['voie_acces'], '1')
        self.assertEqual(mapped2['eleve']['etablissement_diplome'], 'IPGEI')
        self.assertEqual(mapped2['eleve']['email_perso'], 'cheickhtetou@gmail.com')
        self.assertEqual(mapped2['dossier_militaire']['compagnie'], '1re Compagnie')
        self.assertEqual(mapped2['dossier_militaire']['section'], 'Section 13')  # MPG

        mapped3, _ = ListeDefinitiveMapper().map(rows[3], 5, '3A')
        self.assertEqual(mapped3['dossier_academique']['departement'], 'GC-HE')
        self.assertEqual(mapped3['eleve']['voie_acces'], '3')  # Voie 2 + ISME
        self.assertEqual(mapped3['dossier_militaire']['section'], 'Section 13')  # GC-HE

        mapped_irt, _ = ListeDefinitiveMapper().map(rows[2], 4, '3A')
        self.assertEqual(mapped_irt['dossier_academique']['departement'], 'IRT')
        self.assertEqual(mapped_irt['dossier_militaire']['section'], 'Section 11')

    def test_read_4a_fixture(self):
        path = FIXTURES / 'liste_definitive_4a_sample.xlsx'
        with path.open('rb') as fh:
            rows, meta = read_excel(fh)
        self.assertEqual(meta['format'], FORMAT_LISTE_4A)
        mapped, errors = ListeDefinitiveMapper().map(rows[0], 2, '4A')
        self.assertEqual(mapped['dossier_academique']['niveau_actuel'], '4')
        self.assertEqual(mapped['eleve']['voie_acces'], '')
        self.assertEqual(mapped['eleve']['sexe'], 'F')
        self.assertIsNone(mapped['eleve']['nni'])
        self.assertEqual(mapped['dossier_militaire']['compagnie'], '2e Compagnie')
        self.assertEqual(mapped['dossier_militaire']['section'], 'Section 22')  # 4A + GE
        self.assertFalse(any(e['field'] in ListeDefinitiveMapper.FATAL for e in errors))

        mapped_single, _ = ListeDefinitiveMapper().map(rows[2], 4, '4A')
        self.assertEqual(mapped_single['eleve']['prenom'], 'SingleToken')
        self.assertEqual(mapped_single['eleve']['nom_famille'], '')
        self.assertEqual(mapped_single['eleve']['sexe'], 'H')  # M → H
        self.assertEqual(mapped_single['dossier_militaire']['section'], 'Section 21')  # 4A + IRT


class BulkImportListeTests(TestCase):
    def test_import_3a_sample_creates_incomplete(self):
        path = FIXTURES / 'liste_definitive_3a_sample.xlsx'
        with path.open('rb') as fh:
            rows, meta = read_excel(fh)
        report = BulkImporter().run(rows, meta=meta)
        self.assertEqual(report['created'], 5, report)
        self.assertEqual(report['skipped'], 0, report)
        e = Eleve.objects.get(matricule=251001)
        self.assertTrue(e.profil_incomplet)
        self.assertEqual(e.prenom, 'Tettou')
        self.assertEqual(e.nom_famille, 'cheikh')
        self.assertEqual(e.voie_acces, '1')
        self.assertEqual(e.sexe, 'F')
        da = DossierAcademique.objects.get(eleve=e)
        self.assertEqual(da.niveau_actuel, '3')
        dm = DossierMilitaire.objects.get(eleve=e)
        self.assertEqual(dm.compagnie, '1re Compagnie')
        self.assertEqual(dm.section, 'Section 13')  # MPG

        red = Eleve.objects.get(matricule=24053)
        self.assertEqual(red.voie_acces, '')
        self.assertEqual(red.dossier_academique.parcours, 'Redoublant')
        self.assertIsNone(red.nni)
        self.assertIn(red.email_perso, (None, ''))

        # re-import → duplicates skipped
        report2 = BulkImporter().run(rows, meta=meta)
        self.assertEqual(report2['created'], 0)
        self.assertEqual(report2['skipped'], 5)
        self.assertEqual(Eleve.objects.count(), 5)

    def test_import_4a_sample(self):
        path = FIXTURES / 'liste_definitive_4a_sample.xlsx'
        with path.open('rb') as fh:
            rows, meta = read_excel(fh)
        report = BulkImporter().run(rows, meta=meta)
        self.assertEqual(report['created'], 5, report)
        e = Eleve.objects.get(matricule=24002)
        self.assertEqual(e.voie_acces, '')
        self.assertTrue(e.profil_incomplet)
        self.assertEqual(e.dossier_academique.niveau_actuel, '4')
        dm = DossierMilitaire.objects.get(eleve=e)
        self.assertEqual(dm.compagnie, '2e Compagnie')
        self.assertEqual(dm.section, 'Section 22')
