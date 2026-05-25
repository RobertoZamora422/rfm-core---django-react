from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(_request):
    return Response({"status": "ok", "service": "rfm-core-backend"})


@api_view(["GET"])
@permission_classes([AllowAny])
def api_root(_request):
    frontend_url = settings.FRONTEND_PUBLIC_URL
    return Response(
        {
            "service": "RFM Core API",
            "status": "ok",
            "health": "/api/health/",
            "admin": "/admin/",
            "api": "/api/",
            "frontend": frontend_url,
            "public_precotizacion": f"{frontend_url}/pre-cotizacion",
        }
    )
