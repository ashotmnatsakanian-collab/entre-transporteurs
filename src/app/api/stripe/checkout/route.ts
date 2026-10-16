import { db } from '@/lib/db'
import { stripe } from '@/lib/stripe'
import { urlApplication } from '@/lib/email'
import { ApiError, exigerUtilisateur, gerer, json, limiter } from '@/lib/api'

// POST /api/stripe/checkout — souscrire (commissionnaires uniquement)
export const POST = gerer(async (req) => {
  if (!stripe || !process.env.STRIPE_PRICE_ID) throw new ApiError(501, 'Le paiement en ligne est désactivé pendant la période de lancement.')
  const u = await exigerUtilisateur('COMMISSIONNAIRE')
  limiter(req, 'checkout', 10, 60 * 60_000, u.id)

  const abo = await db.abonnement.findUnique({ where: { userId: u.id } })
  if (!abo) throw new ApiError(404, 'Abonnement introuvable')
  if (abo.statut === 'ACTIVE') throw new ApiError(409, 'Déjà abonné')

  let customerId = abo.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({ email: u.email, name: u.nom })
    customerId = customer.id
    await db.abonnement.update({ where: { userId: u.id }, data: { stripeCustomerId: customerId } })
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: urlApplication('/abonnement/succes?session_id={CHECKOUT_SESSION_ID}'),
    cancel_url: urlApplication('/abonnement/tarification'),
    allow_promotion_codes: true,
    metadata: { userId: u.id },
  })
  return json({ url: session.url })
})
