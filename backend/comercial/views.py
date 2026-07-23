from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q
from django.utils.dateparse import parse_date
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as ApiValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from financiero.serializers import ContratoSerializer
from config.pagination import OptionalPageNumberPagination
from negocio.selectors import obtener_configuracion_activa
from negocio.validators import extraer_digitos_telefono, normalizar_telefono_parcial

from .models import Cotizacion
from .selectors import cotizaciones_con_relaciones
from .serializers import (
    CambiarEstadoCotizacionSerializer,
    ConvertirContratoSerializer,
    CotizacionSerializer,
    PreferenciaPaquetePublicaSerializer,
    PreCotizacionSerializer,
)
from .services import (
    cambiar_estado_cotizacion,
    convertir_cotizacion_a_contrato,
    crear_token_solicitud_publica,
    crear_pre_cotizacion,
    guardar_preferencia_paquete_publica,
)
from .whatsapp import construir_acciones_whatsapp


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

        datos_persona = {
            "nombre": data.get("nombre_persona", "").strip(),
            "telefono": data.get("telefono_persona", "").strip(),
            "correo": data.get("correo_persona", "").strip(),
            "observaciones": data.get("observaciones_persona", ""),
        }

        try:
            cotizacion, calculo, creada = crear_pre_cotizacion(
                persona=None,
                datos_persona=datos_persona,
                tipo_evento=data["tipo_evento"],
                paquete=data.get("paquete"),
                fecha_tentativa=data["fecha_tentativa"],
                numero_invitados=data["numero_invitados"],
                tipo_servicio=data["tipo_servicio"],
                observaciones=data.get("observaciones", ""),
                preferencias={
                    "nivel_experiencia": data.get(
                        "nivel_experiencia",
                        "equilibrado",
                    ),
                    "entretenimiento": data.get(
                        "entretenimiento",
                        "indiferente",
                    ),
                },
                solicitud_token=data.get("solicitud_token"),
            )
        except DjangoValidationError as exc:
            _raise_api_validation_error(exc)

        configuracion_activa = obtener_configuracion_activa()
        return Response(
            {
                "cotizacion": CotizacionSerializer(cotizacion).data,
                "calculo": _serializar_calculo(calculo),
                "solicitud_token": crear_token_solicitud_publica(cotizacion),
                "whatsapp": construir_acciones_whatsapp(
                    cotizacion,
                    calculo,
                    configuracion_activa,
                ),
            },
            status=status.HTTP_201_CREATED if creada else status.HTTP_200_OK,
        )


class PreCotizacionPreferenciaAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PreferenciaPaquetePublicaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            cotizacion, calculo = guardar_preferencia_paquete_publica(
                solicitud_token=serializer.validated_data["solicitud_token"],
                paquete=serializer.validated_data["paquete"],
            )
        except DjangoValidationError as exc:
            _raise_api_validation_error(exc)

        configuracion = obtener_configuracion_activa()
        return Response(
            {
                "cotizacion": CotizacionSerializer(cotizacion).data,
                "calculo": _serializar_calculo(calculo),
                "whatsapp": construir_acciones_whatsapp(
                    cotizacion,
                    calculo,
                    configuracion,
                ),
            }
        )


class CotizacionViewSet(viewsets.ModelViewSet):
    serializer_class = CotizacionSerializer
    pagination_class = OptionalPageNumberPagination
    search_fields = ["persona__nombre", "persona__telefono", "observaciones"]

    def get_queryset(self):
        queryset = cotizaciones_con_relaciones()
        estado = self.request.query_params.get("estado")
        persona = self.request.query_params.get("persona")
        tipo_evento = self.request.query_params.get("tipo_evento")
        tipo_servicio = self.request.query_params.get("tipo_servicio")
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
        if fecha_desde and fecha_hasta and fecha_desde > fecha_hasta:
            raise ApiValidationError({"hasta": "La fecha hasta no puede ser anterior a desde."})
        if estado:
            queryset = queryset.filter(estado=estado)
        if persona:
            queryset = queryset.filter(persona_id=persona)
        if tipo_evento:
            queryset = queryset.filter(tipo_evento_id=tipo_evento)
        if tipo_servicio:
            queryset = queryset.filter(tipo_servicio=tipo_servicio)
        if fecha_desde:
            queryset = queryset.filter(fecha_tentativa__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha_tentativa__lte=fecha_hasta)
        if buscar:
            criteria = (
                Q(persona__nombre__icontains=buscar)
                | Q(persona__telefono__icontains=buscar)
                | Q(tipo_evento__nombre__icontains=buscar)
                | Q(paquete__nombre__icontains=buscar)
                | Q(oferta_snapshot__paquete__nombre__icontains=buscar)
                | Q(observaciones__icontains=buscar)
            )
            if extraer_digitos_telefono(buscar):
                criteria |= Q(
                    persona__telefono_normalizado__icontains=normalizar_telefono_parcial(
                        buscar
                    )
                )
            queryset = queryset.filter(criteria)
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

    @action(detail=False, methods=["get"], url_path="resumen")
    def resumen(self, request):
        summary = self.get_queryset().aggregate(
            total=Count("id"),
            nuevas=Count("id", filter=Q(estado=Cotizacion.Estado.NUEVA)),
            contactadas=Count("id", filter=Q(estado=Cotizacion.Estado.CONTACTADA)),
            confirmadas=Count("id", filter=Q(estado=Cotizacion.Estado.CONFIRMADA)),
            convertidas=Count("id", filter=Q(estado=Cotizacion.Estado.CONVERTIDA)),
            descartadas=Count("id", filter=Q(estado=Cotizacion.Estado.DESCARTADA)),
        )
        return Response(summary)

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
            if "tipo_servicio" in serializer.validated_data:
                conversion_data["tipo_servicio"] = serializer.validated_data[
                    "tipo_servicio"
                ]

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
