"""RBAC: role matrix, scoped querysets, DRF permission classes."""

from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import UserProfile

FORBIDDEN_DETAIL = "Vous n'avez pas la permission d'effectuer cette action."
REVOKED_DETAIL = 'Accès révoqué.'

# Action capabilities per role (élèves / related / import / media)
ROLE_CAPS = {
    UserProfile.ROLE_ETUDIANT: {
        'list': True,
        'retrieve': True,
        'create': False,
        'update': False,
        'destroy': False,
        'import': False,
        'media': True,
        'manage_users': False,
    },
    UserProfile.ROLE_SUPERVISEUR: {
        'list': True,
        'retrieve': True,
        'create': False,
        'update': False,
        'destroy': False,
        'import': False,
        'media': True,
        'manage_users': False,
    },
    UserProfile.ROLE_CHEF_SECTION: {
        'list': True,
        'retrieve': True,
        'create': False,
        'update': False,
        'destroy': False,
        'import': False,
        'media': True,
        'manage_users': False,
    },
    UserProfile.ROLE_COMMANDANT_COMPAGNIE: {
        'list': True,
        'retrieve': True,
        'create': False,
        'update': False,
        'destroy': False,
        'import': False,
        'media': True,
        'manage_users': False,
    },
    UserProfile.ROLE_COMMANDANT_GROUPEMENT: {
        'list': True,
        'retrieve': True,
        'create': False,
        'update': False,
        'destroy': False,
        'import': False,
        'media': True,
        'manage_users': False,
    },
    UserProfile.ROLE_COMMANDANT_UNITE: {
        'list': True,
        'retrieve': True,
        'create': True,
        'update': True,
        'destroy': True,
        'import': True,
        'media': True,
        'manage_users': False,
    },
    UserProfile.ROLE_ADMINISTRATEUR: {
        'list': True,
        'retrieve': True,
        'create': True,
        'update': True,
        'destroy': True,
        'import': True,
        'media': True,
        'manage_users': True,
    },
}

# Field-level access: view_nni is True | False | 'masked'
SENSITIVE_CAPS = {
    UserProfile.ROLE_ETUDIANT: {
        'view_nni': True,
        'edit_nni': False,
        'view_sante': True,
        'edit_sante': False,
        'view_parents': True,
        'edit_parents': False,
    },
    UserProfile.ROLE_SUPERVISEUR: {
        'view_nni': 'masked',
        'edit_nni': False,
        'view_sante': False,
        'edit_sante': False,
        'view_parents': False,
        'edit_parents': False,
    },
    UserProfile.ROLE_CHEF_SECTION: {
        'view_nni': True,
        'edit_nni': False,
        'view_sante': True,
        'edit_sante': False,
        'view_parents': True,
        'edit_parents': False,
    },
    UserProfile.ROLE_COMMANDANT_COMPAGNIE: {
        'view_nni': True,
        'edit_nni': False,
        'view_sante': True,
        'edit_sante': False,
        'view_parents': True,
        'edit_parents': False,
    },
    UserProfile.ROLE_COMMANDANT_GROUPEMENT: {
        'view_nni': True,
        'edit_nni': False,
        'view_sante': True,
        'edit_sante': False,
        'view_parents': True,
        'edit_parents': False,
    },
    UserProfile.ROLE_COMMANDANT_UNITE: {
        'view_nni': True,
        'edit_nni': True,
        'view_sante': True,
        'edit_sante': True,
        'view_parents': True,
        'edit_parents': True,
    },
    UserProfile.ROLE_ADMINISTRATEUR: {
        'view_nni': True,
        'edit_nni': True,
        'view_sante': True,
        'edit_sante': True,
        'view_parents': True,
        'edit_parents': True,
    },
}

_ACTION_TO_CAP = {
    'list': 'list',
    'retrieve': 'retrieve',
    'create': 'create',
    'update': 'update',
    'partial_update': 'update',
    'destroy': 'destroy',
    'dashboard_stats': 'list',
    'patch_semestre': 'update',
}


def get_profile(user):
    if user is None or not getattr(user, 'is_authenticated', False):
        return None
    return getattr(user, 'profile', None)


def get_user_fonction(user):
    if user is None or not getattr(user, 'is_authenticated', False):
        return None
    if getattr(user, 'is_superuser', False):
        return UserProfile.ROLE_ADMINISTRATEUR
    profile = get_profile(user)
    if profile is None:
        return None
    return profile.fonction


