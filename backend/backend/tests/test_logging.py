from django.test import SimpleTestCase

from backend.logging_config import RedactFilter, build_logging


class LoggingConfigTests(SimpleTestCase):
    def test_build_logging_json_when_not_debug(self):
        cfg = build_logging(False)
        self.assertEqual(cfg['handlers']['console']['formatter'], 'json')

    def test_redact_filter(self):
        import logging

        record = logging.LogRecord(
            name='t',
            level=logging.INFO,
            pathname=__file__,
            lineno=1,
            msg='login password=supersecret token=abc',
            args=(),
            exc_info=None,
        )
        RedactFilter().filter(record)
        self.assertIn('[REDACTED]', record.getMessage())
        self.assertNotIn('supersecret', record.getMessage())
