import uuid

from django.conf import settings
from django.db import models
from django.db.models import Case, F, Value, When
from django.db.models.functions import Cast, Concat, ExtractYear

from .validators import validate_document_file, validate_image_resolution


class Eleve(models.Model):
    CHOIX_SEXE = [
        ('H', 'Homme'),
        ('F', 'Femme'),
    ]
    CHOIX_CATEGORIE_BAC = [
        ('National', 'National'),
        ('Etranger', 'Étranger'),
    ]
    CHOIX_SERIE_BAC = [
        ('C', 'Mathématiques'),
        ('D', 'Sciences de la Nature'),
        ('TMGM', 'Techniques et Méthodes Générales de Mathématiques'),
        ('TSGM', 'Techniques sciences génie mécanique'),
        ('LM', 'Lettres Modernes'),
        ('LO', 'Lettres Originelles'),
        ('Etrangere', 'Série étrangère'),
    ]
    CHOIX_VOIE_ACCES = [
        ('1', 'Voie 1 Interne'),
        ('2', 'Voie 1 Externe'),
        ('3', 'Voie 2 Interne'),
        ('4', 'Voie 2 Externe'),
    ]

    matricule = models.IntegerField(unique=True)
    num_bac = models.CharField(max_length=50, blank=True, default='', verbose_name="N° de Bac")
    nni = models.CharField(
        max_length=10, unique=True, blank=True, null=True, verbose_name="NNI",
    )
    sexe = models.CharField(max_length=1, choices=CHOIX_SEXE, verbose_name="Sexe")
    prenom = models.CharField(max_length=100, verbose_name="Prénom")
    nom_famille = models.CharField(
        max_length=100, blank=True, default='', verbose_name="Nom de famille",
    )
    prenom_ar = models.CharField(
        max_length=100, blank=True, null=True, verbose_name='Prénom (arabe)',
    )
    nom_famille_ar = models.CharField(
        max_length=100, blank=True, null=True, verbose_name='Nom de famille (arabe)',
    )
    date_naissance = models.DateField(
        blank=True, null=True, verbose_name="Date de naissance",
    )
    lieu_naissance = models.CharField(
        max_length=100, blank=True, default='', verbose_name="Lieu de naissance",
    )
    nationalite = models.CharField(
        max_length=100, blank=True, default='', verbose_name="Nationalité",
    )

    categorie_bac = models.CharField(
        max_length=50, choices=CHOIX_CATEGORIE_BAC, blank=True, default='',
        verbose_name="Catégorie Bac",
    )
    serie_bac = models.CharField(
        max_length=50, choices=CHOIX_SERIE_BAC, blank=True, default='',
        verbose_name="Série Bac",
    )
    moyenne_bac = models.DecimalField(
        max_digits=5, decimal_places=2, blank=True, null=True,
        verbose_name="Moyenne Bac",
    )
    ecole_bac = models.CharField(
        max_length=150, blank=True, default='', verbose_name="École d'obtention du Bac",
    )

    date_premiere_inscription = models.DateField(
        blank=True, null=True, verbose_name="Date de 1ère inscription",
    )

    annee_premiere_inscription = models.GeneratedField(
        expression=Case(
            When(
                date_premiere_inscription__month__gte=9,
                then=Concat(
                    Cast(ExtractYear('date_premiere_inscription'), models.CharField()),
                    Value('-'),
                    Cast(ExtractYear('date_premiere_inscription') + 1, models.CharField()),
                ),
            ),
            default=Concat(
                Cast(ExtractYear('date_premiere_inscription') - 1, models.CharField()),
                Value('-'),
                Cast(ExtractYear('date_premiere_inscription'), models.CharField()),
            ),
        ),
        output_field=models.CharField(max_length=9, verbose_name='Année de 1ère inscription'),
        db_persist=True,
    )

    voie_acces = models.CharField(
        max_length=20, choices=CHOIX_VOIE_ACCES, blank=True, default='',
        verbose_name="Voie d'accès",
    )
    diplome_acces = models.CharField(
        max_length=100, blank=True, default='', verbose_name="Diplôme d'accès",
    )
    etablissement_diplome = models.CharField(max_length=150, blank=True, null=True, verbose_name='Établissement du diplôme')

    adresse_primaire = models.TextField(
        blank=True, default='', verbose_name='Adresse principale',
    )
    adresse_secondaire = models.TextField(blank=True, null=True, verbose_name='Adresse secondaire')
    resident_avec_parents = models.BooleanField(default=True, verbose_name='Réside avec ses parents')
    compte_bankily = models.CharField(max_length=50, blank=True, null=True, verbose_name='Compte Bankily')

    email_pro = models.GeneratedField(
        expression=Concat(
            Cast(F('matricule'), output_field=models.CharField()),
            Value('@esp.mr'),
        ),
        output_field=models.EmailField(),
        db_persist=True,
    )

    email_perso = models.EmailField(
        blank=True, null=True, verbose_name='Email personnel',
    )
    tel1 = models.CharField(max_length=8, blank=True, default='', verbose_name='Téléphone 1')
    tel2_whatsapp = models.CharField(max_length=8, blank=True, null=True, verbose_name='WhatsApp')
    facebook = models.CharField(max_length=150, blank=True, null=True)
    linkedin = models.CharField(max_length=150, blank=True, null=True)

    # Set True only by liste-définitive bulk import; cleared when dossier is completed.
    profil_incomplet = models.BooleanField(default=False, verbose_name='Profil incomplet')

    row_version = models.PositiveIntegerField(default=1)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(moyenne_bac__isnull=True)
                    | (models.Q(moyenne_bac__gte=0) & models.Q(moyenne_bac__lte=20))
                ),
                name='check_moyenne_bac_range',
            ),
        ]
        indexes = [
            models.Index(fields=['nom_famille', 'prenom'], name='eleve_nom_prenom_idx'),
            models.Index(fields=['date_naissance'], name='eleve_date_naissance_idx'),
            models.Index(fields=['-updated_at'], name='eleve_updated_at_idx'),
            models.Index(fields=['created_at'], name='eleve_created_at_idx'),
        ]

    def __str__(self):
        return f'{self.prenom} {self.nom_famille} - {self.matricule}'


