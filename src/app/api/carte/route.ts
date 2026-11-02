import { compterDisponiblesParDepartement } from '@/lib/geo'
import { departement } from '@/lib/referentiel-geo'
import { exigerAccesCommissionnaire, gerer, json, limiter } from '@/lib/api'

// GET /api/carte — transporteurs disponibles maintenant, regroupés par département (commissionnaire avec accès)
// Aucune position individuelle : uniquement des compteurs par zone ; la liste s'obtient ensuite par une recherche sur le département.
export const GET = gerer(async (req) => {
  const u = await exigerAccesCommissionnaire()
  limiter(req, 'carte', 120, 60_000, u.id)

  const lignes = await compterDisponiblesParDepartement()
  const zones = lignes
    .map((l) => {
      const d = departement(l.code)
      return d ? { code: d.code, nom: d.nom, region: d.region, latitude: d.latitude, longitude: d.longitude, nb: l.nb } : null
    })
    .filter((z): z is NonNullable<typeof z> => z !== null)
    .sort((a, b) => b.nb - a.nb)
  return json({ total: zones.reduce((n, z) => n + z.nb, 0), zones })
})
