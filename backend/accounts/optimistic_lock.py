"""Optimistic concurrency helpers (row_version / If-Match)."""

from django.db import transaction
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.response import Response


class VersionConflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'Conflit de version : la ressource a été modifiée par un autre utilisateur.'
    default_code = 'version_conflict'

    def __init__(self, detail=None, current=None, current_version=None, resource=None):
        self.payload = {
            'code': 'version_conflict',
            'detail': detail or self.default_detail,
            'current_version': current_version,
            'resource': resource or '',
            'current': current,
        }
        super().__init__(detail=self.payload)


def parse_expected_version(request, data=None) -> int | None:
    """Read expected version from JSON body or If-Match header."""
    merged = {}
    if request is not None and hasattr(request, 'data'):
        try:
            if isinstance(request.data, dict):
                merged.update(request.data)
        except Exception:
            pass
    if isinstance(data, dict):
        merged.update(data)

    raw = merged.get('expected_version', None)
    if raw is None and request is not None:
        if_match = request.META.get('HTTP_IF_MATCH') or ''
        if not if_match and hasattr(request, 'headers'):
            if_match = request.headers.get('If-Match') or ''
        if if_match:
            raw = str(if_match).strip().strip('"')
    if raw is None or raw == '':
        return None
    try:
        return int(raw)
    except (TypeError, ValueError) as exc:
        raise ValidationError({'expected_version': ['Version invalide.']}) from exc


def serialize_current(instance, serializer_class=None, context=None):
    if serializer_class is None:
        return {
            'id': getattr(instance, 'pk', None),
            'row_version': getattr(instance, 'row_version', None),
            'updated_at': getattr(instance, 'updated_at', None),
        }
    return serializer_class(instance, context=context or {}).data


def assert_version_match(instance, expected: int | None, *, resource: str, current=None):
    """Raise VersionConflict if expected is missing or does not match."""
    current_version = int(getattr(instance, 'row_version', 1) or 1)
    if expected is None:
        raise VersionConflict(
            detail='expected_version (ou en-tête If-Match) est requis pour cette opération.',
            current_version=current_version,
            resource=resource,
            current=current,
        )
    if int(expected) != current_version:
        raise VersionConflict(
            detail=(
                'Un autre utilisateur a modifié cette ressource. '
                'Rechargez puis réessayez.'
            ),
            current_version=current_version,
            resource=resource,
            current=current,
        )


def bump_version(instance):
    """Increment row_version and save. Returns new version."""
    current = int(getattr(instance, 'row_version', 1) or 1)
    instance.row_version = current + 1
    fields = ['row_version']
    if hasattr(instance, 'updated_at'):
        fields.append('updated_at')
    instance.save(update_fields=fields)
    return instance.row_version


class OptimisticLockMixin:
    """
    Require expected_version / If-Match on update, partial_update, destroy.
    Bumps row_version after a successful write.
    Place this mixin *before* AuditedModelViewSetMixin in the MRO.
    """

    optimistic_lock_resource = ''
    require_version_on_write = True

    def _lock_resource_name(self):
        return self.optimistic_lock_resource or getattr(
            self, 'audit_resource_type', self.queryset.model.__name__.lower()
        )

    def get_object(self):
        locked = getattr(self, '_locked_instance', None)
        if locked is not None:
            return locked
        return super().get_object()

    def _acquire_locked_instance(self):
        """Lock row without OUTER JOINs (select_related breaks SELECT FOR UPDATE on Postgres)."""
        from rest_framework.exceptions import NotFound

        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}
        scoped = self.filter_queryset(self.get_queryset())
        if not scoped.filter(**filter_kwargs).exists():
            raise NotFound()
        obj = self.queryset.model.objects.select_for_update().get(**filter_kwargs)
        self.check_object_permissions(self.request, obj)
        return obj

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        with transaction.atomic():
            self._locked_instance = self._acquire_locked_instance()
            try:
                instance = self._locked_instance
                expected = parse_expected_version(request)
                serializer = self.get_serializer(instance, data=request.data, partial=partial)
                serializer.is_valid(raise_exception=True)
                if self.require_version_on_write:
                    assert_version_match(
                        instance,
                        expected,
                        resource=self._lock_resource_name(),
                        current=serialize_current(
                            instance,
                            serializer_class=self.get_serializer_class(),
                            context=self.get_serializer_context(),
                        ),
                    )
                self.perform_update(serializer)
                bump_version(serializer.instance)
                serializer.instance.refresh_from_db()
                return Response(self.get_serializer(serializer.instance).data)
            finally:
                self._locked_instance = None

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        with transaction.atomic():
            self._locked_instance = self._acquire_locked_instance()
            try:
                instance = self._locked_instance
                expected = parse_expected_version(request)
                if self.require_version_on_write:
                    assert_version_match(
                        instance,
                        expected,
                        resource=self._lock_resource_name(),
                        current=serialize_current(
                            instance,
                            serializer_class=self.get_serializer_class(),
                            context=self.get_serializer_context(),
                        ),
                    )
                self.perform_destroy(instance)
                return Response(status=status.HTTP_204_NO_CONTENT)
            finally:
                self._locked_instance = None
