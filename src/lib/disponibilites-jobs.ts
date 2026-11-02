// Tâches de fond sur les disponibilités et les positions (serveur à instance unique : voir DEPLOIEMENT.md).
import { db } from './db'
import { log, messageErreur } from './logger'
import { creerToken } from './tokens'
import { emailRenouvellementDisponibilite, envoyerEmail, urlApplication } from './email'
import { jusquA } from './fraicheur'
import { diffuserChangementCarte } from './position'
import { utilisateurEstConforme } from './documents'

// Durées annoncées dans la politique de confidentialité : ne pas les changer sans mettre ce texte à jour.
export const CONSERVATION_POSITION_JOURS = 30
const MS_PAR_HEURE = 3_600_000
const MS_PAR_JOUR = 86_400_000
const POSITION_NON_RENSEIGNEE = { latitude: 46.6034, longitude: 1.8883 } // centre de la France

/** Coupe les disponibilités dont l'échéance est dépassée (les requêtes les ignorent déjà : ceci remet l'état et la carte à jour). */
export async function expirerDisponibilites(maintenant: Date = new Date()): Promise<number> {
  const { count } = await db.transporteurProfil.updateMany({
    where: { disponible: true, disponibleJusqua: { lte: maintenant } },
    data: { disponible: false },
  })
  if (count > 0) diffuserChangementCarte()
  return count
}

/** Prévient une fois les transporteurs dont la disponibilité expire dans moins de 2 h (disponibilités d'au moins 6 h). */
export async function rappelerRenouvellements(maintenant: Date = new Date()): Promise<number> {
  const profils = await db.transporteurProfil.findMany({
    where: {
      disponible: true,
      rappelDispoEnvoyeLe: null,
      dureeDisponibiliteH: { gte: 6 },
      disponibleJusqua: { gt: maintenant, lte: new Date(maintenant.getTime() + 2 * MS_PAR_HEURE) },
      user: { suspendu: false, supprimeLe: null, alertesEmail: true },
    },
    select: { id: true, userId: true, positionVille: true, disponibleJusqua: true, user: { select: { email: true, nom: true } } },
    take: 200,
  })

  let envoyes = 0
  for (const p of profils) {
    if (!(await utilisateurEstConforme(p.userId))) continue
    // Le lien reste valable jusqu'à 24 h après l'échéance ; il ne sert qu'une fois
    const token = await creerToken(p.userId, 'RENOUVELER_DISPONIBILITE', p.disponibleJusqua!.getTime() - maintenant.getTime() + MS_PAR_JOUR)
    const ok = await envoyerEmail({
      ...emailRenouvellementDisponibilite(p.user.nom, p.positionVille, jusquA(p.disponibleJusqua!, maintenant), urlApplication(`/renouveler-disponibilite?token=${token}`)),
      to: p.user.email,
    })
    if (ok) {
      await db.transporteurProfil.update({ where: { id: p.id }, data: { rappelDispoEnvoyeLe: maintenant } })
      envoyes++
    }
  }
  return envoyes
}

/** Efface les positions non mises à jour depuis 30 jours (hors disponibilité en cours) : on ne garde pas un lieu périmé. */
export async function purgerPositions(maintenant: Date = new Date()): Promise<number> {
  const { count } = await db.transporteurProfil.updateMany({
    where: {
      derniereMAJ: { lt: new Date(maintenant.getTime() - CONSERVATION_POSITION_JOURS * MS_PAR_JOUR) },
      OR: [{ positionInsee: { not: null } }, { destinationInsee: { not: null } }],
      disponible: false,
    },
    data: {
      ...POSITION_NON_RENSEIGNEE,
      positionVille: null, positionInsee: null, positionDepartement: null, positionRegion: null,
      destinationVille: null, destinationInsee: null, destinationDepartement: null,
      disponibleJusqua: null,
    },
  })
  return count
}

/** Lance les tâches toutes les 5 minutes. */
export function planifierDisponibilites(): void {
  const lancer = () =>
    Promise.all([expirerDisponibilites(), rappelerRenouvellements(), purgerPositions()])
      .then(([expirees, rappels, positions]) => {
        if (expirees || rappels || positions) log.info('disponibilités', { expirees, rappels, positionsEffacees: positions })
      })
      .catch((err) => log.error('tâche disponibilités impossible', { erreur: messageErreur(err) }))
  setTimeout(lancer, 20_000).unref()
  setInterval(lancer, 5 * 60_000).unref()
}
