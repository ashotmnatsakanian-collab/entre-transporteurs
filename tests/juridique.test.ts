import { describe, expect, it } from 'vitest'
import { adminUtilisateurSchema } from '../src/lib/validations/divers'
import { CONSERVATION_JOURNAL_MOIS, limiteJournal } from '../src/lib/purge'
import { VERSION_CGU } from '../src/lib/legal'

describe('badge « SIRET vérifié »', () => {
  it("l'admin ne peut pas l'accorder, seulement le retirer", () => {
    expect(adminUtilisateurSchema.safeParse({ verifie: true }).success).toBe(false)
    expect(adminUtilisateurSchema.safeParse({ verifie: false }).success).toBe(true)
    expect(adminUtilisateurSchema.safeParse({ suspendu: true }).success).toBe(true)
  })
})

describe('conservation du journal de sécurité', () => {
  it('conserve 12 mois, comme annoncé dans la politique de confidentialité', () => {
    expect(CONSERVATION_JOURNAL_MOIS).toBe(12)
    const maintenant = new Date('2027-03-15T10:00:00Z')
    expect(limiteJournal(maintenant).toISOString().slice(0, 10)).toBe('2026-03-15')
  })
})

describe('version des CGU', () => {
  it('est une date ISO (changer à chaque modification substantielle)', () => {
    expect(VERSION_CGU).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