class ContactParent(models.Model):
    eleve = models.OneToOneField(Eleve, on_delete=models.CASCADE, related_name='contacts_parents')

    prenom_pere = models.CharField(max_length=100)
    nom_famille_pere = models.CharField(max_length=100)
    fonction_pere = models.CharField(max_length=100, blank=True, null=True)
    tel_pere = models.CharField(max_length=8, blank=True, null=True)
    tel_pere_whatsapp = models.CharField(max_length=8, blank=True, null=True)

    prenom_mere = models.CharField(max_length=100, blank=True, null=True)
    nom_famille_mere = models.CharField(max_length=100, blank=True, null=True)
    fonction_mere = models.CharField(max_length=100, blank=True, null=True)
    tel_mere = models.CharField(max_length=8, blank=True, null=True)
    tel_mere_whatsapp = models.CharField(max_length=8, blank=True, null=True)

    nom_urgence = models.CharField(max_length=150, blank=True, null=True)
    tel_urgence = models.CharField(max_length=8, blank=True, null=True)
    tel_urgence_whatsapp = models.CharField(max_length=8, blank=True, null=True)

    def __str__(self):
        return f'Contacts de {self.eleve.matricule}'


class DossierSante(models.Model):
    CHOIX_GROUPE_SANGUIN = [
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
    ]
    eleve = models.OneToOneField(Eleve, on_delete=models.CASCADE, related_name='dossier_sante')
    groupe_sanguin = models.CharField(max_length=5, choices=CHOIX_GROUPE_SANGUIN)
    assureur = models.CharField(max_length=100, blank=True, null=True)
    num_assure = models.CharField(max_length=100, blank=True, null=True)
    antecedents_medicaux = models.TextField(blank=True, null=True)
    maladies_chroniques = models.TextField(blank=True, null=True)
    medicaments_a_vie = models.TextField(blank=True, null=True)
    dossier_medical_pdf = models.FileField(
        upload_to='dossiers_sante/%Y/%m/',
        blank=True,
        null=True,
    )
    photo_medicale = models.FileField(
        upload_to='dossiers_sante/photos/%Y/%m/',
        blank=True,
        null=True,
    )
    poids_kg = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    taille_cm = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)

    imc = models.GeneratedField(
        expression=F('poids_kg') / ((F('taille_cm') / 100) ** 2),
        output_field=models.DecimalField(max_digits=5, decimal_places=2),
        db_persist=True,
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(taille_cm__gt=0) | models.Q(taille_cm__isnull=True),
                name='check_taille_cm_notzero',
            ),
        ]

    def __str__(self):
        return f'Dossier Santé - {self.eleve.prenom} {self.eleve.nom_famille}'


