import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { db } from '@/lib/db'
import { exigerRoleOuRediriger } from '@/lib/garde'

export const metadata = { title: 'Messagerie — Entre Transporteurs' }

export default async function MessagesPage() {
  const u = await exigerRoleOuRediriger('TRANSPORTEUR', 'COMMISSIONNAIRE')

  const [conversations, nonLus] = await Promise.all([
    db.conversation.findMany({
      where: { participants: { some: { userId: u.id } } },
      include: {
        participants: { include: { user: { select: { id: true, nom: true, role: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { expediteur: { select: { id: true, nom: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    }),
    db.message.groupBy({
      by: ['conversationId'],
      where: { conversation: { participants: { some: { userId: u.id } } }, expediteurId: { not: u.id }, lu: false },
      _count: { _all: true },
    }),
  ])
  const nonLusParConv = new Map(nonLus.map((n) => [n.conversationId, n._count._all]))

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 py-4 border-b bg-white">
        <h1 className="text-xl font-bold">Messagerie</h1>
        <p className="text-sm text-slate-500">{conversations.length} conversation(s)</p>
      </div>

      {conversations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-3 p-6 text-center">
          <div className="text-5xl">💬</div>
          <p>Aucune conversation pour l'instant.</p>
          {u.role === 'COMMISSIONNAIRE' ? (
            <Link href="/commissionnaire/recherche" className="text-brand-600 underline text-sm">Trouver un transporteur →</Link>
          ) : (
            <Link href="/transporteur/annonces" className="text-brand-600 underline text-sm">Publier une disponibilité pour être contacté →</Link>
          )}
        </div>
      ) : (
        <div className="divide-y overflow-auto">
          {conversations.map((conv) => {
            const interlocuteur = conv.participants.find((p) => p.userId !== u.id)?.user
            const dernier = conv.messages[0]
            const nb = nonLusParConv.get(conv.id) ?? 0

            return (
              <Link key={conv.id} href={`/messages/${conv.id}`} className="flex items-center gap-4 px-4 sm:px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {interlocuteur?.nom[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-medium truncate ${nb > 0 ? 'text-slate-900' : 'text-slate-700'}`}>{interlocuteur?.nom}</span>
                    <span className="text-xs text-slate-400 shrink-0">{formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true, locale: fr })}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className={`text-sm truncate ${nb > 0 ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                      {dernier ? `${dernier.expediteur.id === u.id ? 'Vous : ' : ''}${dernier.contenu}` : 'Nouvelle conversation'}
                    </p>
                    {nb > 0 && (
                      <span className="ml-2 bg-brand-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">{nb}</span>
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
