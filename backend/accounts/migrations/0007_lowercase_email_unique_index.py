from django.db import migrations


def lowercase_auth_emails(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    for user in User.objects.all().iterator():
        email = (user.email or '').strip().lower()
        username = (user.username or '').strip().lower()
        # Keep username == email when email is set (ESP convention).
        if email:
            username = email
        updated = False
        if user.email != email:
            user.email = email
            updated = True
        if user.username != username:
            user.username = username
            updated = True
        if updated:
            user.save(update_fields=['email', 'username'])


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_uniq_student_profile_per_eleve'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.RunPython(lowercase_auth_emails, migrations.RunPython.noop),
        migrations.RunSQL(
            sql=(
                'CREATE UNIQUE INDEX IF NOT EXISTS auth_user_email_lower_uniq '
                'ON auth_user (LOWER(email)) '
                "WHERE email IS NOT NULL AND email <> '';"
            ),
            reverse_sql='DROP INDEX IF EXISTS auth_user_email_lower_uniq;',
        ),
    ]
