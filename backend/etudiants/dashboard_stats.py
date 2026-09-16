"""Dashboard aggregate stats (Phase 18) — SQL counts, no full row dump."""

from __future__ import annotations

from django.db.models import Count, Q

from accounts.permissions import eleves_queryset_for, get_user_fonction
from etudiants.cache_keys import (
    cache_get_or_set,
    dashboard_stats_cache_key,
    dashboard_ttl,
)


def _needs_attention_q() -> Q:
    bad_tel = (
        Q(tel1__isnull=True)
        | Q(tel1='')
        | Q(tel1='00000000')
        | Q(tel1__iexact='N/A')
    )
    bad_email = (
        Q(email_perso__isnull=True)
        | Q(email_perso='')
        | Q(email_perso__iexact='user@example.com')
        | Q(email_perso__iendswith='@example.com')
    )
    return bad_tel | bad_email


def _mobilite_q() -> Q:
    return (
        (Q(dossier_academique__type_mobilite__isnull=False) & ~Q(dossier_academique__type_mobilite=''))
        | (Q(dossier_academique__etablissement_echange__isnull=False) & ~Q(dossier_academique__etablissement_echange=''))
        | (
            Q(dossier_academique__etablissement_double_diplome__isnull=False)
            & ~Q(dossier_academique__etablissement_double_diplome='')
        )
        | (Q(dossier_academique__specialite_mobilite__isnull=False) & ~Q(dossier_academique__specialite_mobilite=''))
    )


def compute_dashboard_stats(user) -> dict:
    qs = eleves_queryset_for(user, for_list=True)
    total = qs.count()
    attention_q = _needs_attention_q()
    mobilite_q = _mobilite_q()
    needs_attention = qs.filter(attention_q).count()
    mobilite_count = qs.filter(mobilite_q).count()

    by_departement = list(
        qs.values('dossier_academique__departement')
        .annotate(total=Count('id'))
        .order_by('-total')
    )
    by_niveau = list(
        qs.values('dossier_academique__niveau_actuel')
        .annotate(total=Count('id'))
        .order_by('-total')
    )
    by_compagnie = list(
        qs.values('dossier_militaire__compagnie')
        .annotate(total=Count('id'))
        .order_by('-total')
    )

    par_filiere = []
    for row in by_departement:
        label = row['dossier_academique__departement'] or 'Non renseigné'
        dept_qs = qs.filter(dossier_academique__departement=row['dossier_academique__departement'])
        att = dept_qs.filter(attention_q).count()
        tot = row['total']
        par_filiere.append(
            {
                'filiere': label,
                'total': tot,
                'dossiersComplets': tot - att,
                'dossiersASurveiller': att,
            }
        )

    attention_sample = []
    for e in qs.filter(attention_q).select_related('dossier_militaire', 'dossier_academique')[:4]:
        attention_sample.append(
            {
                'id': e.id,
                'matricule': e.matricule,
                'prenom': e.prenom,
                'nom': e.nom_famille,
                'tel1': e.tel1,
                'emailPerso': e.email_perso,
                'departement': getattr(getattr(e, 'dossier_academique', None), 'departement', None),
            }
        )

    mobilite_sample = []
    for e in qs.filter(mobilite_q).select_related('dossier_academique', 'dossier_militaire')[:4]:
        ac = getattr(e, 'dossier_academique', None)
        mobilite_sample.append(
            {
                'id': e.id,
                'matricule': e.matricule,
                'prenom': e.prenom,
                'nom': e.nom_famille,
                'departement': getattr(ac, 'departement', None),
            }
        )

    compagnies_count = (
        qs.exclude(dossier_militaire__compagnie__isnull=True)
        .exclude(dossier_militaire__compagnie='')
        .values('dossier_militaire__compagnie')
        .distinct()
        .count()
    )

    completion_pct = round(((total - needs_attention) / total) * 100) if total else 0

    repartition_compagnies = [
        {
            'compagnie': row['dossier_militaire__compagnie'] or 'Non assignée',
            'total': row['total'],
        }
        for row in by_compagnie
    ]

    return {
        'total_eleves': total,
        'needs_attention': needs_attention,
        'mobilite_count': mobilite_count,
        'compagnies': compagnies_count,
        'completion_pct': completion_pct,
        'by_departement': [
            {
                'departement': r['dossier_academique__departement'] or 'Non renseigné',
                'total': r['total'],
            }
            for r in by_departement
        ],
        'by_niveau': [
            {'niveau': r['dossier_academique__niveau_actuel'] or '—', 'total': r['total']}
            for r in by_niveau
        ],
        'by_compagnie': repartition_compagnies,
        'par_filiere': par_filiere,
        'attention_sample': attention_sample,
        'mobilite_sample': mobilite_sample,
        'repartition_compagnies': repartition_compagnies,
    }


def get_dashboard_stats_cached(user) -> dict:
    role = get_user_fonction(user) or 'unknown'
    key = dashboard_stats_cache_key(user_id=user.pk, role=role)
    return cache_get_or_set(key, lambda: compute_dashboard_stats(user), dashboard_ttl())
