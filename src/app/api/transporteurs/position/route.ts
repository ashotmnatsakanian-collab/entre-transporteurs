import { db } from '@/lib/db'
import { positionSchema } from '@/lib/validations/position'
import { finDisponibilite, DUREE_PAR_DEFAUT_H } from '@/lib/disponibilite'
import { diffuserChangementCarte, etatPosition } from '@/lib/position'
import { declencherAlertesDisponibilite } from '@/lib/alertes'
import { ApiError, communeOuErreur, exigerConformite, exigerEmailVerifie, exigerUtilisateur, gerer, json, limiter, lireJson } from '@/lib/api'

// GET /api/transporteurs/position — ma position et ma disponibilité
export const GET = gerer(async () => {
  const u = await exigerUtilisateur('TRANSPORTEUR')
  const profil = await db.transporteurProfil.findUnique({ where: { userId: u.id } })
  if (!profil) throw new ApiError(404, 'Profil transporteur introuvable')
  return json(etatPosition(profil))
})

// POST /api/transporteurs/position — « Où êtes-vous maintenant ? »
// Le navigateur n'envoie que le code INSEE de la commune : le serveur retrouve lui-même son centre, son département et sa région.
// Aucune coordonnée GPS n'est reçue ni enregistrée.
export const POST = gerer(async (req) => {
  const u = await exigerUtilisateur('TRANSPORTEUR')
  limiter(req, 'position', 60, 60 * 60_000, u.id)
  const data = await lireJson(req, positionSchema)
  // Se déclarer disponible = se rendre visible : e-mail confirmé et documents validés
  if (data.disponible) {
    exigerEmailVerifie(u)
    await exigerConformite(u.id)
  }

  const commune = await communeOuErreur(data.insee)
  const avant = await db.transporteurProfil.findUnique({ where: { userId: u.id }, select: { id: true, dureeDisponibiliteH: true } })
  if (!avant) throw new ApiError(404, 'Profil transporteur introuvable')

  const maintenant = new Date()
  const heures = data.dureeHeures ?? avant.dureeDisponibiliteH ?? DUREE_PAR_DEFAUT_H
  const profil = await db.transporteurProfil.update({
    where: { id: avant.id },
    data: {
      latitude: commune.latitude,
      longitude: commune.longitude,
      positionVille: commune.nom,
      positionInsee: commune.insee,
      positionDepartement: commune.departement,
      positionRegion: commune.region,
      derniereMAJ: maintenant,
      ...(data.disponible
        ? { disponible: true, disponibleJusqua: finDisponibilite(heures, maintenant), dureeDisponibiliteH: heures, rappelDispoEnvoyeLe: null }
        : { disponible: false, disponibleJusqua: null }),
    },
  })

  diffuserChangementCarte()
  if (data.disponible) void declencherAlertesDisponibilite(profil.id)
  return json(etatPosition(profil))
})
