from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django.utils.dateparse import parse_date
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as ApiValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from financiero.serializers import ContratoSerializer

from .selectors import cotizaciones_con_relaciones
from .serializers import (
    CambiarEstadoCotizacionSerializer,
    ConvertirContratoSerializer,
    CotizacionSerializer,
    PreCotizacionSerializer,
)
from .services import (
    cambiar_estado_cotizacion,
    convertir_cotizacion_a_contrato,
    crear_pre_cotizacion,
)


def _raise_api_validation_error(exc):
    if hasattr(exc, "message_dict"):
        raise ApiValidationError(exc.message_dict)
    raise ApiValidationError(exc.messages)


def _serializar_calculo(calculo):
    if isinstance(calculo, Decimal):
        return str(calculo.quantize(Decimal("0.01")))
    if isinstance(calculo, list):
        return [_serializar_calculo(item) for item in calculo]
    if isinstance(calculo, dict):
        return {clave: _serializar_calculo(valor) for clave, valor in calculo.items()}
    return calculo


def _parse_query_date(value, field_name):
    if not value:
        return None

    parsed = parse_date(value)
    if parsed is None:
        raise ApiValidationError({field_name: "Use el formato YYYY-MM-DD."})
    return parsed


class PreCotizacionAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PreCotizacionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        datos_cliente = {
            "nombre": data.get("nombre_cliente", "").strip(),
            "telefono": data.get("telefono_cliente", "").strip(),
            "observaciones": data.get("observaciones_cliente", ""),
        }

        try:
            cotizacion, calculo = crear_pre_cotizacion(
                cliente=None,
                datos_cliente=datos_cliente,
                tipo_evento=data["tipo_evento"],
                paquete=data.get("paquete"),
                fecha_tentativa=data["fecha_tentativa"],
                numero_invitados=data["numero_invitados"],
                tipo_servicio=data["tipo_servicio"],
                observaciones=data.get("observaciones", ""),
            )
        except DjangoValidationError as exc:
            _raise_api_validation_error(exc)

        return Response(
            {
                "cotizacion": CotizacionSerializer(cotizacion).data,
                "calculo": _serializar_calculo(calculo),
            },
            status=status.HTTP_201_CREATED,
        )


class CotizacionViewSet(viewsets.ModelViewSet):
    serializer_class = CotizacionSerializer
    search_fields = ["cliente__nombre", "cliente__telefono", "observaciones"]

    def get_queryset(self):
        queryset = cotizaciones_con_relaciones()
        estado = self.request.query_params.get("estado")
        cliente = self.request.query_params.get("cliente")
        tipo_evento = self.request.query_params.get("tipo_evento")
        fecha_desde = _parse_query_date(
            self.request.query_params.get("desde"),
            "desde",
        )
        fecha_hasta = _parse_query_date(
            self.request.query_params.get("hasta"),
            "hasta",
        )
        buscar = (
            self.request.query_params.get("buscar")
            or self.request.query_params.get("search")
            or ""
        ).strip()
        es_demo = self.request.query_params.get("es_demo")
        if estado:
            queryset = queryset.filter(estado=estado)
        if cliente:
            queryset = queryset.filter(cliente_id=cliente)
        if tipo_evento:
            queryset = queryset.filter(tipo_evento_id=tipo_evento)
        if fecha_desde:
            queryset = queryset.filter(fecha_tentativa__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha_tentativa__lte=fecha_hasta)
        if buscar:
            queryset = queryset.filter(
                Q(cliente__nombre__icontains=buscar)
                | Q(cliente__telefono__icontains=buscar)
                | Q(observaciones__icontains=buscar)
            )
        if es_demo is not None:
            queryset = queryset.filter(es_demo=es_demo.lower() == "true")
        return queryset

    @action(detail=True, methods=["post"], url_path="cambiar-estado")
    def cambiar_estado(self, request, pk=None):
        cotizacion = self.get_object()
        serializer = CambiarEstadoCotizacionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            cotizacion = cambiar_estado_cotizacion(
                cotizacion,
                serializer.validated_data["estado"],
            )
        except DjangoValidationError as exc:
            _raise_api_validation_error(exc)

        return Response(CotizacionSerializer(cotizacion).data)

    @action(detail=True, methods=["post"], url_path="convertir-contrato")
    def convertir_contrato(self, request, pk=None):
        cotizacion = self.get_object()
        serializer = ConvertirContratoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            conversion_data = {
                "fecha_evento": serializer.validated_data.get("fecha_evento"),
                "numero_invitados": serializer.validated_data.get("numero_invitados"),
                "valor_final": serializer.validated_data.get("valor_final"),
                "monto_abonado": serializer.validated_data.get("monto_abonado"),
                "observaciones": serializer.validated_data.get("observaciones", ""),
            }
            if "paquete" in serializer.validated_data:
                conversion_data["paquete"] = serializer.validated_data["paquete"]

            contrato = convertir_cotizacion_a_contrato(
                cotizacion,
                **conversion_data,
            )
        except DjangoValidationError as exc:
            _raise_api_validation_error(exc)

        cotizacion.refresh_from_db()
        return Response(
            {
                "cotizacion": CotizacionSerializer(cotizacion).data,
                "contrato": ContratoSerializer(contrato).data,
            },
            status=status.HTTP_201_CREATED,
        )
