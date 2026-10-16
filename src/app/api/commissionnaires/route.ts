import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { profilCommissionnaireSchema } from '@/lib/validations/profil'

// PUT /api/commissionnaires — mettre à jour son propre profil commissionnaire
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (session.user.role !== 'COMMISSIONNAIRE') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  try {
    const body = await req.json()
    const data = profilCommissionnaireSchema.parse(body)

    const profil = await db.commissionnaireProfil.update({
      where: { userId: session.user.id },
      data,
    })
    return NextResponse.json(profil)
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'ZodError') {
      return NextResponse.json({ error: 'Données invalides (le SIRET doit comporter 14 chiffres)', details: err }, { status: 400 })
    }
    console.error('[commissionnaires PUT]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
