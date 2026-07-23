from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import (
    CotizacionViewSet,
    PreCotizacionAPIView,
    PreCotizacionPreferenciaAPIView,
)

router = SimpleRouter()
router.register("cotizaciones", CotizacionViewSet, basename="cotizacion")

urlpatterns = [
    path("pre-cotizacion/", PreCotizacionAPIView.as_view(), name="pre-cotizacion"),
    path(
        "pre-cotizacion/preferencia/",
        PreCotizacionPreferenciaAPIView.as_view(),
        name="pre-cotizacion-preferencia",
    ),
    *router.urls,
]
