import { db } from '@/lib/db'
import { alerteSchema } from '@/lib/validations/divers'
import { neutraliserJokers } from '@/lib/alertes'
import { ApiError, exigerAccesCommissionnaire, exigerUtilisateur, gerer, json, limiter, lireJson } from '@/lib/api'

const MAX_ALERTES = 10

// GET /api/alertes — mes alertes
export const GET = gerer(async () => {
  const u = await exigerUtilisateur('COMMISSIONNAIRE')
  return json(await db.alerte.findMany({ where: { userId: u.id }, orderBy: { createdAt: 'desc' }, take: MAX_ALERTES }))
})

// POST /api/alertes — être prévenu par e-mail d'une nouvelle disponibilité correspondante
export const POST = gerer(async (req) => {
  const u = await exigerAccesCommissionnaire()
  limiter(req, 'alertes', 20, 60 * 60_000, u.id)
  const data = await lireJson(req, alerteSchema)

  if ((await db.alerte.count({ where: { userId: u.id } })) >= MAX_ALERTES) {
    throw new ApiError(429, `Vous avez atteint la limite de ${MAX_ALERTES} alertes. Supprimez-en une pour en créer une nouvelle.`)
  }
  const alerte = await db.alerte.create({
    data: { ...data, userId: u.id, villeArrivee: data.villeArrivee ? neutraliserJokers(data.villeArrivee) || null : null },
  })
  return json(alerte, { status: 201 })
})
