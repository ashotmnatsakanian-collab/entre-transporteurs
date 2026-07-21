import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export default async function MessagesPage() {
  const session = await getServerSession(authOptions)

  const conversations = await db.conversation.findMany({
    where: { participants: { some: { userId: session!.user.id } } },
    include: {
      participants: { include: { user: { select: { id: true, nom: true, role: true } } } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { expediteur: { select: { nom: true } } },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // Compter les non-lus par conversation
  const nonLusParConv = await Promise.all(
    conversations.map((c) =>
      db.message.count({
        where: { conversationId: c.id, expediteurId: { not: session!.user.id }, lu: false },
      })
    )
  )

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b bg-white">
        <h1 className="text-xl font-bold">Messagerie</h1>
        <p className="text-sm text-slate-500">{conversations.length} conversation(s)</p>
      </div>

      {conversations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-3">
          <div className="text-5xl">💬</div>
          <p>Aucune conversation pour l'instant.</p>
          <Link href="/commissionnaire/recherche" className="text-brand-600 underline text-sm">
            Chercher un transporteur →
          </Link>
        </div>
      ) : (
        <div className="divide-y overflow-auto">
          {conversations.map((conv, i) => {
            const interlocuteur = conv.participants.find((p) => p.userId !== session!.user.id)?.user
            const dernierMessage = conv.messages[0]
            const nonLus = nonLusParConv[i]

            return (
              <Link key={conv.id} href={`/messages/${conv.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {interlocuteur?.nom[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${nonLus > 0 ? 'text-slate-900' : 'text-slate-700'}`}>
                      {interlocuteur?.nom}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className={`text-sm truncate ${nonLus > 0 ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                      {dernierMessage ? `${dernierMessage.expediteur.nom === interlocuteur?.nom ? '' : 'Vous : '}${dernierMessage.contenu}` : 'Nouvelle conversation'}
                    </p>
                    {nonLus > 0 && (
                      <span className="ml-2 bg-brand-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                        {nonLus}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
