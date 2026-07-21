import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

export const PRIX_MENSUEL_EUR = 9900 // en centimes

export async function creerClientStripe(email: string, nom: string): Promise<string> {
  const customer = await stripe.customers.create({ email, name: nom })
  return customer.id
}

export function abonnementActif(statut: string, dateFinEssai: Date | null): boolean {
  if (statut === 'ACTIVE') return true
  if (statut === 'TRIALING' && dateFinEssai && dateFinEssai > new Date()) return true
  return false
}
