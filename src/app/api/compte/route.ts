import { compare, hash } from 'bcryptjs'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { z } from 'zod'
import { suppressionCompteSchema } from '@/lib/validations/divers'
import { stripe } from '@/lib/stripe'
import { journaliser } from '@/lib/journal'
import { ipClient } from '@/lib/ip'
import { log, messageErreur } from '@/lib/logger'
import { ApiError, exigerUtilisateur, gerer, json, limiter, lireJson } from '@/lib/api'

// GET /api/compte — export de toutes mes données (RGPD, droit d'accès et de portabilité)
export const GET = gerer(async (req) => {
  const u = await exigerUtilisateur('TRANSPORTEUR', 'COMMISSIONNAIRE')
  limiter(req, 'export', 5, 60 * 60_000, u.id)

  const donnees = await db.user.findUniqueOrThrow({
    where: { id: u.id },
    select: {
      id: true, email: true, nom: true, telephone: true, role: true, verifie: true, createdAt: true,
      emailVerifieLe: true, cguAccepteesLe: true, cguVersion: true, alertesEmail: true,
      transporteurProfil: { include: { vehicules: true, annonces: true, avis: true } },
      commissionnaireProfil: { include: { besoins: true } },
      abonnement: { select: { statut: true, dateFinEssai: true, dateFinPeriode: true, createdAt: true } },
      avisDonnes: true,
      alertes: true,
      signalementsEmis: { select: { cibleId: true, motif: true, details: true, createdAt: true } },
    },
  })
  const messages = await db.message.findMany({
    where: { expediteurId: u.id },
    select: { conversationId: true, contenu: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
    take: 20_000,
  })

  await journaliser('export_donnees', { userId: u.id, ip: ipClient(req.headers) })
  return json({ exporteLe: new Date().toISOString(), donnees, messagesEnvoyes: messages }, {
    headers: { 'Content-Disposition': 'attachment; filename="mes-donnees-entre-transporteurs.json"' },
  })
})

// DELETE /api/compte — suppression : données personnelles effacées, identité anonymisée.
// Les messages échangés restent visibles de l'interlocuteur, sous "Compte supprimé".
export const DELETE = gerer(async (req) => {
  const u = await exigerUtilisateur('TRANSPORTEUR', 'COMMISSIONNAIRE')
  limiter(req, 'suppression', 5, 60 * 60_000, u.id)
  const { password } = await lireJson(req, suppressionCompteSchema)

  const user = await db.user.findUniqueOrThrow({ where: { id: u.id }, select: { password: true, abonnement: { select: { stripeSubscriptionId: true } } } })
  if (!(await compare(password, user.password))) throw new ApiError(403, 'Mot de passe incorrect')

  // Résilier l'abonnement Stripe éventuel pour ne plus rien facturer
  const sub = user.abonnement?.stripeSubscriptionId
  if (stripe && sub) {
    try {
      await stripe.subscriptions.cancel(sub)
    } catch (err) {
      log.error('résiliation Stripe échouée lors de la suppression de compte', { erreur: messageErreur(err) })
    }
  }

  const motDePasseInutilisable = await hash(randomBytes(32).toString('hex'), 10)
  await db.$transaction([
    db.transporteurProfil.deleteMany({ where: { userId: u.id } }), // annonces, véhicules, avis reçus : en cascade
    db.commissionnaireProfil.deleteMany({ where: { userId: u.id } }), // besoins : en cascade
    db.avis.deleteMany({ where: { auteurId: u.id } }),
    db.alerte.deleteMany({ where: { userId: u.id } }),
    db.tokenEmail.deleteMany({ where: { userId: u.id } }),
    db.abonnement.deleteMany({ where: { userId: u.id } }),
    db.user.update({
      where: { id: u.id },
      data: {
        email: `supprime-${u.id}@supprime.invalid`,
        nom: 'Compte supprimé',
        telephone: null,
        password: motDePasseInutilisable,
        verifie: false,
        alertesEmail: false,
        supprimeLe: new Date(),
        motDePasseChangeLe: new Date(),
      },
    }),
  ])

  await journaliser('compte_supprime', { userId: u.id, ip: ipClient(req.headers) })
  return json({ success: true })
})

// PATCH /api/compte — préférences (alertes e-mail)
export const PATCH = gerer(async (req) => {
  const u = await exigerUtilisateur('TRANSPORTEUR', 'COMMISSIONNAIRE')
  limiter(req, 'preferences', 30, 60 * 60_000, u.id)
  const { alertesEmail } = await lireJson(req, z.object({ alertesEmail: z.boolean() }))
  await db.user.update({ where: { id: u.id }, data: { alertesEmail } })
  return json({ alertesEmail })
})
