from decimal import Decimal
from datetime import date

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q, Sum
from django.utils.dateparse import parse_date
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from config.pagination import OptionalPageNumberPagination
from negocio.validators import extraer_digitos_telefono, normalizar_telefono_parcial

from .models import Contrato, CostoDirecto, GastoAdicional, GastoRecurrente
from .serializers import (
    AjustePeriodoSerializer,
    AjusteValorDesdeSerializer,
    ContratoSerializer,
    CostoDirectoSerializer,
    DesactivarGastoRecurrenteSerializer,
    GastoAdicionalSerializer,
    GastoRecurrenteAjusteSerializer,
    GastoRecurrenteSerializer,
    GastoRecurrenteVersionSerializer,
    ReactivarGastoRecurrenteSerializer,
)
from .selectors import contratos_con_relaciones
from .services import (
    cancelar_contrato,
    ajustar_gasto_recurrente_desde,
    ajustar_gasto_recurrente_periodo,
    dashboard_financiero,
    desactivar_gasto_recurrente,
    eliminar_logicamente_gasto_adicional,
    eliminar_logicamente_costo_directo,
    reactivar_gasto_recurrente,
    resumen_gastos_periodo,
    serializar_resumen_gastos,
)


def _raise_api_validation_error(exc):
    if hasattr(exc, "message_dict"):
        raise ValidationError(exc.message_dict)
    raise ValidationError(getattr(exc, "messages", [str(exc)]))


def _parse_query_date(value, field_name):
    if not value:
        return None

    parsed = parse_date(value)
    if parsed is None:
        raise ValidationError({field_name: "Use el formato YYYY-MM-DD."})
    return parsed


def _parse_int_query(value, field_name, min_value=None, max_value=None):
    if value in (None, ""):
        return None

    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValidationError({field_name: "Debe ser un numero entero."})

    if min_value is not None and parsed < min_value:
        raise ValidationError({field_name: f"Debe ser mayor o igual a {min_value}."})
    if max_value is not None and parsed > max_value:
        raise ValidationError({field_name: f"Debe ser menor o igual a {max_value}."})
    return parsed


def _serialize_decimal(value):
    return str((value or Decimal("0.00")).quantize(Decimal("0.01")))


class CleanModelValidationMixin:
    def perform_create(self, serializer):
        try:
            serializer.save()
        except DjangoValidationError as exc:
            _raise_api_validation_error(exc)

    def perform_update(self, serializer):
        try:
            serializer.save()
        except DjangoValidationError as exc:
            _raise_api_validation_error(exc)


class ContratoViewSet(CleanModelValidationMixin, viewsets.ModelViewSet):
    serializer_class = ContratoSerializer
    pagination_class = OptionalPageNumberPagination
    search_fields = ["persona__nombre", "persona__telefono", "observaciones"]

    def get_queryset(self):
        queryset = contratos_con_relaciones()
        estado_contrato = self.request.query_params.get("estado_contrato")
        estado_pago = self.request.query_params.get("estado_pago")
        persona = self.request.query_params.get("persona")
        tipo_evento = self.request.query_params.get("tipo_evento")
        tipo_servicio = self.request.query_params.get("tipo_servicio")
        buscar = (
            self.request.query_params.get("buscar")
            or self.request.query_params.get("search")
            or ""
        ).strip()
        fecha_desde = _parse_query_date(
            self.request.query_params.get("desde"),
            "desde",
        )
        fecha_hasta = _parse_query_date(
            self.request.query_params.get("hasta"),
            "hasta",
        )

        if fecha_desde and fecha_hasta and fecha_desde > fecha_hasta:
            raise ValidationError({"hasta": "La fecha hasta no puede ser anterior a desde."})

        if estado_contrato:
            queryset = queryset.filter(estado_contrato=estado_contrato)
        if estado_pago:
            queryset = queryset.filter(estado_pago=estado_pago)
        if persona:
            queryset = queryset.filter(persona_id=persona)
        if tipo_evento:
            queryset = queryset.filter(tipo_evento_id=tipo_evento)
        if tipo_servicio:
            queryset = queryset.filter(tipo_servicio=tipo_servicio)
        if fecha_desde:
            queryset = queryset.filter(fecha_evento__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha_evento__lte=fecha_hasta)
        if buscar:
            criteria = (
                Q(persona__nombre__icontains=buscar)
                | Q(persona__telefono__icontains=buscar)
                | Q(tipo_evento__nombre__icontains=buscar)
                | Q(paquete__nombre__icontains=buscar)
                | Q(oferta_snapshot__paquete__nombre__icontains=buscar)
            )
            if extraer_digitos_telefono(buscar):
                criteria |= Q(
                    persona__telefono_normalizado__icontains=normalizar_telefono_parcial(
                        buscar
                    )
                )
            queryset = queryset.filter(criteria)
        return queryset

    @action(detail=True, methods=["post"], url_path="cancelar")
    def cancelar(self, request, pk=None):
        contrato = self.get_object()
        try:
            contrato = cancelar_contrato(contrato)
        except DjangoValidationError as exc:
            _raise_api_validation_error(exc)
        return Response(ContratoSerializer(contrato).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="resumen")
    def resumen(self, request):
        summary = self.get_queryset().aggregate(
            total=Count("id"),
            confirmados=Count(
                "id",
                filter=Q(estado_contrato="confirmado"),
            ),
            cancelados=Count(
                "id",
                filter=Q(estado_contrato="cancelado"),
            ),
            pendientes=Count("id", filter=Q(estado_pago="pendiente")),
            abonados=Count("id", filter=Q(estado_pago="abonado")),
            pagados=Count("id", filter=Q(estado_pago="pagado")),
        )
        return Response(summary)


