"""Smoke tests for unified dossier Excel template (single sheet, Numbers-safe)."""
from django.test import SimpleTestCase

from etudiants.dossier_excel_geo import PAYS_LIST
from etudiants.dossier_excel_template import (
    COLUMN_HEADERS,
    COLUMNS,
    all_communes_list,
    build_dossier_workbook,
    workbook_to_bytes,
)


class DossierExcelTemplateTests(SimpleTestCase):
    def test_column_headers_unique_and_ordered(self):
        self.assertEqual(len(COLUMN_HEADERS), len(set(COLUMN_HEADERS)))
        self.assertEqual(COLUMN_HEADERS[-1], 'responsable_etage')
        for banned in (
            'compagnie',
            'section',
            'email_pro',
            'imc',
            'type_mobilite',
            'annee_fin_mobilite',
            'photo_identite',
            'cin',
        ):
            self.assertNotIn(banned, COLUMN_HEADERS)

    def test_single_sheet_numbers_safe_lists_and_dates(self):
        wb = build_dossier_workbook()
        self.assertEqual(wb.sheetnames, ['Etudiants'])

        ws = wb['Etudiants']
        headers = [ws.cell(2, c).value for c in range(1, len(COLUMNS) + 1)]
        self.assertEqual(headers, COLUMN_HEADERS)
        self.assertEqual(ws['A1'].value, 'POLYSPACE — Modèle d’import dossier élève')

        # No extra header cells immediately after last data column
        after = ws.cell(2, len(COLUMNS) + 1).value
        self.assertTrue(after is None or after == '')

        # Pays list present below table
        self.assertGreaterEqual(len(PAYS_LIST), 100)
        self.assertGreater(len(all_communes_list()), 30)

        self.assertGreaterEqual(len(ws.data_validations.dataValidation), 8)
        for dv in ws.data_validations.dataValidation:
            f1 = (dv.formula1 or '').strip()
            self.assertFalse(f1.startswith('=='), msg=f1)
            self.assertNotIn('Listes!', f1)
            self.assertNotIn('INDIRECT', f1.upper())
            self.assertNotIn('VLOOKUP', f1.upper())
            bare = f1[1:] if f1.startswith('=') else f1
            self.assertTrue(bare.startswith('$'), msg=f1)

        date_col = COLUMN_HEADERS.index('date_naissance') + 1
        self.assertEqual(ws.cell(3, date_col).number_format, 'DD/MM/YYYY')
        insc_col = COLUMN_HEADERS.index('date_premiere_inscription') + 1
        self.assertEqual(ws.cell(3, insc_col).number_format, 'DD/MM/YYYY')

        raw = workbook_to_bytes(wb)
        self.assertGreater(len(raw), 2000)
        self.assertEqual(raw[:2], b'PK')
