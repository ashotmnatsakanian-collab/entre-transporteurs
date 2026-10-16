import { db } from '@/lib/db'
import { profilTransporteurSchema } from '@/lib/validations/profil'
import { appliquerVerificationSiret, messageStatutSiret } from '@/lib/profils'
import { ApiError, exigerUtilisateur, gerer, json, limiter, lireJson } from '@/lib/api'

// PUT /api/transporteurs — mettre à jour son propre profil (et vérifier le SIRET auprès de l'État)
export const PUT = gerer(async (req) => {
  const u = await exigerUtilisateur('TRANSPORTEUR')
  limiter(req, 'profil', 30, 60 * 60_000, u.id)
  const data = await lireJson(req, profilTransporteurSchema)

  const avant = await db.transporteurProfil.findUnique({ where: { userId: u.id }, select: { siret: true, siretVerifieLe: true } })
  if (!avant) throw new ApiError(404, 'Profil introuvable')

  await db.transporteurProfil.update({ where: { userId: u.id }, data })

  // Déjà vérifié et SIRET inchangé : inutile de re-solliciter l'API
  const dejaVerifie = !!avant.siretVerifieLe && avant.siret === data.siret
  const statut = dejaVerifie ? 'ACTIF' : await appliquerVerificationSiret(u.id, 'TRANSPORTEUR', data.siret, avant.siret || null)

  return json({ success: true, verificationSiret: statut, avertissement: messageStatutSiret(statut) })
})
