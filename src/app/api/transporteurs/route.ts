import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { profilTransporteurSchema } from '@/lib/validations/profil'

// GET /api/transporteurs — liste tous les transporteurs actifs (pour la carte)
export async function GET() {
  const transporteurs = await db.transporteurProfil.findMany({
    include: {
      user: { select: { nom: true, email: true, telephone: true } },
      vehicules: { where: { actif: true } },
      _count: { select: { vehicules: true } },
    },
    where: {
      user: {
        abonnement: {
          OR: [
            { statut: 'ACTIVE' },
            { statut: 'TRIALING', dateFinEssai: { gt: new Date() } },
          ],
        },
      },
    },
  })
  return NextResponse.json(transporteurs)
}

// PUT /api/transporteurs — mettre à jour son propre profil transporteur
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (session.user.role !== 'TRANSPORTEUR') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  try {
    const body = await req.json()
    const data = profilTransporteurSchema.parse(body)

    const profil = await db.transporteurProfil.update({
      where: { userId: session.user.id },
      data,
    })
    return NextResponse.json(profil)
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'ZodError') {
      return NextResponse.json({ error: 'Données invalides', details: err }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
