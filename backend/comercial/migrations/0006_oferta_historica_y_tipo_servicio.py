from decimal import Decimal

from django.db import migrations, models


def money(value):
    return str(Decimal(value or 0).quantize(Decimal("0.01")))


def package_snapshot(paquete, cotizacion):
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
        "tipo_servicio": cotizacion.tipo_servicio,
        "numero_invitados": cotizacion.numero_invitados,
        "total_estimado": money(cotizacion.total_estimado),
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
                paquete.precio_por_persona * cotizacion.numero_invitados
            ),
            "beneficios": beneficios,
            "incluidos_en_todos": [],
        },
    }


def rental_snapshot(configuracion, cotizacion):
    snapshot = {
        "version": 1,
        "origen": "migracion_historica",
        "tipo_servicio": "alquiler",
        "numero_invitados": cotizacion.numero_invitados,
        "total_estimado": money(cotizacion.total_estimado),
        "alquiler": {"parametros_disponibles": False},
    }
    if configuracion:
        adicionales = max(
            cotizacion.numero_invitados
            - configuracion.invitados_incluidos_alquiler,
            0,
        )
        esperado = configuracion.tarifa_base_alquiler + (
            Decimal(adicionales) * configuracion.costo_invitado_adicional
        )
        if esperado == cotizacion.total_estimado:
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


def migrar_cotizaciones(apps, schema_editor):
    Cotizacion = apps.get_model("comercial", "Cotizacion")
    Configuracion = apps.get_model("negocio", "ConfiguracionNegocio")
    configuracion = Configuracion.objects.filter(activo=True).first()

    Cotizacion.objects.filter(tipo_servicio="no_seguro").update(
        tipo_servicio="no_estoy_seguro"
    )

    for cotizacion in Cotizacion.objects.select_related("paquete").iterator():
        requiere_revision = False
        if cotizacion.tipo_servicio == "alquiler":
            snapshot = rental_snapshot(configuracion, cotizacion)
            if cotizacion.paquete_id:
                snapshot["referencia_paquete_legacy"] = {
                    "id": cotizacion.paquete_id,
                    "nombre": cotizacion.paquete.nombre,
                    "tipo_servicio": cotizacion.paquete.tipo_servicio,
                }
                requiere_revision = (
                    cotizacion.paquete.tipo_servicio != "alquiler"
                )
                cotizacion.paquete = None
        elif cotizacion.tipo_servicio == "servicio_completo":
            if cotizacion.paquete_id and cotizacion.paquete.tipo_servicio == "servicio_completo":
                snapshot = package_snapshot(cotizacion.paquete, cotizacion)
            else:
                requiere_revision = True
                snapshot = {
                    "version": 1,
                    "origen": "migracion_historica_incompleta",
                    "tipo_servicio": "servicio_completo",
                    "numero_invitados": cotizacion.numero_invitados,
                    "total_estimado": money(cotizacion.total_estimado),
                    "paquete": {},
                }
        else:
            snapshot = {
                "version": 1,
                "origen": "migracion_historica",
                "tipo_servicio": "no_estoy_seguro",
                "numero_invitados": cotizacion.numero_invitados,
                "total_estimado": money(cotizacion.total_estimado),
                "preferencias": {},
            }
            if cotizacion.paquete_id and cotizacion.paquete.tipo_servicio == "servicio_completo":
                snapshot["paquete"] = package_snapshot(
                    cotizacion.paquete,
                    cotizacion,
                )["paquete"]
        cotizacion.oferta_snapshot = snapshot
        cotizacion.oferta_requiere_revision = requiere_revision
        cotizacion.save(
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
        ("comercial", "0005_rename_cliente_persona"),
    ]

    operations = [
        migrations.AddField(
            model_name="cotizacion",
            name="oferta_requiere_revision",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="cotizacion",
            name="oferta_snapshot",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AlterField(
            model_name="cotizacion",
            name="tipo_servicio",
            field=models.CharField(
                choices=[
                    ("alquiler", "Alquiler del local"),
                    ("servicio_completo", "Servicio completo"),
                    ("no_estoy_seguro", "No estoy seguro"),
                ],
                max_length=30,
            ),
        ),
        migrations.RunPython(migrar_cotizaciones, migrations.RunPython.noop),
    ]
