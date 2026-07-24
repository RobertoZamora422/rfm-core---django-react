import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PreCotizacionPage } from './PreCotizacionPage'

const {
  crearPreCotizacion,
  guardarPreferenciaPreCotizacion,
  listarTiposEventoPublicos,
} = vi.hoisted(() => ({
  crearPreCotizacion: vi.fn(),
  guardarPreferenciaPreCotizacion: vi.fn(),
  listarTiposEventoPublicos: vi.fn(),
}))

vi.mock('../services/preCotizacionService', () => ({
  crearPreCotizacion,
  guardarPreferenciaPreCotizacion,
  listarTiposEventoPublicos,
}))

const whatsappUrl = [
  'https://wa.me/593991234567?text=',
  encodeURIComponent(
    'Nombre: Ana María\nEvento: Boda\nFecha tentativa: 31/08/2026\nInvitados: 100\nModalidad de interés: Servicio completo',
  ),
].join('')

function packageData() {
  return {
    id: 7,
    nombre: 'Celebración integral',
    categoria: 'premium',
    categoria_display: 'Premium',
    resumen_corto: 'Una experiencia completa.',
    destacado: true,
    etiqueta_comercial: 'Más elegido',
    precio_por_persona: '20.00',
    total_estimado: '2000.00',
    beneficios: [
      {
        id: 3,
        tipo: 'principal',
        titulo: 'Banquete',
        detalle: 'Menú para la celebración.',
      },
    ],
  }
}

