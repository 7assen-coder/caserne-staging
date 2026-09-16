"""Password-reset OTP helpers (hashed OTP in cache, rate limits, signed reset token)."""

from __future__ import annotations

import hashlib
import hmac
import re
import secrets

from django.conf import settings
from django.core import signing
from django.core.cache import cache

# Local part: letters/digits/dot/_/%/- only; domain fixed @esp.mr (no '+').
_ESP_EMAIL_RE = re.compile(r'^[a-z0-9._%-]+@esp\.mr$')


class OtpError(Exception):
    def __init__(self, message: str, *, status: int = 400):
        super().__init__(message)
        self.message = message
        self.status = status


def _otp_length() -> int:
    return int(getattr(settings, 'OTP_LENGTH', 6))


def _otp_ttl() -> int:
    return int(getattr(settings, 'OTP_TTL_SECONDS', 600))


def _max_attempts() -> int:
    return int(getattr(settings, 'OTP_MAX_ATTEMPTS', 5))


def _email_limit() -> int:
    return int(getattr(settings, 'OTP_REQUEST_PER_EMAIL_PER_HOUR', 5))


def _ip_limit() -> int:
    return int(getattr(settings, 'OTP_REQUEST_PER_IP_PER_HOUR', 20))


def _cooldown_seconds() -> int:
    return int(getattr(settings, 'OTP_RESEND_COOLDOWN_SECONDS', 60))


def _verify_ip_limit() -> int:
    return int(getattr(settings, 'OTP_VERIFY_PER_IP_PER_HOUR', 40))


def _reset_ttl() -> int:
    return int(getattr(settings, 'RESET_TOKEN_TTL_SECONDS', 600))


def _salt() -> str:
    return getattr(settings, 'RESET_TOKEN_SALT', 'accounts.password-reset')


def normalize_email(email: str) -> str:
    return (email or '').strip().lower()


def validate_esp_email(email: str) -> str:
    """Normalize and require a professional @esp.mr address. Raises ValueError."""
    value = normalize_email(email)
    if not value or len(value) > 254:
        raise ValueError("L'e-mail est invalide.")
    if not _ESP_EMAIL_RE.fullmatch(value):
        raise ValueError("L'e-mail doit se terminer par @esp.mr.")
    return value


def validate_otp_code(otp: str) -> str:
    """Require exact digit length matching OTP_LENGTH. Raises ValueError."""
    candidate = (otp or '').strip()
    length = _otp_length()
    if not candidate.isdigit() or len(candidate) != length:
        raise ValueError(f'Le code doit contenir exactement {length} chiffres.')
    return candidate


def generate_otp() -> str:
    upper = 10 ** _otp_length()
    return str(secrets.randbelow(upper)).zfill(_otp_length())


def hash_otp(email: str, otp: str) -> str:
    key = settings.SECRET_KEY.encode('utf-8')
    msg = f'{normalize_email(email)}:{otp}'.encode('utf-8')
    return hmac.new(key, msg, hashlib.sha256).hexdigest()


def _otp_key(email: str) -> str:
    return f'otp:reset:{normalize_email(email)}'


def _attempts_key(email: str) -> str:
    return f'otp:attempts:{normalize_email(email)}'


def _rl_email_key(email: str) -> str:
    return f'otp:rl:email:{normalize_email(email)}'


def _rl_ip_key(ip: str) -> str:
    return f'otp:rl:ip:{ip or "unknown"}'


def _cooldown_key(email: str) -> str:
    return f'otp:cooldown:{normalize_email(email)}'


def _rl_verify_ip_key(ip: str) -> str:
    return f'otp:rl:verify:ip:{ip or "unknown"}'


def _incr_with_ttl(key: str, ttl: int) -> int:
    """Increment a counter; set TTL on first create. Returns new value."""
    try:
        value = cache.incr(key)
    except ValueError:
        cache.set(key, 1, timeout=ttl)
        return 1
    return int(value)


def check_request_rate_limits(*, email: str, ip: str) -> None:
    """IP + email hourly caps and per-email resend cooldown."""
    email = normalize_email(email)
    cooldown = _cooldown_seconds()
    if cooldown > 0 and cache.get(_cooldown_key(email)):
        raise OtpError('Trop de demandes. Réessayez dans une minute.', status=429)

    email_count = _incr_with_ttl(_rl_email_key(email), 3600)
    if email_count > _email_limit():
        raise OtpError('Trop de demandes. Réessayez dans une heure.', status=429)
    ip_count = _incr_with_ttl(_rl_ip_key(ip), 3600)
    if ip_count > _ip_limit():
        raise OtpError('Trop de demandes depuis cette adresse. Réessayez plus tard.', status=429)

    if cooldown > 0:
        cache.set(_cooldown_key(email), 1, timeout=cooldown)


def check_verify_rate_limits(*, ip: str) -> None:
    count = _incr_with_ttl(_rl_verify_ip_key(ip), 3600)
    if count > _verify_ip_limit():
        raise OtpError('Trop de tentatives depuis cette adresse. Réessayez plus tard.', status=429)


def store_otp(email: str, otp: str) -> None:
    email = normalize_email(email)
    cache.set(_otp_key(email), hash_otp(email, otp), timeout=_otp_ttl())
    cache.set(_attempts_key(email), 0, timeout=_otp_ttl())


def clear_otp(email: str) -> None:
    email = normalize_email(email)
    cache.delete(_otp_key(email))
    cache.delete(_attempts_key(email))


def otp_is_stored(email: str) -> bool:
    return bool(cache.get(_otp_key(normalize_email(email))))


def verify_otp(email: str, otp: str) -> None:
    email = normalize_email(email)
    stored = cache.get(_otp_key(email))
    if not stored:
        raise OtpError('Code expiré ou invalide. Demandez un nouveau code.')

    attempts = cache.get(_attempts_key(email)) or 0
    if int(attempts) >= _max_attempts():
        clear_otp(email)
        raise OtpError('Trop de tentatives. Demandez un nouveau code.', status=429)

    candidate = (otp or '').strip()
    if not hmac.compare_digest(stored, hash_otp(email, candidate)):
        try:
            cache.incr(_attempts_key(email))
        except ValueError:
            cache.set(_attempts_key(email), 1, timeout=_otp_ttl())
        raise OtpError('Code non reconnu.')

    clear_otp(email)


def issue_reset_token(user_id: int, email: str) -> str:
    return signing.dumps(
        {'uid': user_id, 'email': normalize_email(email)},
        salt=_salt(),
    )


def load_reset_token(token: str) -> dict:
    try:
        data = signing.loads(token, salt=_salt(), max_age=_reset_ttl())
    except signing.SignatureExpired as exc:
        raise OtpError('Lien de réinitialisation expiré. Recommencez.') from exc
    except signing.BadSignature as exc:
        raise OtpError('Jeton de réinitialisation invalide.') from exc
    if not isinstance(data, dict) or 'uid' not in data or 'email' not in data:
        raise OtpError('Jeton de réinitialisation invalide.')
    return data
