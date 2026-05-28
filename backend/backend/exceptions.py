import logging

from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_default_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = drf_default_handler(exc, context)
    if response is not None:
        return response

    logger.exception('Unhandled exception in %s', context.get('view'))
    return Response(
        {'detail': 'Une erreur interne est survenue. Veuillez réessayer ou contacter l’administrateur.'},
        status=500,
    )
