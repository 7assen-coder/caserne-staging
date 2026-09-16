"""Redis/LocMem-backed login failure counters and account lockout."""

from __future__ import annotations

import time

from django.conf import settings
from django.core.cache import cache


def client_ip(request) -> str:
    forwarded = (request.META.get('HTTP_X_FORWARDED_FOR') or '').split(',')[0].strip()
    if forwarded:
        return forwarded
    return (request.META.get('REMOTE_ADDR') or '').strip() or 'unknown'


def _fail_ident_key(ident: str) -> str:
    return f'login:fail:ident:{ident}'


def _fail_ip_key(ip: str) -> str:
    return f'login:fail:ip:{ip}'


def _lock_key(ident: str) -> str:
    return f'login:lock:ident:{ident}'


def normalize_identifier(*, email: str = '', phone: str = '') -> str:
    email = (email or '').strip().lower()
    phone = (phone or '').strip()
    if email:
        return f'email:{email}'
    if phone:
        return f'phone:{phone}'
    return ''


def is_locked(ident: str) -> bool:
    if not ident:
        return False
    until = cache.get(_lock_key(ident))
    if until is None:
        return False
    try:
        return float(until) > time.time()
    except (TypeError, ValueError):
        return True


def lock_retry_after(ident: str) -> int:
    """Seconds remaining on lock."""
    if not ident:
        return 0
    until = cache.get(_lock_key(ident))
    if until is None:
        return 0
    try:
        remaining = int(float(until) - time.time())
    except (TypeError, ValueError):
        return int(getattr(settings, 'LOGIN_LOCKOUT_SECONDS', 900))
    return max(0, remaining)


def register_failure(ident: str, ip: str) -> dict:
    """
    Increment failure counters. Returns:
      { locked: bool, retry_after: int, ip_blocked: bool }
    """
    window = int(getattr(settings, 'LOGIN_FAILURE_WINDOW_SECONDS', 900))
    max_ident = int(getattr(settings, 'LOGIN_MAX_FAILURES', 5))
    max_ip = int(getattr(settings, 'LOGIN_IP_MAX_FAILURES', 30))
    lock_seconds = int(getattr(settings, 'LOGIN_LOCKOUT_SECONDS', 900))

    result = {'locked': False, 'retry_after': 0, 'ip_blocked': False}

    if ip:
        ip_key = _fail_ip_key(ip)
        ip_count = cache.get(ip_key, 0) + 1
        cache.set(ip_key, ip_count, window)
        if ip_count >= max_ip:
            result['ip_blocked'] = True
            result['retry_after'] = window

    if ident:
        ident_key = _fail_ident_key(ident)
        count = cache.get(ident_key, 0) + 1
        cache.set(ident_key, count, window)
        if count >= max_ident:
            until = time.time() + lock_seconds
            cache.set(_lock_key(ident), until, lock_seconds)
            result['locked'] = True
            result['retry_after'] = lock_seconds

    return result


def clear_failures(ident: str) -> None:
    if not ident:
        return
    cache.delete(_fail_ident_key(ident))
    cache.delete(_lock_key(ident))


def is_ip_blocked(ip: str) -> bool:
    if not ip:
        return False
    max_ip = int(getattr(settings, 'LOGIN_IP_MAX_FAILURES', 30))
    return cache.get(_fail_ip_key(ip), 0) >= max_ip
