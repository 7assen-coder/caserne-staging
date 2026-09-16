from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class UserProfile(models.Model):
    ROLE_ETUDIANT = 'etudiant'
    ROLE_SUPERVISEUR = 'superviseur'
    ROLE_CHEF_SECTION = 'chef_section'
    ROLE_COMMANDANT_COMPAGNIE = 'commandant_compagnie'
    ROLE_COMMANDANT_GROUPEMENT = 'commandant_groupement'
    ROLE_COMMANDANT_UNITE = 'commandant_unite'
    ROLE_ADMINISTRATEUR = 'administrateur'

    FONCTION_CHOICES = (
        (ROLE_ETUDIANT, 'Étudiant'),
        (ROLE_SUPERVISEUR, 'Superviseur'),
        (ROLE_CHEF_SECTION, 'Chef de section'),
        (ROLE_COMMANDANT_COMPAGNIE, 'Commandant de compagnie'),
        (ROLE_COMMANDANT_GROUPEMENT, 'Commandant de groupement'),
        (ROLE_COMMANDANT_UNITE, "Commandant d'unité"),
        (ROLE_ADMINISTRATEUR, 'Administrateur'),
    )

    SECTION_SCOPED_ROLES = frozenset({ROLE_SUPERVISEUR, ROLE_CHEF_SECTION})
    COMPAGNIE_SCOPED_ROLES = frozenset({ROLE_COMMANDANT_COMPAGNIE})
    ALL_VISIBLE_ROLES = frozenset({
        ROLE_COMMANDANT_GROUPEMENT,
        ROLE_COMMANDANT_UNITE,
        ROLE_ADMINISTRATEUR,
    })

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    phone = models.CharField(max_length=8, blank=True, null=True, unique=True)
    matricule = models.CharField(max_length=50, blank=True)
    fonction = models.CharField(
        max_length=32,
        choices=FONCTION_CHOICES,
        default=ROLE_SUPERVISEUR,
    )
    grade = models.CharField(max_length=120, blank=True)
    scope_compagnie = models.CharField(max_length=100, blank=True, default='')
    scope_section = models.CharField(max_length=100, blank=True, default='')
    eleve = models.ForeignKey(
        'etudiants.Eleve',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='linked_user_profiles',
    )
    is_active_access = models.BooleanField(default=True)
    must_change_password = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'profil utilisateur'
        verbose_name_plural = 'profils utilisateurs'
        constraints = [
            models.UniqueConstraint(
                fields=['eleve'],
                condition=models.Q(fonction='etudiant', eleve__isnull=False),
                name='uniq_student_profile_per_eleve',
            ),
        ]

    def __str__(self):
        return self.user.email or self.user.username

    def clean(self):
        errors = {}
        if self.fonction in self.SECTION_SCOPED_ROLES and not (self.scope_section or '').strip():
            errors['scope_section'] = 'Section requise pour ce rôle.'
        if self.fonction in self.COMPAGNIE_SCOPED_ROLES and not (self.scope_compagnie or '').strip():
            errors['scope_compagnie'] = 'Compagnie requise pour ce rôle.'
        if self.fonction == self.ROLE_ETUDIANT and self.eleve_id is None:
            errors['eleve'] = 'Un élève lié est requis pour le rôle étudiant.'
        if errors:
            raise ValidationError(errors)


class LoginAttempt(models.Model):
    """Append-only audit of login attempts (lockout is enforced via cache)."""

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    identifier = models.CharField(max_length=255, db_index=True)
    ip = models.CharField(max_length=64, blank=True, default='')
    success = models.BooleanField(default=False)
    user_agent = models.CharField(max_length=512, blank=True, default='')

    class Meta:
        ordering = ('-created_at',)
        indexes = [
            models.Index(fields=['identifier', 'created_at']),
        ]

    def __str__(self):
        status = 'ok' if self.success else 'fail'
        return f'{self.identifier} {status} @ {self.created_at}'


