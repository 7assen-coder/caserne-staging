"""Configuration Django du projet backend."""

from pathlib import Path
import os
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Local secrets (never commit backend/.env)
try:
    from dotenv import load_dotenv

    load_dotenv(BASE_DIR / '.env')
except ImportError:
    pass


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/
from django.core.exceptions import ImproperlyConfigured

DJANGO_ENV = os.environ.get('DJANGO_ENV', 'local').strip().lower()


def _secret_is_weak(key: str) -> bool:
    k = (key or '').lower()
    return (
        len(key or '') < 50
        or 'insecure' in k
        or 'change-me' in k
        or 'esp-demo' in k
    )


SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    raise ImproperlyConfigured(
        'SECRET_KEY manquant. Définir la variable ou backend/.env (voir .env.example).'
    )

# Default False — production-safe; set DEBUG=True explicitly in local .env
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

if (not DEBUG or DJANGO_ENV in ('production', 'staging', 'render')) and _secret_is_weak(
    SECRET_KEY
):
    raise ImproperlyConfigured('SECRET_KEY trop faible pour cet environnement.')

ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1,backend').split(',')
    if h.strip()
]


def _split_origins(env_name, defaults):
    raw = os.environ.get(env_name, '').strip()
    if not raw:
        return list(defaults)
    return [o.strip() for o in raw.split(',') if o.strip()]


# Application definition

INSTALLED_APPS = [
    'django_prometheus',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'drf_spectacular',
    'accounts.apps.AccountsConfig',
    'etudiants.apps.EtudiantsConfig',
    'operations.apps.OperationsConfig',
]

MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',
    'backend.middleware.request_id.RequestIdMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'backend.middleware.security_headers.ApiSecurityHeadersMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'backend.middleware.request_log.RequestLogMiddleware',
    'django_prometheus.middleware.PrometheusAfterMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

# Phase 17 — connection reuse. VPS (direct Postgres): CONN_MAX_AGE=600.
# With PgBouncer transaction pooling later: CONN_MAX_AGE=0.
_DB_OPTIONS = {
    'sslmode': os.environ.get('DB_SSLMODE', 'prefer'),
}
_DB_CONNECT_TIMEOUT = os.environ.get('DB_CONNECT_TIMEOUT', '').strip()
if _DB_CONNECT_TIMEOUT:
    _DB_OPTIONS['connect_timeout'] = int(_DB_CONNECT_TIMEOUT)
_DB_STATEMENT_TIMEOUT_MS = os.environ.get('DB_STATEMENT_TIMEOUT_MS', '').strip()
if _DB_STATEMENT_TIMEOUT_MS:
    _DB_OPTIONS['options'] = f'-c statement_timeout={int(_DB_STATEMENT_TIMEOUT_MS)}'

DATABASES = {
    'default': {
        'ENGINE': 'django_prometheus.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'esp'),
        'USER': os.environ.get('DB_USER', 'esp'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'esp'),
        'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
        'PORT': os.environ.get('DB_PORT', '5433'),
        'CONN_MAX_AGE': int(os.environ.get('CONN_MAX_AGE', '60')),
        'OPTIONS': _DB_OPTIONS,
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Media Files (pour les PDF et Images)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Phase 23 — durable S3-compatible media (MinIO / R2 / AWS)
USE_S3_MEDIA = os.environ.get('USE_S3_MEDIA', 'False').strip().lower() in (
    '1',
    'true',
    'yes',
    'on',
)
# Phase 24 — stream (default) or xaccel (local disk + Compose nginx only)
_MEDIA_DELIVERY_RAW = (os.environ.get('MEDIA_DELIVERY') or '').strip().lower()
if _MEDIA_DELIVERY_RAW in ('stream', 'xaccel'):
    MEDIA_DELIVERY = _MEDIA_DELIVERY_RAW
elif USE_S3_MEDIA:
    MEDIA_DELIVERY = 'stream'
else:
    # Prefer stream so Render (no nginx X-Accel) works when DEBUG=False.
    MEDIA_DELIVERY = 'stream'

HEALTHZ_REQUIRE_STORAGE = os.environ.get('HEALTHZ_REQUIRE_STORAGE', 'False').strip().lower() in (
    '1',
    'true',
    'yes',
    'on',
)

# Phase 25 — require Redis on readiness unless USE_LOCMEM_CACHE (Render free) or explicit override
_healthz_redis_raw = os.environ.get('HEALTHZ_REQUIRE_REDIS', '').strip().lower()
_use_locmem_for_healthz = os.environ.get('USE_LOCMEM_CACHE', 'False') == 'True'
if _healthz_redis_raw in ('1', 'true', 'yes', 'on'):
    HEALTHZ_REQUIRE_REDIS = True
elif _healthz_redis_raw in ('0', 'false', 'no', 'off'):
    HEALTHZ_REQUIRE_REDIS = False
else:
    HEALTHZ_REQUIRE_REDIS = not _use_locmem_for_healthz

if USE_S3_MEDIA:
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID', '')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY', '')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME', 'polyspace-media')
    AWS_S3_ENDPOINT_URL = (os.environ.get('AWS_S3_ENDPOINT_URL') or '').strip() or None
    AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME', 'us-east-1')
    AWS_S3_ADDRESSING_STYLE = os.environ.get('AWS_S3_ADDRESSING_STYLE', 'path')
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = False
    AWS_S3_FILE_OVERWRITE = False
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'private, max-age=0, no-store',
    }
    STORAGES = {
        'default': {
            'BACKEND': 'storages.backends.s3boto3.S3Boto3Storage',
        },
        'staticfiles': {
            'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
        },
    }
