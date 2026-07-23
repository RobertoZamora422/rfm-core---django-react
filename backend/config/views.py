import logging

from django.conf import settings
from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status


logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(_request):
    return Response({"status": "ok", "service": "rfm-core-backend"})


@api_view(["GET"])
@permission_classes([AllowAny])
def readiness_check(_request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:
        logger.exception("Database readiness check failed")
        return Response(
            {"status": "unavailable", "service": "rfm-core-backend"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response({"status": "ready", "service": "rfm-core-backend"})


@api_view(["GET"])
@permission_classes([AllowAny])
def api_root(_request):
    frontend_url = settings.FRONTEND_PUBLIC_URL
    return Response(
        {
            "service": "RFM Core API",
            "status": "ok",
            "health": "/api/health/",
            "readiness": "/api/ready/",
            "admin": "/admin/",
            "api": "/api/",
            "frontend": frontend_url,
            "public_precotizacion": f"{frontend_url}/pre-cotizacion",
        }
    )
