import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// PATCH /api/messages/:conversationId/lu — marquer les messages reçus comme lus
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const participant = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: params.conversationId, userId: session.user.id } },
  })
  if (!participant) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  await db.message.updateMany({
    where: {
      conversationId: params.conversationId,
      expediteurId: { not: session.user.id },
      lu: false,
    },
    data: { lu: true },
  })

  return NextResponse.json({ success: true })
}
