import { db } from './db'
import { log, messageErreur } from './logger'

// Durées annoncées dans la politique de confidentialité : ne pas les changer sans mettre ce texte à jour.
export const CONSERVATION_JOURNAL_MOIS = 12
const MS_PAR_JOUR = 86_400_000

/** Date limite en deçà de laquelle une trace du journal de sécurité doit être supprimée. */
export function limiteJournal(maintenant: Date = new Date()): Date {
  const d = new Date(maintenant)
  d.setMonth(d.getMonth() - CONSERVATION_JOURNAL_MOIS)
  return d
}

/**
 * Supprime les données dont la durée de conservation est écoulée :
 * journal de sécurité (12 mois) et jetons d'e-mail expirés ou déjà utilisés.
 */
export async function purgerDonneesExpirees(maintenant: Date = new Date()): Promise<{ journal: number; jetons: number }> {
  const journal = await db.journalSecurite.deleteMany({ where: { createdAt: { lt: limiteJournal(maintenant) } } })
  const jetons = await db.tokenEmail.deleteMany({
    where: { OR: [{ expireLe: { lt: new Date(maintenant.getTime() - MS_PAR_JOUR) } }, { utiliseLe: { not: null } }] },
  })
  return { journal: journal.count, jetons: jetons.count }
}

/** Lance la purge au démarrage puis toutes les 24 h (une seule instance : voir DEPLOIEMENT.md). */
export function planifierPurge(): void {
  const lancer = () =>
    purgerDonneesExpirees()
      .then((r) => { if (r.journal || r.jetons) log.info('purge des données expirées', r) })
      .catch((err) => log.error('purge des données expirées impossible', { erreur: messageErreur(err) }))
  setTimeout(lancer, 30_000).unref()
  setInterval(lancer, MS_PAR_JOUR).unref()
}