else:
    STORAGES = {
        'default': {
            'BACKEND': 'django.core.files.storage.FileSystemStorage',
        },
        'staticfiles': {
            'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
        },
    }

# CORS (credentials + cookies JWT) — set CORS_ALLOWED_ORIGINS for Render static origin
CORS_ALLOW_CREDENTIALS = True
_CORS_DEFAULTS = (
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:9081',
    'http://127.0.0.1:9081',
)
CORS_ALLOWED_ORIGINS = _split_origins('CORS_ALLOWED_ORIGINS', _CORS_DEFAULTS)

CSRF_TRUSTED_ORIGINS = _split_origins(
    'CSRF_TRUSTED_ORIGINS',
    (
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:9081',
        'http://127.0.0.1:9081',
    ),
)

# Behind Render / reverse proxies
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# ---------------------------------------------------------------------------
# Security headers (Phase 5) — production / staging when DEBUG=False
# ---------------------------------------------------------------------------

def _env_bool(name, default=False):
    raw = os.environ.get(name)
    if raw is None or raw == '':
        return default
    return raw.strip().lower() in ('1', 'true', 'yes', 'on')


SECURITY_HEADERS_ENABLED = _env_bool(
    'SECURITY_HEADERS_ENABLED',
    default=not DEBUG,
)
CSP_REPORT_ONLY = _env_bool('CSP_REPORT_ONLY', default=False)
API_CSP = os.environ.get(
    'API_CSP',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
)

if SECURITY_HEADERS_ENABLED:
    SECURE_SSL_REDIRECT = _env_bool('SECURE_SSL_REDIRECT', default=True)
    SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', '31536000'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = _env_bool(
        'SECURE_HSTS_INCLUDE_SUBDOMAINS', default=True
    )
    SECURE_HSTS_PRELOAD = _env_bool('SECURE_HSTS_PRELOAD', default=False)
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = os.environ.get('SECURE_REFERRER_POLICY', 'same-origin')
    X_FRAME_OPTIONS = 'DENY'
    SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin'
else:
    SECURE_SSL_REDIRECT = False
    SECURE_HSTS_SECONDS = 0
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = 'same-origin'
    X_FRAME_OPTIONS = 'DENY'

JWT_COOKIE_ACCESS_NAME = 'esp_access'
JWT_COOKIE_REFRESH_NAME = 'esp_refresh'

# Cookie JWT policy — SameSite=None required for cross-origin SPA↔API (Render split hosts)
_JWT_SAMESITE_ENV = (os.environ.get('JWT_COOKIE_SAMESITE') or '').strip()
if _JWT_SAMESITE_ENV:
    JWT_COOKIE_SAMESITE = _JWT_SAMESITE_ENV
elif DEBUG:
    JWT_COOKIE_SAMESITE = 'Lax'
else:
    JWT_COOKIE_SAMESITE = 'None'

_JWT_SECURE_ENV = os.environ.get('JWT_COOKIE_SECURE')
if _JWT_SECURE_ENV is not None and _JWT_SECURE_ENV != '':
    JWT_COOKIE_SECURE = _JWT_SECURE_ENV == 'True'
else:
    JWT_COOKIE_SECURE = JWT_COOKIE_SAMESITE == 'None' or not DEBUG

JWT_COOKIE_DOMAIN = (os.environ.get('JWT_COOKIE_DOMAIN') or '').strip() or None

