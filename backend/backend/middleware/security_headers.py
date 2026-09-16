"""API Content-Security-Policy (and related) headers for HTML/docs responses."""

from django.conf import settings


class ApiSecurityHeadersMiddleware:
    """
    Append a tight CSP for API/docs/admin HTML.
    JSON responses still get the header; browsers ignore CSP on non-document types.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if not getattr(settings, 'SECURITY_HEADERS_ENABLED', False):
            return response

        csp = getattr(
            settings,
            'API_CSP',
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
        )
        header = (
            'Content-Security-Policy-Report-Only'
            if getattr(settings, 'CSP_REPORT_ONLY', False)
            else 'Content-Security-Policy'
        )
        if header not in response:
            response[header] = csp
        if 'X-Content-Type-Options' not in response:
            response['X-Content-Type-Options'] = 'nosniff'
        if 'Referrer-Policy' not in response:
            response['Referrer-Policy'] = getattr(
                settings, 'SECURE_REFERRER_POLICY', 'same-origin'
            ) or 'same-origin'
        return response
