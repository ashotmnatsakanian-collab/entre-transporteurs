import { db } from '@/lib/db'
import { demandeReinitSchema } from '@/lib/validations/divers'
import { creerToken } from '@/lib/tokens'
import { emailReinitialisation, envoyerEmail, urlApplication } from '@/lib/email'
import { journaliser } from '@/lib/journal'
import { ipClient } from '@/lib/ip'
import { gerer, json, limiter, lireJson } from '@/lib/api'

// POST /api/auth/mot-de-passe-oublie — la réponse est identique que le compte existe ou non
export const POST = gerer(async (req) => {
  limiter(req, 'reinit-ip', 10, 60 * 60_000)
  const { email } = await lireJson(req, demandeReinitSchema)
  limiter(req, 'reinit-email', 3, 60 * 60_000, email)

  const user = await db.user.findUnique({ where: { email }, select: { id: true, nom: true, email: true, suspendu: true, supprimeLe: true } })
  if (user && !user.suspendu && !user.supprimeLe) {
    const token = await creerToken(user.id, 'REINITIALISATION_MDP', 60 * 60_000)
    await envoyerEmail({ ...emailReinitialisation(user.nom, urlApplication(`/reinitialiser?token=${token}`)), to: user.email })
    await journaliser('mdp_reinit_demande', { userId: user.id, ip: ipClient(req.headers) })
  }

  return json({ message: "Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d'être envoyé." })
})
