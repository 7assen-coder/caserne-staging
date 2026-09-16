"""Append-only audit writer — never raises into the request path."""

from __future__ import annotations

import logging
from typing import Any

from django.forms.models import model_to_dict

from .login_protection import client_ip
from .models import AuditEvent
from .permissions import get_profile, get_user_fonction

logger = logging.getLogger(__name__)

REDACT_KEYS = frozenset(
    {
        'nni',
        'password',
        'password1',
        'password2',
        'old_password',
        'new_password',
        'groupe_sanguin',
        'maladies',
        'maladies_chroniques',
        'medicaments',
        'medicaments_a_vie',
        'antecedents',
        'dossier_medical',
        'otp',
        'token',
        'refresh',
        'access',
    }
)


def _redact_value(key: str, value: Any) -> Any:
    if key.lower() in REDACT_KEYS or any(k in key.lower() for k in ('password', 'token', 'secret')):
        return '[REDACTED]'
    if isinstance(value, (dict, list)):
        return '[COMPLEX]'
    try:
        text = str(value)
    except Exception:
        return '[UNSERIALIZABLE]'
    if len(text) > 200:
        return text[:200] + '…'
    return value


def build_changes(instance, validated_data: dict | None) -> dict:
    """Field-level before/after for UPDATE; sensitive values redacted."""
    if not validated_data:
        return {}
    changes = {}
    for key, new_val in validated_data.items():
        if hasattr(instance, key):
            old_val = getattr(instance, key)
            if old_val == new_val:
                continue
            changes[key] = {
                'old': _redact_value(key, old_val),
                'new': _redact_value(key, new_val),
            }
        else:
            changes[key] = {'new': _redact_value(key, new_val)}
    return changes


def record_audit(
    *,
    request=None,
    action: str,
    resource_type: str,
    resource_id: str = '',
    eleve=None,
    summary: str = '',
    changes: dict | None = None,
    success: bool = True,
    actor=None,
):
    try:
        user = actor
        if user is None and request is not None:
            user = getattr(request, 'user', None)
            if user is not None and not getattr(user, 'is_authenticated', False):
                user = None

        email = ''
        role = ''
        if user is not None:
            email = (getattr(user, 'email', None) or getattr(user, 'username', '') or '')[:255]
            role = (get_user_fonction(user) or '')[:64]
            profile = get_profile(user)
            if profile and not role:
                role = (profile.fonction or '')[:64]

        ip = ''
        ua = ''
        path = ''
        method = ''
        if request is not None:
            ip = (client_ip(request) or '')[:64]
            ua = (request.META.get('HTTP_USER_AGENT') or '')[:512]
            path = (getattr(request, 'path', '') or '')[:512]
            method = (getattr(request, 'method', '') or '')[:16]

        matricule = ''
        eleve_obj = eleve
        if eleve_obj is not None:
            raw_mat = getattr(eleve_obj, 'matricule', None)
            matricule = str(raw_mat if raw_mat is not None else '')[:64]
            eleve_pk = getattr(eleve_obj, 'pk', None)
            # After DELETE the instance is gone — do not pass unsaved/deleted FK
            if eleve_pk is not None:
                try:
                    from etudiants.models import Eleve

                    if not Eleve.objects.filter(pk=eleve_pk).exists():
                        eleve_obj = None
                except Exception:
                    eleve_obj = None
            else:
                eleve_obj = None

        AuditEvent.objects.create(
            actor=user if user is not None and getattr(user, 'pk', None) else None,
            actor_email=email,
            actor_role=role,
            ip=ip,
            user_agent=ua,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id or '')[:64],
            eleve=eleve_obj,
            eleve_matricule=matricule,
            path=path,
            method=method,
            summary=(summary or '')[:255],
            changes=changes or {},
            success=success,
        )
    except Exception:
        logger.exception('audit write failed action=%s resource=%s', action, resource_type)


def snapshot_public_fields(instance, fields: list[str] | None = None) -> dict:
    """Optional helper for CREATE summaries."""
    try:
        data = model_to_dict(instance, fields=fields) if fields else model_to_dict(instance)
        return {k: _redact_value(k, v) for k, v in data.items()}
    except Exception:
        return {}
