"""Server-side filters / search / ordering for Eleve list."""

from django.db.models import Q

ORDERING_WHITELIST = {
    'matricule',
    '-matricule',
    'nom_famille',
    '-nom_famille',
    'prenom',
    '-prenom',
    'date_naissance',
    '-date_naissance',
    'updated_at',
    '-updated_at',
    'created_at',
    '-created_at',
}

DEFAULT_ORDERING = '-updated_at'


def apply_eleve_list_filters(qs, params):
    """Apply AND filters from request.query_params onto an already-scoped queryset."""
    q = (params.get('q') or '').strip()
    if q:
        if q.isdigit():
            qs = qs.filter(
                Q(matricule=int(q)) | Q(prenom__icontains=q) | Q(nom_famille__icontains=q)
            )
        else:
            qs = qs.filter(Q(prenom__icontains=q) | Q(nom_famille__icontains=q))

    departement = (params.get('departement') or '').strip()
    if departement:
        qs = qs.filter(dossier_academique__departement=departement)

    niveau = (params.get('niveau') or params.get('annee') or '').strip()
    if niveau:
        qs = qs.filter(dossier_academique__niveau_actuel=niveau)

    compagnie = (params.get('compagnie') or '').strip()
    if compagnie:
        qs = qs.filter(dossier_militaire__compagnie=compagnie)

    section = (params.get('section') or '').strip()
    if section:
        # Short form Section 1|2|3 also matches legacy compound codes (11/21/31…).
        digit = None
        if section in ('1', '2', '3'):
            digit = section
        elif section.lower().startswith('section'):
            tail = ''.join(ch for ch in section if ch.isdigit())
            if tail and tail[-1] in '123':
                digit = tail[-1]
        if digit:
            legacy = [
                f'Section {digit}',
                digit,
                f'Section 1{digit}',
                f'Section 2{digit}',
                f'Section 3{digit}',
                f'1{digit}',
                f'2{digit}',
                f'3{digit}',
            ]
            qs = qs.filter(dossier_militaire__section__in=legacy)
        else:
            qs = qs.filter(dossier_militaire__section=section)

    sexe = (params.get('sexe') or '').strip()
    if sexe:
        qs = qs.filter(sexe=sexe)

    ordering = (params.get('ordering') or '').strip()
    if ordering in ORDERING_WHITELIST:
        qs = qs.order_by(ordering)
    else:
        qs = qs.order_by(DEFAULT_ORDERING)

    return qs
