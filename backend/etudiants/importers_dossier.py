"""
Dossier Excel import — sole accepted format (COLUMN_HEADERS).
Rejects liste définitive 3A/4A and legacy templates.
"""
from __future__ import annotations

import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from etudiants.dossier_excel_template import COLUMN_HEADERS

FORMAT_DOSSIER = 'dossier'

CORE_HEADERS = frozenset(
    {'matricule', 'nom_famille', 'prenom', 'departement', 'niveau'}
)

NIVEAU_FORM_TO_CODE = {
    '3E ANNEE': '3',
    '3EME ANNEE': '3',
    '3': '3',
    '4E ANNEE': '4',
    '4EME ANNEE': '4',
    '4': '4',
    '4E DD': '4-DD',
    '4DD': '4-DD',
    '4-DD': '4-DD',
    '5E E': '4-E',
    '5E': '4-E',
    '4-E': '4-E',
    '5E DD': '5-DD',
    '5DD': '5-DD',
    '5-DD': '5-DD',
}

STATUT_TO_PARCOURS = {
    'NORMAL': 'En cours normal',
    'NORMAL-MNV': 'Normal-MNV',
    'NORMAL MNV': 'Normal-MNV',
    'REDOUBLANT': 'Redoublant',
    'EXCLU': 'Exclu',
    'DIPLOME': 'Diplômé',
    'DIPLÔMÉ': 'Diplômé',
}


def _norm(v):
    import unicodedata
    s = unicodedata.normalize('NFD', str(v or '')).encode('ascii', 'ignore').decode()
    return s.strip().upper()


def _parse_decimal(raw, default=None):
    try:
        return Decimal(str(raw).replace(',', '.').strip())
    except (InvalidOperation, TypeError, ValueError):
        return default


def _parse_date_flexible(raw):
    """JJ/MM/AAAA (and -/\\) or Excel date → ISO YYYY-MM-DD string or None."""
    if not raw:
        return None
    if isinstance(raw, datetime):
        return raw.date().isoformat()
    if isinstance(raw, date):
        return raw.isoformat()
    s = str(raw).strip().replace('\\', '/')
    for fmt in (
        '%d/%m/%Y',
        '%d-%m-%Y',
        '%Y-%m-%d',
        '%Y/%m/%d',
        '%d.%m.%Y',
    ):
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def _norm_niveau_dossier(raw: str) -> str:
    n = _norm(raw)
    compact = n.replace(' ', '').replace('-', '')
    for alias, code in NIVEAU_FORM_TO_CODE.items():
        if _norm(alias).replace(' ', '').replace('-', '') == compact:
            return code
    if n in NIVEAU_FORM_TO_CODE:
        return NIVEAU_FORM_TO_CODE[n]
    return NIVEAU_FORM_TO_CODE.get(compact, '')


def _oui_non(raw) -> bool | None:
    n = _norm(raw)
    if not n:
        return None
    if n in ('OUI', 'YES', 'TRUE', '1', 'O'):
        return True
    if n in ('NON', 'NO', 'FALSE', '0', 'N'):
        return False
    return None


def _parcours_from_statut(raw: str) -> str:
    n = _norm(raw)
    if not n:
        return 'En cours normal'
    if n in STATUT_TO_PARCOURS:
        return STATUT_TO_PARCOURS[n]
    if 'REDOUBL' in n:
        return 'Redoublant'
    if 'MNV' in n:
        return 'Normal-MNV'
    if 'EXCLU' in n:
        return 'Exclu'
    if 'DIPLOM' in n:
        return 'Diplômé'
    return 'En cours normal'


def _mobilite_type_from_niveau_code(niveau: str) -> str:
    if niveau == '4-E':
        return 'Semestre d’échange'
    if niveau in ('4-DD', '5-DD'):
        return 'Double diplôme'
    return ''


def _shift_academic_year(year_str: str, delta: int) -> str:
    m = re.match(r'^(\d{4})-(\d{4})$', (year_str or '').strip())
    if not m:
        return ''
    y0, y1 = int(m.group(1)), int(m.group(2))
    return f'{y0 + delta}-{y1 + delta}'


