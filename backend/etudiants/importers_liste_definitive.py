"""
Liste définitive (3A/4A) Excel mapping helpers.

Field matrix (Excel → model):
  Matricule              → Eleve.matricule
  Nom et Prénom          → prenom (before first space) + nom_famille (rest)
  Département            → DossierAcademique.departement (GC → GC-HE)
  Voie + Institut        → voie_acces 1–4 OR parcours Redoublant
  S / Sexe               → sexe (F / H)
  Institut               → etablissement_diplome
  NNI                    → nni (blank → NULL)
  Date de naissance      → date_naissance (blank → NULL)
  Lieu de naissance      → lieu_naissance
  Mail / e-mail personnel→ email_perso only (never email_pro)
  Tél                    → tel1
  Sheet name 3A / 4A     → niveau_actuel 3 / 4

Absent from file (left blank on import): Bac block, adresse, diplome_acces,
date_premiere_inscription, nationalite, etc. Always profil_incomplet=True.
"""

from __future__ import annotations

import re
import unicodedata
from datetime import date, datetime

FORMAT_LISTE_3A = 'liste_definitive_3a'
FORMAT_LISTE_4A = 'liste_definitive_4a'
FORMAT_LEGACY = 'legacy'

VOIE2_INTERNE = {
    'ISMS', 'ISS', 'ISME', 'ISE', 'IS2M', 'ISGM', 'ISM',
}

DEPT_MAP_LISTE = {
    'IRT': 'IRT', 'SID': 'SID', 'GE': 'GE',
    'GM': 'GM', 'GC': 'GC-HE', 'GC-HE': 'GC-HE', 'MPG': 'MPG',
    'INFORMATIQUE RESEAUX ET TELECOMMUNICATIONS': 'IRT',
    'STATISTIQUE ET INGENIERIE DES DONNEES': 'SID',
    'GENIE ELECTRIQUE': 'GE',
    'GENIE MECANIQUE': 'GM',
    'GENIE CIVIL': 'GC-HE',
    'MINES PETROLE ET GAZ': 'MPG',
    'GC HE': 'GC-HE',
}


def _norm(v) -> str:
    s = unicodedata.normalize('NFD', str(v or '')).encode('ascii', 'ignore').decode()
    return s.strip().upper()


def _norm_header(h: str) -> str:
    s = unicodedata.normalize('NFD', str(h or ''))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'\s+', ' ', s).strip().lower()


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


def split_nom_prenom(full: str) -> tuple[str, str]:
    """First token → prénom; remainder → nom. No space → prenom only."""
    s = str(full or '').strip()
    if not s:
        return '', ''
    parts = s.split(None, 1)
    if len(parts) == 1:
        return parts[0], ''
    return parts[0], parts[1]


def niveau_from_sheet_name(name: str) -> str:
    """Extract 3A/4A from sheet title (ignore text before/after)."""
    s = str(name or '')
    m = re.search(r'(?<![A-Za-z0-9])([34])A(?![A-Za-z0-9])', s, flags=re.IGNORECASE)
    if not m:
        return ''
    return m.group(1)


def _institut_is_voie2_interne(institut: str) -> bool:
    n = _norm(institut).replace(' ', '').replace('-', '')
    if not n:
        return False
    if n in VOIE2_INTERNE:
        return True
    if n.startswith('ISMBTPU') or n.startswith('ISMBTP'):
        return True
    if 'ISM' in n and 'BTPU' in n:
        return True
    return False


def map_voie_institut(voie: str, institut: str) -> dict:
    """Returns voie_acces ('' or '1'..'4') and parcours."""
    v = _norm(voie)
    if not v:
        return {'voie_acces': '', 'parcours': 'En cours normal'}
    if 'REDOUBL' in v:
        return {'voie_acces': '', 'parcours': 'Redoublant'}

    inst = _norm(institut)
    is_ipgei = 'IPGEI' in inst.replace(' ', '')

    if 'VOIE 1' in v or re.search(r'(^|\s)1(\s|$)', v):
        return {
            'voie_acces': '1' if is_ipgei else '2',
            'parcours': 'En cours normal',
        }
    if 'VOIE 2' in v or re.search(r'(^|\s)2(\s|$)', v):
        return {
            'voie_acces': '3' if _institut_is_voie2_interne(institut) else '4',
            'parcours': 'En cours normal',
        }
    return {'voie_acces': '', 'parcours': 'En cours normal'}


def map_sexe(raw) -> str:
    n = _norm(raw)
    if n.startswith('F'):
        return 'F'
    return 'H'


