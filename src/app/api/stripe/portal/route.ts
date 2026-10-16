import { db } from '@/lib/db'
import { stripe } from '@/lib/stripe'
import { urlApplication } from '@/lib/email'
import { ApiError, exigerUtilisateur, gerer, json, limiter } from '@/lib/api'

// POST /api/stripe/portal — gérer / résilier son abonnement
export const POST = gerer(async (req) => {
  if (!stripe) throw new ApiError(501, 'Le paiement en ligne est désactivé pendant la période de lancement.')
  const u = await exigerUtilisateur('COMMISSIONNAIRE')
  limiter(req, 'portail', 10, 60 * 60_000, u.id)

  const abo = await db.abonnement.findUnique({ where: { userId: u.id } })
  if (!abo?.stripeCustomerId) throw new ApiError(404, 'Aucun abonnement Stripe trouvé')

  const portail = await stripe.billingPortal.sessions.create({
    customer: abo.stripeCustomerId,
    return_url: urlApplication('/commissionnaire'),
  })
  return json({ url: portail.url })
})