def _derive_annee_fin(annee_debut: str, type_mobilite: str) -> str:
    if not annee_debut:
        return ''
    if type_mobilite == 'Semestre d’échange':
        return annee_debut
    if type_mobilite == 'Double diplôme':
        return _shift_academic_year(annee_debut, 2)
    return ''


def find_dossier_header_row(rows: list) -> tuple[int, list[str]] | None:
    """Return (index, headers) for first row matching dossier COLUMN_HEADERS."""
    header_set = set(COLUMN_HEADERS)
    for i, row in enumerate(rows[:15]):
        cells = [str(c).strip() if c is not None else '' for c in row]
        non_empty = [c for c in cells if c]
        if not non_empty:
            continue
        hits = sum(1 for c in non_empty if c in header_set)
        if hits >= 5 and 'matricule' in non_empty:
            return i, cells
    return None


def looks_like_liste_or_legacy(headers: list[str]) -> str | None:
    norms = {_norm(h) for h in headers if h}
    if 'NOM ET PRENOM' in norms:
        return 'liste_definitive'
    if 'MATRICULE' in norms and (
        'NOM_FAMILLE' in norms or 'PRENOM' in norms or 'NOM' in norms
    ):
        if 'STATUT_ACADEMIQUE' not in norms and 'WILAYA_NAISSANCE' not in norms:
            snake_hits = sum(1 for h in headers if h in COLUMN_HEADERS)
            if snake_hits < 8:
                return 'legacy'
    return None


def detect_dossier_format(headers: list[str]) -> str:
    """Raise ValueError if not dossier; else return FORMAT_DOSSIER."""
    present = {h for h in headers if h in COLUMN_HEADERS}
    missing_core = CORE_HEADERS - present
    if missing_core:
        legacy_hint = looks_like_liste_or_legacy(headers)
        if legacy_hint == 'liste_definitive':
            raise ValueError(
                'Format liste définitive 3A/4A non pris en charge. '
                'Téléchargez le modèle dossier Polyspace (colonnes matricule, nom_famille, …).'
            )
        if legacy_hint == 'legacy':
            raise ValueError(
                'Ancien modèle d’import non pris en charge. '
                'Téléchargez le modèle dossier Polyspace via Import → Télécharger le modèle.'
            )
        raise ValueError(
            'Fichier dossier incomplet. Colonnes obligatoires manquantes : '
            + ', '.join(sorted(missing_core))
            + '. Téléchargez le modèle Polyspace.'
        )
    return FORMAT_DOSSIER