def access_is_active(user) -> bool:
    if user is None or not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_superuser', False):
        return True
    profile = get_profile(user)
    if profile is None:
        return False
    return bool(profile.is_active_access)


def role_has_cap(fonction: str | None, cap: str) -> bool:
    if not fonction:
        return False
    caps = ROLE_CAPS.get(fonction)
    if not caps:
        return False
    return bool(caps.get(cap, False))


def _raw_sensitive_caps(fonction: str | None) -> dict:
    if not fonction:
        return {
            'view_nni': False,
            'edit_nni': False,
            'view_sante': False,
            'edit_sante': False,
            'view_parents': False,
            'edit_parents': False,
        }
    return dict(
        SENSITIVE_CAPS.get(
            fonction,
            {
                'view_nni': False,
                'edit_nni': False,
                'view_sante': False,
                'edit_sante': False,
                'view_parents': False,
                'edit_parents': False,
            },
        )
    )


def get_sensitive_caps(user) -> dict:
    """Public shape for /me and login: nni/sante/parents levels + edit flags."""
    fonction = get_user_fonction(user)
    if getattr(user, 'is_superuser', False):
        fonction = UserProfile.ROLE_ADMINISTRATEUR
    raw = _raw_sensitive_caps(fonction)
    view_nni = raw.get('view_nni')
    if view_nni == 'masked':
        nni_level = 'masked'
    elif view_nni:
        nni_level = 'full'
    else:
        nni_level = 'none'
    return {
        'nni': nni_level,
        'sante': 'full' if raw.get('view_sante') else 'none',
        'parents': 'full' if raw.get('view_parents') else 'none',
        'edit_nni': bool(raw.get('edit_nni')),
        'edit_sante': bool(raw.get('edit_sante')),
        'edit_parents': bool(raw.get('edit_parents')),
    }


def can_view_nni(user):
    """True | False | 'masked'."""
    fonction = get_user_fonction(user)
    if getattr(user, 'is_superuser', False):
        return True
    return _raw_sensitive_caps(fonction).get('view_nni', False)


def can_edit_nni(user) -> bool:
    if getattr(user, 'is_superuser', False):
        return True
    return bool(_raw_sensitive_caps(get_user_fonction(user)).get('edit_nni'))


def can_view_sante(user) -> bool:
    if getattr(user, 'is_superuser', False):
        return True
    return bool(_raw_sensitive_caps(get_user_fonction(user)).get('view_sante'))


def can_edit_sante(user) -> bool:
    if getattr(user, 'is_superuser', False):
        return True
    return bool(_raw_sensitive_caps(get_user_fonction(user)).get('edit_sante'))


def can_view_parents(user) -> bool:
    if getattr(user, 'is_superuser', False):
        return True
    return bool(_raw_sensitive_caps(get_user_fonction(user)).get('view_parents'))


def can_edit_parents(user) -> bool:
    if getattr(user, 'is_superuser', False):
        return True
    return bool(_raw_sensitive_caps(get_user_fonction(user)).get('edit_parents'))


def mask_nni(value) -> str:
    text = str(value or '')
    if len(text) >= 4:
        return '******' + text[-4:]
    return '******'


def eleves_queryset_for(user, *, for_list=False):
    """Return Eleve queryset visible to user (never leaks all when scope missing).

    for_list=True: only academique + militaire joins (slim list payloads).
    """
    from etudiants.models import Eleve

    empty = Eleve.objects.none()
    if user is None or not getattr(user, 'is_authenticated', False):
        return empty
    if not access_is_active(user):
        return empty

    fonction = get_user_fonction(user)
    profile = get_profile(user)
    if for_list:
        base = Eleve.objects.select_related('dossier_academique', 'dossier_militaire')
    else:
        base = Eleve.objects.select_related(
            'dossier_academique',
            'dossier_sante',
            'dossier_militaire',
            'contacts_parents',
            'hebergement',
            'documents',
        )

    if fonction in UserProfile.ALL_VISIBLE_ROLES or getattr(user, 'is_superuser', False):
        return base.all()

    if fonction == UserProfile.ROLE_ETUDIANT:
        if profile is None or profile.eleve_id is None:
            return empty
        return base.filter(pk=profile.eleve_id)

    if fonction in UserProfile.SECTION_SCOPED_ROLES:
        section = (profile.scope_section or '').strip() if profile else ''
        if not section:
            return empty
        qs = base.filter(dossier_militaire__section=section)
        compagnie = (profile.scope_compagnie or '').strip() if profile else ''
        if compagnie:
            qs = qs.filter(dossier_militaire__compagnie=compagnie)
        return qs

    if fonction == UserProfile.ROLE_COMMANDANT_COMPAGNIE:
        compagnie = (profile.scope_compagnie or '').strip() if profile else ''
        if not compagnie:
            return empty
        return base.filter(dossier_militaire__compagnie=compagnie)

    return empty


