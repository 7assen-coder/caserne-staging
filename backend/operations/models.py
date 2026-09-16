"""Models for équipement, sanctions, demandes, médical, journal, droits, présence."""

from django.db import models

from etudiants.validators import validate_document_file


def _ops_upload(subdir):
    return f'operations/{subdir}/%Y/%m/'


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    row_version = models.PositiveIntegerField(default=1)

    class Meta:
        abstract = True


class EquipementItem(TimeStampedModel):
    ETAT_EN_USAGE = 'en_usage'
    ETAT_RENDU = 'rendu'
    ETAT_CHOICES = (
        (ETAT_EN_USAGE, 'Utilisé'),
        (ETAT_RENDU, 'Rendu'),
    )

    eleve = models.ForeignKey(
        'etudiants.Eleve',
        on_delete=models.CASCADE,
        related_name='equipement_items',
    )
    code = models.CharField(max_length=64, blank=True, default='')
    nature = models.CharField(max_length=120, blank=True, default='')
    description = models.TextField(blank=True, default='')
    quantite = models.PositiveIntegerField(default=1)
    date_remise = models.DateField(null=True, blank=True)
    etat = models.CharField(max_length=20, choices=ETAT_CHOICES, default=ETAT_EN_USAGE)
    date_retour = models.DateField(null=True, blank=True)
    pdf = models.FileField(
        upload_to=_ops_upload('equipement'),
        blank=True,
        null=True,
        validators=[validate_document_file],
    )

    class Meta:
        ordering = ['-date_remise', '-id']
        indexes = [models.Index(fields=['eleve', 'etat'])]

    def __str__(self):
        return f'{self.code or self.nature} — {self.eleve_id}'


class Sanction(TimeStampedModel):
    NATURE_CHOICES = (
        ('avertissement', 'Avertissement'),
        ('blame', 'Blâme'),
        ('retrait', 'Retrait'),
        ('consigne', 'Consigne'),
        ('heures_sup', 'Heures supplémentaires'),
        ('autre', 'Autre'),
    )
    STATUT_CHOICES = (
        ('en_cours', 'En cours'),
        ('cloturee', 'Clôturée'),
        ('annulee', 'Annulée'),
    )

    eleve = models.ForeignKey(
        'etudiants.Eleve',
        on_delete=models.CASCADE,
        related_name='sanctions',
    )
    code = models.CharField(max_length=64, blank=True, default='')
    motif = models.TextField(blank=True, default='')
    nature = models.CharField(max_length=32, choices=NATURE_CHOICES, default='avertissement')
    date_debut = models.DateField(null=True, blank=True)
    date_fin = models.DateField(null=True, blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_cours')
    cr_pdf = models.FileField(
        upload_to=_ops_upload('sanctions_cr'),
        blank=True,
        null=True,
        validators=[validate_document_file],
    )
    pj_pdf = models.FileField(
        upload_to=_ops_upload('sanctions_pj'),
        blank=True,
        null=True,
        validators=[validate_document_file],
    )

    class Meta:
        ordering = ['-date_debut', '-id']
        indexes = [models.Index(fields=['eleve', 'statut'])]


class Demande(TimeStampedModel):
    NATURE_CHOICES = (
        ('permission_sortie', 'Permission de sortie'),
        ('autorisation_sortie', 'Autorisation de sortie'),
        ('demande_document', 'Demande de document'),
        ('demande_stage', 'Demande de stage'),
        ('divers', 'Divers'),
    )
    STATUT_CHOICES = (
        ('en_cours', 'En cours'),
        ('acceptee', 'Acceptée'),
        ('refusee', 'Refusée'),
        ('annulee', 'Annulée'),
    )

    eleve = models.ForeignKey(
        'etudiants.Eleve',
        on_delete=models.CASCADE,
        related_name='demandes',
    )
    code = models.CharField(max_length=64, blank=True, default='')
    description = models.TextField(blank=True, default='')
    nature = models.CharField(max_length=40, choices=NATURE_CHOICES, default='divers')
    date_depot = models.DateField(null=True, blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_cours')
    demande_pdf = models.FileField(
        upload_to=_ops_upload('demandes'),
        blank=True,
        null=True,
        validators=[validate_document_file],
    )
    pj_pdf = models.FileField(
        upload_to=_ops_upload('demandes_pj'),
        blank=True,
        null=True,
        validators=[validate_document_file],
    )

    class Meta:
        ordering = ['-date_depot', '-id']
        indexes = [models.Index(fields=['eleve', 'statut'])]


class ConsultationMedicale(TimeStampedModel):
    TYPE_CHOICES = (
        ('consultation', 'Consultation'),
        ('incident', 'Incident médical'),
    )

    eleve = models.ForeignKey(
        'etudiants.Eleve',
        on_delete=models.CASCADE,
        related_name='consultations_medicales',
    )
    code = models.CharField(max_length=64, blank=True, default='')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='consultation')
    motif = models.TextField(blank=True, default='')
    date_consultation = models.DateField(null=True, blank=True)
    avis_infirmerie = models.TextField(blank=True, default='')
    pj_pdf = models.FileField(
        upload_to=_ops_upload('medical'),
        blank=True,
        null=True,
        validators=[validate_document_file],
    )

    class Meta:
        ordering = ['-date_consultation', '-id']
        indexes = [models.Index(fields=['eleve', 'type'])]


class JournalEvenement(TimeStampedModel):
    TYPE_CHOICES = (
        ('observation', 'Observation'),
        ('felicitation', 'Félicitation'),
        ('incident', 'Incident'),
        ('consigne', 'Consigne'),
        ('encadrement', 'Encadrement'),
        ('divers', 'Divers'),
    )
    SOURCE_MANUEL = 'manuel'
    SOURCE_SYSTEME = 'systeme'
    SOURCE_CHOICES = (
        (SOURCE_MANUEL, 'Manuel'),
        (SOURCE_SYSTEME, 'Système'),
    )

    eleve = models.ForeignKey(
        'etudiants.Eleve',
        on_delete=models.CASCADE,
        related_name='journal_evenements',
    )
    code = models.CharField(max_length=64, blank=True, default='')
    type = models.CharField(max_length=32, choices=TYPE_CHOICES, default='observation')
    date = models.DateTimeField(null=True, blank=True)
    titre = models.CharField(max_length=200, blank=True, default='')
    contenu = models.TextField(blank=True, default='')
    auteur = models.CharField(max_length=150, blank=True, default='')
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default=SOURCE_MANUEL)
    pj_pdf = models.FileField(
        upload_to=_ops_upload('journal'),
        blank=True,
        null=True,
        validators=[validate_document_file],
    )

    class Meta:
        ordering = ['-date', '-id']
        indexes = [models.Index(fields=['eleve', 'type'])]


