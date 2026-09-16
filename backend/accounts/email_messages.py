from __future__ import annotations

from django.conf import settings

SOURCE_LOGIN_RECOVERY = 'login_recovery'
SOURCE_PROFILE_RESET = 'profile_reset'
SOURCE_DEFAULT = SOURCE_LOGIN_RECOVERY
VALID_SOURCES = frozenset({SOURCE_LOGIN_RECOVERY, SOURCE_PROFILE_RESET})

LANG_FR = 'fr'
LANG_AR = 'ar'
VALID_LANGS = frozenset({LANG_FR, LANG_AR})


def normalize_source(source: str | None) -> str:
    value = (source or '').strip().lower()
    return value if value in VALID_SOURCES else SOURCE_DEFAULT


def normalize_lang(lang: str | None) -> str:
    value = (lang or '').strip().lower()
    if value.startswith('ar'):
        return LANG_AR
    return LANG_FR


def platform_name() -> str:
    return getattr(settings, 'PLATFORM_NAME', 'Polyspace')


def _wrap_html(*, dir_attr: str, body_inner: str) -> str:
    """Minimal table layout for common clients — no gradients or decorative chrome."""
    return (
        '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'style="background:#f4f4f5;padding:24px 12px">'
        '<tr><td align="center">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="max-width:520px;background:#ffffff;border:1px solid #e4e4e7;'
        f'border-radius:4px;font-family:Georgia,\'Times New Roman\',serif;'
        f'font-size:15px;line-height:1.55;color:#18181b;direction:{dir_attr}">'
        f'<tr><td style="padding:28px 28px 24px">{body_inner}</td></tr>'
        '</table></td></tr></table></body></html>'
    )


def build_password_reset_otp_email(
    *,
    otp: str,
    source: str | None = None,
    lang: str | None = None,
) -> tuple[str, str, str]:
    """Password-reset OTP mail (plain + light HTML). `source` kept for audit."""
    normalize_source(source)  # validate / normalize for callers
    name = platform_name()
    ttl_min = int(getattr(settings, 'OTP_TTL_SECONDS', 600)) // 60
    locale = normalize_lang(lang)

    otp_span = (
        f'<span style="font-family:ui-monospace,Consolas,monospace;font-size:22px;'
        f'letter-spacing:0.18em;font-weight:600;direction:ltr;unicode-bidi:isolate">'
        f'{otp}</span>'
    )
    otp_box = (
        f'<div style="margin:20px 0;padding:16px 18px;background:#fafafa;'
        f'border:1px solid #e4e4e7;border-radius:4px;text-align:center">'
        f'{otp_span}</div>'
    )

    if locale == LANG_AR:
        subject = f'{name} — الرمز لإعادة التعيين'
        text = (
            f'{name}\n'
            f'\n'
            f'طلبت إعادة تعيين كلمة المرور لحسابك.\n'
            f'\n'
            f'الرمز: {otp}\n'
            f'\n'
            f'هذا الرمز صالح لمدة {ttl_min} دقائق.\n'
            f'لا تشاركه مع أي شخص. إذا لم تطلب ذلك، تجاهل هذه الرسالة؛ '
            f'كلمة مرورك تبقى دون تغيير.\n'
            f'\n'
            f'— فريق {name}\n'
        )
        body = (
            f'<p style="margin:0 0 8px;font-size:13px;letter-spacing:0.04em;'
            f'text-transform:uppercase;color:#71717a">{name}</p>'
            f'<p style="margin:0 0 16px">طلبت إعادة تعيين كلمة المرور لحسابك.</p>'
            f'<p style="margin:0 0 4px;font-size:13px;color:#52525b">الرمز</p>'
            f'{otp_box}'
            f'<p style="margin:0 0 12px">هذا الرمز صالح لمدة <strong>{ttl_min} دقائق</strong>.</p>'
            f'<p style="margin:0 0 20px;font-size:13px;color:#52525b">'
            f'لا تشاركه مع أي شخص. إذا لم تطلب ذلك، تجاهل هذه الرسالة؛ '
            f'كلمة مرورك تبقى دون تغيير.</p>'
            f'<p style="margin:0;font-size:13px;color:#71717a">— فريق {name}</p>'
        )
        html = _wrap_html(dir_attr='rtl', body_inner=body)
    else:
        subject = f'{name} — Code de réinitialisation'
        text = (
            f'{name}\n'
            f'\n'
            f'Vous avez demandé la réinitialisation du mot de passe de votre compte.\n'
            f'\n'
            f'Code : {otp}\n'
            f'\n'
            f'Ce code est valable {ttl_min} minutes.\n'
            f'Ne le communiquez à personne. Si vous n’êtes pas à l’origine de cette demande, '
            f'ignorez ce message ; votre mot de passe reste inchangé.\n'
            f'\n'
            f'— L’équipe {name}\n'
        )
        body = (
            f'<p style="margin:0 0 8px;font-size:13px;letter-spacing:0.04em;'
            f'text-transform:uppercase;color:#71717a">{name}</p>'
            f'<p style="margin:0 0 16px">'
            f'Vous avez demandé la réinitialisation du mot de passe de votre compte.</p>'
            f'<p style="margin:0 0 4px;font-size:13px;color:#52525b">Code</p>'
            f'{otp_box}'
            f'<p style="margin:0 0 12px">Ce code est valable <strong>{ttl_min} minutes</strong>.</p>'
            f'<p style="margin:0 0 20px;font-size:13px;color:#52525b">'
            f'Ne le communiquez à personne. Si vous n’êtes pas à l’origine de cette demande, '
            f'ignorez ce message ; votre mot de passe reste inchangé.</p>'
            f'<p style="margin:0;font-size:13px;color:#71717a">— L’équipe {name}</p>'
        )
        html = _wrap_html(dir_attr='ltr', body_inner=body)

    return subject, text, html
