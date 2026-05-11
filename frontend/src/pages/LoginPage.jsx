import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { Input } from '../components/ui/Input'
import { useAuth } from '../hooks/useAuth'

function resolveLoginError(error) {
  const detail = error?.response?.data

  if (detail?.non_field_errors?.length) {
    return detail.non_field_errors[0]
  }

  if (error?.response?.status === 400) {
    return 'Revise las credenciales ingresadas.'
  }

  return 'No se pudo iniciar sesion con el backend.'
}

export function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from?.pathname ?? '/inicio'

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
    setError('')
    setIsSubmitting(true)

    try {
      await login(form)
      navigate(redirectTo, { replace: true })
    } catch (loginError) {
      setError(resolveLoginError(loginError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-panel__copy">
          <span className="app-kicker">RFM Core</span>
          <h1 id="login-title">Acceso administrativo</h1>
          <p>Gestion comercial, contratos y rentabilidad desde un entorno centralizado.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <Input
            autoComplete="username"
            id="username"
            label="Usuario"
            name="username"
            onChange={handleChange}
            required
            value={form.username}
          />
          <Input
            autoComplete="current-password"
            id="password"
            label="Contrasena"
            name="password"
            onChange={handleChange}
            required
            type="password"
            value={form.password}
          />
          <ErrorMessage>{error}</ErrorMessage>
          <Button icon={LogIn} isLoading={isSubmitting} type="submit">
            Ingresar
          </Button>
        </form>
      </section>
    </main>
  )
}
