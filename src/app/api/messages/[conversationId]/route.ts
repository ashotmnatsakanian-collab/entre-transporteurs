import { db } from '@/lib/db'
import { ApiError, exigerUtilisateur, gerer, json } from '@/lib/api'

// GET /api/messages/:conversationId — derniers messages d'une conversation
export const GET = gerer<{ params: Promise<{ conversationId: string }> }>(async (_req, { params }) => {
  const { conversationId } = await params
  const u = await exigerUtilisateur('TRANSPORTEUR', 'COMMISSIONNAIRE')

  const participant = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: u.id } },
    select: { id: true },
  })
  if (!participant) throw new ApiError(404, 'Conversation introuvable')

  const messages = await db.message.findMany({
    where: { conversationId },
    include: { expediteur: { select: { id: true, nom: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return json(messages.reverse())
})
