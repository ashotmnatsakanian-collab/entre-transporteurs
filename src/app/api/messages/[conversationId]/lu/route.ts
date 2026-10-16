import { db } from '@/lib/db'
import { getIO } from '@/lib/socket-server'
import { ApiError, exigerUtilisateur, gerer, json } from '@/lib/api'

// PATCH /api/messages/:conversationId/lu — marquer les messages reçus comme lus
export const PATCH = gerer<{ params: Promise<{ conversationId: string }> }>(async (_req, { params }) => {
  const { conversationId } = await params
  const u = await exigerUtilisateur('TRANSPORTEUR', 'COMMISSIONNAIRE')

  const participant = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: u.id } },
    select: { id: true },
  })
  if (!participant) throw new ApiError(404, 'Conversation introuvable')

  const { count } = await db.message.updateMany({
    where: { conversationId, expediteurId: { not: u.id }, lu: false },
    data: { lu: true },
  })
  // Prévenir l'expéditeur en direct (indicateur "· Lu")
  if (count > 0) getIO()?.to(`conv:${conversationId}`).emit('messages-read', { conversationId })

  return json({ success: true })
})
