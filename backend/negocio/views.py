from django.db.models import Q
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from config.pagination import OptionalPageNumberPagination

from .models import Cliente, ConfiguracionNegocio, Paquete, TipoEvento
from .serializers import (
    ClienteSerializer,
    ConfiguracionNegocioSerializer,
    PaqueteSerializer,
    PublicConfiguracionNegocioSerializer,
    PublicPaqueteSerializer,
    PublicTipoEventoSerializer,
    TipoEventoSerializer,
)
from .selectors import clientes_con_resumen
from .services import inicio_resumen


class DeactivateInsteadOfDeleteMixin:
    resource_label = "registro"

    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {
                "activo": (
                    f"Este {self.resource_label} no se elimina para proteger el historial. "
                    "Desactívelo si ya no debe ofrecerse en nuevos registros."
                )
            }
        )


class ClienteViewSet(viewsets.ModelViewSet):
    serializer_class = ClienteSerializer
    pagination_class = OptionalPageNumberPagination
    search_fields = ["nombre", "telefono", "correo"]

    def get_queryset(self):
        queryset = clientes_con_resumen()
        buscar = (
            self.request.query_params.get("buscar")
            or self.request.query_params.get("search")
            or ""
        ).strip()
        es_demo = self.request.query_params.get("es_demo")
        if buscar:
            queryset = queryset.filter(
                Q(nombre__icontains=buscar)
                | Q(telefono__icontains=buscar)
                | Q(correo__icontains=buscar)
            )
        if es_demo is not None:
            queryset = queryset.filter(es_demo=es_demo.lower() == "true")
        return queryset


class TipoEventoViewSet(DeactivateInsteadOfDeleteMixin, viewsets.ModelViewSet):
    queryset = TipoEvento.objects.all()
    serializer_class = TipoEventoSerializer
    search_fields = ["nombre", "descripcion"]
    resource_label = "tipo de evento"
    pagination_class = OptionalPageNumberPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        activo = self.request.query_params.get("activo")
        buscar = (
            self.request.query_params.get("buscar")
            or self.request.query_params.get("search")
            or ""
        ).strip()
        if buscar:
            queryset = queryset.filter(
                Q(nombre__icontains=buscar) | Q(descripcion__icontains=buscar)
            )
        if activo is not None:
            queryset = queryset.filter(activo=activo.lower() == "true")
        return queryset


class PaqueteViewSet(DeactivateInsteadOfDeleteMixin, viewsets.ModelViewSet):
    queryset = Paquete.objects.all()
    serializer_class = PaqueteSerializer
    search_fields = ["nombre", "descripcion"]
    resource_label = "paquete"
    pagination_class = OptionalPageNumberPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        activo = self.request.query_params.get("activo")
        tipo_servicio = self.request.query_params.get("tipo_servicio")
        buscar = (
            self.request.query_params.get("buscar")
            or self.request.query_params.get("search")
            or ""
        ).strip()
        if buscar:
            queryset = queryset.filter(
                Q(nombre__icontains=buscar) | Q(descripcion__icontains=buscar)
            )
        if activo is not None:
            queryset = queryset.filter(activo=activo.lower() == "true")
        if tipo_servicio:
            queryset = queryset.filter(tipo_servicio=tipo_servicio)
        return queryset


class ConfiguracionNegocioViewSet(viewsets.ModelViewSet):
    queryset = ConfiguracionNegocio.objects.all()
    serializer_class = ConfiguracionNegocioSerializer
    search_fields = ["nombre_negocio"]

    def get_queryset(self):
        queryset = super().get_queryset()
        activo = self.request.query_params.get("activo")
        if activo is not None:
            queryset = queryset.filter(activo=activo.lower() == "true")
        return queryset

    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {
                "configuracion": "La configuracion vigente no puede eliminarse porque alimenta los calculos publicos."
            }
        )


class InicioResumenAPIView(APIView):
    def get(self, request):
        return Response(inicio_resumen())


class PublicTiposEventoAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = TipoEvento.objects.filter(activo=True).order_by("nombre")
        return Response(PublicTipoEventoSerializer(queryset, many=True).data)


class PublicPaquetesAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = Paquete.objects.filter(activo=True).order_by("nombre")
        tipo_servicio = request.query_params.get("tipo_servicio")
        if tipo_servicio:
            queryset = queryset.filter(tipo_servicio=tipo_servicio)
        return Response(PublicPaqueteSerializer(queryset, many=True).data)


class PublicConfiguracionAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        configuracion = ConfiguracionNegocio.objects.filter(activo=True).first()
        if configuracion is None:
            return Response({})
        return Response(PublicConfiguracionNegocioSerializer(configuracion).data)
