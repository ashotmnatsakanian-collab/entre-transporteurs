import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { FilDiscussion } from '@/components/messagerie/FilDiscussion'

export default async function ConversationPage({ params }: { params: { conversationId: string } }) {
  const session = await getServerSession(authOptions)

  const conversation = await db.conversation.findFirst({
    where: {
      id: params.conversationId,
      participants: { some: { userId: session!.user.id } },
    },
    include: {
      participants: { include: { user: { select: { id: true, nom: true, role: true } } } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { expediteur: { select: { id: true, nom: true, role: true } } },
      },
    },
  })

  if (!conversation) notFound()

  // Marquer les messages reçus comme lus
  await db.message.updateMany({
    where: { conversationId: conversation.id, expediteurId: { not: session!.user.id }, lu: false },
    data: { lu: true },
  })

  const interlocuteur = conversation.participants.find((p) => p.userId !== session!.user.id)?.user

  return (
    <FilDiscussion
      conversation={JSON.parse(JSON.stringify(conversation))}
      currentUser={{ id: session!.user.id, nom: session!.user.nom }}
      interlocuteur={interlocuteur ? JSON.parse(JSON.stringify(interlocuteur)) : null}
    />
  )
}
