import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { stripe } from '@/lib/stripe'

// POST /api/stripe/portal — créer une session Stripe Billing Portal
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const abo = await db.abonnement.findUnique({ where: { userId: session.user.id } })
  if (!abo?.stripeCustomerId) {
    return NextResponse.json({ error: 'Aucun abonnement Stripe trouvé' }, { status: 404 })
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: abo.stripeCustomerId,
    return_url: `${process.env.NEXTAUTH_URL}/transporteur`,
  })

  return NextResponse.json({ url: portalSession.url })
}
