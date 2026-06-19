"""
importers.py — Logique d'import en masse des étudiants.
"""

import csv
import io
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from django.db import transaction

from .models import (
    Eleve, DossierAcademique, DossierMilitaire, DossierSante,
    ContactParent, Hebergement,
)


# ─── Constantes ───────────────────────────────────────────────────────────────

VALID_SEXE      = {'H', 'M', 'HOMME', 'MASCULIN', 'F', 'FEMME', 'FEMININ'}
VALID_SERIE_BAC = {'C', 'D', 'TMGM', 'TSGM', 'LM', 'LO', 'ETRANGERE'}
VALID_SEMESTRE  = {'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'}
VALID_VOIE      = {'1', '2', '3', '4'}
VALID_NIVEAU    = {'3', '4', '4-DD', '4-E', '5-DD'}

# Codes département valides (depuis DossierAcademique.CHOIX_DEPARTEMENT)
# departement est un CharField stockant le code court, pas une FK.
DEPT_MAP = {
    # codes directs
    'IRT': 'IRT', 'SID': 'SID', 'GE': 'GE',
    'GM': 'GM', 'GC': 'GC', 'GC-HE': 'GC-HE', 'MPG': 'MPG',
    # noms longs (normalisés sans accents)
    'INFORMATIQUE RESEAUX ET TELECOMMUNICATIONS': 'IRT',
    'INFORMATIQUE RESEAU ET TELECOMMUNICATION': 'IRT',
    'STATISTIQUE ET INGENIERIE DES DONNEES': 'SID',
    'STATISTIQUE INGENIERIE DES DONNEES': 'SID',
    'GENIE ELECTRIQUE': 'GE',
    'GENIE MECANIQUE': 'GM',
    'GENIE CIVIL': 'GC-HE',
    'MINES PETROLE ET GAZ': 'MPG',
    'MINE PETROLE ET GAZ': 'MPG',
    # alias courts avec tirets/espaces
    'GC HE': 'GC-HE',
}

NIVEAU_ALIASES = {
    '3E ANNEE': '3', '3EME': '3', '3': '3',
    '4E ANNEE': '4', '4EME': '4', '4': '4',
    '4E ANNEE DOUBLE DIPLOME': '4-DD', '4DD': '4-DD', '4-DD': '4-DD',
    '4E ANNEE ECHANGE': '4-E', '4E': '4-E', '4-E': '4-E',
    '5E ANNEE DOUBLE DIPLOME': '5-DD', '5DD': '5-DD', '5-DD': '5-DD',
}


# ─── Utilitaires ──────────────────────────────────────────────────────────────

def _norm(v):
    import unicodedata
    s = unicodedata.normalize('NFD', str(v or '')).encode('ascii', 'ignore').decode()
    return s.strip().upper()


