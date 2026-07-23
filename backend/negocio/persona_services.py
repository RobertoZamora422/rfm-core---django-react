"""Operaciones transaccionales para la identidad canónica de las personas."""

from collections import defaultdict

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from .models import Cliente, NombrePersona
from .validators import normalizar_nombre, normalizar_telefono


class PersonaDuplicadaError(ValidationError):
    def __init__(self, persona):
        self.persona = persona
        super().__init__(
            {
                "telefono": (
                    "Esta persona ya está registrada. Puedes seleccionarla para continuar."
                )
            }
        )


def _combinar_observaciones(actual, adicional, *, referencia=None):
    actual = (actual or "").strip()
    adicional = (adicional or "").strip()
    if not adicional or adicional in actual:
        return actual
    encabezado = f"Registro consolidado #{referencia}:" if referencia else "Información adicional:"
    bloque = f"{encabezado}\n{adicional}"
    return f"{actual}\n\n{bloque}".strip() if actual else bloque


def registrar_nombre_utilizado(persona, nombre, *, origen=None, fecha=None):
    nombre = " ".join((nombre or "").strip().split())
    nombre_normalizado = normalizar_nombre(nombre)
    if not nombre_normalizado or nombre_normalizado == normalizar_nombre(persona.nombre):
        return None

    alias, created = NombrePersona.objects.get_or_create(
        cliente=persona,
        nombre_normalizado=nombre_normalizado,
        defaults={
            "nombre": nombre,
            "origen": origen or persona.origen,
        },
    )
    if created and fecha:
        NombrePersona.objects.filter(pk=alias.pk).update(
            creado_en=fecha,
            actualizado_en=fecha,
        )
        alias.creado_en = fecha
        alias.actualizado_en = fecha
    return alias


def buscar_persona_existente(telefono):
    try:
        telefono_normalizado = normalizar_telefono(telefono)
    except ValidationError:
        return None
    return Cliente.objects.filter(telefono_normalizado=telefono_normalizado).first()


@transaction.atomic
def crear_persona(*, nombre, telefono, correo="", observaciones="", origen, es_demo=False):
    telefono_normalizado = normalizar_telefono(telefono)
    existente = Cliente.objects.select_for_update().filter(
        telefono_normalizado=telefono_normalizado
    ).first()
    if existente:
        raise PersonaDuplicadaError(existente)

    try:
        with transaction.atomic():
            return Cliente.objects.create(
                nombre=nombre,
                telefono=telefono,
                telefono_normalizado=telefono_normalizado,
                correo=correo,
                observaciones=observaciones,
                origen=origen,
                es_demo=es_demo,
            )
    except (IntegrityError, ValidationError) as exc:
        existente = Cliente.objects.filter(
            telefono_normalizado=telefono_normalizado
        ).first()
        if existente:
            raise PersonaDuplicadaError(existente) from exc
        raise


@transaction.atomic
def actualizar_persona(persona, **datos):
    nombre_anterior = persona.nombre
    telefono = datos.get("telefono", persona.telefono)
    telefono_normalizado = normalizar_telefono(telefono)
    duplicada = Cliente.objects.select_for_update().filter(
        telefono_normalizado=telefono_normalizado
    ).exclude(pk=persona.pk).first()
    if duplicada:
        raise PersonaDuplicadaError(duplicada)

    for campo in ("nombre", "telefono", "correo", "observaciones"):
        if campo in datos:
            setattr(persona, campo, datos[campo])
    persona.telefono_normalizado = telefono_normalizado
    persona.save()

    if normalizar_nombre(nombre_anterior) != normalizar_nombre(persona.nombre):
        registrar_nombre_utilizado(
            persona,
            nombre_anterior,
            origen=persona.origen,
        )
    return persona