# Align Django CSRF cookie with JWT cross-origin needs
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SECURE = JWT_COOKIE_SECURE
CSRF_COOKIE_SAMESITE = JWT_COOKIE_SAMESITE
if JWT_COOKIE_DOMAIN:
    CSRF_COOKIE_DOMAIN = JWT_COOKIE_DOMAIN

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=14),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# Login rate limit / lockout (Redis or LocMem cache)
LOGIN_MAX_FAILURES = int(os.environ.get('LOGIN_MAX_FAILURES', '5'))
LOGIN_LOCKOUT_SECONDS = int(os.environ.get('LOGIN_LOCKOUT_SECONDS', '900'))
LOGIN_IP_MAX_FAILURES = int(os.environ.get('LOGIN_IP_MAX_FAILURES', '30'))
LOGIN_FAILURE_WINDOW_SECONDS = int(os.environ.get('LOGIN_FAILURE_WINDOW_SECONDS', '900'))
LOGIN_THROTTLE_RATE = os.environ.get('LOGIN_THROTTLE_RATE', '10/min')
PASSWORD_RESET_REQUEST_THROTTLE_RATE = os.environ.get(
    'PASSWORD_RESET_REQUEST_THROTTLE_RATE', '100/hour'
)
PASSWORD_RESET_VERIFY_THROTTLE_RATE = os.environ.get(
    'PASSWORD_RESET_VERIFY_THROTTLE_RATE', '60/hour'
)

# Django Rest Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'accounts.authentication.CookieJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_THROTTLE_RATES': {
        'login': LOGIN_THROTTLE_RATE,
        'password_reset_request': PASSWORD_RESET_REQUEST_THROTTLE_RATE,
        'password_reset_verify': PASSWORD_RESET_VERIFY_THROTTLE_RATE,
    },
    'EXCEPTION_HANDLER': 'backend.exceptions.custom_exception_handler',
}

# Spectacular Configuration
SPECTACULAR_SETTINGS = {
    'TITLE': 'Polyspace API',
    'DESCRIPTION': 'API v1 — Poste de commandement de la scolarité (ESP)',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SCHEMA_PATH_PREFIX': r'/api/v1',
    'TAGS': [
        {'name': 'Auth', 'description': 'Session cookie JWT, CSRF, mot de passe'},
        {'name': 'Users', 'description': 'Comptes militaires @esp.mr'},
        {'name': 'Audit', 'description': 'Journal d’audit'},
        {'name': 'Eleves', 'description': 'Élèves et dossiers liés'},
        {'name': 'ImportExport', 'description': 'Import / export élèves'},
        {'name': 'Ops', 'description': 'Opérations (sanctions, droits, présence, …)'},
        {'name': 'Health', 'description': 'Sondes livez / readyz (hors v1)'},
    ],
    'POSTPROCESSING_HOOKS': [
        'backend.spectacular_hooks.assign_v1_tags',
    ],
}

# ---------------------------------------------------------------------------
# Celery / Redis / email (password-reset OTP)
# ---------------------------------------------------------------------------

CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://127.0.0.1:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', CELERY_BROKER_URL)
CELERY_TASK_ALWAYS_EAGER = os.environ.get('CELERY_TASK_ALWAYS_EAGER', 'False') == 'True'
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'

_REDIS_URL = os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/1')
_USE_LOCMEM_CACHE = os.environ.get('USE_LOCMEM_CACHE', 'False') == 'True'
_CACHE_KEY_PREFIX = os.environ.get('CACHE_KEY_PREFIX', 'polyspace')
_CACHE_DEFAULT_TTL = int(os.environ.get('CACHE_DEFAULT_TTL', '60'))
DASHBOARD_CACHE_TTL = int(os.environ.get('DASHBOARD_CACHE_TTL', '30'))
ELEVE_HOT_LIST_TTL = int(os.environ.get('ELEVE_HOT_LIST_TTL', '20'))
if _USE_LOCMEM_CACHE:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'polyspace-otp',
            'KEY_PREFIX': _CACHE_KEY_PREFIX,
            'TIMEOUT': _CACHE_DEFAULT_TTL,
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': _REDIS_URL,
            'KEY_PREFIX': _CACHE_KEY_PREFIX,
            'TIMEOUT': _CACHE_DEFAULT_TTL,
        }
    }

