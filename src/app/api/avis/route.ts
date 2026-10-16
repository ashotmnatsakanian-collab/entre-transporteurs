import { z } from 'zod'
import { db } from '@/lib/db'
import { avisSchema } from '@/lib/validations/avis'
import { paireCle } from '@/lib/conversations'
import { ApiError, exigerAccesCommissionnaire, exigerEmailVerifie, gerer, json, limiter, lireJson, lireQuery } from '@/lib/api'

// "François Leroy" -> "François L." : on n'affiche pas le nom complet d'un auteur d'avis
function nomAbrege(nom: string): string {
  const [prenom, ...reste] = nom.trim().split(/\s+/)
  return reste.length > 0 ? `${prenom} ${reste[reste.length - 1][0].toUpperCase()}.` : prenom
}

// GET /api/avis?transporteurId= — avis et moyenne d'un transporteur
export const GET = gerer(async (req) => {
  await exigerAccesCommissionnaire()
  const { transporteurId } = lireQuery(req, z.object({ transporteurId: z.string().min(1).max(40) }))

  const [avis, agregat] = await Promise.all([
    db.avis.findMany({
      where: { transporteurId },
      include: { auteur: { select: { nom: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    db.avis.aggregate({ where: { transporteurId }, _avg: { note: true }, _count: true }),
  ])

  return json({
    avis: avis.map((a) => ({ id: a.id, note: a.note, commentaire: a.commentaire, createdAt: a.createdAt, auteur: { nom: nomAbrege(a.auteur.nom) } })),
    moyenne: agregat._avg.note ?? null,
    total: agregat._count,
  })
})

// POST /api/avis — noter un transporteur
// Condition anti-faux avis : une vraie conversation avec échange dans les deux sens.
export const POST = gerer(async (req) => {
  const u = await exigerAccesCommissionnaire()
  exigerEmailVerifie(u)
  limiter(req, 'avis', 10, 60 * 60_000, u.id)
  const data = await lireJson(req, avisSchema)

  const profil = await db.transporteurProfil.findUnique({ where: { id: data.transporteurId }, select: { userId: true } })
  if (!profil) throw new ApiError(404, 'Transporteur introuvable')

  const conv = await db.conversation.findUnique({
    where: { cle: paireCle(u.id, profil.userId) },
    select: { messages: { where: { expediteurId: { in: [u.id, profil.userId] } }, select: { expediteurId: true }, distinct: ['expediteurId'] } },
  })
  if (!conv || conv.messages.length < 2) {
    throw new ApiError(403, "Vous pouvez noter ce transporteur une fois qu'il vous a répondu.")
  }

  const avis = await db.avis.upsert({
    where: { auteurId_transporteurId: { auteurId: u.id, transporteurId: data.transporteurId } },
    update: { note: data.note, commentaire: data.commentaire ?? null },
    create: { auteurId: u.id, transporteurId: data.transporteurId, note: data.note, commentaire: data.commentaire ?? null },
  })
  return json({ id: avis.id }, { status: 201 })
})