class DossierAcademique(models.Model):
    CHOIX_DEPARTEMENT = [
        ('IRT', 'Informatique, Réseaux et Télécommunications'),
        ('SID', 'Statistique et Ingénierie des Données'),
        ('GE', 'Génie Électrique'),
        ('GM', 'Génie Mécanique'),
        ('GC-HE', 'Génie Civil'),
        ('MPG', 'Mines, Pétrole et Gaz'),
    ]

    CHOIX_ANNEE = [
        ('3', '3e année'),
        ('4', '4e année'),
        ('4-DD', '4e DD'),
        ('4-E', '5e E'),
        ('5-DD', '5e DD'),
    ]

    CHOIX_SEMESTRE = [
        ('S1', 'S1'),
        ('S2', 'S2'),
        ('S3', 'S3'),
        ('S4', 'S4'),
        ('S5', 'S5'),
        ('S6', 'S6'),
        ('S7', 'S7'),
        ('S8', 'S8'),
    ]

    eleve = models.OneToOneField(Eleve, on_delete=models.CASCADE, related_name='dossier_academique')
    departement = models.CharField(max_length=50, choices=CHOIX_DEPARTEMENT)
    niveau_actuel = models.CharField(max_length=20, choices=CHOIX_ANNEE)
    semestre_actuel = models.CharField(max_length=10, choices=CHOIX_SEMESTRE)

    # S1 à S6 info (simplifié via JSONField pour stocker toutes les années/validations)
    # TODO We are going to need a proper table to represent this Field Instead of just a json blob
    donnees_semestres = models.JSONField(default=dict, blank=True, null=True)

    diplome = models.CharField(max_length=100, blank=True, null=True)
    etablissement_echange = models.CharField(max_length=150, blank=True, null=True)
    etablissement_double_diplome = models.CharField(max_length=150, blank=True, null=True)
    specialite_mobilite = models.CharField(max_length=150, blank=True, null=True)
    parcours = models.CharField(max_length=100)  # En cours normal, redoublant, renvoyé
    type_mobilite = models.CharField(max_length=80, blank=True, null=True)
    raison_mobilite = models.TextField(blank=True, null=True)
    annee_debut_mobilite = models.CharField(max_length=20, blank=True, null=True)
    annee_fin_mobilite = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=['departement'], name='acad_departement_idx'),
            models.Index(fields=['niveau_actuel'], name='acad_niveau_actuel_idx'),
            models.Index(
                fields=['departement', 'niveau_actuel'],
                name='acad_dept_niveau_idx',
            ),
        ]


class DossierMilitaire(models.Model):
    eleve = models.OneToOneField(Eleve, on_delete=models.CASCADE, related_name='dossier_militaire')
    compagnie = models.CharField(max_length=100)
    section = models.CharField(max_length=100)
    sport_pratique = models.CharField(max_length=100)

    # Mensurations
    tour_poitrine = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    tour_ceinture = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    tour_taille = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    tour_bassin = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    tour_cou = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    longueur_manche = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    longueur_dos = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    longueur_cote = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    pointure = models.IntegerField(blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=['compagnie'], name='mil_compagnie_idx'),
            models.Index(fields=['section'], name='mil_section_idx'),
            models.Index(fields=['compagnie', 'section'], name='mil_compagnie_section_idx'),
        ]


