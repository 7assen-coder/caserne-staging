"""CSRF helpers for cookie-based JWT (DRF does not enforce CSRF for non-session auth)."""

from django.middleware.csrf import CsrfViewMiddleware
from rest_framework import exceptions


class _CSRFCheck(CsrfViewMiddleware):
    def _reject(self, request, reason):
        return reason


def enforce_csrf(request):
    """Raise PermissionDenied if CSRF check fails (same idea as SessionAuthentication)."""
    check = _CSRFCheck(lambda req: None)
    check.process_request(request)
    reason = check.process_view(request, None, (), {})
    if reason:
        raise exceptions.PermissionDenied(f'CSRF Failed: {reason}')
