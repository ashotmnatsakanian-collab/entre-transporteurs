import { db } from '@/lib/db'
import { ApiError, exigerUtilisateur, gerer, json } from '@/lib/api'

export const DELETE = gerer<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const { id } = await params
  const u = await exigerUtilisateur('COMMISSIONNAIRE')
  const { count } = await db.alerte.deleteMany({ where: { id, userId: u.id } })
  if (count === 0) throw new ApiError(404, 'Alerte introuvable')
  return json({ success: true })
})
