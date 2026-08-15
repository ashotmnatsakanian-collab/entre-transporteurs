import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { stripe } from '@/lib/stripe'

export async function POST() {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe non configuré' }, { status: 501 })
  }

  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const abo = await db.abonnement.findUnique({ where: { userId: session.user.id } })
  if (!abo) return NextResponse.json({ error: 'Abonnement introuvable' }, { status: 404 })

  if (abo.statut === 'ACTIVE') {
    return NextResponse.json({ error: 'Déjà abonné' }, { status: 409 })
  }

  let customerId = abo.stripeCustomerId
  if (!customerId) {
    const user = await db.user.findUnique({ where: { id: session.user.id } })
    const customer = await stripe.customers.create({ email: user!.email, name: user!.nom })
    customerId = customer.id
    await db.abonnement.update({
      where: { userId: session.user.id },
      data: { stripeCustomerId: customerId },
    })
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.NEXTAUTH_URL}/abonnement/succes?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXTAUTH_URL}/abonnement/tarification`,
    allow_promotion_codes: true,
    metadata: { userId: session.user.id },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
