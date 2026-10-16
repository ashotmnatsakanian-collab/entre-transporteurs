import { hash } from 'bcryptjs'
import { addDays } from 'date-fns'
import { db } from '@/lib/db'
import { inscriptionSchema } from '@/lib/validations/profil'
import { creerClientStripe } from '@/lib/stripe'
import { creerToken } from '@/lib/tokens'
import { emailActif, emailVerification, envoyerEmail, urlApplication } from '@/lib/email'
import { journaliser } from '@/lib/journal'
import { ipClient } from '@/lib/ip'
import { ApiError, gerer, json, limiter, lireJson } from '@/lib/api'

// POST /api/auth/register
export const POST = gerer(async (req) => {
  limiter(req, 'inscription', 10, 60 * 60_000)
  const data = await lireJson(req, inscriptionSchema)

  if (await db.user.findUnique({ where: { email: data.email }, select: { id: true } })) {
    throw new ApiError(409, 'Un compte existe déjà avec cet email')
  }

  const motDePasse = await hash(data.password, 12)
  const maintenant = new Date()

  // Utilisateur + profil (+ abonnement) créés dans une seule opération : jamais de compte sans profil
  const user = await db.user.create({
    data: {
      email: data.email,
      password: motDePasse,
      nom: data.nom,
      telephone: data.telephone,
      role: data.role,
      cguAccepteesLe: maintenant,
      // Sans service d'e-mail configuré, la vérification ne peut pas avoir lieu : on ne bloque personne
      emailVerifieLe: emailActif ? null : maintenant,
      ...(data.role === 'TRANSPORTEUR'
        ? { transporteurProfil: { create: { siret: '', raisonSociale: data.nom, latitude: 46.6034, longitude: 1.8883 } } }
        : {
            commissionnaireProfil: { create: { siret: '', raisonSociale: data.nom } },
            // Les transporteurs sont gratuits : seul un commissionnaire a un abonnement
            abonnement: { create: { statut: 'TRIALING', dateFinEssai: addDays(maintenant, 30) } },
          }),
    },
    select: { id: true, nom: true, email: true, role: true },
  })

  await journaliser('inscription', { userId: user.id, ip: ipClient(req.headers), details: user.role })

  if (user.role === 'COMMISSIONNAIRE') {
    try {
      const stripeCustomerId = await creerClientStripe(user.email, user.nom)
      if (stripeCustomerId) await db.abonnement.update({ where: { userId: user.id }, data: { stripeCustomerId } })
    } catch {
      /* Stripe indisponible : le client sera créé au moment du paiement */
    }
  }

  if (emailActif) {
    const token = await creerToken(user.id, 'VERIFICATION_EMAIL', 24 * 60 * 60_000)
    await envoyerEmail({ ...emailVerification(user.nom, urlApplication(`/verifier-email?token=${token}`)), to: user.email })
  }

  return json({ success: true }, { status: 201 })
})
