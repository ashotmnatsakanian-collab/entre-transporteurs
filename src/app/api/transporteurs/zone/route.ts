import { db } from '@/lib/db'
import { zoneSchema } from '@/lib/validations/position'
import { communeOuErreur, ApiError, exigerUtilisateur, gerer, json, limiter, lireJson } from '@/lib/api'
import { etatPosition } from '@/lib/position'

// PUT /api/transporteurs/zone — zone d'intervention : rayon autour de ma position, départements acceptés, destination souhaitée
export const PUT = gerer(async (req) => {
  const u = await exigerUtilisateur('TRANSPORTEUR')
  limiter(req, 'zone', 60, 60 * 60_000, u.id)
  const data = await lireJson(req, zoneSchema)

  // La destination souhaitée est retrouvée auprès de l'API officielle comme la position (jamais fournie par le client)
  const destination = data.destinationInsee ? await communeOuErreur(data.destinationInsee) : null
  const profil = await db.transporteurProfil
    .update({
      where: { userId: u.id },
      data: {
        rayonInterventionKm: data.rayonInterventionKm,
        zonesCirculation: [...new Set(data.departements)],
        destinationVille: destination?.nom ?? null,
        destinationInsee: destination?.insee ?? null,
        destinationDepartement: destination?.departement ?? null,
      },
    })
    .catch(() => null)
  if (!profil) throw new ApiError(404, 'Profil transporteur introuvable')
  return json(etatPosition(profil))
})
