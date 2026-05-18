from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Cliente, ConfiguracionNegocio, Paquete, TipoEvento
from .serializers import (
    ClienteSerializer,
    ConfiguracionNegocioSerializer,
    PaqueteSerializer,
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


class InicioResumenAPIView(APIView):
    def get(self, request):
        return Response(inicio_resumen())
