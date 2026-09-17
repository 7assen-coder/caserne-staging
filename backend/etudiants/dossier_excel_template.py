"""
Unified dossier élève Excel template (drivers only — no pièces).

Single sheet « Etudiants » with hidden ref columns for dropdowns.
Phase 1 preview. Import/export force comes later.
"""
from __future__ import annotations

from datetime import date
from io import BytesIO
from pathlib import Path

from etudiants.dossier_excel_geo import COMMUNE_AUTRE_LABEL, PAYS_LIST, WILAYAS_MR

# ── Column groups (header colors) ─────────────────────────────────────────────

GROUP_COLORS = {
    'identite': '1B2A4A',
    'bac': '2D3E5F',
    'scolarite': '1B4D3E',
    'mobilite': '5C4A1F',
    'contacts': '3D2A5C',
    'sante': '5C1F2A',
    'militaire': '1F3A5C',
    'hebergement': '3A3A3A',
}

DATE_COMMENT = (
    'JJ/MM/AAAA (calendrier Excel). '
    'À l’import, - / \\ sont acceptés. Pas le format AAAA-MM-JJ.'
)

# (header, group, select_list_key|None, comment)
# select_list_key: short list key, 'pays', 'wilaya', 'communes', or None
COLUMNS: list[tuple[str, str, str | None, str]] = [
    ('matricule', 'identite', None, 'Matricule (chiffres, max 6).'),
    ('nom_famille', 'identite', None, 'Nom de famille.'),
    ('prenom', 'identite', None, 'Prénom(s).'),
    ('nni', 'identite', None, 'NNI 10 chiffres.'),
    ('sexe', 'identite', 'sexe', 'M ou F.'),
    ('date_naissance', 'identite', None, DATE_COMMENT),
    ('nationalite', 'identite', 'pays', 'Tous les pays (liste complète).'),
    (
        'wilaya_naissance',
        'identite',
        'wilaya',
        'Si nationalité = Mauritanie. Sinon laisser vide.',
    ),
    (
        'commune_naissance',
        'identite',
        'communes',
        'Choisir la wilaya d’abord, puis une commune de cette wilaya (ou Autre).',
    ),
    (
        'commune_naissance_autre',
        'identite',
        None,
        'Si commune = Autre (préciser).',
    ),
    (
        'lieu_naissance',
        'identite',
        None,
        'Si nationalité ≠ Mauritanie (texte libre).',
    ),
    ('num_bac', 'bac', None, '1 à 5 chiffres.'),
    ('categorie_bac', 'bac', 'categorie_bac', 'National ou Etranger.'),
    ('serie_bac', 'bac', 'serie_bac', 'C, D, TMGM, TSGM, Etrangere.'),
    ('moyenne_bac', 'bac', None, 'Ex. 12,50 (0–20).'),
    ('ecole_bac', 'bac', None, 'Établissement du bac.'),
    ('departement', 'scolarite', 'departement', 'GM, IRT, GC-HE, GE, SID, MPG.'),
    (
        'niveau',
        'scolarite',
        'niveau',
        '3e année | 4e année | 4e DD | 5e E | 5e DD.',
    ),
    (
        'statut_academique',
        'scolarite',
        'statut',
        'Redoublant ICI — jamais dans voie_acces.',
    ),
    (
        'annee_univ_1ere',
        'scolarite',
        'annee_univ',
        'Année universitaire AAAA-AAAA.',
    ),
    (
        'date_premiere_inscription',
        'scolarite',
        None,
        DATE_COMMENT,
    ),
    (
        'voie_acces',
        'scolarite',
        'voie',
        'Obligatoire en 3e année (1–4). En 4e/5e : optionnel, conserver l’historique.',
    ),
    (
        'diplome_acces',
        'scolarite',
        'diplome',
        'CNIM, Licence, Prépa étrangère.',
    ),
    ('etablissement_diplome', 'scolarite', None, 'Établissement du diplôme d’accès.'),
    (
        'etablissement_mobilite',
        'mobilite',
        None,
        'Uniquement si niveau = 4e DD, 5e E ou 5e DD.',
    ),
    (
        'specialite_mobilite',
        'mobilite',
        None,
        'Uniquement si mobilité applicable.',
    ),
    (
        'annee_debut_mobilite',
        'mobilite',
        'annee_univ',
        'AAAA-AAAA. Type et année de fin = automatiques.',
    ),
    ('adresse_primaire', 'contacts', None, ''),
    ('adresse_secondaire', 'contacts', None, ''),
    ('telephone', 'contacts', None, '8 chiffres.'),
    ('tel2', 'contacts', None, '8 chiffres (WhatsApp).'),
    ('email_perso', 'contacts', None, 'Email personnel (pas @esp.mr).'),
    ('resident_avec_parents', 'contacts', 'oui_non', 'Oui ou Non.'),
    ('prenom_pere', 'contacts', None, ''),
    ('nom_famille_pere', 'contacts', None, ''),
    ('fonction_pere', 'contacts', None, ''),
    ('prenom_mere', 'contacts', None, ''),
    ('nom_famille_mere', 'contacts', None, ''),
    ('fonction_mere', 'contacts', None, ''),
    ('tel_pere', 'contacts', None, '8 chiffres.'),
    ('tel_pere_whatsapp', 'contacts', None, '8 chiffres.'),
    ('tel_mere', 'contacts', None, '8 chiffres.'),
    ('tel_mere_whatsapp', 'contacts', None, '8 chiffres.'),
    ('nom_urgence', 'contacts', None, ''),
    ('tel_urgence', 'contacts', None, '8 chiffres.'),
    ('tel_urgence_whatsapp', 'contacts', None, '8 chiffres.'),
    ('groupe_sanguin', 'sante', 'groupe_sanguin', ''),
    ('num_assure', 'sante', None, ''),
    ('assureur', 'sante', None, 'Liste séparée par virgules si besoin.'),
    ('antecedents_medicaux', 'sante', None, ''),
    ('maladies_chroniques', 'sante', None, ''),
    ('medicaments', 'sante', None, ''),
    ('poids_kg', 'sante', None, 'IMC calculé automatiquement (ne pas saisir).'),
    ('taille_cm', 'sante', None, ''),
    ('compte_bankily', 'militaire', None, '8 chiffres (optionnel).'),
    ('sport_pratique', 'militaire', None, ''),
    ('tour_poitrine', 'militaire', None, ''),
    ('tour_ceinture', 'militaire', None, ''),
    ('tour_taille', 'militaire', None, ''),
    ('tour_bassin', 'militaire', None, ''),
    ('tour_cou', 'militaire', None, ''),
    ('longueur_manche', 'militaire', None, ''),
    ('longueur_dos', 'militaire', None, ''),
    ('longueur_cote', 'militaire', None, ''),
    ('pointure', 'militaire', None, ''),
    ('batiment', 'hebergement', None, ''),
    ('etage', 'hebergement', None, ''),
    ('aile', 'hebergement', None, ''),
    ('chambre', 'hebergement', None, ''),
    ('lit', 'hebergement', None, ''),
    ('responsable_chambre', 'hebergement', 'oui_non', 'Oui ou Non.'),
    ('responsable_aile', 'hebergement', 'oui_non', 'Oui ou Non.'),
    ('responsable_etage', 'hebergement', 'oui_non', 'Oui ou Non.'),
]

