import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { vehiculeSchema } from '@/lib/validations/vehicule'

// GET /api/vehicules — liste les véhicules du transporteur connecté
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (session.user.role !== 'TRANSPORTEUR') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const profil = await db.transporteurProfil.findUnique({ where: { userId: session.user.id } })
  if (!profil) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

  const vehicules = await db.vehicule.findMany({
    where: { transporteurId: profil.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(vehicules)
}

// POST /api/vehicules — ajouter un véhicule
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (session.user.role !== 'TRANSPORTEUR') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  try {
    const body = await req.json()
    const data = vehiculeSchema.parse(body)

    const profil = await db.transporteurProfil.findUnique({ where: { userId: session.user.id } })
    if (!profil) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

    const vehicule = await db.vehicule.create({
      data: { ...data, transporteurId: profil.id },
    })
    return NextResponse.json(vehicule, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'ZodError') {
      return NextResponse.json({ error: 'Données invalides', details: err }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
