import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/transporteurs/:id — profil public d'un transporteur
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const profil = await db.transporteurProfil.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { nom: true, email: true, telephone: true, createdAt: true } },
      vehicules: { where: { actif: true }, orderBy: { type: 'asc' } },
    },
  })

  if (!profil) return NextResponse.json({ error: 'Transporteur introuvable' }, { status: 404 })

  return NextResponse.json(profil)
}