COLUMN_HEADERS = [c[0] for c in COLUMNS]
DATE_COLUMNS = {'date_naissance', 'date_premiere_inscription'}


def _build_academic_years(now: date | None = None, span: int = 8) -> list[str]:
    now = now or date.today()
    y = now.year
    m = now.month
    start = y if m >= 9 else y - 1
    out = []
    for i in range(span):
        a = start - i
        out.append(f'{a}-{a + 1}')
    return out


SHORT_LISTS: dict[str, list[str]] = {
    'sexe': ['M', 'F'],
    'categorie_bac': ['National', 'Etranger'],
    'serie_bac': ['C', 'D', 'TMGM', 'TSGM', 'Etrangere'],
    'departement': ['GM', 'IRT', 'GC-HE', 'GE', 'SID', 'MPG'],
    'niveau': ['3e année', '4e année', '4e DD', '5e E', '5e DD'],
    'statut': ['Normal', 'Normal-MNV', 'Redoublant', 'Exclu', 'Diplômé'],
    'voie': ['1', '2', '3', '4'],
    'diplome': ['CNIM', 'Licence', 'Prépa étrangère'],
    'groupe_sanguin': ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
    'oui_non': ['Oui', 'Non'],
    'annee_univ': _build_academic_years(),
}


def all_communes_list() -> list[str]:
    """Flat commune list (Numbers-safe) + Autre."""
    seen: set[str] = set()
    out: list[str] = []
    for w in WILAYAS_MR:
        for c in w['communes']:
            if c not in seen:
                seen.add(c)
                out.append(c)
    out.append(COMMUNE_AUTRE_LABEL)
    return out