class AuditEvent(models.Model):
    """Append-only accountability trail (élève / auth / import)."""

    ACTION_VIEW = 'VIEW'
    ACTION_CREATE = 'CREATE'
    ACTION_UPDATE = 'UPDATE'
    ACTION_DELETE = 'DELETE'
    ACTION_DOWNLOAD = 'DOWNLOAD'
    ACTION_IMPORT = 'IMPORT'
    ACTION_LOGIN_SUCCESS = 'LOGIN_SUCCESS'
    ACTION_LOGIN_FAIL = 'LOGIN_FAIL'
    ACTION_LOGOUT = 'LOGOUT'
    ACTION_PASSWORD_CHANGE = 'PASSWORD_CHANGE'
    ACTION_PASSWORD_RESET = 'PASSWORD_RESET'

    ACTION_CHOICES = (
        (ACTION_VIEW, 'Consultation'),
        (ACTION_CREATE, 'Création'),
        (ACTION_UPDATE, 'Modification'),
        (ACTION_DELETE, 'Suppression'),
        (ACTION_DOWNLOAD, 'Téléchargement'),
        (ACTION_IMPORT, 'Import'),
        (ACTION_LOGIN_SUCCESS, 'Connexion réussie'),
        (ACTION_LOGIN_FAIL, 'Connexion échouée'),
        (ACTION_LOGOUT, 'Déconnexion'),
        (ACTION_PASSWORD_CHANGE, 'Changement mot de passe'),
        (ACTION_PASSWORD_RESET, 'Réinitialisation mot de passe'),
    )

    RESOURCE_ELEVE = 'eleve'
    RESOURCE_CONTACT = 'contact_parent'
    RESOURCE_SANTE = 'dossier_sante'
    RESOURCE_ACADEMIQUE = 'dossier_academique'
    RESOURCE_MILITAIRE = 'dossier_militaire'
    RESOURCE_HEBERGEMENT = 'hebergement'
    RESOURCE_DOCUMENT = 'document'
    RESOURCE_AUTH = 'auth'
    RESOURCE_IMPORT = 'import'
    RESOURCE_EQUIPEMENT = 'equipement'
    RESOURCE_SANCTION = 'sanction'
    RESOURCE_DEMANDE = 'demande'
    RESOURCE_CONSULTATION = 'consultation_medicale'
    RESOURCE_JOURNAL = 'journal'
    RESOURCE_DROITS = 'droits'
    RESOURCE_PRESENCE = 'presence'

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_events',
    )
    actor_email = models.CharField(max_length=255, blank=True, default='')
    actor_role = models.CharField(max_length=64, blank=True, default='')
    ip = models.CharField(max_length=64, blank=True, default='')
    user_agent = models.CharField(max_length=512, blank=True, default='')
    action = models.CharField(max_length=32, choices=ACTION_CHOICES, db_index=True)
    resource_type = models.CharField(max_length=64, db_index=True)
    resource_id = models.CharField(max_length=64, blank=True, default='')
    eleve = models.ForeignKey(
        'etudiants.Eleve',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_events',
    )
    eleve_matricule = models.CharField(max_length=64, blank=True, default='')
    path = models.CharField(max_length=512, blank=True, default='')
    method = models.CharField(max_length=16, blank=True, default='')
    summary = models.CharField(max_length=255, blank=True, default='')
    changes = models.JSONField(default=dict, blank=True)
    success = models.BooleanField(default=True)

    class Meta:
        ordering = ('-created_at',)
        verbose_name = 'événement d’audit'
        verbose_name_plural = 'événements d’audit'
        indexes = [
            models.Index(fields=['eleve', 'created_at']),
            models.Index(fields=['actor', 'created_at']),
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]

    def __str__(self):
        return f'{self.action} {self.resource_type}:{self.resource_id} @ {self.created_at}'

