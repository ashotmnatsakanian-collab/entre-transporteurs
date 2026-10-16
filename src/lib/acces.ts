import { db } from './db'
import { abonnementActif } from './stripe'

/**
 * Un commissionnaire a "accès payant" tant que son essai ou son abonnement est valide.
 * Sans Stripe configuré (période de lancement gratuite), tout commissionnaire inscrit y a droit.
 */
export async function aAccesPayant(userId: string): Promise<boolean> {
  const abo = await db.abonnement.findUnique({ where: { userId }, select: { statut: true, dateFinEssai: true } })
  return !!abo && abonnementActif(abo.statut, abo.dateFinEssai)
}