class DossierRowMapper:
    FATAL = frozenset({'matricule', 'nom_famille', 'prenom', 'departement', 'niveau', 'voie_acces'})

    def _get(self, row: dict, key: str) -> str:
        v = row.get(key)
        if v is None:
            return ''
        if isinstance(v, float) and v == int(v):
            return str(int(v))
        return str(v).strip()

    def map(self, row: dict, row_num: int):
        from etudiants.importers import _auto_dossier_militaire, _resolve_dept

        errors = []

        def err(field, msg):
            errors.append({'row': row_num, 'field': field, 'message': msg})

        g = self._get

        matricule_raw = g(row, 'matricule')
        try:
            matricule = int(re.sub(r'\D', '', matricule_raw))
            if matricule <= 0:
                raise ValueError
        except (ValueError, TypeError):
            matricule = None
            err('matricule', f'Valeur invalide : "{matricule_raw}"')

        nom = g(row, 'nom_famille')
        prenom = g(row, 'prenom')
        if not nom:
            err('nom_famille', 'Champ obligatoire manquant')
        if not prenom:
            err('prenom', 'Champ obligatoire manquant')

        sexe_raw = _norm(g(row, 'sexe'))
        sexe = 'F' if sexe_raw.startswith('F') else 'H'

        nationalite = g(row, 'nationalite') or 'Mauritanie'
        wilaya = g(row, 'wilaya_naissance')
        commune = g(row, 'commune_naissance')
        commune_autre = g(row, 'commune_naissance_autre')
        lieu_libre = g(row, 'lieu_naissance')
        if _norm(nationalite) in ('MAURITANIE', 'MAURITANIENNE'):
            commune_label = (
                commune_autre
                if commune and 'autre' in commune.lower()
                else commune
            )
            parts = [p for p in (commune_label, wilaya) if p]
            lieu = ', '.join(parts) if parts else lieu_libre
        else:
            lieu = lieu_libre

        date_naiss = _parse_date_flexible(row.get('date_naissance'))
        date_insc = _parse_date_flexible(row.get('date_premiere_inscription'))

        nni_digits = re.sub(r'\D', '', g(row, 'nni'))
        nni = nni_digits[:10] if nni_digits else None

        moyenne = _parse_decimal(g(row, 'moyenne_bac'))
        serie = g(row, 'serie_bac')
        if serie and serie.upper() == 'ETRANGERE':
            serie = 'Etrangere'

        cat = g(row, 'categorie_bac')
        if cat and _norm(cat).startswith('ETRANG'):
            cat = 'Etranger'
        elif cat and _norm(cat).startswith('NATIONAL'):
            cat = 'National'

        dept_code = _resolve_dept(g(row, 'departement'))
        if not dept_code:
            err('departement', f'Département invalide : "{g(row, "departement")}"')
            dept_code = 'IRT'

        niveau = _norm_niveau_dossier(g(row, 'niveau'))
        if not niveau:
            err('niveau', f'Niveau invalide : "{g(row, "niveau")}"')
            niveau = '3'

        voie = g(row, 'voie_acces')
        voie_m = re.search(r'[1-4]', voie)
        voie_acces = voie_m.group() if voie_m else ''
        if niveau == '3' and not voie_acces:
            err('voie_acces', 'Voie d’accès obligatoire en 3e année (1–4).')

        parcours = _parcours_from_statut(g(row, 'statut_academique'))
        resident = _oui_non(g(row, 'resident_avec_parents'))
        if resident is None:
            resident = True

        email = g(row, 'email_perso') or None
        tel1 = re.sub(r'\D', '', g(row, 'telephone'))[:8]
        tel2 = re.sub(r'\D', '', g(row, 'tel2'))[:8] or None

        eleve_data = dict(
            matricule=matricule,
            nom_famille=nom,
            prenom=prenom,
            nni=nni,
            sexe=sexe,
            date_naissance=date_naiss,
            lieu_naissance=lieu or '',
            nationalite=nationalite,
            num_bac=g(row, 'num_bac') or '',
            categorie_bac=cat or '',
            serie_bac=serie or '',
            moyenne_bac=moyenne,
            ecole_bac=g(row, 'ecole_bac') or '',
            date_premiere_inscription=date_insc,
            voie_acces=voie_acces or '',
            diplome_acces=g(row, 'diplome_acces') or '',
            etablissement_diplome=g(row, 'etablissement_diplome') or '',
            adresse_primaire=g(row, 'adresse_primaire') or '',
            adresse_secondaire=g(row, 'adresse_secondaire') or None,
            resident_avec_parents=resident,
            compte_bankily=re.sub(r'\D', '', g(row, 'compte_bankily'))[:8] or None,
            email_perso=email,
            tel1=tel1 or '',
            tel2_whatsapp=tel2,
            profil_incomplet=False,
        )

        type_mob = _mobilite_type_from_niveau_code(niveau)
        annee_deb = g(row, 'annee_debut_mobilite')
        etab_mob = g(row, 'etablissement_mobilite')
        spec_mob = g(row, 'specialite_mobilite')
        annee_fin = _derive_annee_fin(annee_deb, type_mob) if type_mob else ''

        da_data = dict(
            departement=dept_code,
            niveau_actuel=niveau,
            semestre_actuel='S1',
            donnees_semestres={},
            parcours=parcours,
            diplome='',
            etablissement_echange=etab_mob if type_mob == 'Semestre d’échange' else '',
            etablissement_double_diplome=etab_mob if type_mob == 'Double diplôme' else '',
            specialite_mobilite=spec_mob or '',
            type_mobilite=type_mob or '',
            annee_debut_mobilite=annee_deb or '',
            annee_fin_mobilite=annee_fin or '',
        )

        dm = _auto_dossier_militaire(niveau, dept_code)
        dm['sport_pratique'] = g(row, 'sport_pratique') or ''
        for field in (
            'tour_poitrine',
            'tour_ceinture',
            'tour_taille',
            'tour_bassin',
            'tour_cou',
            'longueur_manche',
            'longueur_dos',
            'longueur_cote',
        ):
            val = _parse_decimal(g(row, field))
            if val is not None:
                dm[field] = val
        pointure_raw = re.sub(r'\D', '', g(row, 'pointure'))
        if pointure_raw:
            try:
                dm['pointure'] = int(pointure_raw)
            except ValueError:
                pass

        gs = g(row, 'groupe_sanguin').upper().replace(' ', '')
        if gs and gs not in {'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'}:
            gs = ''
        poids = _parse_decimal(g(row, 'poids_kg'))
        taille = _parse_decimal(g(row, 'taille_cm'))
        sante_keys = (
            gs,
            g(row, 'assureur'),
            g(row, 'num_assure'),
            g(row, 'antecedents_medicaux'),
            g(row, 'maladies_chroniques'),
            g(row, 'medicaments'),
            poids,
            taille,
        )
        ds_data = None
        if any(sante_keys):
            ds_data = dict(
                groupe_sanguin=gs or 'O+',
                assureur=g(row, 'assureur') or '',
                num_assure=g(row, 'num_assure') or '',
                antecedents_medicaux=g(row, 'antecedents_medicaux') or '',
                maladies_chroniques=g(row, 'maladies_chroniques') or '',
                medicaments_a_vie=g(row, 'medicaments') or '',
                poids_kg=poids,
                taille_cm=taille,
            )

        def phone8(key):
            digits = re.sub(r'\D', '', g(row, key))[:8]
            return digits or None

        parent_fields = [
            g(row, k)
            for k in (
                'prenom_pere',
                'nom_famille_pere',
                'fonction_pere',
                'prenom_mere',
                'nom_famille_mere',
                'fonction_mere',
                'nom_urgence',
                'tel_pere',
                'tel_pere_whatsapp',
                'tel_mere',
                'tel_mere_whatsapp',
                'tel_urgence',
                'tel_urgence_whatsapp',
            )
        ]
        cp_data = None
        if any(parent_fields):
            cp_data = dict(
                prenom_pere=g(row, 'prenom_pere') or '—',
                nom_famille_pere=g(row, 'nom_famille_pere') or nom or '—',
                fonction_pere=g(row, 'fonction_pere') or '',
                tel_pere=phone8('tel_pere'),
                tel_pere_whatsapp=phone8('tel_pere_whatsapp'),
                prenom_mere=g(row, 'prenom_mere') or '',
                nom_famille_mere=g(row, 'nom_famille_mere') or '',
                fonction_mere=g(row, 'fonction_mere') or '',
                tel_mere=phone8('tel_mere'),
                tel_mere_whatsapp=phone8('tel_mere_whatsapp'),
                nom_urgence=g(row, 'nom_urgence') or '',
                tel_urgence=phone8('tel_urgence'),
                tel_urgence_whatsapp=phone8('tel_urgence_whatsapp'),
            )

        heb_fields = {
            'batiment': g(row, 'batiment'),
            'etage': g(row, 'etage'),
            'aile': g(row, 'aile'),
            'chambre': g(row, 'chambre'),
            'lit': g(row, 'lit'),
            'responsable_chambre': _oui_non(g(row, 'responsable_chambre')) or False,
            'responsable_aile': _oui_non(g(row, 'responsable_aile')) or False,
            'responsable_etage': _oui_non(g(row, 'responsable_etage')) or False,
        }
        hebergement = None
        if any(heb_fields[k] for k in ('batiment', 'etage', 'aile', 'chambre', 'lit')):
            hebergement = {
                'batiment': heb_fields['batiment'] or '—',
                'etage': heb_fields['etage'] or '—',
                'aile': heb_fields['aile'] or '—',
                'chambre': heb_fields['chambre'] or '—',
                'lit': heb_fields['lit'] or '—',
                'responsable_chambre': heb_fields['responsable_chambre'],
                'responsable_aile': heb_fields['responsable_aile'],
                'responsable_etage': heb_fields['responsable_etage'],
            }

        return {
            'eleve': eleve_data,
            'dossier_academique': da_data,
            'dossier_militaire': dm,
            'dossier_sante': ds_data,
            'contact_parent': cp_data,
            'hebergement': hebergement,
        }, errors
