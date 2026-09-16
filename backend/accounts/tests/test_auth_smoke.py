"""Phase 33 — auth smoke: login cookies, bad password, refresh, logout."""

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import UserProfile
from accounts.tests.factories import make_user


@override_settings(
    USE_LOCMEM_CACHE=True,
    SECURE_SSL_REDIRECT=False,
    CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'phase33-auth-smoke',
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
class Phase33AuthSmokeTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient(enforce_csrf_checks=True)
        self.password = 'TestPass12!'
        self.user = make_user(
            email='phase33@esp.mr',
            fonction=UserProfile.ROLE_SUPERVISEUR,
            password=self.password,
            scope_section='11',
        )

    def _csrf(self):
        r = self.client.get('/api/v1/auth/csrf/')
        self.assertEqual(r.status_code, 200)
        return {'HTTP_X_CSRFTOKEN': r.cookies.get('csrftoken').value}

    def test_login_200_sets_cookies(self):
        headers = self._csrf()
        r = self.client.post(
            '/api/v1/auth/login/',
            {'email': self.user.email, 'password': self.password, 'remember_me': True},
            format='json',
            **headers,
        )
        self.assertEqual(r.status_code, 200)
        self.assertIn('user', r.data)
        self.assertIn('esp_access', r.cookies)
        self.assertIn('esp_refresh', r.cookies)

    def test_bad_password_401_or_400(self):
        headers = self._csrf()
        r = self.client.post(
            '/api/v1/auth/login/',
            {'email': self.user.email, 'password': 'WrongPass99!'},
            format='json',
            **headers,
        )
        self.assertIn(r.status_code, (400, 401))

    def test_lockout_trips_after_failures(self):
        for _ in range(5):
            headers = self._csrf()
            self.client.post(
                '/api/v1/auth/login/',
                {'email': self.user.email, 'password': 'WrongPass99!'},
                format='json',
                **headers,
            )
        headers = self._csrf()
        locked = self.client.post(
            '/api/v1/auth/login/',
            {'email': self.user.email, 'password': self.password},
            format='json',
            **headers,
        )
        self.assertEqual(locked.status_code, 403)
        self.assertEqual(locked.data.get('code'), 'login_locked')

    def test_refresh_and_logout_clear_cookies(self):
        headers = self._csrf()
        login = self.client.post(
            '/api/v1/auth/login/',
            {'email': self.user.email, 'password': self.password},
            format='json',
            **headers,
        )
        self.assertEqual(login.status_code, 200)

        headers = self._csrf()
        refresh = self.client.post('/api/v1/auth/refresh/', {}, format='json', **headers)
        self.assertEqual(refresh.status_code, 200)
        self.assertIn('esp_access', refresh.cookies)

        headers = self._csrf()
        logout = self.client.post('/api/v1/auth/logout/', {}, format='json', **headers)
        self.assertIn(logout.status_code, (200, 204))
        me = self.client.get('/api/v1/auth/me/')
        self.assertEqual(me.status_code, 401)
