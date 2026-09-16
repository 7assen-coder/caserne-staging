"""Password change + forgot-password OTP API tests."""

from django.contrib.auth.models import User
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import UserProfile
from accounts.otp import generate_otp, otp_is_stored, store_otp, verify_otp, OtpError
from accounts.serializers import ensure_profile


def _make_user(*, email, password='TestPass12!', must_change=False, active_access=True):
    user = User.objects.create_user(username=email, email=email, password=password)
    profile = ensure_profile(user)
    profile.fonction = UserProfile.ROLE_SUPERVISEUR
    profile.scope_section = '11'
    profile.is_active_access = active_access
    profile.must_change_password = must_change
    profile.save()
    return user


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'otp-tests',
        }
    },
    OTP_REQUEST_PER_EMAIL_PER_HOUR=5,
    OTP_REQUEST_PER_IP_PER_HOUR=20,
    OTP_RESEND_COOLDOWN_SECONDS=0,
    OTP_VERIFY_PER_IP_PER_HOUR=40,
    OTP_MAX_ATTEMPTS=5,
)
class PasswordOtpApiTests(TestCase):
    def setUp(self):
        cache.clear()
        mail.outbox.clear()
        self.client = APIClient()
        self.user = _make_user(email='officer@esp.mr', password='OldPass12!')

    def test_otp_hash_roundtrip(self):
        otp = generate_otp()
        self.assertEqual(len(otp), 6)
        store_otp('officer@esp.mr', otp)
        verify_otp('officer@esp.mr', otp)
        with self.assertRaises(OtpError):
            verify_otp('officer@esp.mr', otp)

    def test_change_password_requires_current_when_not_forced(self):
        self.client.force_authenticate(user=self.user)
        r = self.client.post(
            '/api/v1/auth/password/',
            {'new_password': 'NewPass99!'},
            format='json',
        )
        self.assertEqual(r.status_code, 400)

    def test_change_password_ok(self):
        self.client.force_authenticate(user=self.user)
        r = self.client.post(
            '/api/v1/auth/password/',
            {'current_password': 'OldPass12!', 'new_password': 'NewPass99!'},
            format='json',
        )
        self.assertEqual(r.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewPass99!'))

    def test_forced_change_without_current(self):
        forced = _make_user(email='forced@esp.mr', must_change=True)
        self.client.force_authenticate(user=forced)
        r = self.client.post(
            '/api/v1/auth/password/',
            {'new_password': 'ForcedPass1!'},
            format='json',
        )
        self.assertEqual(r.status_code, 200)
        forced.refresh_from_db()
        self.assertFalse(ensure_profile(forced).must_change_password)

    def test_military_create_sets_must_change(self):
        admin = _make_user(email='admin@esp.mr')
        admin.is_staff = True
        admin.is_superuser = True
        admin.save()
        ensure_profile(admin).fonction = UserProfile.ROLE_ADMINISTRATEUR
        ensure_profile(admin).save()
        self.client.force_authenticate(user=admin)
        r = self.client.post(
            '/api/v1/auth/users/',
            {
                'email': 'newbie@esp.mr',
                'password': 'TempPass12!',
                'fonction': UserProfile.ROLE_SUPERVISEUR,
                'scope_section': '11',
            },
            format='json',
        )
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.data['must_change_password'])

    def test_password_reset_request_sends_email_for_existing_user(self):
        r = self.client.post(
            '/api/v1/auth/password/reset/',
            {'email': 'officer@esp.mr', 'source': 'login_recovery', 'lang': 'fr'},
            format='json',
        )
        self.assertEqual(r.status_code, 200)
        self.assertIn('code', r.data['detail'].lower())
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('officer@esp.mr', mail.outbox[0].to)
        self.assertIn('code', mail.outbox[0].subject.lower())
        self.assertIn('polyspace', mail.outbox[0].subject.lower())
        self.assertIn('Code :', mail.outbox[0].body)
        self.assertTrue(otp_is_stored('officer@esp.mr'))

    def test_password_reset_arabic_locale_subject(self):
        r = self.client.post(
            '/api/v1/auth/password/reset/',
            {'email': 'officer@esp.mr', 'source': 'login_recovery', 'lang': 'ar'},
            format='json',
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('الرمز', mail.outbox[0].subject)
        self.assertIn('polyspace', mail.outbox[0].subject.lower())
        self.assertIn('الرمز:', mail.outbox[0].body)

    def test_password_reset_profile_source_still_sends(self):
        r = self.client.post(
            '/api/v1/auth/password/reset/',
            {'email': 'officer@esp.mr', 'source': 'profile_reset', 'lang': 'fr'},
            format='json',
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('code', mail.outbox[0].subject.lower())
        self.assertIn('polyspace', mail.outbox[0].subject.lower())
        self.assertIn('Code :', mail.outbox[0].body)

    def test_password_reset_request_unknown_email_no_leak(self):
        r = self.client.post(
            '/api/v1/auth/password/reset/',
            {'email': 'ghost@esp.mr'},
            format='json',
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)
        self.assertFalse(otp_is_stored('ghost@esp.mr'))

    def test_password_reset_inactive_access_no_mail(self):
        _make_user(email='locked@esp.mr', active_access=False)
        r = self.client.post(
            '/api/v1/auth/password/reset/',
            {'email': 'locked@esp.mr'},
            format='json',
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)
        self.assertFalse(otp_is_stored('locked@esp.mr'))

    def test_password_reset_rejects_non_esp_email(self):
        r = self.client.post(
            '/api/v1/auth/password/reset/',
            {'email': 'someone@gmail.com'},
            format='json',
        )
        self.assertEqual(r.status_code, 400)
        self.assertEqual(len(mail.outbox), 0)

    def test_password_reset_rejects_plus_alias(self):
        r = self.client.post(
            '/api/v1/auth/password/reset/',
            {'email': 'officer+tag@esp.mr'},
            format='json',
        )
        self.assertEqual(r.status_code, 400)

    def test_password_reset_full_flow(self):
        self.client.post(
            '/api/v1/auth/password/reset/',
            {'email': 'officer@esp.mr'},
            format='json',
        )
        self.assertEqual(len(mail.outbox), 1)
        body = mail.outbox[0].body
        otp = ''.join(ch for ch in body if ch.isdigit())[:6]
        self.assertEqual(len(otp), 6)

        verify = self.client.post(
            '/api/v1/auth/password/reset/verify/',
            {'email': 'officer@esp.mr', 'otp': otp},
            format='json',
        )
        self.assertEqual(verify.status_code, 200)
        token = verify.data['reset_token']

        confirm = self.client.post(
            '/api/v1/auth/password/reset/confirm/',
            {'reset_token': token, 'new_password': 'ResetPass88!'},
            format='json',
        )
        self.assertEqual(confirm.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('ResetPass88!'))

        login = self.client.post(
            '/api/v1/auth/login/',
            {'email': 'officer@esp.mr', 'password': 'ResetPass88!'},
            format='json',
        )
        self.assertEqual(login.status_code, 200)

    def test_verify_wrong_otp(self):
        store_otp('officer@esp.mr', '111222')
        r = self.client.post(
            '/api/v1/auth/password/reset/verify/',
            {'email': 'officer@esp.mr', 'otp': '999999'},
            format='json',
        )
        self.assertEqual(r.status_code, 400)

    def test_verify_rejects_non_digit_otp(self):
        r = self.client.post(
            '/api/v1/auth/password/reset/verify/',
            {'email': 'officer@esp.mr', 'otp': 'abcdef'},
            format='json',
        )
        self.assertEqual(r.status_code, 400)

    def test_rate_limit_on_request(self):
        for _ in range(5):
            r = self.client.post(
                '/api/v1/auth/password/reset/',
                {'email': 'officer@esp.mr'},
                format='json',
            )
            self.assertEqual(r.status_code, 200)
        r = self.client.post(
            '/api/v1/auth/password/reset/',
            {'email': 'officer@esp.mr'},
            format='json',
        )
        self.assertEqual(r.status_code, 429)


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'otp-cooldown-tests',
        }
    },
    OTP_REQUEST_PER_EMAIL_PER_HOUR=5,
    OTP_REQUEST_PER_IP_PER_HOUR=20,
    OTP_RESEND_COOLDOWN_SECONDS=60,
    OTP_MAX_ATTEMPTS=5,
)
class PasswordOtpCooldownTests(TestCase):
    def setUp(self):
        cache.clear()
        mail.outbox.clear()
        self.client = APIClient()
        _make_user(email='officer@esp.mr')

    def test_resend_cooldown(self):
        first = self.client.post(
            '/api/v1/auth/password/reset/',
            {'email': 'officer@esp.mr'},
            format='json',
        )
        self.assertEqual(first.status_code, 200)
        second = self.client.post(
            '/api/v1/auth/password/reset/',
            {'email': 'officer@esp.mr'},
            format='json',
        )
        self.assertEqual(second.status_code, 429)
        self.assertEqual(len(mail.outbox), 1)