def _sample_rows() -> list[dict]:
    years = SHORT_LISTS['annee_univ']
    y0 = years[0] if years else '2025-2026'
    y1 = years[1] if len(years) > 1 else y0
    y2 = years[2] if len(years) > 2 else y0
    return [
        {
            'matricule': '251280',
            'nom_famille': 'Ould Ahmed',
            'prenom': 'Mohamed',
            'nni': '9800123456',
            'sexe': 'M',
            'date_naissance': date(2002, 5, 15),
            'nationalite': 'Mauritanie',
            'wilaya_naissance': 'Nouakchott-Ouest',
            'commune_naissance': 'Tevragh-Zeïna',
            'commune_naissance_autre': '',
            'lieu_naissance': '',
            'num_bac': '12345',
            'categorie_bac': 'National',
            'serie_bac': 'C',
            'moyenne_bac': '14,50',
            'ecole_bac': 'Lycée National',
            'departement': 'IRT',
            'niveau': '3e année',
            'statut_academique': 'Normal',
            'annee_univ_1ere': y0,
            'date_premiere_inscription': date(int(y0[:4]), 9, 1),
            'voie_acces': '1',
            'diplome_acces': 'CNIM',
            'etablissement_diplome': 'IPGEI',
            'etablissement_mobilite': '',
            'specialite_mobilite': '',
            'annee_debut_mobilite': '',
            'adresse_primaire': 'Tevragh-Zeina',
            'adresse_secondaire': '',
            'telephone': '31234567',
            'tel2': '',
            'email_perso': 'med.ahmed@gmail.com',
            'resident_avec_parents': 'Oui',
            'prenom_pere': 'Ahmed',
            'nom_famille_pere': 'Ould Ahmed',
            'fonction_pere': 'Commerçant',
            'prenom_mere': 'Fatimata',
            'nom_famille_mere': 'Mint Mohamed',
            'fonction_mere': '',
            'tel_pere': '42001122',
            'tel_pere_whatsapp': '',
            'tel_mere': '42009988',
            'tel_mere_whatsapp': '',
            'nom_urgence': 'Père',
            'tel_urgence': '42001122',
            'tel_urgence_whatsapp': '',
            'groupe_sanguin': 'O+',
            'num_assure': '',
            'assureur': '',
            'antecedents_medicaux': '',
            'maladies_chroniques': '',
            'medicaments': '',
            'poids_kg': '72',
            'taille_cm': '178',
            'compte_bankily': '',
            'sport_pratique': 'Football',
            'tour_poitrine': '96',
            'tour_ceinture': '82',
            'tour_taille': '88',
            'tour_bassin': '98',
            'tour_cou': '38',
            'longueur_manche': '64',
            'longueur_dos': '72',
            'longueur_cote': '45',
            'pointure': '43',
            'batiment': 'A',
            'etage': '2',
            'aile': 'Nord',
            'chambre': '12',
            'lit': '1',
            'responsable_chambre': 'Non',
            'responsable_aile': 'Non',
            'responsable_etage': 'Non',
        },
        {
            'matricule': '241105',
            'nom_famille': 'Mint Sidi',
            'prenom': 'Aicha',
            'nni': '9900112233',
            'sexe': 'F',
            'date_naissance': date(2001, 11, 2),
            'nationalite': 'Mauritanie',
            'wilaya_naissance': 'Trarza',
            'commune_naissance': 'Rosso',
            'commune_naissance_autre': '',
            'lieu_naissance': '',
            'num_bac': '54321',
            'categorie_bac': 'National',
            'serie_bac': 'D',
            'moyenne_bac': '15,20',
            'ecole_bac': 'Lycée de Rosso',
            'departement': 'GE',
            'niveau': '4e DD',
            'statut_academique': 'Normal',
            'annee_univ_1ere': y1,
            'date_premiere_inscription': date(2023, 9, 1),
            'voie_acces': '2',
            'diplome_acces': 'Licence',
            'etablissement_diplome': 'ESP',
            'etablissement_mobilite': 'INSA Lyon',
            'specialite_mobilite': 'Génie électrique',
            'annee_debut_mobilite': y0,
            'adresse_primaire': 'Ksar',
            'adresse_secondaire': '',
            'telephone': '36112233',
            'tel2': '36112233',
            'email_perso': 'aicha.sidi@gmail.com',
            'resident_avec_parents': 'Non',
            'prenom_pere': 'Sidi',
            'nom_famille_pere': 'Ould Baba',
            'fonction_pere': '',
            'prenom_mere': 'Mariem',
            'nom_famille_mere': 'Mint Sidi',
            'fonction_mere': '',
            'tel_pere': '42003344',
            'tel_pere_whatsapp': '',
            'tel_mere': '',
            'tel_mere_whatsapp': '',
            'nom_urgence': 'Père',
            'tel_urgence': '42003344',
            'tel_urgence_whatsapp': '',
            'groupe_sanguin': 'A+',
            'num_assure': '',
            'assureur': '',
            'antecedents_medicaux': '',
            'maladies_chroniques': '',
            'medicaments': '',
            'poids_kg': '58',
            'taille_cm': '165',
            'compte_bankily': '36112233',
            'sport_pratique': 'Course',
            'tour_poitrine': '',
            'tour_ceinture': '',
            'tour_taille': '',
            'tour_bassin': '',
            'tour_cou': '',
            'longueur_manche': '',
            'longueur_dos': '',
            'longueur_cote': '',
            'pointure': '38',
            'batiment': 'B',
            'etage': '1',
            'aile': 'Sud',
            'chambre': '5',
            'lit': '2',
            'responsable_chambre': 'Oui',
            'responsable_aile': 'Non',
            'responsable_etage': 'Non',
        },
        {
            'matricule': '231050',
            'nom_famille': 'Ba',
            'prenom': 'Ibrahima',
            'nni': '9700556677',
            'sexe': 'M',
            'date_naissance': date(2000, 3, 20),
            'nationalite': 'Sénégal',
            'wilaya_naissance': '',
            'commune_naissance': '',
            'commune_naissance_autre': '',
            'lieu_naissance': 'Dakar',
            'num_bac': '9988',
            'categorie_bac': 'Etranger',
            'serie_bac': 'Etrangere',
            'moyenne_bac': '13,80',
            'ecole_bac': 'Lycée Blaise Diagne',
            'departement': 'SID',
            'niveau': '5e E',
            'statut_academique': 'Redoublant',
            'annee_univ_1ere': y2,
            'date_premiere_inscription': date(2022, 9, 1),
            'voie_acces': '',
            'diplome_acces': 'Prépa étrangère',
            'etablissement_diplome': 'Prépa Dakar',
            'etablissement_mobilite': 'Polytechnique Montréal',
            'specialite_mobilite': 'Science des données',
            'annee_debut_mobilite': y0,
            'adresse_primaire': 'Tevragh-Zeina',
            'adresse_secondaire': '',
            'telephone': '37001122',
            'tel2': '',
            'email_perso': 'ibrahima.ba@gmail.com',
            'resident_avec_parents': 'Non',
            'prenom_pere': 'Moussa',
            'nom_famille_pere': 'Ba',
            'fonction_pere': '',
            'prenom_mere': '',
            'nom_famille_mere': '',
            'fonction_mere': '',
            'tel_pere': '221771234567',
            'tel_pere_whatsapp': '',
            'tel_mere': '',
            'tel_mere_whatsapp': '',
            'nom_urgence': 'Père',
            'tel_urgence': '221771234567',
            'tel_urgence_whatsapp': '',
            'groupe_sanguin': 'B+',
            'num_assure': '',
            'assureur': '',
            'antecedents_medicaux': '',
            'maladies_chroniques': '',
            'medicaments': '',
            'poids_kg': '80',
            'taille_cm': '182',
            'compte_bankily': '',
            'sport_pratique': 'Basket',
            'tour_poitrine': '100',
            'tour_ceinture': '86',
            'tour_taille': '',
            'tour_bassin': '',
            'tour_cou': '',
            'longueur_manche': '',
            'longueur_dos': '',
            'longueur_cote': '',
            'pointure': '44',
            'batiment': '',
            'etage': '',
            'aile': '',
            'chambre': '',
            'lit': '',
            'responsable_chambre': 'Non',
            'responsable_aile': 'Non',
            'responsable_etage': 'Non',
        },
    ]