class CostoDirectoViewSet(CleanModelValidationMixin, viewsets.ModelViewSet):
    serializer_class = CostoDirectoSerializer
    search_fields = [
        "concepto",
        "contrato__persona__nombre",
        "contrato__persona__telefono",
        "observaciones",
    ]

    def get_queryset(self):
        queryset = CostoDirecto.objects.select_related(
            "contrato",
            "contrato__persona",
            "contrato__tipo_evento",
            "contrato__paquete",
        ).filter(eliminado=False)
        contrato = _parse_int_query(
            self.request.query_params.get("contrato"),
            "contrato",
            min_value=1,
        )
        buscar = (
            self.request.query_params.get("buscar")
            or self.request.query_params.get("search")
            or ""
        ).strip()
        fecha_desde = _parse_query_date(
            self.request.query_params.get("desde"),
            "desde",
        )
        fecha_hasta = _parse_query_date(
            self.request.query_params.get("hasta"),
            "hasta",
        )

        if fecha_desde and fecha_hasta and fecha_desde > fecha_hasta:
            raise ValidationError({"hasta": "La fecha hasta no puede ser anterior a desde."})

        if contrato:
            queryset = queryset.filter(contrato_id=contrato)
        if buscar:
            queryset = queryset.filter(
                Q(concepto__icontains=buscar)
                | Q(contrato__persona__nombre__icontains=buscar)
                | Q(contrato__persona__telefono__icontains=buscar)
            )
        if fecha_desde:
            queryset = queryset.filter(fecha__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha__lte=fecha_hasta)
        return queryset

    def perform_destroy(self, instance):
        eliminar_logicamente_costo_directo(instance)

    @action(detail=False, methods=["get"], url_path="resumen")
    def resumen(self, request):
        summary = self.get_queryset().aggregate(
            cantidad=Count("id"),
            total_registrado=Sum("valor"),
            total_financiero=Sum(
                "valor",
                filter=Q(
                    contrato__estado_contrato=Contrato.EstadoContrato.CONFIRMADO
                ),
            ),
            historicos_cancelados=Count(
                "id",
                filter=Q(
                    contrato__estado_contrato=Contrato.EstadoContrato.CANCELADO
                ),
            ),
        )
        return Response(
            {
                "cantidad": summary["cantidad"],
                "total_registrado": _serialize_decimal(summary["total_registrado"]),
                "total_financiero": _serialize_decimal(summary["total_financiero"]),
                "historicos_cancelados": summary["historicos_cancelados"],
            }
        )


class GastoAdicionalViewSet(CleanModelValidationMixin, viewsets.ModelViewSet):
    queryset = GastoAdicional.objects.filter(eliminado=False)
    serializer_class = GastoAdicionalSerializer
    search_fields = ["concepto", "observaciones"]
    pagination_class = OptionalPageNumberPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        mes = _parse_int_query(
            self.request.query_params.get("mes"),
            "mes",
            min_value=1,
            max_value=12,
        )
        anio = _parse_int_query(
            self.request.query_params.get("anio"),
            "anio",
            min_value=2000,
        )
        buscar = (
            self.request.query_params.get("concepto")
            or self.request.query_params.get("buscar")
            or self.request.query_params.get("search")
            or ""
        ).strip()
        if mes:
            queryset = queryset.filter(fecha__month=mes)
        if anio:
            queryset = queryset.filter(fecha__year=anio)
        if buscar:
            queryset = queryset.filter(
                Q(concepto__icontains=buscar)
                | Q(observaciones__icontains=buscar)
            )
        return queryset

    def perform_destroy(self, instance):
        eliminar_logicamente_gasto_adicional(instance)


