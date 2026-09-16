# Generated manually for Phase 35 Arabic name fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('etudiants', '0005_phase21_jobs_thumbs'),
    ]

    operations = [
        migrations.AddField(
            model_name='eleve',
            name='prenom_ar',
            field=models.CharField(
                blank=True, max_length=100, null=True, verbose_name='Prénom (arabe)',
            ),
        ),
        migrations.AddField(
            model_name='eleve',
            name='nom_famille_ar',
            field=models.CharField(
                blank=True, max_length=100, null=True, verbose_name='Nom de famille (arabe)',
            ),
        ),
    ]
