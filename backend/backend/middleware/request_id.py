"""Attach X-Request-ID for structured logs (Phase 32)."""

from __future__ import annotations

import uuid


class RequestIdMiddleware:
    HEADER = 'HTTP_X_REQUEST_ID'

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        rid = (request.META.get(self.HEADER) or '').strip() or uuid.uuid4().hex
        request.request_id = rid
        response = self.get_response(request)
        response['X-Request-ID'] = rid
        return response
