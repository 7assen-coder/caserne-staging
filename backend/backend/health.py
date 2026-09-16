"""Health probes for load balancers (Phase 25).

- /api/livez/  — process up (no dependency checks)
- /api/readyz/ — DB + Redis (+ optional storage); fails with 503 when required deps fail
- /api/healthz/ — alias of readyz (Render healthCheckPath)

Never use /api/docs/ or /api/schema/ as a health probe.
"""

from django.conf import settings
from django.core.cache import cache
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import connection
from django.http import JsonResponse
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView


def _probe() -> dict:
    """Return dependency status dict (values: ok | error; storage optional)."""
    db_ok = False
    redis_ok = False
    storage_ok = None

    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
        db_ok = True
    except Exception:  # noqa: BLE001
        db_ok = False

    try:
        cache.set('healthz:ping', '1', timeout=5)
        redis_ok = cache.get('healthz:ping') == '1'
    except Exception:  # noqa: BLE001
        redis_ok = False

    if getattr(settings, 'USE_S3_MEDIA', False):
        storage_ok = False
        try:
            key = 'healthz/ping.txt'
            if not default_storage.exists(key):
                default_storage.save(key, ContentFile(b'ok'))
            storage_ok = default_storage.exists(key)
        except Exception:  # noqa: BLE001
            storage_ok = False

    return {
        'db': db_ok,
        'redis': redis_ok,
        'storage': storage_ok,
    }


def _ready_response():
    probe = _probe()
    db_ok = probe['db']
    redis_ok = probe['redis']
    storage_ok = probe['storage']

    require_redis = getattr(settings, 'HEALTHZ_REQUIRE_REDIS', False)
    require_storage = getattr(settings, 'HEALTHZ_REQUIRE_STORAGE', False)

    redis_fail = require_redis and not redis_ok
    storage_fail = require_storage and storage_ok is False
    ok = db_ok and not redis_fail and not storage_fail
    status_code = 200 if ok else 503

    payload = {
        'status': 'ok' if ok else 'degraded',
        'db': 'ok' if db_ok else 'error',
        'redis': 'ok' if redis_ok else 'error',
    }
    if storage_ok is not None:
        payload['storage'] = 'ok' if storage_ok else 'error'
    return JsonResponse(payload, status=status_code)


class LivezView(APIView):
    """Liveness: Django process is up. Do not check DB/Redis (avoids restart loops)."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return JsonResponse({'status': 'ok'}, status=200)


class ReadyzView(APIView):
    """Readiness: dependencies required for traffic."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return _ready_response()


class HealthzView(ReadyzView):
    """Compat alias of readyz (Render healthCheckPath)."""

    pass
