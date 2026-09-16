from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
import logging

from .email_messages import build_password_reset_otp_email

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_password_reset_otp_email(
    self,
    email: str,
    otp: str,
    source: str = 'login_recovery',
    lang: str = 'fr',
):
    subject, text, html = build_password_reset_otp_email(otp=otp, source=source, lang=lang)
    try:
        send_mail(
            subject=subject,
            message=text,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=html,
            fail_silently=False,
        )
    except Exception as exc:
        # Eager mode: do not raise Retry (would 500 the HTTP request).
        if settings.CELERY_TASK_ALWAYS_EAGER:
            logger.exception('password-reset OTP mail failed email=%s', email)
            return
        raise self.retry(exc=exc)
