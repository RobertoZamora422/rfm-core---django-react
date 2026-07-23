from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import (
    BeneficioPaqueteViewSet,
    PersonaViewSet,
    ConfiguracionNegocioViewSet,
    InicioResumenAPIView,
    PaqueteViewSet,
    PublicConfiguracionAPIView,
    PublicPaquetesAPIView,
    PublicTiposEventoAPIView,
    TipoEventoViewSet,
)

router = SimpleRouter()
router.register("personas", PersonaViewSet, basename="persona")
router.register("tipos-evento", TipoEventoViewSet, basename="tipo-evento")
router.register("paquetes", PaqueteViewSet, basename="paquete")
router.register(
    "beneficios-paquetes",
    BeneficioPaqueteViewSet,
    basename="beneficio-paquete",
)
router.register(
    "configuracion-negocio",
    ConfiguracionNegocioViewSet,
    basename="configuracion-negocio",
)

urlpatterns = [
    path("inicio-resumen/", InicioResumenAPIView.as_view(), name="inicio-resumen"),
    path("public/tipos-evento/", PublicTiposEventoAPIView.as_view(), name="public-tipos-evento"),
    path("public/paquetes/", PublicPaquetesAPIView.as_view(), name="public-paquetes"),
    path("public/configuracion/", PublicConfiguracionAPIView.as_view(), name="public-configuracion"),
]
urlpatterns += router.urls
