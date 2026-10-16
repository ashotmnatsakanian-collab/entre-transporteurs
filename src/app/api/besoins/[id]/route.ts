import { db } from '@/lib/db'
import { annoncePatchSchema } from '@/lib/validations/annonce'
import { ApiError, exigerUtilisateur, gerer, json, limiter, lireJson } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

async function besoinPropre(id: string, userId: string) {
  const b = await db.besoin.findUnique({ where: { id }, select: { id: true, commissionnaire: { select: { userId: true } } } })
  if (!b || b.commissionnaire.userId !== userId) throw new ApiError(404, 'Besoin introuvable')
}

export const PATCH = gerer<Ctx>(async (req, { params }) => {
  const { id } = await params
  const u = await exigerUtilisateur('COMMISSIONNAIRE')
  limiter(req, 'besoins-modif', 60, 60 * 60_000, u.id)
  await besoinPropre(id, u.id)
  const { active } = await lireJson(req, annoncePatchSchema)
  return json(await db.besoin.update({ where: { id }, data: { active } }))
})

export const DELETE = gerer<Ctx>(async (req, { params }) => {
  const { id } = await params
  const u = await exigerUtilisateur('COMMISSIONNAIRE')
  limiter(req, 'besoins-modif', 60, 60 * 60_000, u.id)
  await besoinPropre(id, u.id)
  await db.besoin.delete({ where: { id } })
  return json({ success: true })
})
