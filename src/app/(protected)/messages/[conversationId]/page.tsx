import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { exigerRoleOuRediriger } from '@/lib/garde'
import { getIO } from '@/lib/socket-server'
import { FilDiscussion } from '@/components/messagerie/FilDiscussion'
import { PanneauDocumentsInterlocuteur } from '@/components/documents/PanneauDocumentsInterlocuteur'

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

  // Documents légaux de l'interlocuteur : statut toujours visible, fichiers seulement s'il en a autorisé le partage
  const autre = interlocuteur ? await db.user.findUnique({ where: { id: interlocuteur.id }, select: { partageDocuments: true, documents: { select: { id: true, type: true, statut: true, dateExpiration: true } } } }) : null

  return (
    <div className="flex flex-col h-full">
      {interlocuteur && autre && (
        <PanneauDocumentsInterlocuteur nom={interlocuteur.nom} role={interlocuteur.role} documents={autre.documents} peutTelecharger={autre.partageDocuments} />
      )}
      <div className="flex-1 min-h-0">
        <FilDiscussion
          conversation={JSON.parse(JSON.stringify({ ...conversation, messages }))}
          currentUser={{ id: u.id, nom: u.nom }}
          interlocuteur={interlocuteur ? JSON.parse(JSON.stringify(interlocuteur)) : null}
        />
      </div>
    </div>
  )
}