def _parse_date(raw):
    if not raw:
        return None
    if isinstance(raw, (date, datetime)):
        return raw.strftime('%Y-%m-%d')
    s = str(raw).strip()
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%Y/%m/%d', '%d.%m.%Y'):
        try:
            return datetime.strptime(s, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    return None


def _parse_decimal(raw, default=None):
    try:
        return Decimal(str(raw).replace(',', '.').strip())
    except (InvalidOperation, TypeError, ValueError):
        return default


def _norm_sexe(v):
    n = _norm(v)
    return 'F' if n.startswith('F') else 'H'


def _norm_niveau(v):
    n = _norm(v).replace(' ', '').replace('-', '')
    for alias, code in NIVEAU_ALIASES.items():
        if _norm(alias).replace(' ', '').replace('-', '') == n:
            return code
    return ''


def _norm_voie(v):
    s = str(v or '').strip()
    m = re.search(r'[1-4]', s)
    return m.group() if m else '1'


def _resolve_dept(raw):
    """Résout une valeur brute vers le code département valide (str) ou None."""
    if not raw:
        return None
    n = _norm(raw)
    # Essai direct
    if n in DEPT_MAP:
        return DEPT_MAP[n]
    # Essai en enlevant les tirets/espaces
    n2 = n.replace('-', '').replace(' ', '')
    for key, code in DEPT_MAP.items():
        if key.replace('-', '').replace(' ', '') == n2:
            return code
    return None


# ─── Lecteurs de fichier ──────────────────────────────────────────────────────

def read_excel(file_obj):
    try:
        import openpyxl
    except ImportError:
        raise ImportError("openpyxl est requis. pip install openpyxl")
    wb = openpyxl.load_workbook(file_obj, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(h).strip() if h is not None else f'col_{i}' for i, h in enumerate(rows[0])]
    result = []
    for row in rows[1:]:
        if all(v is None or str(v).strip() == '' for v in row):
            continue
        result.append(dict(zip(headers, row)))
    return result


def read_csv(file_obj):
    raw = file_obj.read()
    for enc in ('utf-8-sig', 'utf-8', 'latin-1'):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ValueError("Encodage CSV non reconnu. Sauvegardez en UTF-8.")
    sample = text[:2048]
    sep = ';' if sample.count(';') >= sample.count(',') else ','
    reader = csv.DictReader(io.StringIO(text), delimiter=sep)
    return [dict(row) for row in reader]


# ─── Mapping ligne → champs Django ───────────────────────────────────────────

class RowMapper:
    def _pick(self, row, *keys):
        normed = {_norm(k): v for k, v in row.items()}
        for key in keys:
            v = normed.get(_norm(key))
            if v is not None and str(v).strip() != '':
                return str(v).strip()
        return ''

    def map(self, row, row_num):
        errors = []

        def err(field, msg):
            errors.append({'row': row_num, 'field': field, 'message': msg})

        p = self._pick

        # ── Eleve ─────────────────────────────────────────────────────────────
        matricule_raw = p(row, 'matricule', 'Matricule', 'mat')
        try:
            matricule = int(re.sub(r'\D', '', matricule_raw))
        except (ValueError, TypeError):
            matricule = None
            err('matricule', f'Valeur invalide : "{matricule_raw}"')

        nom = p(row, 'nom_famille', 'nom', 'Nom', 'last_name')
        if not nom:
            err('nom_famille', 'Champ obligatoire manquant')

        prenom = p(row, 'prenom', 'Prénom', 'prenoms', 'first_name')
        if not prenom:
            err('prenom', 'Champ obligatoire manquant')

        nni = p(row, 'nni', 'NNI', 'identifiant_national')
        if not nni:
            nni = f'AUTO-{matricule_raw or row_num}'

        date_naissance = _parse_date(p(row, 'date_naissance', 'naissance', 'ddn'))
        if not date_naissance:
            date_naissance = '2000-01-01'

        date_inscription = _parse_date(p(row, 'date_premiere_inscription', 'date_inscription'))
        if not date_inscription:
            date_inscription = f'{date.today().year}-09-01'

        moyenne_bac = _parse_decimal(p(row, 'moyenne_bac', 'moyenne', 'moy_bac'), Decimal('10.00'))
        if moyenne_bac < 0 or moyenne_bac > 20:
            err('moyenne_bac', f'Doit être entre 0 et 20 (reçu : {moyenne_bac})')
            moyenne_bac = Decimal('10.00')

        serie_raw = _norm(p(row, 'serie_bac', 'serie', 'filiere_bac'))
        serie_bac = serie_raw if serie_raw in VALID_SERIE_BAC else 'C'

        categorie_bac_raw = _norm(p(row, 'categorie_bac', 'cat_bac'))
        categorie_bac = 'Etranger' if 'ETRANGER' in categorie_bac_raw else 'National'

        voie_acces = _norm_voie(p(row, 'voie_acces', 'voie', 'acces'))

        eleve_data = dict(
            matricule=matricule,
            num_bac=p(row, 'num_bac', 'numero_bac', 'bac') or '—',
            nni=nni,
            sexe=_norm_sexe(p(row, 'sexe', 'genre', 'sex')),
            prenom=prenom,
            nom_famille=nom,
            date_naissance=date_naissance,
            lieu_naissance=p(row, 'lieu_naissance', 'lieu', 'ville_naissance') or '—',
            nationalite=p(row, 'nationalite', 'nationalité', 'nationality') or 'Mauritanienne',
            categorie_bac=categorie_bac,
            serie_bac=serie_bac,
            moyenne_bac=moyenne_bac,
            ecole_bac=p(row, 'ecole_bac', 'lycee', 'etablissement_bac') or '—',
            date_premiere_inscription=date_inscription,
            voie_acces=voie_acces,
            diplome_acces=p(row, 'diplome_acces', 'diplome') or '—',
            etablissement_diplome=p(row, 'etablissement_diplome', 'etablissement') or '',
            adresse_primaire=p(row, 'adresse_primaire', 'adresse') or '—',
            adresse_secondaire=p(row, 'adresse_secondaire') or '',
            resident_avec_parents=True,
            compte_bankily=p(row, 'compte_bankily', 'bankily') or '',
            email_perso=p(row, 'email_perso', 'email', 'mail') or f'{matricule_raw or row_num}@import.esp.mr',
            tel1=p(row, 'telephone', 'tel', 'tel1', 'phone') or '00000000',
            tel2_whatsapp=p(row, 'whatsapp', 'tel2', 'tel_whatsapp') or '',
        )

        # ── DossierAcademique ─────────────────────────────────────────────────
        dept_raw = p(row, 'departement', 'filiere', 'département', 'dept')
        dept_code = _resolve_dept(dept_raw)
        if dept_code is None:
            if dept_raw:
                err('departement', f'Département inconnu : "{dept_raw}". Valeurs : IRT, GE, GM, GC-HE, SID, MPG.')
            dept_code = 'IRT'  # valeur par défaut non-fatale

        niveau_raw = p(row, 'niveau', 'annee', 'année', 'niveau_actuel')
        niveau = _norm_niveau(niveau_raw)
        if not niveau:
            err('niveau', f'Niveau inconnu : "{niveau_raw}". Valeurs : 3, 4, 4-DD, 4-E, 5-DD.')
            niveau = '3'

        semestre_raw = _norm(p(row, 'semestre', 'semestre_actuel'))
        semestre = semestre_raw if semestre_raw in VALID_SEMESTRE else 'S1'

        da_data = dict(
            departement=dept_code,       # CharField, pas une FK
            niveau_actuel=niveau,
            semestre_actuel=semestre,
            donnees_semestres={},
            parcours=p(row, 'parcours', 'statut') or 'En cours normal',
            diplome=p(row, 'diplome_obtenu') or '',
            etablissement_echange=p(row, 'etablissement_echange') or '',
            etablissement_double_diplome=p(row, 'etablissement_double_diplome') or '',
            specialite_mobilite=p(row, 'specialite_mobilite') or '',
        )

        # ── DossierSante (optionnel) ──────────────────────────────────────────
        poids = _parse_decimal(p(row, 'poids', 'poids_kg'))
        taille = _parse_decimal(p(row, 'taille', 'taille_cm'))
        gs_raw = _norm(p(row, 'groupe_sanguin', 'groupe_sang', 'blood'))
        gs = gs_raw if gs_raw in {'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'} else None

        ds_data = dict(
            groupe_sanguin=gs or 'O+',
            assureur=p(row, 'assureur') or '',
            num_assure=p(row, 'num_assure', 'numero_assure') or '',
            antecedents_medicaux=p(row, 'antecedents', 'antecedents_medicaux') or '',
            maladies_chroniques=p(row, 'maladies_chroniques') or '',
            medicaments_a_vie=p(row, 'medicaments') or '',
            poids_kg=poids,
            taille_cm=taille,
        ) if (gs or poids or taille) else None

        # ── ContactParent (optionnel) ─────────────────────────────────────────
        tel_urgence = p(row, 'tel_urgence', 'telephone_urgence', 'tel_pere', 'tel_parent')
        cp_data = dict(
            prenom_pere=p(row, 'prenom_pere', 'nom_pere') or '',
            nom_famille_pere=p(row, 'nom_famille_pere') or nom,
            fonction_pere=p(row, 'fonction_pere') or '',
            tel_pere=p(row, 'tel_pere', 'telephone_pere') or '',
            prenom_mere=p(row, 'prenom_mere', 'nom_mere') or '',
            nom_famille_mere=p(row, 'nom_famille_mere') or '',
            tel_mere=p(row, 'tel_mere', 'telephone_mere') or '',
            nom_urgence=p(row, 'nom_urgence', 'contact_urgence') or '',
            tel_urgence=tel_urgence or '00000000',
        ) if tel_urgence else None

        return {
            'eleve': eleve_data,
            'dossier_academique': da_data,
            'dossier_sante': ds_data,
            'contact_parent': cp_data,
        }, errors


# ─── Import principal ─────────────────────────────────────────────────────────

class BulkImporter:
    def __init__(self):
        self.mapper = RowMapper()

    def run(self, rows):
        created = 0
        skipped = 0
        all_errors = []

        for idx, raw_row in enumerate(rows):
            row_num = idx + 2
            mapped, field_errors = self.mapper.map(raw_row, row_num)

            if field_errors:
                fatal = [e for e in field_errors if e['field'] in ('matricule', 'nom_famille', 'prenom')]
                all_errors.extend(field_errors)
                if fatal:
                    skipped += 1
                    continue

            try:
                with transaction.atomic():
                    self._create_row(mapped)
                created += 1
            except Exception as exc:
                skipped += 1
                msg = str(exc)
                if 'matricule' in msg and 'unique' in msg.lower():
                    msg = f"Matricule {mapped['eleve'].get('matricule')} déjà existant."
                elif 'nni' in msg and 'unique' in msg.lower():
                    msg = f"NNI {mapped['eleve'].get('nni')} déjà existant."
                all_errors.append({'row': row_num, 'field': 'db', 'message': msg})

        return {'created': created, 'skipped': skipped, 'errors': all_errors}

    def _create_row(self, mapped):
        eleve = Eleve.objects.create(**mapped['eleve'])

        da = mapped['dossier_academique']
        da['eleve'] = eleve
        DossierAcademique.objects.create(**da)

        if mapped.get('dossier_sante'):
            ds = mapped['dossier_sante']
            if not ds.get('poids_kg') or not ds.get('taille_cm'):
                ds['poids_kg'] = None
                ds['taille_cm'] = None
            ds['eleve'] = eleve
            DossierSante.objects.create(**ds)

        if mapped.get('contact_parent'):
            cp = mapped['contact_parent']
            cp['eleve'] = eleve
            ContactParent.objects.create(**cp)


# ─── Générateur de templates ──────────────────────────────────────────────────

def generate_excel_template():
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        from openpyxl.utils import get_column_letter
    except ImportError:
        raise ImportError("openpyxl requis. pip install openpyxl")

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'Etudiants'

    columns = [
        ('matricule',                '12001',           True,  'Numéro matricule entier unique'),
        ('nom_famille',              'Ould Ahmed',       True,  'Nom de famille'),
        ('prenom',                   'Mohamed',          True,  'Prénom(s)'),
        ('nni',                      '9800123456',       True,  '10 chiffres'),
        ('sexe',                     'H',                True,  'H ou F'),
        ('date_naissance',           '2002-05-15',       True,  'Format AAAA-MM-JJ'),
        ('lieu_naissance',           'Nouakchott',       False, ''),
        ('nationalite',              'Mauritanienne',    False, ''),
        ('email_perso',              'med@gmail.com',    False, ''),
        ('telephone',                '22334455',         False, '8 chiffres'),
        ('adresse_primaire',         'Tevragh Zeina',    False, ''),
        ('num_bac',                  'BAC-2021-001',     False, ''),
        ('serie_bac',                'C',                False, 'C, D, TMGM, TSGM, LM, LO'),
        ('categorie_bac',            'National',         False, 'National ou Etranger'),
        ('moyenne_bac',              '14.50',            False, '0 à 20'),
        ('ecole_bac',                'Lycée Nationale',  False, ''),
        ('date_premiere_inscription','2024-09-01',       False, 'Format AAAA-MM-JJ'),
        ('voie_acces',               '1',                False, '1,2,3,4'),
        ('diplome_acces',            'Baccalauréat',     False, ''),
        ('departement',              'IRT',              True,  'IRT, GE, GM, GC-HE, SID, MPG'),
        ('niveau',                   '3',                True,  '3, 4, 4-DD, 4-E, 5-DD'),
        ('semestre',                 'S1',               False, 'S1 à S8'),
        ('parcours',                 'En cours normal',  False, ''),
        ('groupe_sanguin',           'O+',               False, 'A+,A-,B+,B-,AB+,AB-,O+,O-'),
        ('poids_kg',                 '72',               False, ''),
        ('taille_cm',                '178',              False, ''),
        ('tel_urgence',              '20001122',         False, ''),
        ('nom_urgence',              'Père',             False, ''),
        ('tel_pere',                 '20001122',         False, ''),
        ('tel_mere',                 '20009988',         False, ''),
    ]

    navy_fill     = PatternFill('solid', fgColor='1B2A4A')
    required_fill = PatternFill('solid', fgColor='C8A54E')
    opt_fill      = PatternFill('solid', fgColor='2D3E5F')
    example_fill  = PatternFill('solid', fgColor='F9F4E8')
    thin_border   = Border(
        left=Side(style='thin', color='D1D9E6'), right=Side(style='thin', color='D1D9E6'),
        top=Side(style='thin', color='D1D9E6'),  bottom=Side(style='thin', color='D1D9E6'),
    )
    center = Alignment(horizontal='center', vertical='center', wrap_text=True)
    left   = Alignment(horizontal='left',   vertical='center')

    # Titre
    ws.merge_cells(f'A1:{get_column_letter(len(columns))}1')
    c = ws['A1']
    c.value = 'MODÈLE IMPORT ÉTUDIANTS — ESP'
    c.font = Font(color='FFFFFF', bold=True, size=13)
    c.fill = navy_fill
    c.alignment = center
    ws.row_dimensions[1].height = 28

    # En-têtes
    for col_idx, (col_name, _, required, comment) in enumerate(columns, start=1):
        cell = ws.cell(row=2, column=col_idx, value=col_name)
        cell.fill = required_fill if required else opt_fill
        cell.font = Font(color='1B2A4A' if required else 'FFFFFF', bold=True, size=10)
        cell.alignment = center
        cell.border = thin_border
        if comment:
            from openpyxl.comments import Comment
            cell.comment = Comment(comment, 'ESP Import')
    ws.row_dimensions[2].height = 24

    # Exemple
    for col_idx, (_, example, _, _) in enumerate(columns, start=1):
        cell = ws.cell(row=3, column=col_idx, value=example)
        cell.fill = example_fill
        cell.font = Font(color='1B2A4A', size=10)
        cell.alignment = left
        cell.border = thin_border
    ws.row_dimensions[3].height = 18

    # Zones de saisie
    empty_fill = PatternFill('solid', fgColor='FFFFFF')
    alt_fill   = PatternFill('solid', fgColor='F5F7FB')
    for row_idx in range(4, 54):
        fill = empty_fill if row_idx % 2 == 0 else alt_fill
        for col_idx in range(1, len(columns) + 1):
            cell = ws.cell(row=row_idx, column=col_idx, value='')
            cell.fill = fill
            cell.font = Font(size=10)
            cell.alignment = left
            cell.border = thin_border
        ws.row_dimensions[row_idx].height = 16

    ws.freeze_panes = 'A3'
    ws.auto_filter.ref = f'A2:{get_column_letter(len(columns))}2'

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def generate_csv_template():
    headers = [
        'matricule', 'nom_famille', 'prenom', 'nni', 'sexe', 'date_naissance',
        'lieu_naissance', 'nationalite', 'email_perso', 'telephone',
        'adresse_primaire', 'num_bac', 'serie_bac', 'categorie_bac',
        'moyenne_bac', 'ecole_bac', 'date_premiere_inscription', 'voie_acces',
        'diplome_acces', 'departement', 'niveau', 'semestre', 'parcours',
        'groupe_sanguin', 'poids_kg', 'taille_cm',
        'tel_urgence', 'nom_urgence', 'tel_pere', 'tel_mere',
    ]
    example = [
        '12001', 'Ould Ahmed', 'Mohamed', '9800123456', 'H', '2002-05-15',
        'Nouakchott', 'Mauritanienne', 'med@gmail.com', '22334455',
        'Tevragh Zeina', 'BAC-2021-001', 'C', 'National',
        '14.50', 'Lycée Nationale', '2024-09-01', '1',
        'Baccalauréat', 'IRT', '3', 'S1', 'En cours normal',
        'O+', '72', '178', '20001122', 'Père', '20001122', '20009988',
    ]
    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=';')
    writer.writerow(headers)
    writer.writerow(example)
    return buf.getvalue()