class Hebergement(models.Model):
    eleve = models.OneToOneField(Eleve, on_delete=models.CASCADE, related_name='hebergement')
    batiment = models.CharField(max_length=100)
    etage = models.CharField(max_length=50)
    aile = models.CharField(max_length=50)
    chambre = models.CharField(max_length=50)
    lit = models.CharField(max_length=50)
    responsable_chambre = models.BooleanField(default=False)
    responsable_aile = models.BooleanField(default=False)
    responsable_etage = models.BooleanField(default=False)


# flaged to be changed in the near future
class DocumentEleve(models.Model):
    eleve = models.OneToOneField(Eleve, on_delete=models.CASCADE, related_name='documents')
    cin = models.FileField(upload_to='documents/cin/', blank=True, null=True, validators=[validate_document_file])
    acte_naissance = models.FileField(upload_to='documents/acte_naissance/', blank=True, null=True, validators=[validate_document_file])
    diplome_acces = models.FileField(upload_to='documents/diplome_acces/', blank=True, null=True, validators=[validate_document_file])
    diplome_bac = models.FileField(upload_to='documents/diplome_bac/', blank=True, null=True, validators=[validate_document_file])
    photo_identite_militaire = models.ImageField(upload_to='documents/photos/militaire/', blank=True, null=True, validators=[validate_image_resolution])
    photo_identite_civile = models.ImageField(upload_to='documents/photos/civile/', blank=True, null=True, validators=[validate_image_resolution])
    photo_militaire_integrale = models.ImageField(upload_to='documents/photos/integrale/', blank=True, null=True, validators=[validate_image_resolution])
    # Phase 21 — relative MEDIA paths for WebP thumbs (filled by Celery)
    photo_identite_militaire_thumb_128 = models.CharField(max_length=512, blank=True, default='')
    photo_identite_militaire_thumb_320 = models.CharField(max_length=512, blank=True, default='')
    photo_identite_civile_thumb_128 = models.CharField(max_length=512, blank=True, default='')
    photo_identite_civile_thumb_320 = models.CharField(max_length=512, blank=True, default='')
    photo_militaire_integrale_thumb_128 = models.CharField(max_length=512, blank=True, default='')
    photo_militaire_integrale_thumb_320 = models.CharField(max_length=512, blank=True, default='')


class JobStatus(models.TextChoices):
    PENDING = 'pending', 'En attente'
    RUNNING = 'running', 'En cours'
    SUCCEEDED = 'succeeded', 'Réussi'
    FAILED = 'failed', 'Échoué'


def import_job_upload_to(instance, filename):
    return f"imports/%Y/%m/{instance.id}_{filename}"


def export_job_upload_to(instance, filename):
    return f"exports/%Y/%m/{instance.id}_{filename}"


class ImportJob(models.Model):
    """Phase 21 — async Excel/CSV bulk import."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='import_jobs',
    )
    status = models.CharField(
        max_length=16,
        choices=JobStatus.choices,
        default=JobStatus.PENDING,
        db_index=True,
    )
    source_file = models.FileField(upload_to='imports/%Y/%m/')
    original_name = models.CharField(max_length=255, blank=True, default='')
    report = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']


class ExportJob(models.Model):
    """Phase 21 — async server-side Excel export of élèves."""

    FORMAT_XLSX = 'xlsx'
    FORMAT_CHOICES = [(FORMAT_XLSX, 'Excel')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='export_jobs',
    )
    status = models.CharField(
        max_length=16,
        choices=JobStatus.choices,
        default=JobStatus.PENDING,
        db_index=True,
    )
    format = models.CharField(max_length=8, choices=FORMAT_CHOICES, default=FORMAT_XLSX)
    filters = models.JSONField(default=dict, blank=True)
    columns = models.JSONField(default=list, blank=True)
    result_file = models.FileField(upload_to='exports/%Y/%m/', blank=True, null=True)
    error_message = models.TextField(blank=True, default='')
    row_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