def eleve_in_scope(user, eleve) -> bool:
    if eleve is None:
        return False
    return eleves_queryset_for(user).filter(pk=eleve.pk).exists()


def _message(permission, request, message=FORBIDDEN_DETAIL):
    """Attach French detail for DRF exception handler consumers."""
    permission.message = message
    return False


class HasActiveAccess(BasePermission):
    message = REVOKED_DETAIL

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if access_is_active(user):
            return True
        self.message = REVOKED_DETAIL
        return False


class EleveRolePermission(BasePermission):
    message = FORBIDDEN_DETAIL

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if not access_is_active(user):
            self.message = REVOKED_DETAIL
            return False

        fonction = get_user_fonction(user)
        action = getattr(view, 'action', None)

        if action is None:
            # APIView: map by method
            if request.method in SAFE_METHODS:
                cap = 'retrieve' if request.method == 'GET' else 'list'
            elif request.method == 'POST':
                cap = 'create'
            elif request.method in ('PUT', 'PATCH'):
                cap = 'update'
            elif request.method == 'DELETE':
                cap = 'destroy'
            else:
                return _message(self, request)
        else:
            cap = _ACTION_TO_CAP.get(action)
            if cap is None:
                # unknown action: allow only if full CRUD role
                return role_has_cap(fonction, 'update')

        if not role_has_cap(fonction, cap):
            return _message(self, request)
        return True

    def has_object_permission(self, request, view, obj):
        # Object must already be in scoped queryset (404 otherwise).
        return self.has_permission(request, view)


class CanImportEleves(BasePermission):
    message = FORBIDDEN_DETAIL

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not access_is_active(user):
            self.message = REVOKED_DETAIL if user and user.is_authenticated else FORBIDDEN_DETAIL
            return False
        return role_has_cap(get_user_fonction(user), 'import')


class CanAccessMedia(BasePermission):
    message = FORBIDDEN_DETAIL

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not access_is_active(user):
            self.message = REVOKED_DETAIL if user and user.is_authenticated else FORBIDDEN_DETAIL
            return False
        return role_has_cap(get_user_fonction(user), 'media')


class CanManageMilitaryUsers(BasePermission):
    message = FORBIDDEN_DETAIL

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not access_is_active(user):
            self.message = REVOKED_DETAIL if user and user.is_authenticated else FORBIDDEN_DETAIL
            return False
        return role_has_cap(get_user_fonction(user), 'manage_users')


class CanListOrImportTemplate(BasePermission):
    """Import template: any authenticated role that can list élèves."""

    message = FORBIDDEN_DETAIL

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not access_is_active(user):
            self.message = REVOKED_DETAIL if user and user.is_authenticated else FORBIDDEN_DETAIL
            return False
        return role_has_cap(get_user_fonction(user), 'list')


class CanViewAudit(BasePermission):
    """Audit trail: administrateur only."""

    message = FORBIDDEN_DETAIL
    ALLOWED = frozenset({UserProfile.ROLE_ADMINISTRATEUR})

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not access_is_active(user):
            self.message = REVOKED_DETAIL if user and user.is_authenticated else FORBIDDEN_DETAIL
            return False
        if getattr(user, 'is_superuser', False):
            return True
        return get_user_fonction(user) in self.ALLOWED


class CanProvisionStudents(BasePermission):
    """Create student login linked to an élève (admin / commandant d'unité)."""

    message = FORBIDDEN_DETAIL
    ALLOWED = frozenset(
        {
            UserProfile.ROLE_ADMINISTRATEUR,
            UserProfile.ROLE_COMMANDANT_UNITE,
        }
    )

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not access_is_active(user):
            self.message = REVOKED_DETAIL if user and user.is_authenticated else FORBIDDEN_DETAIL
            return False
        if getattr(user, 'is_superuser', False):
            return True
        return get_user_fonction(user) in self.ALLOWED