def normalize_dept_liste(raw: str):
    """Resolve département; GC → GC-HE."""
    if not raw or not str(raw).strip():
        return None
    n = _norm(raw)
    if n in DEPT_MAP_LISTE:
        return DEPT_MAP_LISTE[n]
    n2 = n.replace('-', '').replace(' ', '')
    for key, code in DEPT_MAP_LISTE.items():
        if key.replace('-', '').replace(' ', '') == n2:
            return code
    return None


# Compagnie digit from niveau cycle: 3→1, 4→2, 5→3
DEPT_SECTION_DIGIT = {
    'IRT': '1', 'SID': '1',
    'GM': '2', 'GE': '2',
    'GC-HE': '3', 'GC': '3', 'MPG': '3',
}


def cycle_from_niveau(niveau: str) -> int | None:
    """
    Academic cycle → compagnie digit base.
    3 / 3A → 3 (1re Compagnie)
    4 / 4A / 4-DD → 4 (2e Compagnie)
    4-E / 5-DD / 5* → 5 (3e Compagnie)
    """
    raw = str(niveau or '').strip()
    if not raw:
        return None
    n = _norm(raw).replace(' ', '')
    # Explicit mobility / late-cycle codes first
    if n in ('4-E', '4E') or n.startswith('5'):
        return 5
    if '5E' in n or n.endswith('E') and n.startswith('4') and 'DD' not in n:
        return 5
    if n.startswith('3'):
        return 3
    if n.startswith('4'):
        return 4
    return None


def compagnie_from_niveau(niveau: str) -> str:
    cycle = cycle_from_niveau(niveau)
    if cycle == 3:
        return '1re Compagnie'
    if cycle == 4:
        return '2e Compagnie'
    if cycle == 5:
        return '3e Compagnie'
    return ''


def section_from_dept_niveau(departement: str, niveau: str) -> str:
    """Compound section: Section {compagnieDigit}{deptDigit} e.g. Section 11."""
    cycle = cycle_from_niveau(niveau)
    if cycle == 3:
        compagnie_digit = '1'
    elif cycle == 4:
        compagnie_digit = '2'
    elif cycle == 5:
        compagnie_digit = '3'
    else:
        return ''

    resolved = normalize_dept_liste(departement) if departement else None
    code = resolved or _norm(departement).replace(' ', '')
    if code == 'GCHE':
        code = 'GC-HE'
    dept_digit = DEPT_SECTION_DIGIT.get(code)
    if not dept_digit:
        return ''
    return f'Section {compagnie_digit}{dept_digit}'


def dossier_militaire_from_niveau_dept(niveau: str, departement: str) -> dict:
    return {
        'compagnie': compagnie_from_niveau(niveau),
        'section': section_from_dept_niveau(departement, niveau),
        'sport_pratique': '',
    }


def pick_liste_sheet(sheetnames: list) -> str | None:
    for name in sheetnames:
        if niveau_from_sheet_name(name):
            return name
    return sheetnames[0] if sheetnames else None


def detect_import_format(headers: list, sheet_name: str = '') -> str:
    norms = {_norm_header(h) for h in headers if h is not None}
    has_full_name = 'nom et prenom' in norms
    has_legacy_name = bool(norms & {'nom_famille', 'prenom', 'nom', 'prenoms'})
    has_mat = any(h.startswith('matricule') for h in norms)

    if has_full_name and has_mat:
        niveau = niveau_from_sheet_name(sheet_name)
        if niveau == '3':
            missing = [
                c for c in ('matricule', 'nom et prenom', 'departement', 'voie')
                if c not in norms
            ]
            if missing:
                raise ValueError(
                    'Fichier liste définitive 3A incomplet. '
                    f'Colonnes manquantes : {", ".join(missing)}.'
                )
            return FORMAT_LISTE_3A
        if niveau == '4':
            missing = [
                c for c in ('matricule', 'nom et prenom', 'departement')
                if c not in norms
            ]
            if missing:
                raise ValueError(
                    'Fichier liste définitive 4A incomplet. '
                    f'Colonnes manquantes : {", ".join(missing)}.'
                )
            return FORMAT_LISTE_4A
        raise ValueError(
            f'Feuille « {sheet_name} » : indiquez 3A ou 4A dans le nom de la feuille '
            '(ex. « 3A », « Liste 4A »).'
        )

    if has_mat and has_legacy_name:
        return FORMAT_LEGACY

    raise ValueError(
        'Format de fichier non reconnu. Utilisez une liste définitive 3A/4A '
        '(colonne « Nom et Prénom ») ou le modèle d’import classique '
        '(colonnes nom / prénom / niveau).'
    )


