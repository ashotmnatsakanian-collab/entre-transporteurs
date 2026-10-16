import { db } from '@/lib/db'
import { verificationSchema } from '@/lib/validations/divers'
import { consommerToken } from '@/lib/tokens'
import { journaliser } from '@/lib/journal'
import { ipClient } from '@/lib/ip'
import { ApiError, gerer, json, limiter, lireJson } from '@/lib/api'

// POST /api/auth/verifier-email — confirmer son adresse avec le jeton reçu par e-mail
export const POST = gerer(async (req) => {
  limiter(req, 'verif-email', 20, 60 * 60_000)
  const { token } = await lireJson(req, verificationSchema)

  const userId = await consommerToken(token, 'VERIFICATION_EMAIL')
  if (!userId) throw new ApiError(400, 'Ce lien est invalide ou a expiré.')

  await db.user.update({ where: { id: userId }, data: { emailVerifieLe: new Date() } })
  await journaliser('email_verifie', { userId, ip: ipClient(req.headers) })
  return json({ success: true })
})
