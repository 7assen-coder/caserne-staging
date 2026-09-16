"""Prometheus /metrics — private net or METRICS_TOKEN (Phase 32)."""

from __future__ import annotations

import ipaddress

from django.conf import settings
from django.http import HttpResponseForbidden
from django_prometheus.exports import ExportToDjangoView


def _client_ip(request) -> str:
    forwarded = (request.META.get('HTTP_X_FORWARDED_FOR') or '').split(',')[0].strip()
    return forwarded or (request.META.get('REMOTE_ADDR') or '')


def _is_private(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
        return bool(addr.is_private or addr.is_loopback)
    except ValueError:
        return False


def metrics_view(request):
    token = (getattr(settings, 'METRICS_TOKEN', '') or '').strip()
    provided = (
        request.GET.get('token') or request.headers.get('X-Metrics-Token') or ''
    ).strip()
    if token and provided == token:
        return ExportToDjangoView(request)
    if _is_private(_client_ip(request)):
        return ExportToDjangoView(request)
    return HttpResponseForbidden('metrics forbidden')
