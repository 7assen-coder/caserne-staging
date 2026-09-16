# Generated manually — tel_urgence optional (align with contacts UI).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('etudiants', '0006_phase35_arabic_names'),
    ]

    operations = [
        migrations.AlterField(
            model_name='contactparent',
            name='tel_urgence',
            field=models.CharField(blank=True, max_length=8, null=True),
        ),
    ]
