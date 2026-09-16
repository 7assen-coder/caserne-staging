"""Shared factories for accounts / etudiants API tests."""

from datetime import date
from decimal import Decimal

from django.contrib.auth.models import User

from accounts.models import UserProfile
from accounts.serializers import ensure_profile
from etudiants.models import DossierAcademique, DossierMilitaire, DossierSante, Eleve


def make_eleve(
    *,
    matricule,
    compagnie='1ere',
    section='11',
    nni=None,
    prenom='Test',
    nom='Eleve',
    departement='IRT',
    niveau='3',
):
    nni = nni or f'{2000000000 + int(matricule)}'[-10:]
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
        eleve=eleve,
        compagnie=compagnie,
        section=section,
        sport_pratique='Football',
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


def make_user(*, email, fonction, password='TestPass12!', **profile_kwargs):
    user = User.objects.create_user(username=email, email=email, password=password)
    profile = ensure_profile(user)
    profile.fonction = fonction
    profile.is_active_access = True
    for k, v in profile_kwargs.items():
        setattr(profile, k, v)
    profile.save()
    return User.objects.select_related('profile').get(pk=user.pk)
