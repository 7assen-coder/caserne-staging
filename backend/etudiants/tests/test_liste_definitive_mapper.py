"""
Liste définitive mapper unit tests (helpers still used for auto compagnie/section).
Bulk import of 3A/4A files is rejected — see test_dossier_import.py.
"""

from pathlib import Path

from django.test import TestCase

from etudiants.importers import read_excel
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


class ListeMapperStillWorksUnit(TestCase):
    """Mapper unit tests against fixtures (import path rejects these files)."""

    def test_map_3a_row_from_fixture_if_readable(self):
        # Build a synthetic row matching liste shape for unit map
        row = {
            'N°': 1,
            'Matricule': 251001,
            'Nom et Prénom': 'Tettou cheikh',
            'Département': 'MPG',
            'Voie': 'Voie 1',
            'S': 'F',
            'Institut': 'IPGEI',
            'NNI': '',
            'Date de naissance': '',
            'Lieu de naissance': '',
            'Mail Personnel': 'cheickhtetou@gmail.com',
            'Tél': '',
        }
        mapped, errors = ListeDefinitiveMapper().map(row, 2, '3A')
        self.assertEqual(mapped['eleve']['prenom'], 'Tettou')
        self.assertEqual(mapped['eleve']['nom_famille'], 'cheikh')
        self.assertEqual(mapped['eleve']['voie_acces'], '1')
        self.assertEqual(mapped['dossier_militaire']['compagnie'], '1re Compagnie')
        self.assertFalse(any(e['field'] in ListeDefinitiveMapper.FATAL for e in errors))


class RejectListeViaReadExcel(TestCase):
    def test_read_excel_rejects_3a(self):
        path = FIXTURES / 'liste_definitive_3a_sample.xlsx'
        with path.open('rb') as fh:
            with self.assertRaises(ValueError) as ctx:
                read_excel(fh)
        self.assertIn('liste définitive', str(ctx.exception).lower())
