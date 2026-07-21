import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getIO } from '@/lib/socket-server'

// PATCH /api/transporteurs/disponibilite
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (session.user.role !== 'TRANSPORTEUR') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { disponible } = await req.json() as { disponible: boolean }

  const profil = await db.transporteurProfil.update({
    where: { userId: session.user.id },
    data: { disponible, derniereMAJ: new Date() },
  })

  // Diffuser en temps réel à tous les clients de la carte
  const io = getIO()
  if (io) {
    io.emit('disponibilite-change', { userId: session.user.id, disponible })
  }

  return NextResponse.json({ disponible: profil.disponible })
}
