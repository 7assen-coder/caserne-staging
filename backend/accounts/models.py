from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    FONCTION_CHOICES = (
        ('terrain', 'terrain'),
        ('encadrement', 'encadrement'),
        ('commandement', 'commandement'),
    )

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=8, blank=True, null=True, unique=True)
    matricule = models.CharField(max_length=50, blank=True)
    fonction = models.CharField(max_length=32, choices=FONCTION_CHOICES, default='encadrement')
    grade = models.CharField(max_length=120, blank=True)

    class Meta:
        verbose_name = 'profil utilisateur'
        verbose_name_plural = 'profils utilisateurs'

    def __str__(self):
        return self.user.email or self.user.username
