import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { vehiculeSchema } from '@/lib/validations/vehicule'

async function vehiculeAppartient(vehiculeId: string, userId: string): Promise<boolean> {
  const v = await db.vehicule.findFirst({
    where: { id: vehiculeId, transporteur: { userId } },
  })
  return !!v
}

// GET /api/vehicules/:id
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (!(await vehiculeAppartient(params.id, session.user.id))) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }
  const vehicule = await db.vehicule.findUnique({ where: { id: params.id } })
  return NextResponse.json(vehicule)
}

// PUT /api/vehicules/:id
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (!(await vehiculeAppartient(params.id, session.user.id))) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  try {
    const body = await req.json()
    const data = vehiculeSchema.parse(body)
    const vehicule = await db.vehicule.update({ where: { id: params.id }, data })
    return NextResponse.json(vehicule)
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'ZodError') {
      return NextResponse.json({ error: 'Données invalides', details: err }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/vehicules/:id
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (!(await vehiculeAppartient(params.id, session.user.id))) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }
  await db.vehicule.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
