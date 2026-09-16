# Generated manually for Phase 2 must_change_password

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_rbac_roles_scopes'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='must_change_password',
            field=models.BooleanField(default=False),
        ),
    ]
