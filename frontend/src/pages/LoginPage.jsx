import { useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react'
import ranchoLogo from '../assets/logotipo-rancho.svg'
import { Button } from '../components/ui/Button'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { useAuth } from '../hooks/useAuth'

function resolveLoginError(error) {
  const detail = error?.response?.data

  if (detail?.non_field_errors?.length) {
    return detail.non_field_errors[0]
  }

  if (error?.response?.status === 400) {
    return 'Revise las credenciales ingresadas.'
  }

  return 'No se pudo iniciar sesión con el servidor.'
}

export function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const submissionInFlight = useRef(false)
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from?.pathname ?? '/inicio'
  const currentYear = new Date().getFullYear()

  if (isAuthenticated) {
    return <Navigate replace to={redirectTo} />
  }

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (submissionInFlight.current) return

    submissionInFlight.current = true
    setError('')
    setIsSubmitting(true)

    try {
      await login(form)
      navigate(redirectTo, { replace: true })
    } catch (loginError) {
      setError(resolveLoginError(loginError))
    } finally {
      submissionInFlight.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel" aria-labelledby="login-title">
        <header className="login-panel__header">
          <img className="login-logo" src={ranchoLogo} alt="Rancho Flor María" />
          <h1 id="login-title">Acceso administrativo</h1>
          <div className="login-ornament" aria-hidden="true">
            <span />
            <i />
            <span />
          </div>
        </header>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-field__label" htmlFor="username">
              Usuario
            </label>
            <span className="login-field__control">
              <UserRound aria-hidden="true" className="login-field__icon" size={19} />
              <input
                autoComplete="username"
                id="username"
                name="username"
                onChange={handleChange}
                placeholder="Ingresa tu usuario"
                required
                value={form.username}
              />
            </span>
          </div>

          <div className="login-field">
            <label className="login-field__label" htmlFor="password">
              Contraseña
            </label>
            <span className="login-field__control">
              <LockKeyhole aria-hidden="true" className="login-field__icon" size={19} />
              <input
                autoComplete="current-password"
                id="password"
                name="password"
                onChange={handleChange}
                placeholder="Ingresa tu contraseña"
                required
                type={showPassword ? 'text' : 'password'}
                value={form.password}
              />
              <button
                className="login-password-toggle"
                type="button"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((isVisible) => !isVisible)}
              >
                {showPassword ? <EyeOff aria-hidden="true" size={19} /> : <Eye aria-hidden="true" size={19} />}
              </button>
            </span>
          </div>

          <ErrorMessage>{error}</ErrorMessage>

          <Button
            className="login-submit"
            isLoading={isSubmitting}
            loadingLabel="Iniciando sesión…"
            type="submit"
          >
            Iniciar sesión
          </Button>
        </form>

        <footer className="login-panel__footer">© {currentYear} Rancho Flor María</footer>
      </section>
    </main>
  )
}