class DroitsBatch(TimeStampedModel):
    annee = models.PositiveIntegerField()
    mois = models.PositiveSmallIntegerField()
    compagnie = models.CharField(max_length=100)
    validated_at = models.DateTimeField(null=True, blank=True)
    default_montant = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        unique_together = [('annee', 'mois', 'compagnie')]
        ordering = ['-annee', '-mois', 'compagnie']

    def __str__(self):
        return f'{self.compagnie} {self.mois}/{self.annee}'


class DroitsLigne(TimeStampedModel):
    ETAT_CHOICES = (
        ('percu', 'Perçu'),
        ('non_percu', 'Non perçu'),
    )

    batch = models.ForeignKey(DroitsBatch, on_delete=models.CASCADE, related_name='lignes')
    eleve = models.ForeignKey(
        'etudiants.Eleve',
        on_delete=models.CASCADE,
        related_name='droits_lignes',
    )
    montant = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    etat = models.CharField(max_length=20, choices=ETAT_CHOICES, default='non_percu')
    remarques = models.TextField(blank=True, default='')

    class Meta:
        unique_together = [('batch', 'eleve')]
        ordering = ['eleve_id']


class AppelPresence(TimeStampedModel):
    TYPE_CHOICES = (
        ('matin', 'Matin'),
        ('apres_midi', 'Après-midi'),
        ('exceptionnel', 'Exceptionnel'),
    )

    date = models.DateTimeField()
    statut = models.CharField(max_length=40, default='transmis')
    section = models.CharField(max_length=100, blank=True, default='')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='matin')
    compagnie = models.CharField(max_length=100, blank=True, default='')
    superviseur = models.CharField(max_length=150, blank=True, default='')

    class Meta:
        ordering = ['-date', '-id']
        indexes = [models.Index(fields=['compagnie', 'section', 'date'])]


class AppelLigne(TimeStampedModel):
    STATUT_CHOICES = (
        ('present', 'Présent'),
        ('absent', 'Absent'),
    )
    MOTIF_CHOICES = (
        ('medical', 'Médical'),
        ('social', 'Social'),
        ('familial', 'Familial'),
        ('administratif', 'Administratif'),
        ('permission', 'Permission'),
        ('mission', 'Mission'),
        ('non_justifie', 'Non justifié'),
    )

    appel = models.ForeignKey(AppelPresence, on_delete=models.CASCADE, related_name='lignes')
    eleve = models.ForeignKey(
        'etudiants.Eleve',
        on_delete=models.CASCADE,
        related_name='presence_lignes',
    )
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='present')
    motif = models.CharField(max_length=32, choices=MOTIF_CHOICES, blank=True, null=True)

    class Meta:
        unique_together = [('appel', 'eleve')]
