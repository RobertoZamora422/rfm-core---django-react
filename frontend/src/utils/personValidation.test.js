import { describe, expect, it } from 'vitest'
import {
  isValidPersonName,
  normalizeEcuadorMobile,
  normalizePersonName,
} from './personValidation'

describe('personValidation', () => {
  it('normaliza espacios y acepta nombres reales en español', () => {
    expect(normalizePersonName('  Ana   María  ')).toBe('Ana María')
    for (const name of ['Bob', 'Ale', 'Ana María', 'José', 'María-José', 'D’Angelo']) {
      expect(isValidPersonName(name)).toBe(true)
    }
  })

  it('rechaza símbolos, números y nombres con menos de tres letras', () => {
    for (const name of ['', '.', '12', 'A', 'Jo', '---', 'A1a']) {
      expect(isValidPersonName(name)).toBe(false)
    }
  })

  it('convierte las representaciones ecuatorianas al mismo celular canónico', () => {
    expect(normalizeEcuadorMobile('0912345678')).toBe('0912345678')
    expect(normalizeEcuadorMobile('593912345678')).toBe('0912345678')
    expect(normalizeEcuadorMobile('+593 91 234-5678')).toBe('0912345678')
  })

  it('rechaza fijos, longitudes intermedias y caracteres no permitidos', () => {
    for (const phone of [
      '0223456789',
      '091234567',
      '09123456789',
      '593812345678',
      '59391234567',
      '09ABC45678',
      '0912.345678',
    ]) {
      expect(normalizeEcuadorMobile(phone)).toBeNull()
    }
  })
})
