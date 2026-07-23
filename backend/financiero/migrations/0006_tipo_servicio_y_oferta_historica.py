from decimal import Decimal

from django.db import migrations, models


def money(value):
    return str(Decimal(value or 0).quantize(Decimal("0.01")))


def snapshot_paquete(paquete, contrato):
    beneficios = []
    if paquete.descripcion:
        beneficios.append(
            {
                "id": None,
                "tipo": "detalle",
                "tipo_display": "Detalle adicional",
                "titulo": "Descripción vigente al migrar",
                "detalle": paquete.descripcion,
                "orden": 0,
                "minimo_invitados": None,
                "maximo_invitados": None,
            }
        )
    return {
        "version": 1,
        "origen": "migracion_historica",
        "tipo_servicio": "servicio_completo",
        "numero_invitados": contrato.numero_invitados,
        "total_estimado": money(contrato.valor_final),
        "paquete": {
            "id": paquete.id,
            "nombre": paquete.nombre,
            "categoria": paquete.categoria,
            "categoria_display": paquete.categoria.title(),
            "orden": paquete.orden,
            "resumen_corto": paquete.resumen_corto,
            "etiqueta_comercial": paquete.etiqueta_comercial,
            "destacado": paquete.destacado,
            "precio_por_persona": money(paquete.precio_por_persona),
            "total_estimado": money(
                paquete.precio_por_persona * contrato.numero_invitados
            ),
            "beneficios": beneficios,
            "incluidos_en_todos": [],
        },
    }


def snapshot_alquiler(configuracion, contrato):
    snapshot = {
        "version": 1,
        "origen": "migracion_historica",
        "tipo_servicio": "alquiler",
        "numero_invitados": contrato.numero_invitados,
        "total_estimado": money(contrato.valor_final),
        "alquiler": {"parametros_disponibles": False},
    }
    if contrato.cotizacion_id:
        origen = contrato.cotizacion.oferta_snapshot or {}
        if origen.get("tipo_servicio") == "alquiler" and origen.get("alquiler"):
            snapshot["alquiler"] = origen["alquiler"]
            return snapshot
    if configuracion:
        adicionales = max(
            contrato.numero_invitados - configuracion.invitados_incluidos_alquiler,
            0,
        )
        esperado = configuracion.tarifa_base_alquiler + (
            Decimal(adicionales) * configuracion.costo_invitado_adicional
        )
        if esperado == contrato.valor_final:
            snapshot["alquiler"] = {
                "parametros_disponibles": True,
                "configuracion_id": configuracion.id,
                "tarifa_base": money(configuracion.tarifa_base_alquiler),
                "invitados_incluidos": configuracion.invitados_incluidos_alquiler,
                "costo_invitado_adicional": money(
                    configuracion.costo_invitado_adicional
                ),
                "invitados_adicionales": adicionales,
                "costo_adicional": money(
                    Decimal(adicionales) * configuracion.costo_invitado_adicional
                ),
            }
    return snapshot


def migrar_contratos(apps, schema_editor):
    Contrato = apps.get_model("financiero", "Contrato")
    Configuracion = apps.get_model("negocio", "ConfiguracionNegocio")
    configuracion = Configuracion.objects.filter(activo=True).first()

    queryset = Contrato.objects.select_related("cotizacion", "paquete")
    for contrato in queryset.iterator():
        tipo = None
        requiere_revision = False
        tipo_cotizacion = (
            contrato.cotizacion.tipo_servicio if contrato.cotizacion_id else None
        )
        tipo_paquete = contrato.paquete.tipo_servicio if contrato.paquete_id else None
        if tipo_cotizacion == "alquiler" and tipo_paquete in {None, "alquiler"}:
            tipo = "alquiler"
        elif (
            tipo_cotizacion == "servicio_completo"
            and tipo_paquete == "servicio_completo"
        ):
            tipo = "servicio_completo"
        elif not contrato.cotizacion_id and contrato.paquete_id:
            tipo = contrato.paquete.tipo_servicio

        if tipo == "alquiler":
            snapshot = snapshot_alquiler(configuracion, contrato)
            contrato.paquete = None
        elif tipo == "servicio_completo" and contrato.paquete_id:
            if (
                contrato.cotizacion_id
                and (contrato.cotizacion.oferta_snapshot or {})
                .get("paquete", {})
                .get("id")
                == contrato.paquete_id
            ):
                snapshot = dict(contrato.cotizacion.oferta_snapshot)
                snapshot.update(
                    {
                        "origen": "migracion_historica_desde_cotizacion",
                        "tipo_servicio": "servicio_completo",
                        "numero_invitados": contrato.numero_invitados,
                        "total_estimado": money(contrato.valor_final),
                    }
                )
            else:
                snapshot = snapshot_paquete(contrato.paquete, contrato)
        else:
            requiere_revision = True
            snapshot = {
                "version": 1,
                "origen": "migracion_historica_ambigua",
                "tipo_servicio": None,
                "numero_invitados": contrato.numero_invitados,
                "total_estimado": money(contrato.valor_final),
            }
            tipo = None

        contrato.tipo_servicio = tipo
        contrato.oferta_snapshot = snapshot
        contrato.oferta_requiere_revision = requiere_revision
        contrato.save(
            update_fields=[
                "paquete",
                "tipo_servicio",
                "oferta_snapshot",
                "oferta_requiere_revision",
            ]
        )


class Migration(migrations.Migration):
    dependencies = [
        ("negocio", "0007_estructura_oferta_paquetes"),
        ("comercial", "0006_oferta_historica_y_tipo_servicio"),
        ("financiero", "0005_gastos_recurrentes_y_adicionales"),
    ]

    operations = [
        migrations.AddField(
            model_name="contrato",
            name="oferta_requiere_revision",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="contrato",
            name="oferta_snapshot",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="contrato",
            name="tipo_servicio",
            field=models.CharField(
                blank=True,
                choices=[
                    ("alquiler", "Alquiler del local"),
                    ("servicio_completo", "Servicio completo"),
                ],
                max_length=30,
                null=True,
            ),
        ),
        migrations.RunPython(migrar_contratos, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="contrato",
            constraint=models.CheckConstraint(
                condition=models.Q(("oferta_requiere_revision", True))
                | models.Q(("paquete__isnull", True), ("tipo_servicio", "alquiler"))
                | models.Q(
                    ("paquete__isnull", False),
                    ("tipo_servicio", "servicio_completo"),
                ),
                name="contrato_tipo_servicio_paquete_coherente",
            ),
        ),
    ]
