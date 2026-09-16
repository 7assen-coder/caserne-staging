"""JSON logging helpers (Phase 32). Mask secrets in log records."""

from __future__ import annotations

import logging
import re

_SENSITIVE = re.compile(
    r'(password|passwd|secret|token|authorization|nni|cookie)=([^\s&]+)',
    re.I,
)


class RedactFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        try:
            msg = record.getMessage()
            if msg:
                record.msg = _SENSITIVE.sub(r'\1=[REDACTED]', msg)
                record.args = ()
        except Exception:
            pass
        return True


def build_logging(debug: bool) -> dict:
    """Return Django LOGGING dict — JSON to stdout when not DEBUG."""
    formatter = 'verbose' if debug else 'json'
    return {
        'version': 1,
        'disable_existing_loggers': False,
        'filters': {
            'request_context': {
                '()': 'backend.logging_config.RequestContextFilter',
            },
            'redact': {
                '()': 'backend.logging_config.RedactFilter',
            },
        },
        'formatters': {
            'verbose': {
                'format': '[{asctime}] {levelname} {name} {message}',
                'style': '{',
            },
            'json': {
                '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
                'fmt': '%(asctime)s %(levelname)s %(name)s %(message)s '
                '%(request_id)s %(user_id)s %(path)s %(status_code)s %(duration_ms)s',
            },
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'filters': ['request_context', 'redact'],
                'formatter': formatter,
            },
        },
        'root': {
            'handlers': ['console'],
            'level': 'DEBUG' if debug else 'INFO',
        },
        'loggers': {
            'django.request': {
                'handlers': ['console'],
                'level': 'WARNING',
                'propagate': False,
            },
            'django.db.backends': {
                'handlers': ['console'],
                'level': 'WARNING',
                'propagate': False,
            },
        },
    }


class RequestContextFilter(logging.Filter):
    """Fill request_id / user_id / path from thread-local or blanks."""

    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, 'request_id'):
            record.request_id = getattr(record, 'request_id', '-') or '-'
        if not hasattr(record, 'user_id'):
            record.user_id = '-'
        if not hasattr(record, 'path'):
            record.path = '-'
        if not hasattr(record, 'status_code'):
            record.status_code = '-'
        if not hasattr(record, 'duration_ms'):
            record.duration_ms = '-'
        return True
