import Stripe from 'stripe'
import { facturationActive, finEssaiEffective } from './facturation'

// Stripe est optionnel — l'app fonctionne sans clé configurée
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' })
  : null

// Prix de l'abonnement commissionnaire (les transporteurs sont gratuits)
export const PRIX_MENSUEL_EUR = 6900

export async function creerClientStripe(email: string, nom: string): Promise<string | null> {
  if (!stripe) return null
  const customer = await stripe.customers.create({ email, name: nom })
  return customer.id
}

// Accès libre tant que le paiement n'est pas exigé (lancement gratuit, ou avant la date de facturation)
export function abonnementActif(statut: string, dateFinEssai: Date | null): boolean {
  if (!facturationActive()) return true
  if (statut === 'ACTIVE') return true
  const fin = finEssaiEffective(dateFinEssai)
  if (statut === 'TRIALING' && fin && fin > new Date()) return true
  return false
}
