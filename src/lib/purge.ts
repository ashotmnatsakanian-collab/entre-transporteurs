import { db } from './db'
import { log, messageErreur } from './logger'
import { DOCUMENTS } from './documents-regles'
import { emailDocumentsExpiration, envoyerEmail, urlApplication } from './email'

// Durées annoncées dans la politique de confidentialité : ne pas les changer sans mettre ce texte à jour.
export const CONSERVATION_JOURNAL_MOIS = 12
export const CONSERVATION_DOCUMENT_REFUSE_JOURS = 30
export const CONSERVATION_DOCUMENT_EXPIRE_MOIS = 6
export const PREAVIS_EXPIRATION_DOCUMENT_JOURS = 30
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

function ilYAMois(mois: number, maintenant: Date): Date {
  const d = new Date(maintenant)
  d.setMonth(d.getMonth() - mois)
  return d
}

/**
 * Documents légaux : supprime les documents refusés depuis 30 jours et ceux expirés depuis 6 mois,
 * retire la conformité des profils dont un document est arrivé à échéance.
 */
export async function purgerDocuments(maintenant: Date = new Date()): Promise<{ refuses: number; expires: number; profils: number }> {
  const refuses = await db.documentTransporteur.deleteMany({
    where: { statut: 'REFUSE', verifieLe: { lt: new Date(maintenant.getTime() - CONSERVATION_DOCUMENT_REFUSE_JOURS * MS_PAR_JOUR) } },
  })
  const expires = await db.documentTransporteur.deleteMany({ where: { dateExpiration: { lt: ilYAMois(CONSERVATION_DOCUMENT_EXPIRE_MOIS, maintenant) } } })
  const profils = await db.transporteurProfil.updateMany({
    where: { documentsConformesJusqua: { lte: maintenant } },
    data: { documentsConformesJusqua: null },
  })
  return { refuses: refuses.count, expires: expires.count, profils: profils.count }
}

/** Prévient une fois chaque transporteur dont des documents validés expirent dans les 30 jours. */
export async function rappelerExpirationsDocuments(maintenant: Date = new Date()): Promise<number> {
  const limite = new Date(maintenant.getTime() + PREAVIS_EXPIRATION_DOCUMENT_JOURS * MS_PAR_JOUR)
  const docs = await db.documentTransporteur.findMany({
    where: {
      statut: 'VALIDE', rappelEnvoyeLe: null, dateExpiration: { gt: maintenant, lte: limite },
      transporteur: { user: { suspendu: false, supprimeLe: null } },
    },
    select: { id: true, type: true, dateExpiration: true, transporteurId: true, transporteur: { select: { user: { select: { email: true, nom: true } } } } },
  })
  const parTransporteur = new Map<string, typeof docs>()
  for (const d of docs) parTransporteur.set(d.transporteurId, [...(parTransporteur.get(d.transporteurId) ?? []), d])

  let envoyes = 0
  for (const liste of parTransporteur.values()) {
    const user = liste[0].transporteur.user
    const lignes = liste.map((d) => `${DOCUMENTS[d.type].libelle} — expire le ${d.dateExpiration.toLocaleDateString('fr-FR')}`)
    const ok = await envoyerEmail({ ...emailDocumentsExpiration(user.nom, lignes, urlApplication('/transporteur/documents')), to: user.email })
    // Marqué seulement si l'envoi a réussi : sinon nouvel essai à la prochaine passe
    if (ok) {
      await db.documentTransporteur.updateMany({ where: { id: { in: liste.map((d) => d.id) } }, data: { rappelEnvoyeLe: maintenant } })
      envoyes++
    }
  }
  return envoyes
}

/** Lance la purge au démarrage puis toutes les 24 h (une seule instance : voir DEPLOIEMENT.md). */
export function planifierPurge(): void {
  const lancer = () =>
    Promise.all([purgerDonneesExpirees(), purgerDocuments(), rappelerExpirationsDocuments()])
      .then(([r, d, rappels]) => {
        if (r.journal || r.jetons || d.refuses || d.expires || d.profils || rappels) log.info('purge des données expirées', { ...r, documents: d, rappels })
      })
      .catch((err) => log.error('purge des données expirées impossible', { erreur: messageErreur(err) }))
  setTimeout(lancer, 30_000).unref()
  setInterval(lancer, MS_PAR_JOUR).unref()
}
