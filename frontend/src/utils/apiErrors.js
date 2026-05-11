function normalizeValue(value) {
  if (Array.isArray(value)) return value.join(' ')
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') return Object.values(value).flat().join(' ')
  return 'No se pudo completar la solicitud.'
}

export function getApiFieldErrors(error) {
  const data = error?.response?.data
  if (!data || typeof data !== 'object') return {}

  return Object.entries(data).reduce((errors, [key, value]) => {
    errors[key] = normalizeValue(value)
    return errors
  }, {})
}

export function getApiErrorMessage(error) {
  const data = error?.response?.data

  if (!data) {
    return 'No se pudo conectar con el backend.'
  }

  if (typeof data === 'string') return data
  if (data.detail) return normalizeValue(data.detail)
  if (data.non_field_errors) return normalizeValue(data.non_field_errors)

  return normalizeValue(data)
}
