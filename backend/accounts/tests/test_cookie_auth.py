"""Cookie-only JWT auth: no tokens in body, rotation + blacklist, CSRF."""

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils.http import urlencode
from rest_framework.test import APIClient

from accounts.models import UserProfile
from accounts.serializers import ensure_profile


def _make_user(*, email='officer@esp.mr', password='TestPass12!'):
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
            'LOCATION': 'cookie-auth-tests',
        }
    },
    JWT_COOKIE_SECURE=False,
    JWT_COOKIE_SAMESITE='Lax',
    SIMPLE_JWT={
        'ACCESS_TOKEN_LIFETIME': __import__('datetime').timedelta(minutes=60),
        'REFRESH_TOKEN_LIFETIME': __import__('datetime').timedelta(days=14),
        'ROTATE_REFRESH_TOKENS': True,
        'BLACKLIST_AFTER_ROTATION': True,
        'UPDATE_LAST_LOGIN': True,
        'AUTH_HEADER_TYPES': ('Bearer',),
    },
)
class CookieAuthTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient(enforce_csrf_checks=True)
        self.user = _make_user()
        self.password = 'TestPass12!'

    def _csrf_headers(self):
        r = self.client.get('/api/v1/auth/csrf/')
        self.assertEqual(r.status_code, 200)
        token = r.cookies.get('csrftoken').value
        return {'HTTP_X_CSRFTOKEN': token}

    def test_login_sets_cookies_without_tokens_in_body(self):
        headers = self._csrf_headers()
        r = self.client.post(
            '/api/v1/auth/login/',
            {'email': self.user.email, 'password': self.password, 'remember_me': True},
            format='json',
            **headers,
        )
        self.assertEqual(r.status_code, 200)
        self.assertIn('user', r.data)
        self.assertNotIn('access', r.data)
        self.assertNotIn('refresh', r.data)
        self.assertIn('esp_access', r.cookies)
        self.assertIn('esp_refresh', r.cookies)
        cookie = r.cookies['esp_access']
        self.assertTrue(cookie['httponly'])
        # max-age aligned to access lifetime (~3600)
        self.assertLessEqual(int(cookie['max-age']), 3600)
        self.assertGreaterEqual(int(cookie['max-age']), 3500)

    def test_me_works_with_cookie_only(self):
        headers = self._csrf_headers()
        login = self.client.post(
            '/api/v1/auth/login/',
            {'email': self.user.email, 'password': self.password},
            format='json',
            **headers,
        )
        self.assertEqual(login.status_code, 200)
        # No Authorization header — cookies from login jar
        me = self.client.get('/api/v1/auth/me/')
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data['email'], self.user.email)

    def test_refresh_rotates_and_blacklists_old(self):
        headers = self._csrf_headers()
        login = self.client.post(
            '/api/v1/auth/login/',
            {'email': self.user.email, 'password': self.password},
            format='json',
            **headers,
        )
        self.assertEqual(login.status_code, 200)
        old_refresh = login.cookies['esp_refresh'].value

        headers = self._csrf_headers()
        refreshed = self.client.post('/api/v1/auth/refresh/', {}, format='json', **headers)
        self.assertEqual(refreshed.status_code, 200)
        self.assertEqual(refreshed.data.get('ok'), True)
        self.assertNotIn('access', refreshed.data)
        new_refresh = refreshed.cookies['esp_refresh'].value
        self.assertNotEqual(old_refresh, new_refresh)

        # Old refresh must fail (blacklisted after rotation)
        rogue = APIClient(enforce_csrf_checks=True)
        csrf = rogue.get('/api/v1/auth/csrf/')
        token = csrf.cookies.get('csrftoken').value
        rogue.cookies['esp_refresh'] = old_refresh
        bad = rogue.post(
            '/api/v1/auth/refresh/',
            {},
            format='json',
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertIn(bad.status_code, (401, 400))

    def test_logout_blacklists_refresh(self):
        headers = self._csrf_headers()
        login = self.client.post(
            '/api/v1/auth/login/',
            {'email': self.user.email, 'password': self.password},
            format='json',
            **headers,
        )
        refresh_val = login.cookies['esp_refresh'].value
        headers = self._csrf_headers()
        out = self.client.post('/api/v1/auth/logout/', {}, format='json', **headers)
        self.assertEqual(out.status_code, 204)

        rogue = APIClient(enforce_csrf_checks=True)
        csrf = rogue.get('/api/v1/auth/csrf/')
        token = csrf.cookies.get('csrftoken').value
        rogue.cookies['esp_refresh'] = refresh_val
        bad = rogue.post(
            '/api/v1/auth/refresh/',
            {},
            format='json',
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertIn(bad.status_code, (401, 400))
