import { hash } from 'bcryptjs'
import { db } from '@/lib/db'
import { reinitSchema } from '@/lib/validations/divers'
import { consommerToken } from '@/lib/tokens'
import { journaliser } from '@/lib/journal'
import { ipClient } from '@/lib/ip'
import { ApiError, gerer, json, limiter, lireJson } from '@/lib/api'

// POST /api/auth/reinitialiser — choisir un nouveau mot de passe avec le jeton reçu par e-mail
export const POST = gerer(async (req) => {
  limiter(req, 'reinit-valid', 10, 60 * 60_000)
  const { token, password } = await lireJson(req, reinitSchema)

  const userId = await consommerToken(token, 'REINITIALISATION_MDP')
  if (!userId) throw new ApiError(400, 'Ce lien est invalide ou a expiré. Refaites une demande.')

  await db.user.update({
    where: { id: userId },
    // motDePasseChangeLe révoque toutes les sessions ouvertes
    data: { password: await hash(password, 12), motDePasseChangeLe: new Date() },
  })
  await db.tokenEmail.deleteMany({ where: { userId, type: 'REINITIALISATION_MDP' } })
  await journaliser('mdp_reinit_ok', { userId, ip: ipClient(req.headers) })

  return json({ success: true })
})
