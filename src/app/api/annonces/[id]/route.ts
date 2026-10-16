import { db } from '@/lib/db'
import { annoncePatchSchema } from '@/lib/validations/annonce'
import { ApiError, exigerUtilisateur, gerer, json, limiter, lireJson } from '@/lib/api'

async function annoncePropre(id: string, userId: string) {
  const annonce = await db.annonce.findUnique({ where: { id }, select: { id: true, transporteur: { select: { userId: true } } } })
  // 404 (et non 403) : on ne révèle pas l'existence d'une annonce d'autrui
  if (!annonce || annonce.transporteur.userId !== userId) throw new ApiError(404, 'Annonce introuvable')
  return annonce
}

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/annonces/[id] — marquer pourvue / réactiver sa propre annonce
export const PATCH = gerer<Ctx>(async (req, { params }) => {
  const { id } = await params
  const u = await exigerUtilisateur('TRANSPORTEUR')
  limiter(req, 'annonces-modif', 60, 60 * 60_000, u.id)
  await annoncePropre(id, u.id)
  const { active } = await lireJson(req, annoncePatchSchema)
  return json(await db.annonce.update({ where: { id }, data: { active } }))
})

// DELETE /api/annonces/[id]
export const DELETE = gerer<Ctx>(async (req, { params }) => {
  const { id } = await params
  const u = await exigerUtilisateur('TRANSPORTEUR')
  limiter(req, 'annonces-modif', 60, 60 * 60_000, u.id)
  await annoncePropre(id, u.id)
  await db.annonce.delete({ where: { id } })
  return json({ success: true })
})
