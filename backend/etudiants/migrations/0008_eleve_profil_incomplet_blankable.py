# Liste définitive import: allow incomplete dossiers (true blanks, no fake NNI/email).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('etudiants', '0007_contactparent_tel_urgence_optional'),
    ]

    operations = [
        migrations.AddField(
            model_name='eleve',
            name='profil_incomplet',
            field=models.BooleanField(default=False, verbose_name='Profil incomplet'),
        ),
        migrations.AlterField(
            model_name='eleve',
            name='adresse_primaire',
            field=models.TextField(blank=True, default='', verbose_name='Adresse principale'),
        ),
        migrations.AlterField(
            model_name='eleve',
            name='categorie_bac',
            field=models.CharField(
                blank=True,
                choices=[('National', 'National'), ('Etranger', 'Étranger')],
                default='',
                max_length=50,
                verbose_name='Catégorie Bac',
            ),
        ),
        migrations.AlterField(
            model_name='eleve',
            name='date_naissance',
            field=models.DateField(blank=True, null=True, verbose_name='Date de naissance'),
        ),
        migrations.AlterField(
            model_name='eleve',
            name='date_premiere_inscription',
            field=models.DateField(blank=True, null=True, verbose_name='Date de 1ère inscription'),
        ),
        migrations.AlterField(
            model_name='eleve',
            name='diplome_acces',
            field=models.CharField(
                blank=True, default='', max_length=100, verbose_name="Diplôme d'accès",
            ),
        ),
        migrations.AlterField(
            model_name='eleve',
            name='ecole_bac',
            field=models.CharField(
                blank=True,
                default='',
                max_length=150,
                verbose_name="École d'obtention du Bac",
            ),
        ),
        migrations.AlterField(
            model_name='eleve',
            name='email_perso',
            field=models.EmailField(
                blank=True, max_length=254, null=True, verbose_name='Email personnel',
            ),
        ),
        migrations.AlterField(
            model_name='eleve',
            name='lieu_naissance',
            field=models.CharField(
                blank=True, default='', max_length=100, verbose_name='Lieu de naissance',
            ),
        ),
        migrations.AlterField(
            model_name='eleve',
            name='moyenne_bac',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=5,
                null=True,
                verbose_name='Moyenne Bac',
            ),
        ),
        migrations.AlterField(
            model_name='eleve',
            name='nationalite',
            field=models.CharField(
                blank=True, default='', max_length=100, verbose_name='Nationalité',
            ),
        ),
        migrations.AlterField(
            model_name='eleve',
            name='nni',
            field=models.CharField(
                blank=True, max_length=10, null=True, unique=True, verbose_name='NNI',
            ),
        ),
        migrations.AlterField(
            model_name='eleve',
            name='nom_famille',
            field=models.CharField(
                blank=True, default='', max_length=100, verbose_name='Nom de famille',
            ),
        ),
        migrations.AlterField(
            model_name='eleve',
            name='num_bac',
            field=models.CharField(
                blank=True, default='', max_length=50, verbose_name='N° de Bac',
            ),
        ),
        migrations.AlterField(
            model_name='eleve',
            name='serie_bac',
            field=models.CharField(
                blank=True,
                choices=[
                    ('C', 'Mathématiques'),
                    ('D', 'Sciences de la Nature'),
                    ('TMGM', 'Techniques et Méthodes Générales de Mathématiques'),
                    ('TSGM', 'Techniques sciences génie mécanique'),
                    ('LM', 'Lettres Modernes'),
                    ('LO', 'Lettres Originelles'),
                    ('Etrangere', 'Série étrangère'),
                ],
                default='',
                max_length=50,
                verbose_name='Série Bac',
            ),
        ),
        migrations.AlterField(
            model_name='eleve',
            name='tel1',
            field=models.CharField(
                blank=True, default='', max_length=8, verbose_name='Téléphone 1',
            ),
        ),
        migrations.AlterField(
            model_name='eleve',
            name='voie_acces',
            field=models.CharField(
                blank=True,
                choices=[
                    ('1', 'Voie 1 Interne'),
                    ('2', 'Voie 1 Externe'),
                    ('3', 'Voie 2 Interne'),
                    ('4', 'Voie 2 Externe'),
                ],
                default='',
                max_length=20,
                verbose_name="Voie d'accès",
            ),
        ),
        migrations.RemoveConstraint(
            model_name='eleve',
            name='check_moyenne_bac_range',
        ),
        migrations.AddConstraint(
            model_name='eleve',
            constraint=models.CheckConstraint(
                check=(
                    models.Q(moyenne_bac__isnull=True)
                    | (models.Q(moyenne_bac__gte=0) & models.Q(moyenne_bac__lte=20))
                ),
                name='check_moyenne_bac_range',
            ),
        ),
    ]