class GastoRecurrenteViewSet(CleanModelValidationMixin, viewsets.ModelViewSet):
    queryset = GastoRecurrente.objects.prefetch_related("versiones", "ajustes")
    serializer_class = GastoRecurrenteSerializer
    pagination_class = OptionalPageNumberPagination
    http_method_names = ["get", "post", "patch", "put", "head", "options"]

    def _selected_period(self):
        today = date.today()
        mes = _parse_int_query(
            self.request.query_params.get("mes"),
            "mes",
            min_value=1,
            max_value=12,
        ) or today.month
        anio = _parse_int_query(
            self.request.query_params.get("anio"),
            "anio",
            min_value=2000,
        ) or today.year
        return date(anio, mes, 1)

    def get_serializer_context(self):
        return {
            **super().get_serializer_context(),
            "periodo": self._selected_period(),
        }

    def get_queryset(self):
        queryset = super().get_queryset()
        buscar = (
            self.request.query_params.get("buscar")
            or self.request.query_params.get("search")
            or ""
        ).strip()
        estado = self.request.query_params.get("estado")
        if buscar:
            queryset = queryset.filter(
                Q(concepto__icontains=buscar)
                | Q(observaciones__icontains=buscar)
            )
        if estado == "activo":
            queryset = queryset.filter(activo=True)
        elif estado == "inactivo":
            queryset = queryset.filter(activo=False)
        return queryset

    def _service_response(self, service, **kwargs):
        try:
            service(**kwargs)
        except DjangoValidationError as exc:
            _raise_api_validation_error(exc)
        instance = self.get_queryset().get(pk=kwargs["gasto"].pk)
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=["post"], url_path="ajustar-desde")
    def ajustar_desde(self, request, pk=None):
        serializer = AjusteValorDesdeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._service_response(
            ajustar_gasto_recurrente_desde,
            gasto=self.get_object(),
            **serializer.validated_data,
        )

    @action(detail=True, methods=["post"], url_path="ajustar-periodo")
    def ajustar_periodo(self, request, pk=None):
        serializer = AjustePeriodoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            ajuste = ajustar_gasto_recurrente_periodo(
                gasto=self.get_object(),
                **serializer.validated_data,
            )
        except DjangoValidationError as exc:
            _raise_api_validation_error(exc)
        return Response(GastoRecurrenteAjusteSerializer(ajuste).data)

    @action(detail=True, methods=["post"])
    def desactivar(self, request, pk=None):
        serializer = DesactivarGastoRecurrenteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._service_response(
            desactivar_gasto_recurrente,
            gasto=self.get_object(),
            **serializer.validated_data,
        )

    @action(detail=True, methods=["post"])
    def reactivar(self, request, pk=None):
        serializer = ReactivarGastoRecurrenteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._service_response(
            reactivar_gasto_recurrente,
            gasto=self.get_object(),
            **serializer.validated_data,
        )

    @action(detail=True, methods=["get"])
    def historial(self, request, pk=None):
        gasto = self.get_object()
        return Response(
            {
                "gasto": self.get_serializer(gasto).data,
                "versiones": GastoRecurrenteVersionSerializer(
                    gasto.versiones.all(),
                    many=True,
                ).data,
                "ajustes": GastoRecurrenteAjusteSerializer(
                    gasto.ajustes.filter(eliminado=False),
                    many=True,
                ).data,
            }
        )


class GastosResumenAPIView(APIView):
    def get(self, request):
        today = date.today()
        mes = _parse_int_query(
            request.query_params.get("mes"),
            "mes",
            min_value=1,
            max_value=12,
        ) or today.month
        anio = _parse_int_query(
            request.query_params.get("anio"),
            "anio",
            min_value=2000,
        ) or today.year
        return Response(serializar_resumen_gastos(resumen_gastos_periodo(mes, anio)))


class DashboardFinancieroAPIView(APIView):
    def get(self, request):
        mes = _parse_int_query(
            request.query_params.get("mes"),
            "mes",
            min_value=1,
            max_value=12,
        )
        anio = _parse_int_query(
            request.query_params.get("anio"),
            "anio",
            min_value=2000,
        )
        return Response(dashboard_financiero(mes=mes, anio=anio))