def _write_list_column(ws, col: int, header: str, values: list[str], start_row: int = 1):
    from openpyxl.utils import get_column_letter

    ws.cell(start_row, col, header)
    for i, val in enumerate(values, start=start_row + 1):
        ws.cell(i, col, val)
    end = start_row + len(values)
    letter = get_column_letter(col)
    return f'${letter}${start_row + 1}:${letter}${end}'


def build_dossier_workbook():
    """Return an openpyxl Workbook — single sheet Etudiants."""
    import openpyxl
    from openpyxl.comments import Comment
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter
    from openpyxl.worksheet.datavalidation import DataValidation

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'Etudiants'

    navy = PatternFill('solid', fgColor='1B2A4A')
    thin = Border(
        left=Side(style='thin', color='D1D9E6'),
        right=Side(style='thin', color='D1D9E6'),
        top=Side(style='thin', color='D1D9E6'),
        bottom=Side(style='thin', color='D1D9E6'),
    )
    center = Alignment(horizontal='center', vertical='center', wrap_text=True)
    left = Alignment(horizontal='left', vertical='center')

    n_cols = len(COLUMNS)
    ws.merge_cells(f'A1:{get_column_letter(n_cols)}1')
    banner = ws['A1']
    banner.value = 'POLYSPACE — Modèle d’import dossier élève'
    banner.font = Font(color='FFFFFF', bold=True, size=12)
    banner.fill = navy
    banner.alignment = Alignment(horizontal='left', vertical='center', indent=1)
    ws.row_dimensions[1].height = 30

    header_row = 2
    for col_idx, (name, group, _lk, comment) in enumerate(COLUMNS, start=1):
        cell = ws.cell(header_row, col_idx, name)
        cell.fill = PatternFill('solid', fgColor=GROUP_COLORS[group])
        cell.font = Font(color='FFFFFF', bold=True, size=9)
        cell.alignment = center
        cell.border = thin
        if comment:
            cell.comment = Comment(comment, 'Polyspace', width=300, height=90)
    ws.row_dimensions[header_row].height = 36
    ws.freeze_panes = 'A3'

    samples = _sample_rows()
    example_fill = PatternFill('solid', fgColor='F9F4E8')
    for row_offset, sample in enumerate(samples):
        r = 3 + row_offset
        for col_idx, (name, _, _, _) in enumerate(COLUMNS, start=1):
            val = sample.get(name, '')
            cell = ws.cell(r, col_idx, val)
            cell.fill = example_fill
            cell.font = Font(color='1B2A4A', size=9)
            cell.alignment = left
            cell.border = thin
            if name in DATE_COLUMNS and isinstance(val, date):
                cell.number_format = 'DD/MM/YYYY'
        ws.row_dimensions[r].height = 18

    empty_fill = PatternFill('solid', fgColor='FFFFFF')
    alt_fill = PatternFill('solid', fgColor='F5F7FB')
    data_end = 3 + len(samples) + 50
    for row_idx in range(3 + len(samples), data_end):
        fill = empty_fill if row_idx % 2 == 0 else alt_fill
        for col_idx, (name, _, _, _) in enumerate(COLUMNS, start=1):
            cell = ws.cell(row_idx, col_idx, None if name in DATE_COLUMNS else '')
            cell.fill = fill
            cell.border = thin
            cell.font = Font(size=9)
            if name in DATE_COLUMNS:
                cell.number_format = 'DD/MM/YYYY'
        ws.row_dimensions[row_idx].height = 16

    for col_idx, (name, _, _, _) in enumerate(COLUMNS, start=1):
        width = max(12, min(22, len(name) + 2))
        ws.column_dimensions[get_column_letter(col_idx)].width = width

    # ── Ref lists BELOW the table (no columns after responsable_etage) ──────
    # Numbers does not support INDIRECT in data validation — use flat ranges.
    ref_row = data_end + 5
    list_ranges: dict[str, str] = {}
    col = 1

    list_ranges['pays'] = _write_list_column(ws, col, '_pays', list(PAYS_LIST), ref_row)
    col += 1
    wilaya_names = [w['nom'] for w in WILAYAS_MR]
    list_ranges['wilaya'] = _write_list_column(ws, col, '_wilayas', wilaya_names, ref_row)
    col += 1
    list_ranges['communes'] = _write_list_column(
        ws, col, '_communes', all_communes_list(), ref_row
    )
    col += 1
    for key, values in SHORT_LISTS.items():
        list_ranges[key] = _write_list_column(ws, col, f'_{key}', values, ref_row)
        col += 1

    max_ref_rows = max(len(PAYS_LIST), len(all_communes_list()), 20) + 2
    for r in range(ref_row, ref_row + max_ref_rows):
        ws.row_dimensions[r].hidden = True

    max_data_row = data_end - 1
    first_data_row = 3

    for col_idx, (name, _, list_key, _) in enumerate(COLUMNS, start=1):
        if not list_key or list_key not in list_ranges:
            continue
        letter = get_column_letter(col_idx)
        sqref = f'{letter}{first_data_row}:{letter}{max_data_row}'
        dv = DataValidation(
            type='list',
            formula1=list_ranges[list_key],
            allow_blank=True,
            showDropDown=False,
        )
        dv.error = 'Choisissez une valeur de la liste'
        dv.errorTitle = name
        dv.add(sqref)
        ws.add_data_validation(dv)

    for extra in list(wb.sheetnames):
        if extra != 'Etudiants':
            del wb[extra]

    return wb


def workbook_to_bytes(wb=None) -> bytes:
    wb = wb or build_dossier_workbook()
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def write_desktop_template(path: Path | None = None) -> Path:
    desktop = Path.home() / 'Desktop'
    desktop.mkdir(parents=True, exist_ok=True)
    target = path or (desktop / 'Polyspace_modele_dossier_eleve.xlsx')
    wb = build_dossier_workbook()
    wb.save(target)
    return target.resolve()


def main():
    out = write_desktop_template()
    print(f'Wrote {out}')
    print(f'Columns: {len(COLUMN_HEADERS)}')
    print(f'Pays: {len(PAYS_LIST)} · Wilayas: {len(WILAYAS_MR)}')


if __name__ == '__main__':
    main()
