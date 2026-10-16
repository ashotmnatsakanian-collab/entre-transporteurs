import { afterEach, describe, expect, it, vi } from 'vitest'
import { debutFacturation, facturationActive, facturationAnnoncee, finEssaiEffective, JOURS_ESSAI } from '../src/lib/facturation'
import { abonnementActif } from '../src/lib/stripe'

const JOUR = 86_400_000
const dans = (jours: number) => new Date(Date.now() + jours * JOUR)

afterEach(() => vi.unstubAllEnvs())

describe('ouverture de la facturation', () => {
  it('reste gratuite sans clé Stripe', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    expect(facturationActive()).toBe(false)
    expect(abonnementActif('CANCELED', null)).toBe(true)
  })

  it('est active immédiatement avec Stripe et sans date', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_x')
    vi.stubEnv('FACTURATION_A_PARTIR_DU', '')
    expect(facturationActive()).toBe(true)
  })

  it("reste gratuite jusqu'à la date annoncée, puis s'active", () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_x')
    vi.stubEnv('FACTURATION_A_PARTIR_DU', dans(40).toISOString())
    expect(facturationActive()).toBe(false)
    expect(facturationAnnoncee()).toEqual(debutFacturation())
    vi.stubEnv('FACTURATION_A_PARTIR_DU', dans(-1).toISOString())
    expect(facturationActive()).toBe(true)
    expect(facturationAnnoncee()).toBeNull()
  })

  it('ignore une date invalide', () => {
    vi.stubEnv('FACTURATION_A_PARTIR_DU', 'demain')
    expect(debutFacturation()).toBeNull()
  })
})

describe("essai gratuit : jamais consommé pendant le lancement", () => {
  it("garantit 30 jours à partir du début de facturation, même pour un compte créé il y a un an", () => {
    const debut = dans(10)
    vi.stubEnv('FACTURATION_A_PARTIR_DU', debut.toISOString())
    const fin = finEssaiEffective(dans(-335))!
    expect(Math.round((fin.getTime() - debut.getTime()) / JOUR)).toBe(JOURS_ESSAI)
    expect(finEssaiEffective(null)!.getTime()).toBe(fin.getTime())
  })

  it("respecte un essai plus long déjà accordé", () => {
    vi.stubEnv('FACTURATION_A_PARTIR_DU', dans(10).toISOString())
    const longue = dans(200)
    expect(finEssaiEffective(longue)).toEqual(longue)
  })

  it('ne modifie rien sans date de facturation', () => {
    vi.stubEnv('FACTURATION_A_PARTIR_DU', '')
    const fin = dans(5)
    expect(finEssaiEffective(fin)).toEqual(fin)
    expect(finEssaiEffective(null)).toBeNull()
  })

  it("garde l'accès pendant l'essai effectif, le retire ensuite", () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_x')
    // facturation ouverte depuis 5 jours : essai effectif = 25 jours restants, même si l'essai d'origine est expiré
    vi.stubEnv('FACTURATION_A_PARTIR_DU', dans(-5).toISOString())
    expect(abonnementActif('TRIALING', dans(-300))).toBe(true)
    // facturation ouverte depuis 31 jours : essai terminé
    vi.stubEnv('FACTURATION_A_PARTIR_DU', dans(-31).toISOString())
    expect(abonnementActif('TRIALING', dans(-300))).toBe(false)
    expect(abonnementActif('ACTIVE', null)).toBe(true)
    expect(abonnementActif('PAST_DUE', null)).toBe(false)
  })
})
