import { db } from '@/lib/db'
import { profilCommissionnaireSchema } from '@/lib/validations/profil'
import { appliquerVerificationSiret, messageStatutSiret } from '@/lib/profils'
import { ApiError, exigerUtilisateur, gerer, json, limiter, lireJson } from '@/lib/api'

// PUT /api/commissionnaires — mettre à jour son profil (et vérifier le SIRET auprès de l'État)
export const PUT = gerer(async (req) => {
  const u = await exigerUtilisateur('COMMISSIONNAIRE')
  limiter(req, 'profil', 30, 60 * 60_000, u.id)
  const data = await lireJson(req, profilCommissionnaireSchema)

  const avant = await db.commissionnaireProfil.findUnique({ where: { userId: u.id }, select: { siret: true, siretVerifieLe: true } })
  if (!avant) throw new ApiError(404, 'Profil introuvable')

  await db.commissionnaireProfil.update({ where: { userId: u.id }, data })

  const dejaVerifie = !!avant.siretVerifieLe && avant.siret === data.siret
  const statut = dejaVerifie ? 'ACTIF' : await appliquerVerificationSiret(u.id, 'COMMISSIONNAIRE', data.siret, avant.siret || null)

  return json({ success: true, verificationSiret: statut, avertissement: messageStatutSiret(statut) })
})