function serviceResponse(paquete = null) {
  return {
    cotizacion: {
      id: 10,
      persona_nombre: 'Ana María',
      persona_telefono: '0991234567',
      tipo_evento_nombre: 'Boda',
      fecha_tentativa: '2026-08-31',
      numero_invitados: 100,
      tipo_servicio: 'servicio_completo',
      paquete,
    },
    calculo: {
      tipo_servicio: 'servicio_completo',
      total_estimado: paquete ? '2000.00' : null,
      incluidos_en_todos: [
        {
          id: 1,
          tipo: 'principal',
          titulo: 'Jardín iluminado',
          detalle: 'Entorno preparado.',
        },
      ],
      paquetes: [packageData()],
    },
    solicitud_token: 'token-seguro',
    whatsapp: {
      principal: {
        etiqueta: 'Continuar por WhatsApp',
        url: whatsappUrl,
      },
    },
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route
          element={(
            <Outlet
              context={{
                configuracion: {
                  nombre_negocio: 'Rancho Flor María',
                  whatsapp_disponible: true,
                  fecha_minima_cotizacion: '2026-07-24',
                },
                configError: false,
                isConfigLoading: false,
                reloadConfiguracion: vi.fn(),
              }}
            />
          )}
        >
          <Route element={<PreCotizacionPage />} index />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

async function completeEventForm({ mode = 'Servicio completo' } = {}) {
  fireEvent.change(screen.getByLabelText(/Tipo de evento/), { target: { value: '1' } })
  fireEvent.input(screen.getByLabelText(/Fecha tentativa/), {
    target: { value: '2026-08-31' },
  })
  fireEvent.change(screen.getByLabelText(/Número de invitados/), {
    target: { value: '100' },
  })
  fireEvent.click(screen.getByLabelText(mode))
  fireEvent.change(screen.getByLabelText(/Nombre completo/), {
    target: { value: 'Ana María' },
  })
  fireEvent.change(screen.getByLabelText(/Celular \/ WhatsApp/), {
    target: { value: '+593 99 123 4567' },
  })
}

describe('PreCotizacionPage', () => {
  beforeEach(() => {
    crearPreCotizacion.mockReset()
    guardarPreferenciaPreCotizacion.mockReset()
    listarTiposEventoPublicos.mockReset()
    listarTiposEventoPublicos.mockResolvedValue([{ id: 1, nombre: 'Boda' }])
    crearPreCotizacion.mockResolvedValue(serviceResponse())
    guardarPreferenciaPreCotizacion.mockImplementation(({ paquete }) => (
      Promise.resolve(serviceResponse(paquete))
    ))
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    window.requestAnimationFrame = (callback) => callback()
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('presenta evento, modalidad y contacto en ese orden y bloquea fechas pasadas', async () => {
    renderPage()
    await screen.findByRole('option', { name: 'Boda' })

    const eventHeading = screen.getByRole('heading', { name: /1\. Información del evento/ })
    const modality = screen.getByRole('group', { name: /2\. Modalidad de interés/ })
    const contactHeading = screen.getByRole('heading', { name: /3\. Datos de contacto/ })

    expect(eventHeading.compareDocumentPosition(modality) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(modality.compareDocumentPosition(contactHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(modality.querySelector('.lucide-tree-deciduous')).toBeInTheDocument()
    expect(modality.querySelector('.lucide-hand-platter')).toBeInTheDocument()
    expect(modality.querySelector('.lucide-signpost')).toBeInTheDocument()
    const dateInput = screen.getByLabelText(/Fecha tentativa/)
    expect(dateInput).toHaveAttribute('min', '2026-07-24')

    fireEvent.input(dateInput, { target: { value: '2026-07-23' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ver mis opciones y estimación' }))
    expect(screen.getByText('Seleccione una fecha válida.')).toBeInTheDocument()
    expect(crearPreCotizacion).not.toHaveBeenCalled()

    fireEvent.input(dateInput, { target: { value: '2026-07-24' } })
    expect(screen.queryByText('Seleccione una fecha válida.')).not.toBeInTheDocument()
  })

  it('muestra el error junto al campo y lo limpia al corregir el valor', async () => {
    renderPage()
    await screen.findByRole('option', { name: 'Boda' })

    fireEvent.click(screen.getByRole('button', { name: 'Ver mis opciones y estimación' }))
    expect(screen.getByText('Ingrese su nombre.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre completo/)).toHaveAttribute('aria-invalid', 'true')

    fireEvent.change(screen.getByLabelText(/Nombre completo/), {
      target: { value: 'Ana María' },
    })
    expect(screen.queryByText('Ingrese su nombre.')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre completo/)).toHaveAttribute('aria-invalid', 'false')
  })

  it('continúa sin paquete y normaliza el celular antes de enviar', async () => {
    renderPage()
    await screen.findByRole('option', { name: 'Boda' })
    await completeEventForm()

    const submitButton = screen.getByRole('button', { name: 'Ver mis opciones y estimación' })
    fireEvent.click(submitButton)
    fireEvent.click(submitButton)

    await waitFor(() => expect(crearPreCotizacion).toHaveBeenCalledTimes(1))
    expect(crearPreCotizacion).toHaveBeenCalledWith(expect.objectContaining({
      nombre_persona: 'Ana María',
      telefono_persona: '0991234567',
      paquete: null,
      tipo_servicio: 'servicio_completo',
    }))
    expect(await screen.findByRole('heading', { name: 'Tu evento, en un vistazo' })).toBeInTheDocument()
  })

  it('selecciona, cambia y deselecciona una preferencia sin duplicar la cotización', async () => {
    renderPage()
    await screen.findByRole('option', { name: 'Boda' })
    await completeEventForm()
    fireEvent.click(screen.getByRole('button', { name: 'Ver mis opciones y estimación' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Elegir este paquete' }))
    await waitFor(() => expect(guardarPreferenciaPreCotizacion).toHaveBeenLastCalledWith({
      solicitud_token: 'token-seguro',
      paquete: 7,
    }))
    expect(screen.getAllByRole('button', { name: 'Quitar preferencia' }).length).toBeGreaterThan(0)

    fireEvent.click(screen.getAllByRole('button', { name: 'Quitar preferencia' })[0])
    await waitFor(() => expect(guardarPreferenciaPreCotizacion).toHaveBeenLastCalledWith({
      solicitud_token: 'token-seguro',
      paquete: null,
    }))
    expect(crearPreCotizacion).toHaveBeenCalledTimes(1)
  })

  it('usa el CTA configurado y conserva en el enlace los datos válidos del evento', async () => {
    renderPage()
    await screen.findByRole('option', { name: 'Boda' })
    await completeEventForm()
    fireEvent.click(screen.getByRole('button', { name: 'Ver mis opciones y estimación' }))

    const cta = await screen.findByRole('link', { name: 'Continuar por WhatsApp' })
    expect(cta).toHaveAttribute('href', whatsappUrl)
    expect(decodeURIComponent(cta.getAttribute('href'))).toContain('Nombre: Ana María')
    expect(decodeURIComponent(cta.getAttribute('href'))).toContain('Invitados: 100')
    expect(decodeURIComponent(cta.getAttribute('href'))).not.toMatch(/undefined|null/)
  })
})