# Phase 40 — shared cache for Django sessions when Redis is on (multi-replica safe).
# LocMem is forbidden when BACKEND_REPLICAS > 1 or DJANGO_ENV=production.
_BACKEND_REPLICAS = int(os.environ.get('BACKEND_REPLICAS', '1'))
if _BACKEND_REPLICAS > 1 and _USE_LOCMEM_CACHE:
    raise ImproperlyConfigured(
        'BACKEND_REPLICAS>1 requires shared Redis: set USE_LOCMEM_CACHE=False and REDIS_URL.'
    )
if DJANGO_ENV == 'production' and _USE_LOCMEM_CACHE:
    raise ImproperlyConfigured(
        'Production forbids USE_LOCMEM_CACHE (lockout/cache must be shared across workers/replicas).'
    )
if DJANGO_ENV == 'production' and not USE_S3_MEDIA:
    raise ImproperlyConfigured(
        'Production requires USE_S3_MEDIA=True (shared MinIO/S3 — no local disk media on replicas).'
    )
if not _USE_LOCMEM_CACHE:
    SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
    SESSION_CACHE_ALIAS = 'default'

# Phase 19 — Gunicorn sizing (documented; process reads these via shell/env in CMD)
GUNICORN_WORKERS = int(os.environ.get('GUNICORN_WORKERS', '3'))
GUNICORN_THREADS = int(os.environ.get('GUNICORN_THREADS', '2'))
GUNICORN_TIMEOUT = int(os.environ.get('GUNICORN_TIMEOUT', '60'))
GUNICORN_MAX_REQUESTS = int(os.environ.get('GUNICORN_MAX_REQUESTS', '1000'))
CELERY_CONCURRENCY = int(os.environ.get('CELERY_CONCURRENCY', '2'))

EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND',
    (
        'django.core.mail.backends.smtp.EmailBackend'
        if os.environ.get('EMAIL_HOST_PASSWORD')
        else (
            'django.core.mail.backends.console.EmailBackend'
            if DEBUG
            else 'django.core.mail.backends.smtp.EmailBackend'
        )
    ),
)
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.resend.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', 'resend')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'Polyspace <noreply@polyspace.mr>')

PLATFORM_NAME = os.environ.get('PLATFORM_NAME', 'Polyspace')

# Upload limits: intake before normalize (~10 Mo files); nginx may need client_max_body_size ≥ 12M
DATA_UPLOAD_MAX_MEMORY_SIZE = int(os.environ.get('DATA_UPLOAD_MAX_MEMORY_SIZE', str(12 * 1024 * 1024)))
FILE_UPLOAD_MAX_MEMORY_SIZE = int(os.environ.get('FILE_UPLOAD_MAX_MEMORY_SIZE', str(12 * 1024 * 1024)))

# Password-reset OTP
OTP_LENGTH = 6
OTP_TTL_SECONDS = 600
OTP_MAX_ATTEMPTS = 5
OTP_REQUEST_PER_EMAIL_PER_HOUR = int(os.environ.get('OTP_REQUEST_PER_EMAIL_PER_HOUR', '5'))
OTP_REQUEST_PER_IP_PER_HOUR = int(os.environ.get('OTP_REQUEST_PER_IP_PER_HOUR', '20'))
OTP_RESEND_COOLDOWN_SECONDS = int(os.environ.get('OTP_RESEND_COOLDOWN_SECONDS', '60'))
OTP_VERIFY_PER_IP_PER_HOUR = int(os.environ.get('OTP_VERIFY_PER_IP_PER_HOUR', '40'))
RESET_TOKEN_TTL_SECONDS = 600
RESET_TOKEN_SALT = 'accounts.password-reset'

# ---------------------------------------------------------------------------
# Phase 32 — observability (Sentry, JSON logs, Prometheus)
# ---------------------------------------------------------------------------

METRICS_TOKEN = (os.environ.get('METRICS_TOKEN') or '').strip()

from backend.logging_config import build_logging  # noqa: E402

LOGGING = build_logging(DEBUG)

SENTRY_DSN = (os.environ.get('SENTRY_DSN') or '').strip()
SENTRY_TRACES_SAMPLE_RATE = float(os.environ.get('SENTRY_TRACES_SAMPLE_RATE', '0') or '0')
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.django import DjangoIntegration

    _sentry_env = DJANGO_ENV if DJANGO_ENV not in ('', 'local') else ('development' if DEBUG else 'production')
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration(), CeleryIntegration()],
        environment=_sentry_env,
        traces_sample_rate=SENTRY_TRACES_SAMPLE_RATE,
        send_default_pii=False,
    )
