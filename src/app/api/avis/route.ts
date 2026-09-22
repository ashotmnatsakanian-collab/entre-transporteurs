import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { avisSchema } from '@/lib/validations/avis'

// GET /api/avis?transporteurId= — liste des avis + moyenne pour un transporteur
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const transporteurId = new URL(req.url).searchParams.get('transporteurId')
  if (!transporteurId) return NextResponse.json({ error: 'transporteurId requis' }, { status: 400 })

  const [avis, agregat] = await Promise.all([
    db.avis.findMany({
      where: { transporteurId },
      include: { auteur: { select: { nom: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    db.avis.aggregate({ where: { transporteurId }, _avg: { note: true }, _count: true }),
  ])

  return NextResponse.json({
    avis,
    moyenne: agregat._avg.note ?? null,
    total: agregat._count,
  })
}

// POST /api/avis — publier ou mettre à jour son propre avis sur un transporteur
// Réservé aux commissionnaires ayant déjà échangé avec ce transporteur (anti-faux avis)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (session.user.role !== 'COMMISSIONNAIRE') {
    return NextResponse.json({ error: 'Seuls les commissionnaires peuvent laisser un avis' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = avisSchema.parse(body)

    const profil = await db.transporteurProfil.findUnique({ where: { id: data.transporteurId } })
    if (!profil) return NextResponse.json({ error: 'Transporteur introuvable' }, { status: 404 })

    const dejaEchange = await db.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: session.user.id } } },
          { participants: { some: { userId: profil.userId } } },
        ],
      },
    })
    if (!dejaEchange) {
      return NextResponse.json({ error: 'Vous devez avoir échangé avec ce transporteur pour le noter' }, { status: 403 })
    }

    const avis = await db.avis.upsert({
      where: { auteurId_transporteurId: { auteurId: session.user.id, transporteurId: data.transporteurId } },
      update: { note: data.note, commentaire: data.commentaire ?? null },
      create: {
        auteurId: session.user.id,
        transporteurId: data.transporteurId,
        note: data.note,
        commentaire: data.commentaire ?? null,
      },
    })
    return NextResponse.json(avis, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'ZodError') {
      return NextResponse.json({ error: 'Données invalides', details: err }, { status: 400 })
    }
    console.error('[avis POST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
