import { db } from '@/lib/db'
import { vehiculeSchema } from '@/lib/validations/vehicule'
import { ApiError, exigerUtilisateur, gerer, json, limiter, lireJson } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

async function vehiculePropre(id: string, userId: string) {
  const v = await db.vehicule.findFirst({ where: { id, transporteur: { userId } } })
  if (!v) throw new ApiError(404, 'Véhicule introuvable')
  return v
}

export const GET = gerer<Ctx>(async (_req, { params }) => {
  const { id } = await params
  const u = await exigerUtilisateur('TRANSPORTEUR')
  return json(await vehiculePropre(id, u.id))
})

export const PUT = gerer<Ctx>(async (req, { params }) => {
  const { id } = await params
  const u = await exigerUtilisateur('TRANSPORTEUR')
  limiter(req, 'vehicules', 60, 60 * 60_000, u.id)
  await vehiculePropre(id, u.id)
  const data = await lireJson(req, vehiculeSchema)
  return json(await db.vehicule.update({ where: { id }, data }))
})

export const DELETE = gerer<Ctx>(async (_req, { params }) => {
  const { id } = await params
  const u = await exigerUtilisateur('TRANSPORTEUR')
  await vehiculePropre(id, u.id)
  await db.vehicule.delete({ where: { id } })
  return json({ success: true })
})
