import { db } from '@/lib/db'
import { disponibiliteSchema } from '@/lib/validations/position'
import { finDisponibilite } from '@/lib/disponibilite'
import { diffuserChangementCarte, etatPosition } from '@/lib/position'
import { declencherAlertesDisponibilite } from '@/lib/alertes'
import { ApiError, exigerConformite, exigerEmailVerifie, exigerUtilisateur, gerer, json, limiter, lireJson } from '@/lib/api'

// PATCH /api/transporteurs/disponibilite — « disponible maintenant » (expire automatiquement, durée réglable)
export const PATCH = gerer(async (req) => {
  const u = await exigerUtilisateur('TRANSPORTEUR')
  limiter(req, 'disponibilite', 60, 60 * 60_000, u.id)
  const data = await lireJson(req, disponibiliteSchema)

  const avant = await db.transporteurProfil.findUnique({ where: { userId: u.id }, select: { id: true, positionInsee: true, dureeDisponibiliteH: true } })
  if (!avant) throw new ApiError(404, 'Profil transporteur introuvable')

  const maintenant = new Date()
  let donnees
  if (data.disponible) {
    // Se déclarer disponible exige une position, un e-mail confirmé et des documents validés ; se déclarer indisponible reste toujours possible
    if (!avant.positionInsee) throw new ApiError(400, "Indiquez d'abord où vous êtes.", { code: 'POSITION_REQUISE' })
    exigerEmailVerifie(u)
    await exigerConformite(u.id)
    const heures = data.dureeHeures ?? avant.dureeDisponibiliteH
    donnees = { disponible: true, disponibleJusqua: finDisponibilite(heures, maintenant), dureeDisponibiliteH: heures, rappelDispoEnvoyeLe: null, derniereMAJ: maintenant }
  } else {
    donnees = { disponible: false, disponibleJusqua: null, derniereMAJ: maintenant }
  }

  const profil = await db.transporteurProfil.update({ where: { id: avant.id }, data: donnees })
  diffuserChangementCarte()
  if (data.disponible) void declencherAlertesDisponibilite(profil.id)
  return json(etatPosition(profil))
})
