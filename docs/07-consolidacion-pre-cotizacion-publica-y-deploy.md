# Pre-cotización Pública y Despliegue

## Contrato público

`POST /api/pre-cotizacion/` no requiere autenticación y acepta:

```json
{
  "nombre_persona": "Ana Zamora",
  "telefono_persona": "+593 99 123 4567",
  "tipo_evento": 1,
  "fecha_tentativa": "2026-12-10",
  "numero_invitados": 80,
  "tipo_servicio": "alquiler"
}
```

Opcionalmente puede recibir correo u observaciones de persona y observaciones de la cotización.

## Identidad durante el envío

1. El backend normaliza el teléfono.
2. Reutiliza la Persona existente o crea una nueva con origen `formulario_publico`.
3. Conserva el nombre recibido como alias si difiere del principal.
4. Crea la Cotización relacionada mediante `persona`.
5. Confirma o revierte todo dentro de una transacción.

El usuario público recibe el mismo resultado comercial exista o no un registro administrativo previo. La API pública no permite seleccionar una Persona mediante ID.

## Catálogos y cálculo

- Solo Tipos de evento y Paquetes activos se publican.
- La configuración activa del negocio alimenta la estimación de alquiler.
- Los paquetes de servicio completo usan precios registrados en backend.
- La estimación no es reserva ni precio final.
- WhatsApp continúa la atención humana.

## Entorno local

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py createsuperuser
.\.venv\Scripts\python.exe manage.py runserver

cd ..\frontend
npm install
npm run dev
```

Registrar Configuración, Tipos de evento y Paquetes reales desde el panel. No se cargan datos demo.

## Render

Backend:

- Root Directory: `backend`.
- Build: `pip install -r requirements.txt`.
- Start: `gunicorn config.wsgi:application`.
- Ejecutar `python manage.py migrate` y `python manage.py collectstatic --noinput`.
- Configurar `DATABASE_URL`, secretos, hosts y orígenes permitidos.

Frontend:

- Root Directory: `frontend`.
- Build: `npm install && npm run build`.
- Publish Directory: `dist`.
- Definir `VITE_API_BASE_URL` con el backend real.

## Política de datos

- Las migraciones no insertan información demo.
- No existen comandos de seeds demo en el flujo normal.
- El administrador y la configuración real se crean explícitamente.
- `limpiar_datos_operativos` es manual, audita por defecto y nunca se ejecuta en startup o deploy.
- Una base nueva queda estructuralmente lista, pero sin datos operativos inventados.

## Verificación previa al despliegue

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe manage.py test

cd ..\frontend
npm run lint
npm run build
```

Verificar además `/api/health/`, CORS, login, el formulario público y la navegación a `/personas`.
