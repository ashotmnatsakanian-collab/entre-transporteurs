import { db } from '@/lib/db'
import { rechercheSchema } from '@/lib/validations/recherche'
import { rechercherParRayon } from '@/lib/geo'
import { exigerAccesCommissionnaire, gerer, json, limiter, lireJson } from '@/lib/api'

// POST /api/recherche — recherche géolocalisée de transporteurs (commissionnaire avec accès)
export const POST = gerer(async (req) => {
  const u = await exigerAccesCommissionnaire()
  limiter(req, 'recherche', 120, 60_000, u.id)
  const filtres = await lireJson(req, rechercheSchema)

  const transporteurs = await rechercherParRayon(filtres.lat, filtres.lng, filtres.rayonKm, filtres.disponibleSeulement)
  if (transporteurs.length === 0) return json([])

  const vehicules = await db.vehicule.findMany({
    where: {
      transporteurId: { in: transporteurs.map((t) => t.id) },
      actif: true,
      ...(filtres.typeVehicule && { type: filtres.typeVehicule }),
      ...(filtres.chargeUtileMin && { chargeUtile: { gte: filtres.chargeUtileMin } }),
      ...(filtres.longueurMin && { longueur: { gte: filtres.longueurMin } }),
      ...(filtres.largeurMin && { largeur: { gte: filtres.largeurMin } }),
      ...(filtres.specificites.length > 0 && { specificites: { hasEvery: filtres.specificites } }),
    },
  })

  const idsAvecVehicule = new Set(vehicules.map((v) => v.transporteurId))
  return json(
    transporteurs
      .filter((t) => idsAvecVehicule.has(t.id))
      .map((t) => ({ ...t, vehicules: vehicules.filter((v) => v.transporteurId === t.id) }))
  )
})
