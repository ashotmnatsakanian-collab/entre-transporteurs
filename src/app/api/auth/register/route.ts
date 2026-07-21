import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { db } from '@/lib/db'
import { creerClientStripe } from '@/lib/stripe'
import { inscriptionSchema } from '@/lib/validations/profil'
import { addDays } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = inscriptionSchema.parse(body)

    const existant = await db.user.findUnique({ where: { email: data.email.toLowerCase() } })
    if (existant) {
      return NextResponse.json({ error: 'Un compte existe déjà avec cet email' }, { status: 409 })
    }

    const passwordHash = await hash(data.password, 12)

    // Créer le client Stripe (sans subscription — trial local de 30 jours)
    let stripeCustomerId: string | undefined
    try {
      stripeCustomerId = await creerClientStripe(data.email.toLowerCase(), data.nom)
    } catch {
      // Stripe non configuré en dev — on continue sans
    }

    const user = await db.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: passwordHash,
        nom: data.nom,
        telephone: data.telephone,
        role: data.role,
        abonnement: {
          create: {
            statut: 'TRIALING',
            dateFinEssai: addDays(new Date(), 30),
            stripeCustomerId: stripeCustomerId ?? null,
          },
        },
      },
    })

    // Créer le profil métier vide — l'utilisateur le complètera dans son dashboard
    if (data.role === 'TRANSPORTEUR') {
      await db.transporteurProfil.create({
        data: {
          userId: user.id,
          siret: '',
          raisonSociale: data.nom,
          latitude: 46.6034, // Centre France par défaut
          longitude: 1.8883,
        },
      })
    } else {
      await db.commissionnaireProfil.create({
        data: { userId: user.id, siret: '', raisonSociale: data.nom },
      })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'ZodError') {
      return NextResponse.json({ error: 'Données invalides', details: err }, { status: 400 })
    }
    console.error('[register]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
