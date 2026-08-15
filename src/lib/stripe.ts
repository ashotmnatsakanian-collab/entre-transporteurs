import Stripe from 'stripe'

// Stripe est optionnel — l'app fonctionne sans clé configurée
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' })
  : null

export const PRIX_MENSUEL_EUR = 9900

export async function creerClientStripe(email: string, nom: string): Promise<string | null> {
  if (!stripe) return null
  const customer = await stripe.customers.create({ email, name: nom })
  return customer.id
}

// Sans Stripe configuré : accès libre (utile pour le lancement)
export function abonnementActif(statut: string, dateFinEssai: Date | null): boolean {
  if (!process.env.STRIPE_SECRET_KEY) return true
  if (statut === 'ACTIVE') return true
  if (statut === 'TRIALING' && dateFinEssai && dateFinEssai > new Date()) return true
  return false
}
