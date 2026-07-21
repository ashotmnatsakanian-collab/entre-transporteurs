import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

async function participantValide(conversationId: string, userId: string): Promise<boolean> {
  const p = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  })
  return !!p
}

// GET /api/messages/:conversationId — historique d'une conversation
export async function GET(
  _req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  if (!(await participantValide(params.conversationId, session.user.id))) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const messages = await db.message.findMany({
    where: { conversationId: params.conversationId },
    include: { expediteur: { select: { id: true, nom: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(messages)
}
