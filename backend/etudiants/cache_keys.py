"""Phase 18 — versioned Redis/LocMem cache keys for dashboard + hot lists."""

from __future__ import annotations

import hashlib
import logging
from typing import Any, Callable

from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

ELEVE_LIST_VER_KEY = 'eleves:list:ver'
DASHBOARD_STATS_VER_KEY = 'dashboard:stats:ver'

HOT_LIST_QUERY_ALLOWLIST = frozenset(
    {'page', 'page_size', 'q', 'departement', 'niveau', 'annee', 'compagnie', 'section', 'sexe', 'ordering'}
)


def bump_version(key: str) -> int:
    try:
        return int(cache.incr(key))
    except ValueError:
        cache.set(key, 1, timeout=None)
        return 1
    except Exception as exc:  # noqa: BLE001 — Redis blip
        logger.warning('cache bump failed for %s: %s', key, exc)
        return 0


def get_version(key: str) -> int:
    try:
        val = cache.get(key)
        return int(val or 0)
    except Exception as exc:  # noqa: BLE001
        logger.warning('cache get version failed for %s: %s', key, exc)
        return 0


def bump_eleve_caches() -> None:
    bump_version(ELEVE_LIST_VER_KEY)
    bump_version(DASHBOARD_STATS_VER_KEY)


def dashboard_stats_cache_key(*, user_id: int, role: str) -> str:
    ver = get_version(DASHBOARD_STATS_VER_KEY)
    return f'dashboard:stats:v1:{ver}:{user_id}:{role}'


def hot_list_cache_key(*, role: str, scope_id: str, query_items: list[tuple[str, str]]) -> str:
    ver = get_version(ELEVE_LIST_VER_KEY)
    stable = '&'.join(f'{k}={v}' for k, v in sorted(query_items))
    digest = hashlib.sha256(stable.encode('utf-8')).hexdigest()[:24]
    return f'eleves:list:v1:{ver}:{role}:{scope_id}:{digest}'


def cache_get_or_set(key: str, producer: Callable[[], Any], timeout: int) -> Any:
    try:
        cached = cache.get(key)
        if cached is not None:
            return cached
    except Exception as exc:  # noqa: BLE001
        logger.warning('cache get failed for %s: %s', key, exc)
        return producer()

    value = producer()
    try:
        cache.set(key, value, timeout=timeout)
    except Exception as exc:  # noqa: BLE001
        logger.warning('cache set failed for %s: %s', key, exc)
    return value


def dashboard_ttl() -> int:
    return int(getattr(settings, 'DASHBOARD_CACHE_TTL', 30))


def hot_list_ttl() -> int:
    return int(getattr(settings, 'ELEVE_HOT_LIST_TTL', 20))
