import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { compteActuel, consommer, reinitialiser } from '@/lib/rate-limit'

describe('limitation de débit', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('autorise jusqu’au plafond puis refuse', () => {
    const cle = 'test-plafond'
    expect(consommer(cle, 3, 1000).autorise).toBe(true)
    expect(consommer(cle, 3, 1000).autorise).toBe(true)
    expect(consommer(cle, 3, 1000).autorise).toBe(true)
    const refus = consommer(cle, 3, 1000)
    expect(refus.autorise).toBe(false)
    expect(refus.restant).toBe(0)
    expect(refus.retryApresSec).toBeGreaterThan(0)
  })

  it('se réinitialise une fois la fenêtre écoulée', () => {
    const cle = 'test-fenetre'
    consommer(cle, 1, 1000)
    expect(consommer(cle, 1, 1000).autorise).toBe(false)
    vi.advanceTimersByTime(1001)
    expect(consommer(cle, 1, 1000).autorise).toBe(true)
  })

  it('isole les clés entre elles', () => {
    consommer('a', 1, 1000)
    expect(consommer('a', 1, 1000).autorise).toBe(false)
    expect(consommer('b', 1, 1000).autorise).toBe(true)
  })

  it('compteActuel lit sans consommer, reinitialiser remet à zéro', () => {
    const cle = 'test-lecture'
    consommer(cle, 5, 1000)
    consommer(cle, 5, 1000)
    expect(compteActuel(cle)).toBe(2)
    expect(compteActuel(cle)).toBe(2)
    reinitialiser(cle)
    expect(compteActuel(cle)).toBe(0)
  })
})
