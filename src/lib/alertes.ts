import { Prisma } from '@prisma/client'
import { db } from './db'
import { aAccesPayant } from './acces'
import { emailAlerteAnnonce, emailAlerteBesoin, envoyerEmail, urlApplication } from './email'
import { recupererAnnonceDiffusion } from './geo'
import { log, messageErreur } from './logger'
import { consommer } from './rate-limit'

/** Retire les jokers SQL d'un texte saisi : il est utilisé dans un ILIKE. */
export function neutraliserJokers(s: string): string {
  return s.replace(/[%_\\]/g, '')
}

function formatJour(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

/**
 * Prévient par e-mail les commissionnaires dont une alerte correspond à la nouvelle annonce
 * (départ dans le rayon choisi, destination compatible). Au plus un e-mail par alerte et par heure.
 */
export async function declencherAlertesAnnonce(annonceId: string): Promise<void> {
  try {
    const a = await recupererAnnonceDiffusion(annonceId)
    if (!a) return
    const arrivee = a.villeArrivee

    const alertes = await db.$queryRaw<Array<{ id: string; userId: string; email: string; nom: string }>>(Prisma.sql`
      SELECT al.id, al."userId", u.email, u.nom
      FROM "Alerte" al
      JOIN "User" u ON u.id = al."userId"
      WHERE al.actif
        AND u."alertesEmail" AND NOT u.suspendu AND u."supprimeLe" IS NULL
        AND (al."derniereNotifLe" IS NULL OR al."derniereNotifLe" < NOW() - INTERVAL '1 hour')
        AND (al."villeArrivee" IS NULL OR ${arrivee}::text IS NULL OR ${arrivee}::text ILIKE '%' || al."villeArrivee" || '%')
        AND 6371 * acos(LEAST(1.0,
              cos(radians(al."latDepart")) * cos(radians(${a.latDepart}))
              * cos(radians(${a.lngDepart}) - radians(al."lngDepart"))
              + sin(radians(al."latDepart")) * sin(radians(${a.latDepart})))) <= al."rayonKm"
      LIMIT 200
    `)

    const resume = `${a.raisonSociale} est disponible au départ de ${a.villeDepart}${arrivee ? ` vers ${arrivee}` : ' (toutes directions)'} à partir du ${formatJour(a.dateDisponibilite)}.`

    for (const al of alertes) {
      if (!(await aAccesPayant(al.userId))) continue
      await envoyerEmail({ ...emailAlerteAnnonce(al.nom, resume, urlApplication('/commissionnaire/recherche')), to: al.email })
      await db.alerte.update({ where: { id: al.id }, data: { derniereNotifLe: new Date() } })
    }
  } catch (err) {
    log.error('alertes annonce échouées', { erreur: messageErreur(err) })
  }
}

/**
 * Prévient les transporteurs proches (≤ 150 km de leur base) qu'un fret est à transporter,
 * si leur flotte convient. Au plus 3 e-mails par transporteur et par jour.
 */
export async function declencherAlertesBesoin(besoinId: string): Promise<void> {
  try {
    const b = await db.besoin.findUnique({ where: { id: besoinId } })
    if (!b) return

    const transporteurs = await db.$queryRaw<Array<{ userId: string; email: string; nom: string; profilId: string }>>(Prisma.sql`
      SELECT u.id AS "userId", u.email, u.nom, tp.id AS "profilId"
      FROM "TransporteurProfil" tp
      JOIN "User" u ON u.id = tp."userId"
      WHERE u."alertesEmail" AND NOT u.suspendu AND u."supprimeLe" IS NULL
        AND 6371 * acos(LEAST(1.0,
              cos(radians(${b.latDepart})) * cos(radians(tp.latitude))
              * cos(radians(tp.longitude) - radians(${b.lngDepart}))
              + sin(radians(${b.latDepart})) * sin(radians(tp.latitude)))) <= 150
      LIMIT 100
    `)

    const resume = `Un fret est à transporter de ${b.villeDepart} vers ${b.villeArrivee}, enlèvement le ${formatJour(b.dateEnlevement)}${b.poidsKg ? ` (${Math.round(b.poidsKg)} kg)` : ''}.`

    for (const t of transporteurs) {
      const vehiculeAdapte = await db.vehicule.count({
        where: {
          transporteurId: t.profilId,
          actif: true,
          ...(b.typeVehicule && { type: b.typeVehicule }),
          ...(b.poidsKg && { chargeUtile: { gte: b.poidsKg } }),
        },
      })
      if (vehiculeAdapte === 0) continue
      if (!consommer(`alerte-besoin:${t.userId}`, 3, 24 * 60 * 60_000).autorise) continue
      await envoyerEmail({ ...emailAlerteBesoin(t.nom, resume, urlApplication('/transporteur/besoins')), to: t.email })
    }
  } catch (err) {
    log.error('alertes besoin échouées', { erreur: messageErreur(err) })
  }
}
