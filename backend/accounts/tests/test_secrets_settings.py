"""Phase 8 — SECRET_KEY / DEBUG bootstrap rules."""

import os
import subprocess
import sys
import unittest
from pathlib import Path

SETTINGS_PATH = Path(__file__).resolve().parents[2] / 'backend' / 'settings.py'
BACKEND_ROOT = Path(__file__).resolve().parents[2]


def _run_probe(env: dict, script: str) -> subprocess.CompletedProcess:
    clean = {
        'PATH': os.environ.get('PATH', ''),
        'HOME': os.environ.get('HOME', ''),
        'PYTHONPATH': str(BACKEND_ROOT),
    }
    clean.update(env)
    return subprocess.run(
        [sys.executable, '-c', script],
        cwd=str(BACKEND_ROOT),
        env=clean,
        capture_output=True,
        text=True,
    )


class SecretsSettingsTests(unittest.TestCase):
    def test_settings_source_has_no_hardcoded_insecure_legacy_key(self):
        text = SETTINGS_PATH.read_text(encoding='utf-8')
        self.assertNotIn('django-insecure-b1yk9ocnx', text)
        self.assertNotIn('esp-demo-change-me-oracle-hassen', text)

    def test_missing_secret_key_raises(self):
        script = (
            'import os, sys\n'
            'from unittest.mock import patch\n'
            'os.environ["SECRET_KEY"] = ""\n'
            'os.environ["DEBUG"] = "True"\n'
            'os.environ["DJANGO_ENV"] = "local"\n'
            'with patch("dotenv.load_dotenv", lambda *a, **k: False):\n'
            '    sys.modules.pop("backend.settings", None)\n'
            '    try:\n'
            '        import backend.settings\n'
            '    except Exception as e:\n'
            '        print(type(e).__name__)\n'
            '        sys.exit(0)\n'
            'print("UNEXPECTED")\n'
            'sys.exit(1)\n'
        )
        r = _run_probe({'SECRET_KEY': '', 'DEBUG': 'True', 'DJANGO_ENV': 'local'}, script)
        self.assertEqual(r.returncode, 0, r.stderr + r.stdout)
        self.assertIn('ImproperlyConfigured', r.stdout)

    def test_weak_key_rejected_when_debug_false(self):
        script = (
            'import os, sys\n'
            'from unittest.mock import patch\n'
            'os.environ["SECRET_KEY"] = "django-insecure-change-me-local-short"\n'
            'os.environ["DEBUG"] = "False"\n'
            'os.environ["DJANGO_ENV"] = "local"\n'
            'with patch("dotenv.load_dotenv", lambda *a, **k: False):\n'
            '    sys.modules.pop("backend.settings", None)\n'
            '    try:\n'
            '        import backend.settings\n'
            '    except Exception as e:\n'
            '        print(type(e).__name__)\n'
            '        sys.exit(0)\n'
            'print("UNEXPECTED")\n'
            'sys.exit(1)\n'
        )
        r = _run_probe(
            {
                'SECRET_KEY': 'django-insecure-change-me-local-short',
                'DEBUG': 'False',
                'DJANGO_ENV': 'local',
            },
            script,
        )
        self.assertEqual(r.returncode, 0, r.stderr + r.stdout)
        self.assertIn('ImproperlyConfigured', r.stdout)

    def test_strong_key_ok_with_debug_true(self):
        strong = 'x' * 64
        script = (
            'import os, sys\n'
            'from unittest.mock import patch\n'
            f'os.environ["SECRET_KEY"] = "{strong}"\n'
            'os.environ["DEBUG"] = "True"\n'
            'os.environ["DJANGO_ENV"] = "local"\n'
            'with patch("dotenv.load_dotenv", lambda *a, **k: False):\n'
            '    sys.modules.pop("backend.settings", None)\n'
            '    import backend.settings as s\n'
            '    assert s.DEBUG is True\n'
            '    assert len(s.SECRET_KEY) >= 50\n'
            '    print("OK")\n'
        )
        r = _run_probe(
            {'SECRET_KEY': strong, 'DEBUG': 'True', 'DJANGO_ENV': 'local'},
            script,
        )
        self.assertEqual(r.returncode, 0, r.stderr + r.stdout)
        self.assertIn('OK', r.stdout)

    def test_secret_is_weak_helper(self):
        from backend.settings import _secret_is_weak

        self.assertTrue(_secret_is_weak('short'))
        self.assertTrue(_secret_is_weak('django-insecure-' + 'a' * 60))
        self.assertTrue(_secret_is_weak('esp-demo-' + 'a' * 60))
        self.assertFalse(_secret_is_weak('a' * 50))


if __name__ == '__main__':
    unittest.main()
