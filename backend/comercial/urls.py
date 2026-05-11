from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import CotizacionViewSet, PreCotizacionAPIView

router = SimpleRouter()
router.register("cotizaciones", CotizacionViewSet, basename="cotizacion")

urlpatterns = [
    path("pre-cotizacion/", PreCotizacionAPIView.as_view(), name="pre-cotizacion"),
    *router.urls,
]
