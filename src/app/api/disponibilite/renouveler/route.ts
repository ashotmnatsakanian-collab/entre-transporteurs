import { z } from 'zod'
import { db } from '@/lib/db'
import { consommerToken } from '@/lib/tokens'
import { finDisponibilite } from '@/lib/disponibilite'
import { diffuserChangementCarte } from '@/lib/position'
import { declencherAlertesDisponibilite } from '@/lib/alertes'
import { journaliser } from '@/lib/journal'
import { ipClient } from '@/lib/ip'
import { ApiError, exigerConformite, gerer, json, limiter, lireJson } from '@/lib/api'

// POST /api/disponibilite/renouveler — renouvellement en un clic depuis l'e-mail de rappel
// Public (le jeton à usage unique tient lieu d'authentification) ; appelé par un bouton de confirmation, jamais par un simple clic sur le lien.
export const POST = gerer(async (req) => {
  limiter(req, 'renouvellement', 20, 60 * 60_000)
  const { token } = await lireJson(req, z.object({ token: z.string().min(20).max(200) }))

  const userId = await consommerToken(token, 'RENOUVELER_DISPONIBILITE')
  if (!userId) throw new ApiError(400, 'Ce lien est invalide ou a déjà été utilisé.')

  const profil = await db.transporteurProfil.findUnique({
    where: { userId },
    select: { id: true, positionInsee: true, dureeDisponibiliteH: true, user: { select: { suspendu: true, supprimeLe: true } } },
  })
  if (!profil || profil.user.suspendu || profil.user.supprimeLe) throw new ApiError(400, 'Ce lien est invalide ou a déjà été utilisé.')
  if (!profil.positionInsee) throw new ApiError(400, "Indiquez d'abord où vous êtes.", { code: 'POSITION_REQUISE' })
  await exigerConformite(userId)

  const maintenant = new Date()
  const fin = finDisponibilite(profil.dureeDisponibiliteH, maintenant)
  await db.transporteurProfil.update({
    where: { id: profil.id },
    data: { disponible: true, disponibleJusqua: fin, rappelDispoEnvoyeLe: null, derniereMAJ: maintenant },
  })
  diffuserChangementCarte()
  void declencherAlertesDisponibilite(profil.id)
  await journaliser('disponibilite_renouvelee', { userId, ip: ipClient(req.headers) })
  return json({ disponibleJusqua: fin })
})
