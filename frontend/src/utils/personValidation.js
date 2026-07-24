export const PERSON_NAME_ERROR = 'Ingrese su nombre.'
export const ECUADOR_MOBILE_ERROR = 'Ingrese su teléfono para validar su solicitud.'

const PERSON_NAME_PATTERN = /^\p{L}+(?:[ '\u2019-]\p{L}+)*$/u
const PHONE_INPUT_PATTERN = /^\+?[0-9\s()-]+$/

export function normalizePersonName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

export function isValidPersonName(value) {
  const normalized = normalizePersonName(value)
  const letters = [...normalized].filter((character) => /\p{L}/u.test(character))
  return letters.length >= 3 && PERSON_NAME_PATTERN.test(normalized)
}

export function normalizeEcuadorMobile(value) {
  const input = String(value ?? '').trim()
  if (!PHONE_INPUT_PATTERN.test(input)) return null

  const digits = input.replace(/\D/g, '')
  if (/^09\d{8}$/.test(digits)) return digits
  if (/^5939\d{8}$/.test(digits)) return `0${digits.slice(3)}`
  return null
}