def _pick_row(row: dict, *keys: str) -> str:
    normed = {_norm_header(k): v for k, v in row.items()}
    for key in keys:
        v = normed.get(_norm_header(key))
        if v is not None and str(v).strip() != '':
            return str(v).strip()
    return ''


def _empty_to_none(s: str):
    return s if s else None


class ListeDefinitiveMapper:
    """Map one liste-définitive row → Eleve + DossierAcademique payloads (no DB)."""

    FATAL = frozenset({'matricule', 'nom_prenom', 'niveau', 'departement'})

    def map(self, row: dict, row_num: int, sheet_name: str):
        errors = []

        def err(field, msg):
            errors.append({'row': row_num, 'field': field, 'message': msg})

        full_name = _pick_row(row, 'Nom et Prénom', 'nom et prenom', 'Nom Complet')
        prenom, nom_famille = split_nom_prenom(full_name)
        if not prenom:
            err('nom_prenom', 'Champ « Nom et Prénom » obligatoire manquant')

        matricule_raw = _pick_row(row, 'Matricule', 'matricule')
        try:
            matricule = int(re.sub(r'\D', '', matricule_raw))
            if matricule <= 0:
                raise ValueError
        except (ValueError, TypeError):
            matricule = None
            err('matricule', f'Valeur invalide : "{matricule_raw}"')

        niveau = niveau_from_sheet_name(sheet_name)
        if not niveau:
            err('niveau', f'Niveau introuvable dans le nom de feuille « {sheet_name} ».')

        dept_raw = _pick_row(row, 'Département', 'Departement', 'département')
        dept_code = normalize_dept_liste(dept_raw)
        if dept_raw and dept_code is None:
            err(
                'departement',
                f'Département inconnu : "{dept_raw}". Valeurs : IRT, GE, GM, GC-HE, SID, MPG.',
            )
        if not dept_raw:
            err('departement', 'Département obligatoire manquant')
            dept_code = None

        voie_raw = _pick_row(row, 'Voie', 'voie')
        institut = _pick_row(row, 'Institut', 'institut', 'Établissement')
        voie_info = map_voie_institut(voie_raw, institut)

        sexe = map_sexe(_pick_row(row, 'S', 'Sexe', 'sexe', 'genre'))

        nni_raw = _pick_row(row, 'NNI', 'nni')
        nni = None
        if nni_raw:
            digits = re.sub(r'\D', '', nni_raw)
            nni = digits[:10] if digits else None

        date_naissance = _parse_date(
            _pick_row(row, 'Date de naissance', 'date_naissance', 'naissance')
        )

        email = _pick_row(
            row,
            'Mail Personnel',
            'e-mail personnel',
            'email personnel',
            'mail personnel',
            'email_perso',
        )
        tel = re.sub(
            r'\D', '',
            _pick_row(row, 'Tél', 'Tel', 'Téléphone', 'telephone', 'tel1'),
        )
        if len(tel) > 8:
            tel = tel[-8:]

        lieu = _pick_row(row, 'Lieu de naissance', 'lieu_naissance', 'lieu')

        eleve_data = dict(
            matricule=matricule,
            num_bac='',
            nni=nni,
            sexe=sexe,
            prenom=prenom,
            nom_famille=nom_famille,
            date_naissance=date_naissance,
            lieu_naissance=lieu,
            nationalite='',
            categorie_bac='',
            serie_bac='',
            moyenne_bac=None,
            ecole_bac='',
            date_premiere_inscription=None,
            voie_acces=voie_info['voie_acces'],
            diplome_acces='',
            etablissement_diplome=institut or '',
            adresse_primaire='',
            adresse_secondaire='',
            resident_avec_parents=True,
            compte_bankily='',
            email_perso=_empty_to_none(email),
            tel1=tel or '',
            tel2_whatsapp='',
            profil_incomplet=True,
        )

        da_data = dict(
            departement=dept_code or 'IRT',
            niveau_actuel=niveau or '3',
            semestre_actuel='S1',
            donnees_semestres={},
            parcours=voie_info['parcours'],
            diplome='',
            etablissement_echange='',
            etablissement_double_diplome='',
            specialite_mobilite='',
        )

        dm_data = dossier_militaire_from_niveau_dept(niveau or '3', dept_code or '')

        return {
            'eleve': eleve_data,
            'dossier_academique': da_data,
            'dossier_militaire': dm_data,
            'dossier_sante': None,
            'contact_parent': None,
        }, errors
