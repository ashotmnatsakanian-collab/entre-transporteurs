import { describe, expect, it } from 'vitest'
import { siretValide } from '@/lib/siret'

describe('siretValide', () => {
  it('accepte des SIRET réels (clé de Luhn)', () => {
    expect(siretValide('35600000000048')).toBe(true) // siège de La Poste
    expect(siretValide('98765432101237')).toBe(true)
  })
  it('refuse une clé de contrôle incorrecte', () => {
    expect(siretValide('35600000000049')).toBe(false)
    expect(siretValide('12345678900001')).toBe(false)
  })
  it('refuse les formats invalides', () => {
    expect(siretValide('')).toBe(false)
    expect(siretValide('1234567890000')).toBe(false) // 13 chiffres
    expect(siretValide('123456789000012')).toBe(false) // 15 chiffres
    expect(siretValide('1234567890000a')).toBe(false)
    expect(siretValide('1234 5678 9000 01')).toBe(false)
  })
  it("applique l'exception La Poste (somme des chiffres multiple de 5)", () => {
    // SIREN 356000000 : valide si Luhn OU somme multiple de 5. 35600000000001 → somme 15, Luhn invalide.
    expect(siretValide('35600000000001')).toBe(true)
    expect(siretValide('35600000000002')).toBe(false)
  })
})
