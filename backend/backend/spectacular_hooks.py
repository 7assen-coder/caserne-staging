"""OpenAPI post-processing: assign stable tags from /api/v1 path prefixes."""


def assign_v1_tags(result, generator, request, public):
    paths = result.get('paths') or {}
    for path, methods in paths.items():
        if not isinstance(methods, dict):
            continue
        tag = _tag_for_path(path)
        if not tag:
            continue
        for method, operation in methods.items():
            if method.startswith('x-') or not isinstance(operation, dict):
                continue
            operation['tags'] = [tag]
            if not operation.get('operationId'):
                safe = path.strip('/').replace('/', '_').replace('{', '').replace('}', '')
                operation['operationId'] = f'{tag.lower()}_{method}_{safe}'
    return result


def _tag_for_path(path: str) -> str | None:
    p = path or ''
    if p.startswith('/api/livez') or p.startswith('/api/readyz') or p.startswith('/api/healthz'):
        return 'Health'
    if not p.startswith('/api/v1/'):
        return None
    rest = p[len('/api/v1/') :]
    if rest.startswith('auth/users'):
        return 'Users'
    if rest.startswith('auth/'):
        return 'Auth'
    if rest.startswith('audit'):
        return 'Audit'
    if rest.startswith('eleves/import') or rest.startswith('eleves/export'):
        return 'ImportExport'
    if rest.startswith('eleves') or rest.startswith('contacts') or rest.startswith('sante'):
        return 'Eleves'
    if rest.startswith('academique') or rest.startswith('militaire') or rest.startswith('hebergements'):
        return 'Eleves'
    if rest.startswith('docs'):
        return 'Eleves'
    return 'Ops'
