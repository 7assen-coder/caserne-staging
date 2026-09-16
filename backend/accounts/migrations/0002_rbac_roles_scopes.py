# Generated manually for RBAC Phase 1

import django.db.models.deletion
from django.db import migrations, models


LEGACY_MAP = {
    'commandement': 'administrateur',
    'encadrement': 'superviseur',
    'terrain': 'chef_section',
}


def forwards_map_fonctions(apps, schema_editor):
    UserProfile = apps.get_model('accounts', 'UserProfile')
    for profile in UserProfile.objects.all():
        mapped = LEGACY_MAP.get(profile.fonction)
        if mapped:
            profile.fonction = mapped
            profile.save(update_fields=['fonction'])


def backwards_map_fonctions(apps, schema_editor):
    UserProfile = apps.get_model('accounts', 'UserProfile')
    reverse = {
        'administrateur': 'commandement',
        'commandant_unite': 'commandement',
        'commandant_groupement': 'commandement',
        'commandant_compagnie': 'encadrement',
        'superviseur': 'encadrement',
        'chef_section': 'terrain',
        'etudiant': 'terrain',
    }
    for profile in UserProfile.objects.all():
        mapped = reverse.get(profile.fonction)
        if mapped:
            profile.fonction = mapped
            profile.save(update_fields=['fonction'])


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
        ('etudiants', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='scope_compagnie',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='scope_section',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='is_active_access',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='eleve',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='linked_user_profiles',
                to='etudiants.eleve',
            ),
        ),
        migrations.AlterField(
            model_name='userprofile',
            name='fonction',
            field=models.CharField(
                choices=[
                    ('etudiant', 'Étudiant'),
                    ('superviseur', 'Superviseur'),
                    ('chef_section', 'Chef de section'),
                    ('commandant_compagnie', 'Commandant de compagnie'),
                    ('commandant_groupement', 'Commandant de groupement'),
                    ('commandant_unite', "Commandant d'unité"),
                    ('administrateur', 'Administrateur'),
                ],
                default='superviseur',
                max_length=32,
            ),
        ),
        migrations.RunPython(forwards_map_fonctions, backwards_map_fonctions),
    ]
