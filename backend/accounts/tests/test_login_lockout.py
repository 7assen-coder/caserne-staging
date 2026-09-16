"""Login rate limit and account lockout."""

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import UserProfile
from accounts.serializers import ensure_profile


def _make_user(*, email='lock@esp.mr', password='TestPass12!'):
    user = User.objects.create_user(username=email, email=email, password=password)
    profile = ensure_profile(user)
    profile.fonction = UserProfile.ROLE_SUPERVISEUR
    profile.scope_section = '11'
    profile.is_active_access = True
    profile.save()
    return user


@override_settings(
    USE_LOCMEM_CACHE=True,
    CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'login-lockout-tests',
        }
    },
    LOGIN_MAX_FAILURES=5,
    LOGIN_LOCKOUT_SECONDS=900,
    LOGIN_IP_MAX_FAILURES=30,
    LOGIN_FAILURE_WINDOW_SECONDS=900,
    LOGIN_THROTTLE_RATE='1000/min',
    JWT_COOKIE_SECURE=False,
    JWT_COOKIE_SAMESITE='Lax',
)
class LoginLockoutTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient(enforce_csrf_checks=True)
        self.password = 'TestPass12!'
        self.user = _make_user(password=self.password)

    def _csrf(self):
        r = self.client.get('/api/v1/auth/csrf/')
        return {'HTTP_X_CSRFTOKEN': r.cookies.get('csrftoken').value}

    def test_five_failures_then_lock_blocks_even_correct_password(self):
        headers = self._csrf()
        for _ in range(5):
            r = self.client.post(
                '/api/v1/auth/login/',
                {'email': self.user.email, 'password': 'WrongPass99!'},
                format='json',
                **headers,
            )
            self.assertIn(r.status_code, (400, 403))

        headers = self._csrf()
        locked = self.client.post(
            '/api/v1/auth/login/',
            {'email': self.user.email, 'password': self.password},
            format='json',
            **headers,
        )
        self.assertEqual(locked.status_code, 403)
        self.assertEqual(locked.data.get('code'), 'login_locked')
        self.assertIn('retry_after', locked.data)

    def test_success_clears_failure_counter(self):
        headers = self._csrf()
        for _ in range(3):
            self.client.post(
                '/api/v1/auth/login/',
                {'email': self.user.email, 'password': 'WrongPass99!'},
                format='json',
                **headers,
            )
        headers = self._csrf()
        ok = self.client.post(
            '/api/v1/auth/login/',
            {'email': self.user.email, 'password': self.password},
            format='json',
            **headers,
        )
        self.assertEqual(ok.status_code, 200)

        # Counter cleared: 4 more wrongs should not lock yet (need 5)
        headers = self._csrf()
        for _ in range(4):
            r = self.client.post(
                '/api/v1/auth/login/',
                {'email': self.user.email, 'password': 'WrongPass99!'},
                format='json',
                **headers,
            )
            self.assertEqual(r.status_code, 400)

        headers = self._csrf()
        still_ok = self.client.post(
            '/api/v1/auth/login/',
            {'email': self.user.email, 'password': self.password},
            format='json',
            **headers,
        )
        self.assertEqual(still_ok.status_code, 200)

    @override_settings(LOGIN_IP_MAX_FAILURES=5, LOGIN_MAX_FAILURES=100)
    def test_ip_flood_blocks(self):
        cache.clear()
        headers = self._csrf()
        for i in range(5):
            email = f'ghost{i}@esp.mr'
            r = self.client.post(
                '/api/v1/auth/login/',
                {'email': email, 'password': 'WrongPass99!'},
                format='json',
                **headers,
            )
            self.assertIn(r.status_code, (400, 403))

        headers = self._csrf()
        blocked = self.client.post(
            '/api/v1/auth/login/',
            {'email': self.user.email, 'password': self.password},
            format='json',
            **headers,
        )
        self.assertEqual(blocked.status_code, 403)
        self.assertIn(blocked.data.get('code'), ('login_ip_blocked', 'login_locked'))
