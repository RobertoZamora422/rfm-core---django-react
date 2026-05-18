from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import (
    ClienteViewSet,
    ConfiguracionNegocioViewSet,
    InicioResumenAPIView,
    PaqueteViewSet,
    TipoEventoViewSet,
)

router = SimpleRouter()
router.register("clientes", ClienteViewSet, basename="cliente")
router.register("tipos-evento", TipoEventoViewSet, basename="tipo-evento")
router.register("paquetes", PaqueteViewSet, basename="paquete")
router.register(
    "configuracion-negocio",
    ConfiguracionNegocioViewSet,
    basename="configuracion-negocio",
)

urlpatterns = [
    path("inicio-resumen/", InicioResumenAPIView.as_view(), name="inicio-resumen"),
]
urlpatterns += router.urls
