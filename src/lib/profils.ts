import { db } from './db'
import { verifierSiret, type StatutSiret } from './siret'

/**
 * Applique le résultat de la vérification officielle du SIRET au profil et au badge
 * "SIRET vérifié" de l'utilisateur. Si l'API est indisponible, l'état précédent est
 * conservé (on ne retire pas un badge à cause d'une panne).
 */
export async function appliquerVerificationSiret(
  userId: string,
  type: 'TRANSPORTEUR' | 'COMMISSIONNAIRE',
  siret: string,
  siretPrecedent: string | null
): Promise<StatutSiret> {
  const res = await verifierSiret(siret)
  const siretChange = siretPrecedent !== null && siretPrecedent !== siret

  if (res.statut === 'INDISPONIBLE') {
    if (siretChange) await retirerBadge(userId, type)
    return res.statut
  }

  const actif = res.statut === 'ACTIF'
  const donnees = { siretVerifieLe: actif ? new Date() : null, activiteOfficielle: actif ? res.activite ?? null : null }
  if (type === 'TRANSPORTEUR') await db.transporteurProfil.update({ where: { userId }, data: donnees })
  else await db.commissionnaireProfil.update({ where: { userId }, data: donnees })
  await db.user.update({ where: { id: userId }, data: { verifie: actif } })
  return res.statut
}

async function retirerBadge(userId: string, type: 'TRANSPORTEUR' | 'COMMISSIONNAIRE') {
  const donnees = { siretVerifieLe: null, activiteOfficielle: null }
  if (type === 'TRANSPORTEUR') await db.transporteurProfil.update({ where: { userId }, data: donnees })
  else await db.commissionnaireProfil.update({ where: { userId }, data: donnees })
  await db.user.update({ where: { id: userId }, data: { verifie: false } })
}

export function messageStatutSiret(statut: StatutSiret): string | null {
  switch (statut) {
    case 'ACTIF':
      return null
    case 'CESSE':
      return "Ce SIRET correspond à un établissement fermé : le badge « SIRET vérifié » n'a pas été attribué."
    case 'INTROUVABLE':
      return "Ce SIRET est introuvable dans le répertoire officiel : le badge « SIRET vérifié » n'a pas été attribué."
    case 'INDISPONIBLE':
      return "Le répertoire officiel est momentanément injoignable : la vérification du SIRET sera à refaire."
  }
}