@transaction.atomic
def obtener_o_crear_persona_publica(*, nombre, telefono, correo="", observaciones=""):
    telefono_normalizado = normalizar_telefono(telefono)
    persona = Cliente.objects.select_for_update().filter(
        telefono_normalizado=telefono_normalizado
    ).first()

    if persona is None:
        try:
            with transaction.atomic():
                persona = Cliente.objects.create(
                    nombre=nombre,
                    telefono=telefono,
                    telefono_normalizado=telefono_normalizado,
                    correo=correo,
                    observaciones=observaciones,
                    origen=Cliente.Origen.FORMULARIO_PUBLICO,
                )
                return persona, True
        except (IntegrityError, ValidationError):
            persona = Cliente.objects.select_for_update().get(
                telefono_normalizado=telefono_normalizado
            )

    registrar_nombre_utilizado(
        persona,
        nombre,
        origen=Cliente.Origen.FORMULARIO_PUBLICO,
    )
    campos_actualizados = []
    if correo and not persona.correo:
        persona.correo = correo
        campos_actualizados.append("correo")
    observaciones_combinadas = _combinar_observaciones(
        persona.observaciones,
        observaciones,
    )
    if observaciones_combinadas != persona.observaciones:
        persona.observaciones = observaciones_combinadas
        campos_actualizados.append("observaciones")
    if campos_actualizados:
        persona.save(update_fields=[*campos_actualizados, "actualizado_en"])
    return persona, False


def _plan_consolidacion(personas):
    personas = sorted(personas, key=lambda item: (item.creado_en, item.id))
    canonica = personas[0]
    duplicadas = personas[1:]
    correos = sorted({item.correo for item in personas if item.correo})
    return {
        "telefono_normalizado": normalizar_telefono(canonica.telefono),
        "canonica_id": canonica.id,
        "canonica_nombre": canonica.nombre,
        "duplicados_ids": [item.id for item in duplicadas],
        "cotizaciones_a_reasignar": sum(item.cotizaciones.count() for item in duplicadas),
        "contratos_a_reasignar": sum(item.contratos.count() for item in duplicadas),
        "nombres": sorted({item.nombre for item in personas}),
        "correos": correos,
        "conflictos": ["correos diferentes"] if len(correos) > 1 else [],
    }


def planificar_consolidacion_personas():
    grupos = defaultdict(list)
    for persona in Cliente.objects.all().prefetch_related("cotizaciones", "contratos"):
        grupos[normalizar_telefono(persona.telefono)].append(persona)
    return [
        _plan_consolidacion(personas)
        for personas in grupos.values()
        if len(personas) > 1
    ]


@transaction.atomic
def consolidar_personas_duplicadas():
    planes = planificar_consolidacion_personas()
    for plan in planes:
        personas = list(
            Cliente.objects.select_for_update()
            .filter(id__in=[plan["canonica_id"], *plan["duplicados_ids"]])
            .order_by("creado_en", "id")
        )
        canonica = personas[0]
        fecha_creacion = min(item.creado_en for item in personas)
        fecha_actualizacion = max(item.actualizado_en for item in personas)

        for duplicada in personas[1:]:
            registrar_nombre_utilizado(
                canonica,
                duplicada.nombre,
                origen=duplicada.origen,
                fecha=duplicada.creado_en,
            )
            if not canonica.correo and duplicada.correo:
                canonica.correo = duplicada.correo
            elif duplicada.correo and duplicada.correo != canonica.correo:
                canonica.observaciones = _combinar_observaciones(
                    canonica.observaciones,
                    f"Correo alternativo: {duplicada.correo}",
                    referencia=duplicada.id,
                )
            canonica.observaciones = _combinar_observaciones(
                canonica.observaciones,
                duplicada.observaciones,
                referencia=duplicada.id,
            )
            duplicada.cotizaciones.update(cliente=canonica)
            duplicada.contratos.update(cliente=canonica)

        canonica.es_demo = all(item.es_demo for item in personas)
        canonica.telefono_normalizado = plan["telefono_normalizado"]
        canonica.save()
        Cliente.objects.filter(id__in=plan["duplicados_ids"]).delete()
        Cliente.objects.filter(pk=canonica.pk).update(
            creado_en=fecha_creacion,
            actualizado_en=fecha_actualizacion,
        )
    return planes
