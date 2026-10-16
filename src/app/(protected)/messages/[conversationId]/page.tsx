import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { exigerRoleOuRediriger } from '@/lib/garde'
import { getIO } from '@/lib/socket-server'
import { FilDiscussion } from '@/components/messagerie/FilDiscussion'

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params
  const u = await exigerRoleOuRediriger('TRANSPORTEUR', 'COMMISSIONNAIRE')

  // 404 (et non 403) pour une conversation dont on n'est pas participant : on ne révèle pas son existence
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, participants: { some: { userId: u.id } } },
    include: { participants: { include: { user: { select: { id: true, nom: true, role: true } } } } },
  })
  if (!conversation) notFound()

  // Les 200 derniers messages (ordre chronologique)
  const messages = (
    await db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { expediteur: { select: { id: true, nom: true, role: true } } },
    })
  ).reverse()

  const { count } = await db.message.updateMany({
    where: { conversationId, expediteurId: { not: u.id }, lu: false },
    data: { lu: true },
  })
  if (count > 0) getIO()?.to(`conv:${conversationId}`).emit('messages-read', { conversationId })

  const interlocuteur = conversation.participants.find((p) => p.userId !== u.id)?.user

  return (
    <FilDiscussion
      conversation={JSON.parse(JSON.stringify({ ...conversation, messages }))}
      currentUser={{ id: u.id, nom: u.nom }}
      interlocuteur={interlocuteur ? JSON.parse(JSON.stringify(interlocuteur)) : null}
    />
  )
}
