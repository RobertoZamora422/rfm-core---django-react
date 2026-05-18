"""Serializers de la app reportes."""

from django.utils import timezone
from rest_framework import serializers


def _current_month_bounds():
    today = timezone.localdate()
    return today.replace(day=1), today


class DateRangeReportQuerySerializer(serializers.Serializer):
    desde = serializers.DateField(required=False)
    hasta = serializers.DateField(required=False)

    def validate(self, attrs):
        default_desde, default_hasta = _current_month_bounds()
        desde = attrs.get("desde") or default_desde
        hasta = attrs.get("hasta") or default_hasta

        if desde > hasta:
            raise serializers.ValidationError(
                {"hasta": "La fecha hasta no puede ser anterior a desde."}
            )

        attrs["desde"] = desde
        attrs["hasta"] = hasta
        return attrs


class MonthYearReportQuerySerializer(serializers.Serializer):
    mes = serializers.IntegerField(min_value=1, max_value=12, required=False)
    anio = serializers.IntegerField(min_value=2000, required=False)

    def validate(self, attrs):
        today = timezone.localdate()
        attrs["mes"] = attrs.get("mes") or today.month
        attrs["anio"] = attrs.get("anio") or today.year
        return attrs
