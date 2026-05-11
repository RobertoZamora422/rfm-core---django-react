from rest_framework.routers import SimpleRouter

from .views import CotizacionViewSet

router = SimpleRouter()
router.register("cotizaciones", CotizacionViewSet, basename="cotizacion")

urlpatterns = router.urls
