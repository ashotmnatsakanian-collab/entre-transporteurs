import { db } from '@/lib/db'
import { messageCreationSchema } from '@/lib/validations/divers'
import { trouverOuCreerConversation } from '@/lib/conversations'
import { aAccesPayant } from '@/lib/acces'
import { ApiError, exigerEmailVerifie, exigerUtilisateur, gerer, json, limiter, lireJson } from '@/lib/api'

// GET /api/messages — mes conversations (avec le nombre de messages non lus)
export const GET = gerer(async () => {
  const u = await exigerUtilisateur('TRANSPORTEUR', 'COMMISSIONNAIRE')

  const [conversations, nonLus] = await Promise.all([
    db.conversation.findMany({
      where: { participants: { some: { userId: u.id } } },
      include: {
        participants: { include: { user: { select: { id: true, nom: true, role: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { expediteur: { select: { nom: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    }),
    // Une seule requête pour tous les compteurs (au lieu d'une par conversation)
    db.message.groupBy({
      by: ['conversationId'],
      where: { conversation: { participants: { some: { userId: u.id } } }, expediteurId: { not: u.id }, lu: false },
      _count: { _all: true },
    }),
  ])

  const parConv = new Map(nonLus.map((n) => [n.conversationId, n._count._all]))
  return json(conversations.map((c) => ({ ...c, nonLus: parConv.get(c.id) ?? 0 })))
})

// POST /api/messages — ouvrir (ou retrouver) la conversation avec un autre utilisateur
export const POST = gerer(async (req) => {
  const u = await exigerUtilisateur('TRANSPORTEUR', 'COMMISSIONNAIRE')
  exigerEmailVerifie(u)
  limiter(req, 'conversations', 30, 60 * 60_000, u.id)
  const { destinataireId, premierMessage } = await lireJson(req, messageCreationSchema)

  if (destinataireId === u.id) throw new ApiError(400, 'Impossible de se contacter soi-même')
  if (u.role === 'COMMISSIONNAIRE' && !(await aAccesPayant(u.id))) {
    throw new ApiError(402, 'Abonnement requis', { code: 'ABONNEMENT_REQUIS' })
  }

  // Les échanges se font uniquement entre un transporteur et un commissionnaire
  const dest = await db.user.findUnique({ where: { id: destinataireId }, select: { id: true, role: true, suspendu: true, supprimeLe: true } })
  if (!dest || dest.suspendu || dest.supprimeLe || dest.role === 'ADMIN' || dest.role === u.role) {
    throw new ApiError(404, 'Destinataire introuvable')
  }

  const conv = await trouverOuCreerConversation(
    u.id,
    dest.id,
    premierMessage ? { expediteurId: u.id, contenu: premierMessage } : undefined
  )
  return json({ id: conv.id }, { status: conv.creee ? 201 : 200 })
})
