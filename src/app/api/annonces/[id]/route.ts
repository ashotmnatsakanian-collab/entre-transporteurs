import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

async function trouverAnnoncePropre(id: string, userId: string) {
  const annonce = await db.annonce.findUnique({
    where: { id },
    include: { transporteur: { select: { userId: true } } },
  })
  if (!annonce || annonce.transporteur.userId !== userId) return null
  return annonce
}

// PATCH /api/annonces/[id] — activer/désactiver (ex: trajet pourvu) sa propre annonce
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const annonce = await trouverAnnoncePropre(params.id, session.user.id)
  if (!annonce) return NextResponse.json({ error: 'Annonce introuvable' }, { status: 404 })

  const body = await req.json() as { active?: boolean }
  const maj = await db.annonce.update({
    where: { id: params.id },
    data: { ...(typeof body.active === 'boolean' && { active: body.active }) },
  })
  return NextResponse.json(maj)
}

// DELETE /api/annonces/[id] — supprimer sa propre annonce
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const annonce = await trouverAnnoncePropre(params.id, session.user.id)
  if (!annonce) return NextResponse.json({ error: 'Annonce introuvable' }, { status: 404 })

  await db.annonce.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
