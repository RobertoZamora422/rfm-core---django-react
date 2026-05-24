from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

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
from .services import inicio_resumen


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    search_fields = ["nombre", "telefono", "correo"]

    def get_queryset(self):
        queryset = super().get_queryset()
        es_demo = self.request.query_params.get("es_demo")
        if es_demo is not None:
            queryset = queryset.filter(es_demo=es_demo.lower() == "true")
        return queryset


class TipoEventoViewSet(viewsets.ModelViewSet):
    queryset = TipoEvento.objects.all()
    serializer_class = TipoEventoSerializer
    search_fields = ["nombre", "descripcion"]

    def get_queryset(self):
        queryset = super().get_queryset()
        activo = self.request.query_params.get("activo")
        if activo is not None:
            queryset = queryset.filter(activo=activo.lower() == "true")
        return queryset


class PaqueteViewSet(viewsets.ModelViewSet):
    queryset = Paquete.objects.all()
    serializer_class = PaqueteSerializer
    search_fields = ["nombre", "descripcion"]

    def get_queryset(self):
        queryset = super().get_queryset()
        activo = self.request.query_params.get("activo")
        tipo_servicio = self.request.query_params.get("tipo_servicio")
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
