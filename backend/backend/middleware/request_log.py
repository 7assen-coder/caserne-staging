"""Log each HTTP request as one structured line (Phase 32)."""

from __future__ import annotations

import logging
import time

logger = logging.getLogger('backend.request')


class RequestLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.perf_counter()
        response = self.get_response(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        user = getattr(request, 'user', None)
        user_id = '-'
        if user is not None and getattr(user, 'is_authenticated', False):
            user_id = str(getattr(user, 'pk', '-') or '-')
        extra = {
            'request_id': getattr(request, 'request_id', '-'),
            'user_id': user_id,
            'path': request.path,
            'status_code': response.status_code,
            'duration_ms': duration_ms,
        }
        logger.info(
            '%s %s -> %s (%.2fms)',
            request.method,
            request.path,
            response.status_code,
            duration_ms,
            extra=extra,
        )
        return response
