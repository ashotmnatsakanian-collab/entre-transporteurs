import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { ApiError, gerer, json } from '@/lib/api'
import { log, messageErreur } from '@/lib/logger'

// POST /api/stripe/webhook — appelé par Stripe uniquement (signature vérifiée, corps brut)
export const POST = gerer(async (req) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) throw new ApiError(501, 'Stripe non configuré')

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) throw new ApiError(400, 'Signature manquante')

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    log.warn('webhook Stripe : signature invalide', { erreur: messageErreur(err) })
    throw new ApiError(400, 'Signature invalide')
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const cs = event.data.object as Stripe.Checkout.Session
        if (cs.mode !== 'subscription' || !cs.subscription) break
        const sub = await stripe.subscriptions.retrieve(cs.subscription as string)
        await db.abonnement.updateMany({
          where: { stripeCustomerId: cs.customer as string },
          data: {
            stripeSubscriptionId: sub.id,
            statut: 'ACTIVE',
            dateFinPeriode: new Date(sub.current_period_end * 1000),
            dateFinEssai: null,
          },
        })
        break
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await db.abonnement.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            statut: stripeStatutVersLocal(sub.status),
            dateFinPeriode: new Date(sub.current_period_end * 1000),
            dateFinEssai: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
          },
        })
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await db.abonnement.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { statut: 'CANCELED' },
        })
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (!invoice.subscription) break
        await db.abonnement.updateMany({
          where: { stripeSubscriptionId: invoice.subscription as string },
          data: { statut: 'PAST_DUE' },
        })
        break
      }
    }
  } catch (err) {
    log.error('webhook Stripe : traitement échoué', { type: event.type, erreur: messageErreur(err) })
    throw new ApiError(500, 'Erreur interne') // Stripe réessaiera
  }

  return json({ received: true })
})

function stripeStatutVersLocal(statut: Stripe.Subscription.Status): 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' {
  switch (statut) {
    case 'trialing': return 'TRIALING'
    case 'active': return 'ACTIVE'
    case 'past_due':
    case 'unpaid': return 'PAST_DUE'
    case 'canceled': return 'CANCELED'
    default: return 'PAST_DUE'
  }
}
