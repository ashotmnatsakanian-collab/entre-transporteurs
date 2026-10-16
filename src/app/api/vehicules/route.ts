import { db } from '@/lib/db'
import { vehiculeSchema } from '@/lib/validations/vehicule'
import { ApiError, exigerUtilisateur, gerer, json, limiter, lireJson } from '@/lib/api'

const MAX_VEHICULES = 50

async function profilDe(userId: string) {
  const profil = await db.transporteurProfil.findUnique({ where: { userId }, select: { id: true } })
  if (!profil) throw new ApiError(404, 'Profil introuvable')
  return profil
}

// GET /api/vehicules — véhicules du transporteur connecté
export const GET = gerer(async () => {
  const u = await exigerUtilisateur('TRANSPORTEUR')
  const profil = await profilDe(u.id)
  return json(await db.vehicule.findMany({ where: { transporteurId: profil.id }, orderBy: { createdAt: 'desc' }, take: MAX_VEHICULES }))
})

// POST /api/vehicules — ajouter un véhicule
export const POST = gerer(async (req) => {
  const u = await exigerUtilisateur('TRANSPORTEUR')
  limiter(req, 'vehicules', 60, 60 * 60_000, u.id)
  const profil = await profilDe(u.id)
  const data = await lireJson(req, vehiculeSchema)

  if ((await db.vehicule.count({ where: { transporteurId: profil.id } })) >= MAX_VEHICULES) {
    throw new ApiError(429, `Limite de ${MAX_VEHICULES} véhicules atteinte`)
  }
  return json(await db.vehicule.create({ data: { ...data, transporteurId: profil.id } }), { status: 201 })
})
